import { prisma } from "@/lib/prisma"
import { computePercentile, resolvePickTeam } from "@/lib/scoring"
import { computeCollisionAwareRanks, computeMaxPossibleScore } from "@/lib/max-possible-score"
import type { TeamBracketInfo } from "@/lib/bracket-ppr"
import { calculateEntryExpectedScore, getSBDataForCheckpoint } from "@/lib/silver-bulletin-2026"

/**
 * Score Snapshot System
 *
 * After each game completes, we save a snapshot of every entry's score, rank,
 * and percentile. This powers:
 * - Timeline/chart feature (score history over time)
 * - Score history on player profiles
 * - "You moved up/down X spots" notifications
 *
 * CLAUDE.md spec order (steps 7-9 of recalculation pipeline):
 * 7. Update rankings AND percentiles for all 6 dimensions
 * 8. Save score snapshots including rank and percentile (BEFORE invalidating cache)
 * 9. Invalidate leaderboard cache
 */

/**
 * Save score snapshots for all entries in the current season.
 * Called after a game completes and entry scores have been recalculated.
 *
 * @param gameId - The TournamentGame.id that triggered this snapshot
 * @returns Number of snapshots saved
 */
export async function saveScoreSnapshots(gameId: string): Promise<{ saved: number }> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  const seasonId = settings?.currentSeasonId
  if (!seasonId) return { saved: 0 }

  // Determine checkpoint for this game (for SB version selection)
  const game = await prisma.tournamentGame.findUnique({
    where: { id: gameId },
    select: { round: true, startTime: true },
  })
  const checkpoint = game ? await getCheckpointForGame(gameId, game.round, game.startTime) : 0
  const sbData = getSBDataForCheckpoint(checkpoint)

  // Get current team states for expected score computation
  const allTeams = await prisma.team.findMany({
    where: { isPlayIn: false },
    select: { id: true, wins: true, eliminated: true },
  })
  const teamStates = new Map<string, { wins: number; eliminated: boolean }>()
  for (const t of allTeams) {
    teamStates.set(t.id, { wins: t.wins, eliminated: t.eliminated })
  }

  // Get all entries with their current scores AND picks for collision-aware ranking
  const entries = await prisma.entry.findMany({
    where: {
      seasonId,
      draftInProgress: false,
      entryPicks: { some: {} },
    },
    select: {
      id: true,
      score: true,
      maxPossibleScore: true,
      entryPicks: {
        include: {
          team: true,
          playInSlot: { include: { team1: true, team2: true, winner: true } },
        },
      },
    },
    orderBy: { score: "desc" },
  })

  if (entries.length === 0) return { saved: 0 }

  // Rank entries by score (descending)
  // Handle ties: entries with the same score share the same rank
  const total = entries.length

  // Build ranked list with current ranks
  const ranked: Array<{ entry: typeof entries[0]; rank: number }> = []
  let currentRank = 1
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].score < entries[i - 1].score) {
      currentRank = i + 1
    }
    ranked.push({ entry: entries[i], rank: currentRank })
  }

  // ── Build teamInfoMap and entry pick data for collision-aware ranking ──
  // IMPORTANT: include ALL teams so simulateBracketWins can simulate chalk for the full bracket
  const teamInfoMap = new Map<string, TeamBracketInfo>()

  const bracketTeams = await prisma.team.findMany({
    where: { isPlayIn: false },
    select: { id: true, seed: true, region: true, wins: true, eliminated: true },
  })
  for (const t of bracketTeams) {
    teamInfoMap.set(t.id, { seed: t.seed, region: t.region, wins: t.wins, eliminated: t.eliminated })
  }

  const entryPickMap = new Map<string, string[]>()
  const teamsRemainingMap = new Map<string, number>()

  for (const { entry } of ranked) {
    const pickTeamIds: string[] = []
    let teamsRemaining = 0
    for (const pick of entry.entryPicks) {
      const team = resolvePickTeam(pick)
      if (!team) continue
      pickTeamIds.push(team.id)
      if (!team.eliminated) teamsRemaining++
      if (!teamInfoMap.has(team.id)) {
        teamInfoMap.set(team.id, {
          seed: team.seed,
          region: team.region,
          wins: team.wins,
          eliminated: team.eliminated,
        })
      }
    }
    entryPickMap.set(entry.id, pickTeamIds)
    teamsRemainingMap.set(entry.id, teamsRemaining)
  }

  // Compute collision-aware maxRank and floorRank
  const collisionEntries = ranked.map(r => ({
    entryId: r.entry.id,
    pickTeamIds: entryPickMap.get(r.entry.id) ?? [],
    currentScore: r.entry.score,
    maxPossibleScore: r.entry.maxPossibleScore,
    teamsRemaining: teamsRemainingMap.get(r.entry.id) ?? 0,
    currentRank: r.rank,
  }))

  const rankResults = computeCollisionAwareRanks(collisionEntries, teamInfoMap)

  // Compute expected scores for all entries
  const expectedScores = new Map<string, number | null>()
  for (const { entry } of ranked) {
    const pickTeamIds = entryPickMap.get(entry.id) ?? []
    const es = calculateEntryExpectedScore(pickTeamIds, teamStates, false, sbData)
    expectedScores.set(entry.id, es)
  }

  // Compute expected ranks (ranking by expectedScore descending)
  const sortedByExpected = [...ranked].sort((a, b) =>
    (expectedScores.get(b.entry.id) ?? 0) - (expectedScores.get(a.entry.id) ?? 0)
  )
  const expectedRanks = new Map<string, number>()
  let expRank = 1
  for (let i = 0; i < sortedByExpected.length; i++) {
    if (i > 0 && (expectedScores.get(sortedByExpected[i].entry.id) ?? 0) < (expectedScores.get(sortedByExpected[i - 1].entry.id) ?? 0)) {
      expRank = i + 1
    }
    expectedRanks.set(sortedByExpected[i].entry.id, expRank)
  }

  // Build snapshots with all computed values
  const snapshots: Array<{
    entryId: string
    gameId: string
    score: number
    rank: number
    percentile: number
    maxRank: number | null
    floorRank: number | null
    expectedScore: number | null
    expectedRank: number | null
  }> = []

  for (const { entry, rank } of ranked) {
    const ranks = rankResults.get(entry.id)
    snapshots.push({
      entryId: entry.id,
      gameId,
      score: entry.score,
      rank,
      percentile: computePercentile(rank, total),
      maxRank: ranks?.maxRank ?? null,
      floorRank: ranks?.floorRank ?? null,
      expectedScore: expectedScores.get(entry.id) ?? null,
      expectedRank: expectedRanks.get(entry.id) ?? null,
    })
  }

  // Batch insert in chunks of 100
  let saved = 0
  for (let i = 0; i < snapshots.length; i += 100) {
    const chunk = snapshots.slice(i, i + 100)
    await prisma.scoreSnapshot.createMany({ data: chunk })
    saved += chunk.length
  }

  return { saved }
}

