import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendBracketAnnouncedEmail, sendBracketAnnouncedIncompleteEmail } from "@/lib/email"

/**
 * POST /api/admin/resend-bracket-emails — Re-send bracket announced emails
 * to all registered users (and incomplete registrations).
 */
export async function POST() {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  // Get current season
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  if (!settings?.currentSeasonId) {
    return NextResponse.json({ error: "No active season" }, { status: 400 })
  }

  const season = await prisma.season.findUnique({ where: { id: settings.currentSeasonId } })
  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 })
  }

  if (season.status !== "REGISTRATION") {
    return NextResponse.json({ error: "Season must be in REGISTRATION status" }, { status: 400 })
  }

  // Format deadline
  const deadlineStr = season.entryDeadlineUtc
    ? season.entryDeadlineUtc.toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      }) + " ET"
    : "TBD"

  // Get registered users
  const registeredUsers = await prisma.user.findMany({
    where: { registrationComplete: true },
    select: { email: true, firstName: true },
  })

  // Get incomplete users
  const incompleteUsers = await prisma.user.findMany({
    where: { registrationComplete: false },
    select: { email: true, name: true },
  })

  let sent = 0
  let failed = 0

  for (const user of registeredUsers) {
    if (!user.email || !user.firstName) continue
    const result = await sendBracketAnnouncedEmail(user.email, user.firstName, deadlineStr)
    if (result.success) sent++
    else failed++
  }

  let incompleteSent = 0
  let incompleteFailed = 0

  for (const user of incompleteUsers) {
    if (!user.email) continue
    const firstName = user.name?.split(" ")[0] ?? null
    const result = await sendBracketAnnouncedIncompleteEmail(user.email, firstName, deadlineStr)
    if (result.success) incompleteSent++
    else incompleteFailed++
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      adminId: session.user.id!,
      action: `Resent bracket announced emails: ${sent}/${registeredUsers.length} registered, ${incompleteSent}/${incompleteUsers.length} incomplete`,
    },
  })

  return NextResponse.json({
    success: true,
    registered: { sent, failed, total: registeredUsers.length },
    incomplete: { sent: incompleteSent, failed: incompleteFailed, total: incompleteUsers.length },
  })
}
