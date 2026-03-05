import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendBracketAnnouncedEmail } from "@/lib/email"

// GET /api/admin/seasons — list all seasons
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session.user.role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const seasons = await prisma.season.findMany({
    orderBy: { year: "desc" },
    include: {
      _count: { select: { entries: true, leagues: true } },
    },
  })

  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })

  return NextResponse.json({
    seasons: seasons.map((s) => ({
      id: s.id,
      year: s.year,
      status: s.status,
      entryDeadlineUtc: s.entryDeadlineUtc,
      entries: s._count.entries,
      leagues: s._count.leagues,
      isCurrent: settings?.currentSeasonId === s.id,
    })),
    currentSeasonId: settings?.currentSeasonId ?? null,
  })
}

// POST /api/admin/seasons — create a new season
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session.user.role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const year = body.year as number
  const entryDeadline = body.entryDeadline as string | null
  const setAsCurrent = body.setAsCurrent as boolean

  if (!year || year < 2016 || year > 2099) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 })
  }

  // Check for duplicate year
  const existing = await prisma.season.findUnique({ where: { year } })
  if (existing) {
    return NextResponse.json({ error: `Season ${year} already exists` }, { status: 409 })
  }

  const season = await prisma.season.create({
    data: {
      year,
      status: "SETUP",
      entryDeadlineUtc: entryDeadline ? new Date(entryDeadline) : null,
    },
  })

  // Optionally set as current season
  if (setAsCurrent) {
    await prisma.appSettings.upsert({
      where: { id: "main" },
      update: { currentSeasonId: season.id },
      create: { id: "main", currentSeasonId: season.id },
    })
  }

  return NextResponse.json({ id: season.id, year: season.year }, { status: 201 })
}

// PUT /api/admin/seasons — update season status/deadline
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session.user.role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { seasonId, status, entryDeadline, setAsCurrent } = body

  if (!seasonId) {
    return NextResponse.json({ error: "Season ID required" }, { status: 400 })
  }

  const season = await prisma.season.findUnique({ where: { id: seasonId } })
  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 })
  }

  // Validate status if provided
  const VALID_STATUSES = ["SETUP", "REGISTRATION", "LOCKED", "ACTIVE", "COMPLETE"]
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 })
  }

  // Validate entryDeadline if provided
  if (entryDeadline !== undefined && entryDeadline !== null) {
    const parsedDate = new Date(entryDeadline)
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid entry deadline date" }, { status: 400 })
    }
  }

  const updateData: Record<string, unknown> = {}
  if (status) updateData.status = status
  if (entryDeadline !== undefined) {
    updateData.entryDeadlineUtc = entryDeadline ? new Date(entryDeadline) : null
  }

  const updated = await prisma.season.update({
    where: { id: seasonId },
    data: updateData,
  })

  if (setAsCurrent) {
    await prisma.appSettings.upsert({
      where: { id: "main" },
      update: { currentSeasonId: seasonId },
      create: { id: "main", currentSeasonId: seasonId },
    })
  }

  // ── Trigger bracket announced email when status changes to REGISTRATION ──
  // This is a mandatory email — bypass notificationsEnabled flag
  if (status === "REGISTRATION" && season.status !== "REGISTRATION") {
    // Fire and forget — don't block the API response
    sendBracketAnnouncedEmails(updated.entryDeadlineUtc).catch((err) => {
      console.error("[admin/seasons] Bracket announced email error:", err)
    })
  }

  return NextResponse.json({
    id: updated.id,
    year: updated.year,
    status: updated.status,
    entryDeadlineUtc: updated.entryDeadlineUtc,
  })
}

// ─── Helper: Send bracket announced emails to all registered users ──────────

async function sendBracketAnnouncedEmails(deadline: Date | null) {
  // Get all registered users (mandatory email — send to ALL regardless of notificationsEnabled)
  const users = await prisma.user.findMany({
    where: { registrationComplete: true },
    select: { email: true, firstName: true },
  })

  // Format deadline for display
  const deadlineStr = deadline
    ? deadline.toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      }) + " ET"
    : "TBD"

  let sent = 0
  let failed = 0

  for (const user of users) {
    if (!user.email || !user.firstName) continue
    const result = await sendBracketAnnouncedEmail(user.email, user.firstName, deadlineStr)
    if (result.success) sent++
    else failed++
  }

  console.log(`[admin/seasons] Bracket announced emails: ${sent} sent, ${failed} failed, ${users.length} total users`)

  // Create audit log
  await prisma.auditLog.create({
    data: {
      adminId: "system",
      action: `Bracket announced emails sent: ${sent} delivered, ${failed} failed out of ${users.length} users`,
    },
  })
}