/**
 * Checkpoint index mapping (0-10):
 * 0 = Pre-Tournament, 1 = R64 D1, 2 = R64 D2, 3 = R32 D1, 4 = R32 D2,
 * 5 = S16 D1, 6 = S16 D2, 7 = E8 D1, 8 = E8 D2, 9 = F4, 10 = Championship
 *
 * Rounds 1-4 split into Day 1/Day 2 by ESPN startTime.
 * Rounds 5-6 (F4, Championship) have a single checkpoint each.
 * Round 0 (First Four/play-in) does NOT create a session checkpoint.
 */

interface CheckpointDef {
  index: number
  label: string
}

/** Maps "round_dayIndex" → checkpoint definition. dayIndex 0 = first half, 1 = second half. */
const CHECKPOINT_MAP: Record<string, CheckpointDef> = {
  "1_0": { index: 1, label: "Round of 64 Day 1" },
  "1_1": { index: 2, label: "Round of 64 Day 2" },
  "2_0": { index: 3, label: "Round of 32 Day 1" },
  "2_1": { index: 4, label: "Round of 32 Day 2" },
  "3_0": { index: 5, label: "Sweet 16 Day 1" },
  "3_1": { index: 6, label: "Sweet 16 Day 2" },
  "4_0": { index: 7, label: "Elite 8 Day 1" },
  "4_1": { index: 8, label: "Elite 8 Day 2" },
  "5_0": { index: 9, label: "Final Four" },
  "6_0": { index: 10, label: "National Championship" },
}

