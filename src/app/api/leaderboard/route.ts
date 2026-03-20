import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { computeLeaderboardFromEntries, type EntryWithRelations } from "@/lib/scoring"
import { getCachedLeaderboard, setCachedLeaderboard } from "@/lib/cache"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

/**
 * GET /api/leaderboard — Serve leaderboard data
 *
 * CLAUDE.md spec: "Never query the database on a user page load for leaderboard data.
 * Serve from cache only. 50,000 users refreshing = zero database queries between game results."
 *
 * Cache-first pattern:
 * 1. Check cache for leaderboard data
 * 2. If cache hit → return immediately (zero DB queries)
 * 3. If cache miss → query DB, compute, store in cache, return
 *
 * Query params:
 *   ?dimension=global|country|state|conference|gender|private_league
 *   ?value=<dimension_value> (e.g. "USA", "SEC", league_id)
 */
export async function GET(req: NextRequest) {
  // Rate limit: 100 req/min per IP
  const rateLimitResponse = rateLimit(getClientIp(req))
  if (rateLimitResponse) return rateLimitResponse

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const dimension = req.nextUrl.searchParams.get("dimension") ?? "global"
  const dimensionValue = req.nextUrl.searchParams.get("value") ?? "all"

  const settings = await prisma.appSettings.findUnique({
    where: { id: "main" },
    select: { currentSeasonId: true, picksDeadline: true },
  })
  const seasonId = settings?.currentSeasonId

  if (!seasonId) {
    return NextResponse.json([], { headers: { "Cache-Control": "no-store" } })
  }

  // Gate: don't reveal picks while picks are still open
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { status: true },
  })
  const deadlinePassed = settings.picksDeadline ? new Date() >= settings.picksDeadline : false
  if (season?.status === "REGISTRATION" && !deadlinePassed) {
    return NextResponse.json([], { headers: { "Cache-Control": "no-store" } })
  }

  // ── 1. Check cache first ───────────────────────────────────────────────────
  const cached = await getCachedLeaderboard(seasonId, dimension, dimensionValue)
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        "Cache-Control": "no-store",
        "X-Cache": "HIT",
      },
    })
  }

  // ── 2. Cache miss — query DB and compute ───────────────────────────────────
  const entries = await prisma.entry.findMany({
    where: {
      seasonId,
      draftInProgress: false,
      entryPicks: { some: {} },
    },
    select: {
      id: true,
      userId: true,
      entryNumber: true,
      nickname: true,
      charityPreference: true,
      leagueEntries: { select: { leagueId: true } },
      score: true,
      maxPossibleScore: true,
      expectedScore: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          isPaid: true,
          username: true,
          country: true,
          state: true,
          gender: true,
          favoriteTeam: { select: { id: true, name: true, conference: true } },
        },
      },
      entryPicks: {
        include: {
          team: true,
          playInSlot: { include: { team1: true, team2: true, winner: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  }) as unknown as EntryWithRelations[]

  // Fetch ALL teams (not just picked ones) for proper bracket simulation in maxRank
  const allTeams = await prisma.team.findMany({
    where: { isPlayIn: false },
    select: { id: true, seed: true, region: true, wins: true, eliminated: true },
  })

  let leaderboard = computeLeaderboardFromEntries(entries, allTeams)

  // ── 2b. Compute rank change from last game ─────────────────────────────────
  // Find the 2 most recently completed games. Compare each entry's rank at the
  // latest game to their rank at the previous game to get rankChange.
  try {
    const recentGames = await prisma.tournamentGame.findMany({
      where: { isComplete: true, round: { gt: 0 } },
      orderBy: { startTime: "desc" },
      take: 2,
      select: { id: true },
    })

    if (recentGames.length >= 2) {
      // Get snapshots from the game BEFORE the latest one
      const previousGameId = recentGames[1].id
      const prevSnapshots = await prisma.scoreSnapshot.findMany({
        where: { gameId: previousGameId },
        select: { entryId: true, rank: true },
      })

      if (prevSnapshots.length > 0) {
        const prevRankMap = new Map(prevSnapshots.map(s => [s.entryId, s.rank]))
        leaderboard = leaderboard.map(entry => {
          const prevRank = prevRankMap.get(entry.entryId)
          if (prevRank != null) {
            return { ...entry, rankChange: prevRank - entry.rank }
          }
          return entry
        })
      }
    }
  } catch {
    // Non-critical — skip rankChange if snapshots unavailable
  }

  // ── 3. Apply dimension filter ──────────────────────────────────────────────
  if (dimension !== "global" && dimensionValue !== "all") {
    switch (dimension) {
      case "country":
        leaderboard = leaderboard.filter((e) => (e.country ?? "No Response") === dimensionValue)
        break
      case "state":
        leaderboard = leaderboard.filter((e) => (e.state ?? "No Response") === dimensionValue)
        break
      case "gender":
        leaderboard = leaderboard.filter((e) => (e.gender ?? "No Response") === dimensionValue)
        break
      case "conference":
        leaderboard = leaderboard.filter((e) => (e.conference ?? "No Response") === dimensionValue)
        break
      case "private_league":
        leaderboard = leaderboard.filter((e) => e.leagueIds?.includes(dimensionValue))
        break
    }

    // Re-rank after filtering
    leaderboard = leaderboard.map((entry, i) => ({
      ...entry,
      rank: i + 1,
      percentile: leaderboard.length > 1
        ? Math.round(((i + 1) / leaderboard.length) * 1000) / 10
        : 0,
    }))
  }

  // ── 4. Store in cache for next request ─────────────────────────────────────
  await setCachedLeaderboard(seasonId, leaderboard, dimension, dimensionValue)

  return NextResponse.json(leaderboard, {
    headers: {
      "Cache-Control": "no-store",
      "X-Cache": "MISS",
    },
  })
}
