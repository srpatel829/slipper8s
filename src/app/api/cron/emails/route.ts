import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  sendDeadlineReminderEmail,
  sendEntriesLockedEmail,
  sendDailyRecapEmail,
} from "@/lib/email"
import { computePercentile } from "@/lib/scoring"
import { ROUND_NAMES } from "@/lib/espn"

/**
 * GET /api/cron/emails — Automated email triggers
 *
 * Runs on Vercel cron (same schedule as sync).
 * Checks for email triggers and sends as needed:
 *
 * 1. Deadline reminder — 24h before deadline, sent once
 * 2. Entries locked — when deadline passes, sent once
 * 3. Daily recap — after all games today are final, once per day
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
            entries: { some: {} },
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

    // ── 3. Daily Recap (after all games today are final) ───────────────────
    // Send if: deadline has passed AND there were games today AND all are final
    if (hoursUntilDeadline <= 0) {
      await handleDailyRecap(now, settings.currentSeasonId, results)
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

// ─── Daily Recap Handler ───────────────────────────────────────────────────

async function handleDailyRecap(
  now: Date,
  seasonId: string | null,
  results: Record<string, unknown>,
) {
  if (!seasonId) {
    results.dailyRecap = { skipped: true, reason: "No current season" }
    return
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  // Find today's games
  const todayGames = await prisma.tournamentGame.findMany({
    where: {
      startTime: { gte: todayStart, lt: todayEnd },
    },
    select: { id: true, isComplete: true, round: true },
  })

  if (todayGames.length === 0) {
    results.dailyRecap = { skipped: true, reason: "No games today" }
    return
  }

  // Check if ALL today's games are complete
  const allComplete = todayGames.every(g => g.isComplete)
  if (!allComplete) {
    results.dailyRecap = {
      skipped: true,
      reason: `${todayGames.filter(g => !g.isComplete).length} of ${todayGames.length} games still in progress`,
    }
    return
  }

  // Check if we already sent a recap today (use checkpoint — look for a recent one)
  const recentCheckpoint = await prisma.checkpoint.findFirst({
    where: {
      seasonId,
      createdAt: { gte: todayStart },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, dailyRecapSentAt: true },
  })

  // If we sent a recap after the last checkpoint today, skip
  // Use a simple approach: check if any checkpoint today already has recap sent
  if (recentCheckpoint?.dailyRecapSentAt) {
    results.dailyRecap = { skipped: true, reason: "Already sent today" }
    return
  }

  // Determine the round label for the email subject
  const maxRound = Math.max(...todayGames.map(g => g.round))
  const roundLabel = ROUND_NAMES[maxRound] ?? `Round ${maxRound}`

  console.log(`[cron/emails] Sending daily recap for ${roundLabel}...`)

  // Get all entries with their current scores + users
  const entries = await prisma.entry.findMany({
    where: { seasonId, draftInProgress: false },
    include: {
      user: {
        select: { email: true, firstName: true, notificationsEnabled: true },
      },
    },
    orderBy: { score: "desc" },
  })

  // Compute ranks
  const sortedEntries = [...entries].sort((a, b) => {
    const scoreA = a.score ?? 0
    const scoreB = b.score ?? 0
    return scoreB - scoreA
  })

  const totalEntries = sortedEntries.length

  // Get yesterday's snapshots for rank change calculation
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)
  const yesterdaySnapshots = await prisma.scoreSnapshot.findMany({
    where: {
      savedAt: { gte: yesterdayStart, lt: todayStart },
    },
    select: { entryId: true, rank: true },
    orderBy: { savedAt: "desc" },
    distinct: ["entryId"],
  })

  const yesterdayRankMap = new Map(yesterdaySnapshots.map(s => [s.entryId, s.rank]))

  let sent = 0
  let failed = 0
  let skippedOptOut = 0

  for (let i = 0; i < sortedEntries.length; i++) {
    const entry = sortedEntries[i]
    const user = entry.user

    // Only send to users with notifications enabled (optional email)
    if (!user.notificationsEnabled) {
      skippedOptOut++
      continue
    }
    if (!user.email || !user.firstName) continue

    const rank = i + 1
    const percentile = computePercentile(rank, totalEntries)
    const yesterdayRank = yesterdayRankMap.get(entry.id)
    const rankChange = yesterdayRank != null ? yesterdayRank - rank : 0

    const result = await sendDailyRecapEmail(user.email, user.firstName, {
      rank,
      percentile,
      score: entry.score ?? 0,
      totalEntries,
      teamsRemaining: entry.teamsAlive ?? 0,
      rankChange,
      roundLabel,
    })

    if (result.success) sent++
    else failed++
  }

  // Mark checkpoint as having sent recap
  if (recentCheckpoint) {
    await prisma.checkpoint.update({
      where: { id: recentCheckpoint.id },
      data: { dailyRecapSentAt: now },
    })
  }

  results.dailyRecap = { sent, failed, skippedOptOut, totalEntries, roundLabel }
  console.log(`[cron/emails] Daily recap for ${roundLabel}: ${sent} sent, ${failed} failed, ${skippedOptOut} opted out`)
}