/**
 * Create the Pre-Tournament checkpoint (index 0).
 * Baseline before any R64 games — all entries at score 0, all teams alive.
 * Called once when the season flips from LOCKED to ACTIVE.
 */
export async function checkAndCreatePreTournamentCheckpoint(seasonId: string): Promise<void> {
  const checkpoint = await prisma.checkpoint.upsert({
    where: { seasonId_gameIndex: { seasonId, gameIndex: 0 } },
    create: {
      seasonId,
      gameIndex: 0,
      roundLabel: "Pre-Tournament",
      isSession: true,
    },
    update: {},
  })

  await createDimensionSnapshots(checkpoint.id, seasonId)
}

/**
 * Check if a completed game triggers a session checkpoint.
 *
 * For rounds 1-4: splits games into Day 1/Day 2 by ESPN startTime. When all
 * games in a day-half complete, creates that day's checkpoint (index 1-8).
 * For rounds 5-6: creates checkpoint when all games in round complete (index 9-10).
 * Round 0 (play-in): no session checkpoint.
 *
 * @param gameId - The TournamentGame.id that just completed
 */
export async function checkAndCreateCheckpoint(gameId: string): Promise<{
  checkpointCreated: boolean
  checkpointId?: string
}> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  const seasonId = settings?.currentSeasonId
  if (!seasonId) return { checkpointCreated: false }

  const game = await prisma.tournamentGame.findUnique({
    where: { id: gameId },
    select: { id: true, round: true, startTime: true },
  })
  if (!game) return { checkpointCreated: false }

  const round = game.round

  // Play-in games (round 0) don't create session checkpoints
  if (round === 0) return { checkpointCreated: false }

  // Get all games in this round ordered by ESPN startTime
  const roundGames = await prisma.tournamentGame.findMany({
    where: { round },
    select: { id: true, isComplete: true, startTime: true },
    orderBy: { startTime: "asc" },
  })

  if (round >= 1 && round <= 4) {
    // Rounds 1-4: split into Day 1 / Day 2 by start time date (ET timezone)
    // We use startTime (not completion time) so a 10:30pm ET game that finishes
    // past midnight still counts as the day it started.
    const dateOfStart = (g: { startTime: Date | null }) => {
      if (!g.startTime) return "unknown"
      return g.startTime.toLocaleDateString("en-US", { timeZone: "America/New_York" })
    }
    const uniqueDates = [...new Set(roundGames.map(dateOfStart))]
    // Sort dates chronologically
    uniqueDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

    const dayHalves: Array<{ dayIndex: number; games: typeof roundGames }> = uniqueDates.length >= 2
      ? [
          { dayIndex: 0, games: roundGames.filter(g => dateOfStart(g) === uniqueDates[0]) },
          { dayIndex: 1, games: roundGames.filter(g => dateOfStart(g) !== uniqueDates[0]) },
        ]
      : [
          // All games on the same date — treat as Day 1 only
          { dayIndex: 0, games: roundGames },
        ]

    for (const { dayIndex, games: dayGames } of dayHalves) {
      // Only check the half this game belongs to
      if (!dayGames.some(g => g.id === game.id)) continue

      // All games in this day-half must be complete
      if (!dayGames.every(g => g.isComplete)) continue

      const cpDef = CHECKPOINT_MAP[`${round}_${dayIndex}`]
      if (!cpDef) continue

      const checkpoint = await prisma.checkpoint.upsert({
        where: { seasonId_gameIndex: { seasonId, gameIndex: cpDef.index } },
        create: { seasonId, gameIndex: cpDef.index, roundLabel: cpDef.label, isSession: true },
        update: { roundLabel: cpDef.label, isSession: true },
      })

      await createDimensionSnapshots(checkpoint.id, seasonId)
      return { checkpointCreated: true, checkpointId: checkpoint.id }
    }

    return { checkpointCreated: false }

  } else {
    // Rounds 5-6 (F4, Championship): single checkpoint per round
    if (!roundGames.every(g => g.isComplete)) return { checkpointCreated: false }

    const cpDef = CHECKPOINT_MAP[`${round}_0`]
    if (!cpDef) return { checkpointCreated: false }

    const checkpoint = await prisma.checkpoint.upsert({
      where: { seasonId_gameIndex: { seasonId, gameIndex: cpDef.index } },
      create: { seasonId, gameIndex: cpDef.index, roundLabel: cpDef.label, isSession: true },
      update: { roundLabel: cpDef.label, isSession: true },
    })

    await createDimensionSnapshots(checkpoint.id, seasonId)
    return { checkpointCreated: true, checkpointId: checkpoint.id }
  }
}

