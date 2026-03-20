import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { computePercentile, computeOptimal8 } from "@/lib/scoring"
import { type TeamBracketInfo } from "@/lib/bracket-ppr"
import { computeMaxPossibleScore } from "@/lib/max-possible-score"

/**
 * GET /api/leaderboard/historical?gameId=xxx
 *
 * Returns leaderboard state at a specific completed game.
 * Uses ScoreSnapshots for historical scores and reconstructs team states
 * from games completed up to that point.
 *
 * Also accepts ?gameIndex=-1 for pre-tournament state (all scores = 0).
 */
export async function GET(req: NextRequest) {
  const rateLimitResponse = rateLimit(getClientIp(req))
  if (rateLimitResponse) return rateLimitResponse

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const gameId = req.nextUrl.searchParams.get("gameId")
  const gameIndexStr = req.nextUrl.searchParams.get("gameIndex")

  const settings = await prisma.appSettings.findUnique({
    where: { id: "main" },
    select: { currentSeasonId: true },
  })
  const seasonId = settings?.currentSeasonId
  if (!seasonId) return NextResponse.json([])

  // Get all entries with their picks (same as live leaderboard)
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
      expectedScore: true,
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
      leagueEntries: { select: { leagueId: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  // Pre-tournament: all scores = 0
  if (gameIndexStr === "-1" || (!gameId && !gameIndexStr)) {
    return buildPreTournamentLeaderboard(entries)
  }

  if (!gameId) return NextResponse.json({ error: "gameId required" }, { status: 400 })

  // Get score snapshots at this game for all entries
  const snapshots = await prisma.scoreSnapshot.findMany({
    where: { gameId },
    select: { entryId: true, score: true, rank: true, percentile: true, maxRank: true, floorRank: true },
  })

  const snapshotMap = new Map(snapshots.map(s => [s.entryId, s]))

  // Get all games completed up to and including this one, to reconstruct team states
  const targetGame = await prisma.tournamentGame.findUnique({
    where: { id: gameId },
    select: { startTime: true },
  })
  if (!targetGame || !targetGame.startTime) return NextResponse.json({ error: "Game not found" }, { status: 404 })

  // Get all completed games up to this point
  const gamesUpToNow = await prisma.tournamentGame.findMany({
    where: {
      isComplete: true,
      startTime: { lte: targetGame.startTime },
    },
    select: { winnerId: true, team1Id: true, team2Id: true },
  })

  // Compute wins and eliminations at this point
  const teamWins = new Map<string, number>()
  const eliminatedTeams = new Set<string>()
  for (const g of gamesUpToNow) {
    if (g.winnerId) {
      teamWins.set(g.winnerId, (teamWins.get(g.winnerId) ?? 0) + 1)
      // The loser is the other team
      const loserId = g.team1Id === g.winnerId ? g.team2Id : g.team1Id
      if (loserId) eliminatedTeams.add(loserId)
    }
  }

  // Build leaderboard entries
  const leaderboard = entries.map(entry => {
    const snap = snapshotMap.get(entry.id)
    const score = snap?.score ?? 0

    // Resolve picks to team summaries with historical state
    const picks = entry.entryPicks.map(pick => {
      const team = pick.team ?? pick.playInSlot?.winner
      if (!team) return null
      const historicalWins = teamWins.get(team.id) ?? 0
      const historicalEliminated = eliminatedTeams.has(team.id)
      return {
        teamId: team.id,
        name: team.name,
        shortName: team.shortName,
        seed: team.seed,
        region: team.region,
        wins: historicalWins,
        eliminated: historicalEliminated,
        logoUrl: team.logoUrl,
        espnId: team.espnId ?? null,
        conference: team.conference ?? null,
        isPlayIn: false as const,
        playInSlotId: pick.playInSlotId,
      }
    }).filter(Boolean)

    const teamsRemaining = picks.filter(p => p && !p.eliminated).length

    // Compute PPR from historical state
    const teamInfoMap = new Map<string, TeamBracketInfo>()
    for (const p of picks) {
      if (p) {
        teamInfoMap.set(p.teamId, {
          seed: p.seed,
          region: p.region,
          wins: p.wins,
          eliminated: p.eliminated,
        })
      }
    }
    // Use computeMaxPossibleScore (unified algorithm) instead of PPR
    const pickTeamIds = picks.filter(Boolean).map(p => p!.teamId)
    const maxResult = pickTeamIds.length > 0
      ? computeMaxPossibleScore(pickTeamIds, teamInfoMap)
      : { maxPossibleScore: 0, breakdown: [] }

    const maxPossibleScore = maxResult.maxPossibleScore
    const ppr = maxPossibleScore - score
    const tps = maxPossibleScore
    const displayName = entry.user.name ?? entry.user.email

    return {
      entryId: entry.id,
      userId: entry.userId,
      rank: snap?.rank ?? 1,
      percentile: snap?.percentile ?? 0,
      maxRank: snap?.maxRank ?? null,
      floorRank: snap?.floorRank ?? null,
      name: entry.entryNumber > 1
        ? (entry.nickname
            ? `${entry.nickname} (${displayName} ${entry.entryNumber})`
            : `${displayName} ${entry.entryNumber}`)
        : displayName,
      username: entry.user.username,
      email: entry.user.email,
      isPaid: entry.user.isPaid,
      entryNumber: entry.entryNumber,
      nickname: entry.nickname,
      currentScore: score,
      ppr,
      tps,
      teamsRemaining,
      maxPossibleScore,
      expectedScore: entry.expectedScore,
      charity: entry.charityPreference,
      country: entry.user.country,
      state: entry.user.state,
      gender: entry.user.gender,
      favoriteTeam: entry.user.favoriteTeam?.name ?? null,
      conference: entry.user.favoriteTeam?.conference ?? null,
      leagueIds: entry.leagueEntries.map(le => le.leagueId),
      picks,
    }
  })

  // Sort by score descending, re-rank with tie handling
  leaderboard.sort((a, b) => b.currentScore - a.currentScore || b.ppr - a.ppr)
  let currentRank = 1
  for (let i = 0; i < leaderboard.length; i++) {
    if (i > 0 && leaderboard[i].currentScore < leaderboard[i - 1].currentScore) {
      currentRank = i + 1
    }
    leaderboard[i].rank = currentRank
    leaderboard[i].percentile = computePercentile(currentRank, leaderboard.length)
  }

  // Compute rank change vs the previous game
  try {
    // Find the game that completed just before this one
    const prevGame = await prisma.tournamentGame.findFirst({
      where: {
        isComplete: true,
        round: { gt: 0 },
        startTime: { lt: targetGame.startTime },
      },
      orderBy: { startTime: "desc" },
      select: { id: true },
    })

    if (prevGame) {
      const prevSnapshots = await prisma.scoreSnapshot.findMany({
        where: { gameId: prevGame.id },
        select: { entryId: true, rank: true },
      })
      if (prevSnapshots.length > 0) {
        const prevRankMap = new Map(prevSnapshots.map(s => [s.entryId, s.rank]))
        for (const entry of leaderboard) {
          const prevRank = prevRankMap.get(entry.entryId)
          if (prevRank != null) {
            (entry as any).rankChange = prevRank - entry.rank
          }
        }
      }
    }
  } catch {
    // Non-critical
  }

  return NextResponse.json(leaderboard, {
    headers: { "Cache-Control": "no-store" },
  })
}

function buildPreTournamentLeaderboard(entries: any[]) {
  // All entries at score 0, tied at rank 1
  const leaderboard = entries.map(entry => {
    const displayName = entry.user.name ?? entry.user.email
    const picks = entry.entryPicks.map((pick: any) => {
      const team = pick.team ?? pick.playInSlot?.winner
      if (!team) return null
      return {
        teamId: team.id,
        name: team.name,
        shortName: team.shortName,
        seed: team.seed,
        region: team.region,
        wins: 0,
        eliminated: false,
        logoUrl: team.logoUrl,
        espnId: team.espnId ?? null,
        conference: team.conference ?? null,
        isPlayIn: false,
        playInSlotId: pick.playInSlotId,
      }
    }).filter(Boolean)

    const teamInfoMap = new Map<string, TeamBracketInfo>()
    for (const p of picks) {
      if (p) {
        teamInfoMap.set(p.teamId, { seed: p.seed, region: p.region, wins: 0, eliminated: false })
      }
    }
    // Use computeMaxPossibleScore (unified algorithm) for pre-tournament
    const pickTeamIds = picks.filter(Boolean).map((p: any) => p.teamId)
    const maxResult = pickTeamIds.length > 0
      ? computeMaxPossibleScore(pickTeamIds, teamInfoMap)
      : { maxPossibleScore: 0, breakdown: [] }

    const maxPossibleScore = maxResult.maxPossibleScore
    return {
      entryId: entry.id,
      userId: entry.userId,
      rank: 1,
      percentile: 0,
      maxRank: null,
      floorRank: null,
      name: entry.entryNumber > 1
        ? (entry.nickname
            ? `${entry.nickname} (${displayName} ${entry.entryNumber})`
            : `${displayName} ${entry.entryNumber}`)
        : displayName,
      username: entry.user.username,
      email: entry.user.email,
      isPaid: entry.user.isPaid,
      entryNumber: entry.entryNumber,
      nickname: entry.nickname,
      currentScore: 0,
      ppr: maxPossibleScore,
      tps: maxPossibleScore,
      teamsRemaining: picks.length,
      maxPossibleScore,
      expectedScore: entry.expectedScore,
      charity: entry.charityPreference,
      country: entry.user.country,
      state: entry.user.state,
      gender: entry.user.gender,
      favoriteTeam: entry.user.favoriteTeam?.name ?? null,
      conference: entry.user.favoriteTeam?.conference ?? null,
      leagueIds: entry.leagueEntries.map((le: any) => le.leagueId),
      picks,
    }
  })

  // Sort by maxPossibleScore descending for display order
  leaderboard.sort((a: any, b: any) => b.maxPossibleScore - a.maxPossibleScore || a.name.localeCompare(b.name))

  return NextResponse.json(leaderboard, {
    headers: { "Cache-Control": "no-store" },
  })
}
