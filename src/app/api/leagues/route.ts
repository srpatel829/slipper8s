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

  // Find leagues where the user is admin OR is a LeagueMember
  const leagues = await prisma.league.findMany({
    where: {
      OR: [
        { adminId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      admin: { select: { id: true, name: true, username: true } },
      _count: { select: { members: true, leagueEntries: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // Self-heal: if admin has no LeagueMember row for any league they own, create it
  for (const l of leagues) {
    if (l.adminId === session.user.id && l._count.members === 0) {
      try {
        await prisma.leagueMember.create({
          data: { leagueId: l.id, userId: session.user.id },
        })
        l._count.members = 1
      } catch {
        // Already exists (unique constraint) — ignore
      }
    }
  }

  return NextResponse.json(
    leagues.map((l) => ({
      id: l.id,
      name: l.name,
      inviteCode: l.inviteCode,
      description: l.description,
      maxEntries: l.maxEntries,
      trackPayments: l.trackPayments,
      isAdmin: l.adminId === session.user.id,
      adminName: l.admin.username ?? l.admin.name ?? "Unknown",
      memberCount: l._count.members,
      entryCount: l._count.leagueEntries,
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

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
  const name = (body.name as string)?.trim()
  const description = (body.description as string)?.trim() || null
  const maxEntries = body.maxEntries != null ? Number(body.maxEntries) : null
  const trackPayments = Boolean(body.trackPayments)

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

  try {
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

    // Create league + auto-join admin in a transaction
    const league = await prisma.$transaction(async (tx) => {
      const newLeague = await tx.league.create({
        data: {
          name,
          description,
          maxEntries,
          trackPayments,
          inviteCode: generateInviteCode(),
          adminId: session.user.id,
          seasonId: season.id,
        },
      })

      await tx.leagueMember.create({
        data: {
          leagueId: newLeague.id,
          userId: session.user.id,
        },
      })

      return newLeague
    })

    return NextResponse.json({
      id: league.id,
      name: league.name,
      inviteCode: league.inviteCode,
    })
  }

  const currentSeasonId = settings.currentSeasonId!

  // Check duplicate name for this season
  const existing = await prisma.league.findUnique({
    where: { name_seasonId: { name, seasonId: currentSeasonId } },
  })
  if (existing) {
    return NextResponse.json(
      { error: "A league with this name already exists" },
      { status: 409 }
    )
  }

  // Create league + auto-join admin in a transaction so both succeed or neither does
  const league = await prisma.$transaction(async (tx) => {
    const newLeague = await tx.league.create({
      data: {
        name,
        description,
        maxEntries,
        trackPayments,
        inviteCode: generateInviteCode(),
        adminId: session.user.id,
        seasonId: currentSeasonId,
      },
    })

    await tx.leagueMember.create({
      data: {
        leagueId: newLeague.id,
        userId: session.user.id,
      },
    })

    return newLeague
  })

  return NextResponse.json({
    id: league.id,
    name: league.name,
    inviteCode: league.inviteCode,
  })
  } catch (err) {
    console.error("[leagues] POST error:", err)
    return NextResponse.json(
      { error: "Failed to create league" },
      { status: 500 }
    )
  }
}
