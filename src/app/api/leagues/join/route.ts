import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

// POST /api/leagues/join — join a league by invite code
// Many-to-many: adds all user's entries for that season into the league via LeagueEntry
export async function POST(request: NextRequest) {
  const rateLimitResponse = rateLimit(getClientIp(request))
  if (rateLimitResponse) return rateLimitResponse

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const code = (body.code as string)?.trim().toUpperCase()

  if (!code) {
    return NextResponse.json({ error: "Invite code required" }, { status: 400 })
  }

  const league = await prisma.league.findUnique({
    where: { inviteCode: code },
    include: {
      _count: { select: { leagueEntries: true } },
    },
  })

  if (!league) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 })
  }

  // Find all of user's entries for this season
  const userEntries = await prisma.entry.findMany({
    where: { userId: session.user.id, seasonId: league.seasonId },
    select: { id: true },
  })

  if (userEntries.length === 0) {
    return NextResponse.json({ error: "You don't have any entries for this season yet" }, { status: 400 })
  }

  // Find which entries are already in this league
  const existingLeagueEntries = await prisma.leagueEntry.findMany({
    where: {
      leagueId: league.id,
      entryId: { in: userEntries.map((e) => e.id) },
    },
    select: { entryId: true },
  })

  const alreadyInLeague = new Set(existingLeagueEntries.map((le) => le.entryId))
  const newEntryIds = userEntries.filter((e) => !alreadyInLeague.has(e.id)).map((e) => e.id)

  if (newEntryIds.length === 0) {
    return NextResponse.json({ error: "All your entries are already in this league" }, { status: 409 })
  }

  // Check max entries cap
  if (league.maxEntries != null) {
    const currentCount = league._count.leagueEntries
    if (currentCount + newEntryIds.length > league.maxEntries) {
      return NextResponse.json(
        { error: `This league is full (${currentCount}/${league.maxEntries} entries)` },
        { status: 400 }
      )
    }
  }

  // Create LeagueEntry rows for all eligible entries
  await prisma.leagueEntry.createMany({
    data: newEntryIds.map((entryId) => ({
      leagueId: league.id,
      entryId,
    })),
  })

  return NextResponse.json({
    id: league.id,
    name: league.name,
    entriesAdded: newEntryIds.length,
    memberCount: league._count.leagueEntries + newEntryIds.length,
  })
}