/**
 * Create CheckpointDimensionSnapshot records for all dimensions.
 * Captures the leader, median, and entry count for each dimension at this point in time.
 */
export async function createDimensionSnapshots(checkpointId: string, seasonId: string): Promise<void> {
  // Get all entries with their scores and user profile data
  const entries = await prisma.entry.findMany({
    where: {
      seasonId,
      draftInProgress: false,
      entryPicks: { some: {} },
    },
    select: {
      id: true,
      score: true,
      leagueEntries: { select: { leagueId: true } },
      user: {
        select: {
          country: true,
          state: true,
          gender: true,
          favoriteTeam: { select: { conference: true } },
        },
      },
    },
    orderBy: { score: "desc" },
  })

  if (entries.length === 0) return

  // Helper to find leader and median from a sorted list of entries
  function findLeaderAndMedian(sortedEntries: typeof entries) {
    if (sortedEntries.length === 0) return { leaderId: null, medianId: null }
    const leaderId = sortedEntries[0].id
    const medianIdx = Math.floor(sortedEntries.length / 2)
    const medianId = sortedEntries[medianIdx].id
    return { leaderId, medianId }
  }

  const dimensionData: Array<{
    checkpointId: string
    dimensionType: string
    dimensionValue: string
    leaderEntryId: string | null
    medianEntryId: string | null
    totalEntries: number
  }> = []

  // 1. Global dimension
  const { leaderId: globalLeader, medianId: globalMedian } = findLeaderAndMedian(entries)
  dimensionData.push({
    checkpointId,
    dimensionType: "global",
    dimensionValue: "global",
    leaderEntryId: globalLeader,
    medianEntryId: globalMedian,
    totalEntries: entries.length,
  })

  // 2. Country dimension
  const byCountry = new Map<string, typeof entries>()
  for (const e of entries) {
    const country = e.user.country ?? "No Response"
    if (!byCountry.has(country)) byCountry.set(country, [])
    byCountry.get(country)!.push(e)
  }
  for (const [country, countryEntries] of byCountry) {
    const { leaderId, medianId } = findLeaderAndMedian(countryEntries)
    dimensionData.push({
      checkpointId,
      dimensionType: "country",
      dimensionValue: country,
      leaderEntryId: leaderId,
      medianEntryId: medianId,
      totalEntries: countryEntries.length,
    })
  }

  // 3. State dimension (USA only)
  const byState = new Map<string, typeof entries>()
  for (const e of entries) {
    if (e.user.country !== "USA" && e.user.country !== "United States") continue
    const state = e.user.state ?? "No Response"
    if (!byState.has(state)) byState.set(state, [])
    byState.get(state)!.push(e)
  }
  for (const [state, stateEntries] of byState) {
    const { leaderId, medianId } = findLeaderAndMedian(stateEntries)
    dimensionData.push({
      checkpointId,
      dimensionType: "state",
      dimensionValue: state,
      leaderEntryId: leaderId,
      medianEntryId: medianId,
      totalEntries: stateEntries.length,
    })
  }

  // 4. Gender dimension
  const byGender = new Map<string, typeof entries>()
  for (const e of entries) {
    const gender = e.user.gender ?? "No Response"
    if (!byGender.has(gender)) byGender.set(gender, [])
    byGender.get(gender)!.push(e)
  }
  for (const [gender, genderEntries] of byGender) {
    const { leaderId, medianId } = findLeaderAndMedian(genderEntries)
    dimensionData.push({
      checkpointId,
      dimensionType: "gender",
      dimensionValue: gender,
      leaderEntryId: leaderId,
      medianEntryId: medianId,
      totalEntries: genderEntries.length,
    })
  }

  // 5. Conference dimension (from favorite team)
  const byConference = new Map<string, typeof entries>()
  for (const e of entries) {
    const conference = e.user.favoriteTeam?.conference ?? "No Response"
    if (!byConference.has(conference)) byConference.set(conference, [])
    byConference.get(conference)!.push(e)
  }
  for (const [conference, confEntries] of byConference) {
    const { leaderId, medianId } = findLeaderAndMedian(confEntries)
    dimensionData.push({
      checkpointId,
      dimensionType: "conference",
      dimensionValue: conference,
      leaderEntryId: leaderId,
      medianEntryId: medianId,
      totalEntries: confEntries.length,
    })
  }

  // 6. Private league dimension (many-to-many via leagueEntries)
  const byLeague = new Map<string, typeof entries>()
  for (const e of entries) {
    for (const le of (e.leagueEntries ?? [])) {
      if (!byLeague.has(le.leagueId)) byLeague.set(le.leagueId, [])
      byLeague.get(le.leagueId)!.push(e)
    }
  }
  for (const [leagueId, leagueEntries] of byLeague) {
    const { leaderId, medianId } = findLeaderAndMedian(leagueEntries)
    dimensionData.push({
      checkpointId,
      dimensionType: "private_league",
      dimensionValue: leagueId,
      leaderEntryId: leaderId,
      medianEntryId: medianId,
      totalEntries: leagueEntries.length,
    })
  }

  // Batch upsert all dimensions
  for (const dim of dimensionData) {
    await prisma.checkpointDimensionSnapshot.upsert({
      where: {
        checkpointId_dimensionType_dimensionValue: {
          checkpointId: dim.checkpointId,
          dimensionType: dim.dimensionType,
          dimensionValue: dim.dimensionValue,
        },
      },
      create: dim,
      update: {
        leaderEntryId: dim.leaderEntryId,
        medianEntryId: dim.medianEntryId,
        totalEntries: dim.totalEntries,
      },
    })
  }
}

