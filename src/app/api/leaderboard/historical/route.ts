import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { computePercentile, computeOptimal8 } from "@/lib/scoring"
import { type TeamBracketInfo } from "@/lib/bracket-ppr"
import { computeMaxPossibleScore, computeCollisionAwareRanks } from "@/lib/max-possible-score"
import { calculateEntryExpectedScore, getSBDataForCheckpoint } from "@/lib/silver-bulletin-2026"

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

  // Get score snapshots at this game for all entries (including stored expectedScore/expectedRank)
  const snapshots = await prisma.scoreSnapshot.findMany({
    where: { gameId },
    select: { entryId: true, score: true, rank: true, percentile: true, maxRank: true, floorRank: true, expectedScore: true, expectedRank: true },
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

  // ── Determine checkpoint for this game (for SB version selection) ──
  // We need to know which checkpoint this game belongs to for correct SB data
  const allCompletedGames = await prisma.tournamentGame.findMany({
    where: { isComplete: true, round: { gte: 1 } },
    select: { id: true, round: true, startTime: true },
    orderBy: { startTime: "asc" },
  })

  const ROUND_TO_CP: Record<number, [number, number] | [number]> = {
    1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8], 5: [9], 6: [10],
  }

  const dateOfStart = (g: { startTime: Date | null }) => {
    if (!g.startTime) return "unknown"
    return g.startTime.toLocaleDateString("en-US", { timeZone: "America/New_York" })
  }

  // Build gameId → checkpoint index
  const gameToCheckpoint = new Map<string, number>()
  const gamesByRound = new Map<number, typeof allCompletedGames>()
  for (const g of allCompletedGames) {
    if (!gamesByRound.has(g.round)) gamesByRound.set(g.round, [])
    gamesByRound.get(g.round)!.push(g)
  }
  for (const [round, cpIndices] of Object.entries(ROUND_TO_CP)) {
    const rGames = gamesByRound.get(parseInt(round))
    if (!rGames || rGames.length === 0) continue
    if (cpIndices.length === 2) {
      const uniqueDates = [...new Set(rGames.map(dateOfStart))]
      uniqueDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      for (const g of rGames) {
        gameToCheckpoint.set(g.id, dateOfStart(g) === uniqueDates[0] ? cpIndices[0] : cpIndices[1])
      }
    } else {
      for (const g of rGames) gameToCheckpoint.set(g.id, cpIndices[0])
    }
  }

  const gameCheckpoint = gameToCheckpoint.get(gameId) ?? 0
  const historicalSBData = getSBDataForCheckpoint(gameCheckpoint)

  // Build historical team states map for expected score computation
  const historicalTeamStates = new Map<string, { wins: number; eliminated: boolean }>()
  for (const [tid, w] of teamWins) {
    historicalTeamStates.set(tid, { wins: w, eliminated: eliminatedTeams.has(tid) })
  }
  // Also add teams that are eliminated but have 0 wins
  for (const tid of eliminatedTeams) {
    if (!historicalTeamStates.has(tid)) {
      historicalTeamStates.set(tid, { wins: 0, eliminated: true })
    }
  }

  // Build a global teamInfoMap for collision-aware ranks
  const globalTeamInfoMap = new Map<string, TeamBracketInfo>()

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
        const info = {
          seed: p.seed,
          region: p.region,
          wins: p.wins,
          eliminated: p.eliminated,
        }
        teamInfoMap.set(p.teamId, info)
        globalTeamInfoMap.set(p.teamId, info)
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

    // Use stored expectedScore from snapshot if available, else compute on-the-fly
    const historicalExpectedScore = snap?.expectedScore != null
      ? snap.expectedScore
      : calculateEntryExpectedScore(pickTeamIds, historicalTeamStates, false, historicalSBData)

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
      expectedScore: historicalExpectedScore ?? entry.expectedScore,
      charity: entry.charityPreference,
      country: entry.user.country,
      state: entry.user.state,
      gender: entry.user.gender,
      favoriteTeam: entry.user.favoriteTeam?.name ?? null,
      conference: entry.user.favoriteTeam?.conference ?? null,
      leagueIds: entry.leagueEntries.map(le => le.leagueId),
      picks,
      pickTeamIds,
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

  // Compute collision-aware maxRank/floorRank on-the-fly when snapshot values are null
  const needsCollisionRanks = leaderboard.some(e => e.maxRank == null || e.floorRank == null)
  if (needsCollisionRanks && leaderboard.length > 0) {
    const collisionEntries = leaderboard.map(e => ({
      entryId: e.entryId,
      pickTeamIds: (e as any).pickTeamIds as string[],
      currentScore: e.currentScore,
      maxPossibleScore: e.maxPossibleScore ?? 0,
      teamsRemaining: e.teamsRemaining,
      currentRank: e.rank,
    }))
    const collisionRanks = computeCollisionAwareRanks(collisionEntries, globalTeamInfoMap)
    for (const e of leaderboard) {
      if (e.maxRank == null || e.floorRank == null) {
        const computed = collisionRanks.get(e.entryId)
        if (computed) {
          e.maxRank = e.maxRank ?? computed.maxRank
          e.floorRank = e.floorRank ?? computed.floorRank
        }
      }
    }
  }

  // Use stored expectedRank from snapshots when available, else compute on-the-fly
  const hasStoredExpectedRanks = leaderboard.some(e => {
    const snap = snapshotMap.get(e.entryId)
    return snap?.expectedRank != null
  })

  if (hasStoredExpectedRanks) {
    for (const e of leaderboard) {
      const snap = snapshotMap.get(e.entryId)
      ;(e as any).expectedRank = snap?.expectedRank ?? null
    }
  } else {
    const sortedByExpected = [...leaderboard].sort((a, b) =>
      (b.expectedScore ?? 0) - (a.expectedScore ?? 0)
    )
    let expectedRank = 1
    for (let i = 0; i < sortedByExpected.length; i++) {
      if (i > 0 && (sortedByExpected[i].expectedScore ?? 0) < (sortedByExpected[i - 1].expectedScore ?? 0)) {
        expectedRank = i + 1
      }
      (sortedByExpected[i] as any).expectedRank = expectedRank
    }
  }

  // Clean up internal fields before returning
  for (const e of leaderboard) {
    delete (e as any).pickTeamIds
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
  const preTournamentSBData = getSBDataForCheckpoint(0)

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

    // Compute pre-tournament expected score using Version 0 SB data
    const preTournExpectedScore = calculateEntryExpectedScore(
      pickTeamIds,
      new Map(),
      true,
      preTournamentSBData,
    )

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
      expectedScore: preTournExpectedScore ?? entry.expectedScore,
      expectedRank: null,
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

  // Compute expected rank for pre-tournament
  const sortedByExpected = [...leaderboard].sort((a, b) =>
    (b.expectedScore ?? 0) - (a.expectedScore ?? 0)
  )
  let expectedRank = 1
  for (let i = 0; i < sortedByExpected.length; i++) {
    if (i > 0 && (sortedByExpected[i].expectedScore ?? 0) < (sortedByExpected[i - 1].expectedScore ?? 0)) {
      expectedRank = i + 1
    }
    (sortedByExpected[i] as any).expectedRank = expectedRank
  }

  return NextResponse.json(leaderboard, {
    headers: { "Cache-Control": "no-store" },
  })
}
