import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendBroadcastEmail } from "@/lib/email"

// GET /api/leagues/[id]/messages — fetch recent messages for a league
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Verify user is a member of this league
  const membership = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: id, userId: session.user.id } },
  })
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this league" }, { status: 403 })
  }

  const messages = await prisma.leagueMessage.findMany({
    where: { leagueId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      sender: {
        select: { name: true, username: true },
      },
    },
  })

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      subject: m.subject,
      message: m.message,
      senderName: m.sender.username ?? m.sender.name ?? "Admin",
      createdAt: m.createdAt.toISOString(),
    })),
  })
}

// POST /api/leagues/[id]/messages — send a message to all league members
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  // Verify league exists and user is admin
  const league = await prisma.league.findUnique({
    where: { id },
    select: { id: true, name: true, adminId: true },
  })
  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 })
  }
  if (league.adminId !== session.user.id) {
    return NextResponse.json({ error: "Only the league admin can send messages" }, { status: 403 })
  }

  const body = await request.json()
  const { subject, message } = body

  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 })
  }
  if (subject.length > 100) {
    return NextResponse.json({ error: "Subject must be 100 characters or less" }, { status: 400 })
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "Message must be 2000 characters or less" }, { status: 400 })
  }

  try {
    // Save message to DB
    const leagueMessage = await prisma.leagueMessage.create({
      data: {
        leagueId: id,
        senderId: session.user.id,
        subject,
        message,
      },
    })

    // Fetch all league members with email info
    const members = await prisma.leagueMember.findMany({
      where: { leagueId: id },
      include: {
        user: { select: { email: true, firstName: true } },
      },
    })

    // Convert plain text to HTML paragraphs
    const escapeHtml = (str: string) =>
      str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    const messageHtml = message
      .split("\n")
      .filter((line: string) => line.trim())
      .map((line: string) => `<p style="margin:0 0 12px;">${escapeHtml(line)}</p>`)
      .join("")

    let sent = 0
    let failed = 0

    const emailSubject = `[${league.name}] ${subject}`

    for (const member of members) {
      if (!member.user.email || !member.user.firstName) continue

      const result = await sendBroadcastEmail(
        member.user.email,
        member.user.firstName,
        emailSubject,
        messageHtml
      )
      if (result.success) {
        sent++
      } else {
        failed++
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id,
        action: `League message: "${subject}" to ${league.name} (${sent} sent, ${failed} failed)`,
        details: {
          leagueId: id,
          leagueName: league.name,
          subject,
          sent,
          failed,
          totalMembers: members.length,
          messageId: leagueMessage.id,
        },
      },
    })

    return NextResponse.json({
      success: true,
      sent,
      failed,
      totalMembers: members.length,
      messageId: leagueMessage.id,
    })
  } catch (err) {
    console.error("[league/messages] Error:", err)
    return NextResponse.json(
      { error: "Failed to send message", message: String(err) },
      { status: 500 }
    )
  }
}