/**
 * Determine which checkpoint a game belongs to (for SB version selection).
 * Rounds 1-4 split into Day 1/Day 2 by ESPN startTime date (ET timezone).
 * Rounds 5-6 have single checkpoints.
 */
async function getCheckpointForGame(
  gameId: string,
  round: number,
  startTime: Date | null,
): Promise<number> {
  if (round === 0 || !startTime) return 0

  const ROUND_TO_CP: Record<number, [number, number] | [number]> = {
    1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8], 5: [9], 6: [10],
  }

  const cpIndices = ROUND_TO_CP[round]
  if (!cpIndices) return 0

  // Single checkpoint rounds
  if (cpIndices.length === 1) return cpIndices[0]

  // Two-day rounds: determine if this game is Day 1 or Day 2
  const roundGames = await prisma.tournamentGame.findMany({
    where: { round },
    select: { id: true, startTime: true },
    orderBy: { startTime: "asc" },
  })

  const dateOfStart = (g: { startTime: Date | null }) => {
    if (!g.startTime) return "unknown"
    return g.startTime.toLocaleDateString("en-US", { timeZone: "America/New_York" })
  }

  const uniqueDates = [...new Set(roundGames.map(dateOfStart))]
  uniqueDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

  if (uniqueDates.length < 2) return cpIndices[0]

  const thisDate = dateOfStart({ startTime })
  return thisDate === uniqueDates[0] ? cpIndices[0] : cpIndices[1]
}

/**
 * Get score history for an entry (for the timeline/chart feature).
 * Returns all snapshots in chronological order.
 */
export async function getEntryScoreHistory(entryId: string) {
  return prisma.scoreSnapshot.findMany({
    where: { entryId },
    orderBy: { savedAt: "asc" },
    include: {
      game: {
        select: {
          round: true,
          espnGameId: true,
          startTime: true,
        },
      },
    },
  })
}

/**
 * Get all checkpoints for a season with their dimension snapshots.
 * Used by the timeline footer to show available time positions.
 */
export async function getSeasonCheckpoints(seasonId: string) {
  return prisma.checkpoint.findMany({
    where: { seasonId, isSession: true },
    orderBy: { gameIndex: "asc" },
    include: {
      dimensions: {
        select: {
          dimensionType: true,
          dimensionValue: true,
          leaderEntryId: true,
          medianEntryId: true,
          totalEntries: true,
          rollingOptimal8Score: true,
          hindsightOptimal8Score: true,
        },
      },
    },
  })
}
