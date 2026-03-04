import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  sendDeadlineReminderEmail,
  sendEntriesLockedEmail,
} from "@/lib/email"

/**
 * GET /api/cron/emails — Automated email triggers
 *
 * Runs on Vercel cron (same schedule as sync).
 * Checks for email triggers and sends as needed:
 *
 * 1. Deadline reminder — 24h before deadline, sent once
 * 2. Entries locked — when deadline passes, sent once
 *
 * Protected by CRON_SECRET env var.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()

  // ── Auth: Verify cron secret ───────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get("authorization")
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === "production") {
    console.error("[cron/emails] CRON_SECRET not set in production!")
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }

  const results: Record<string, unknown> = {}

  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })

    if (!settings?.picksDeadline) {
      return NextResponse.json({
        skipped: true,
        reason: "No picks deadline configured",
        duration: Date.now() - startTime,
      })
    }

    const now = new Date()
    const deadline = new Date(settings.picksDeadline)
    const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)

    // ── 1. Deadline Reminder (24h before deadline) ─────────────────────────
    // Send if: deadline is within 24 hours AND hasn't been sent yet
    if (hoursUntilDeadline > 0 && hoursUntilDeadline <= 24) {
      if (!settings.deadlineReminderSentAt) {
        console.log("[cron/emails] Sending deadline reminder emails...")

        // Get all users with entries who have notifications enabled
        const usersToNotify = await prisma.user.findMany({
          where: {
            notificationsEnabled: true,
            entries: { some: {} }, // Has at least one entry
          },
          select: { email: true, firstName: true },
        })

        // Also get users without entries but who are registered (encourage them to pick)
        const usersWithoutEntries = await prisma.user.findMany({
          where: {
            notificationsEnabled: true,
            registrationComplete: true,
            entries: { none: {} },
          },
          select: { email: true, firstName: true },
        })

        const allUsers = [...usersToNotify, ...usersWithoutEntries]

        // Format deadline for email
        const deadlineStr = deadline.toLocaleString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone: "America/New_York",
        }) + " ET"

        let sent = 0
        let failed = 0

        for (const user of allUsers) {
          if (!user.email || !user.firstName) continue
          const result = await sendDeadlineReminderEmail(user.email, user.firstName, deadlineStr)
          if (result.success) sent++
          else failed++
        }

        // Mark as sent
        await prisma.appSettings.update({
          where: { id: "main" },
          data: { deadlineReminderSentAt: now },
        })

        results.deadlineReminder = { sent, failed, totalUsers: allUsers.length }
        console.log(`[cron/emails] Deadline reminder: ${sent} sent, ${failed} failed`)
      } else {
        results.deadlineReminder = { skipped: true, reason: "Already sent" }
      }
    } else {
      results.deadlineReminder = {
        skipped: true,
        reason: hoursUntilDeadline > 24 ? "More than 24h until deadline" : "Deadline has passed",
      }
    }

    // ── 2. Entries Locked (when deadline passes) ───────────────────────────
    // Send if: deadline has passed AND hasn't been sent yet
    if (hoursUntilDeadline <= 0) {
      if (!settings.entriesLockedSentAt) {
        console.log("[cron/emails] Sending entries locked emails...")

        // Get all users with entries (mandatory email — bypass notificationsEnabled)
        const usersWithEntries = await prisma.user.findMany({
          where: {
            entries: { some: {} },
          },
          select: { email: true, firstName: true },
        })

        let sent = 0
        let failed = 0

        for (const user of usersWithEntries) {
          if (!user.email || !user.firstName) continue
          const result = await sendEntriesLockedEmail(user.email, user.firstName)
          if (result.success) sent++
          else failed++
        }

        // Mark as sent
        await prisma.appSettings.update({
          where: { id: "main" },
          data: { entriesLockedSentAt: now },
        })

        results.entriesLocked = { sent, failed, totalUsers: usersWithEntries.length }
        console.log(`[cron/emails] Entries locked: ${sent} sent, ${failed} failed`)
      } else {
        results.entriesLocked = { skipped: true, reason: "Already sent" }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      duration: Date.now() - startTime,
    })
  } catch (err) {
    console.error("[cron/emails] Fatal error:", err)
    return NextResponse.json(
      { error: "Email cron failed", message: String(err), duration: Date.now() - startTime },
      { status: 500 }
    )
  }
}
