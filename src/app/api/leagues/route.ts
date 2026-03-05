import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isProfane } from "@/lib/profanity"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import crypto from "crypto"

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase() // 8 char hex
}

// GET /api/leagues — list leagues the current user is in (as admin or member)
export async function GET(req: NextRequest) {
  const rateLimitResponse = rateLimit(getClientIp(req))
  if (rateLimitResponse) return rateLimitResponse

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Find leagues where the user is admin OR has an entry
  const leagues = await prisma.league.findMany({
    where: {
      OR: [
        { adminId: session.user.id },
        { entries: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      admin: { select: { id: true, name: true, username: true } },
      _count: { select: { entries: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(
    leagues.map((l) => ({
      id: l.id,
      name: l.name,
      inviteCode: l.inviteCode,
      isAdmin: l.adminId === session.user.id,
      adminName: l.admin.username ?? l.admin.name ?? "Unknown",
      memberCount: l._count.entries,
      createdAt: l.createdAt,
    }))
  )
}

// POST /api/leagues — create a new league
export async function POST(request: NextRequest) {
  const rateLimitResponse = rateLimit(getClientIp(request))
  if (rateLimitResponse) return rateLimitResponse

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const name = (body.name as string)?.trim()

  if (!name || name.length < 3 || name.length > 50) {
    return NextResponse.json(
      { error: "League name must be 3-50 characters" },
      { status: 400 }
    )
  }

  if (isProfane(name)) {
    return NextResponse.json(
      { error: "League name contains inappropriate language" },
      { status: 400 }
    )
  }

  // Get current season
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  if (!settings?.currentSeasonId) {
    // Try to find most recent season
    const season = await prisma.season.findFirst({ orderBy: { year: "desc" } })
    if (!season) {
      return NextResponse.json(
        { error: "No active season found" },
        { status: 400 }
      )
    }

    // Check duplicate name for this season
    const existing = await prisma.league.findUnique({
      where: { name_seasonId: { name, seasonId: season.id } },
    })
    if (existing) {
      return NextResponse.json(
        { error: "A league with this name already exists" },
        { status: 409 }
      )
    }

    const league = await prisma.league.create({
      data: {
        name,
        inviteCode: generateInviteCode(),
        adminId: session.user.id,
        seasonId: season.id,
      },
    })

    return NextResponse.json({
      id: league.id,
      name: league.name,
      inviteCode: league.inviteCode,
    }, { status: 201 })
  }

  // Check duplicate name for this season
  const existing = await prisma.league.findUnique({
    where: { name_seasonId: { name, seasonId: settings.currentSeasonId } },
  })
  if (existing) {
    return NextResponse.json(
      { error: "A league with this name already exists" },
      { status: 409 }
    )
  }

  const league = await prisma.league.create({
    data: {
      name,
      inviteCode: generateInviteCode(),
      adminId: session.user.id,
      seasonId: settings.currentSeasonId,
    },
  })

  return NextResponse.json({
    id: league.id,
    name: league.name,
    inviteCode: league.inviteCode,
  }, { status: 201 })
}
