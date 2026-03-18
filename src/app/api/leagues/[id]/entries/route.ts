import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { invalidateLeaderboardCache } from "@/lib/cache"

// GET /api/leagues/[id]/entries — get user's entries with inLeague status
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const league = await prisma.league.findUnique({
    where: { id },
    select: { id: true, seasonId: true },
  })
  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 })
  }

  // Verify user is a member
  const membership = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: id, userId: session.user.id } },
  })
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this league" }, { status: 403 })
  }

  // Get all user entries for the league's season
  const entries = await prisma.entry.findMany({
    where: { userId: session.user.id, seasonId: league.seasonId },
    select: {
      id: true,
      entryNumber: true,
      nickname: true,
      entryPicks: { select: { id: true } },
      leagueEntries: {
        where: { leagueId: id },
        select: { id: true },
      },
    },
    orderBy: { entryNumber: "asc" },
  })

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      entryNumber: e.entryNumber,
      nickname: e.nickname,
      pickCount: e.entryPicks.length,
      inLeague: e.leagueEntries.length > 0,
    })),
  })
}

// POST /api/leagues/[id]/entries — add or remove an entry from a league
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { entryId, action } = body

  if (!entryId || !["add", "remove"].includes(action)) {
    return NextResponse.json({ error: "entryId and action (add/remove) required" }, { status: 400 })
  }

  const league = await prisma.league.findUnique({
    where: { id },
    select: { id: true, seasonId: true },
  })
  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 })
  }

  // Check deadline
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  if (settings?.picksDeadline && new Date() > new Date(settings.picksDeadline)) {
    return NextResponse.json({ error: "Picks deadline has passed — league entries are locked" }, { status: 400 })
  }

  // Verify user is a member
  const membership = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: id, userId: session.user.id } },
  })
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this league" }, { status: 403 })
  }

  // Verify entry belongs to user and matches season
  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    select: { id: true, userId: true, seasonId: true },
  })
  if (!entry || entry.userId !== session.user.id) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 })
  }
  if (entry.seasonId !== league.seasonId) {
    return NextResponse.json({ error: "Entry does not belong to this league's season" }, { status: 400 })
  }

  if (action === "add") {
    await prisma.leagueEntry.create({
      data: { leagueId: id, entryId },
    }).catch((err) => {
      // Unique constraint violation = already linked
      if (err.code === "P2002") return
      throw err
    })
  } else {
    await prisma.leagueEntry.deleteMany({
      where: { leagueId: id, entryId },
    })
  }

  // Invalidate leaderboard cache
  invalidateLeaderboardCache(league.seasonId).catch((err) =>
    console.error("[league-entries] Cache invalidation failed:", err)
  )

  return NextResponse.json({ success: true })
}
