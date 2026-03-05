import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendBroadcastEmail } from "@/lib/email"

/**
 * POST /api/admin/broadcast — Send broadcast email to players
 *
 * Body: { subject, message, audience }
 * audience: "all" | "paid" | "with_entries" | "opted_in"
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const { subject, message, audience } = await req.json()

    if (!subject || !message) {
      return NextResponse.json({ error: "Subject and message are required" }, { status: 400 })
    }

    // Build user query based on audience
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      registrationComplete: true,
    }

    switch (audience) {
      case "paid":
        where.isPaid = true
        break
      case "with_entries":
        where.entries = { some: {} }
        break
      case "opted_in":
        where.notificationsEnabled = true
        break
      case "all":
      default:
        // All registered users
        break
    }

    const users = await prisma.user.findMany({
      where,
      select: { email: true, firstName: true },
    })

    let sent = 0
    let failed = 0
    const errors: string[] = []

    // Convert plain text to HTML paragraphs (escape HTML to prevent XSS)
    const escapeHtml = (str: string) =>
      str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    const messageHtml = message
      .split("\n")
      .filter((line: string) => line.trim())
      .map((line: string) => `<p style="margin:0 0 12px;">${escapeHtml(line)}</p>`)
      .join("")

    for (const user of users) {
      if (!user.email || !user.firstName) continue

      const result = await sendBroadcastEmail(user.email, user.firstName, subject, messageHtml)
      if (result.success) {
        sent++
      } else {
        failed++
        if (errors.length < 5) errors.push(user.email)
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id!,
        action: `Broadcast email: "${subject}" to ${audience} (${sent} sent, ${failed} failed)`,
        details: { subject, audience, sent, failed, totalUsers: users.length },
      },
    })

    return NextResponse.json({
      success: true,
      sent,
      failed,
      totalUsers: users.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    console.error("[admin/broadcast] Error:", err)
    return NextResponse.json(
      { error: "Failed to send broadcast", message: String(err) },
      { status: 500 },
    )
  }
}
