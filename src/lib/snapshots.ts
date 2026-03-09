import { prisma } from "@/lib/prisma"
import { computePercentile } from "@/lib/scoring"

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

  // Get all entries with their current scores
  const entries = await prisma.entry.findMany({
    where: {
      seasonId,
      draftInProgress: false,
      entryPicks: { some: {} },
    },
    select: {
      id: true,
      score: true,
    },
    orderBy: { score: "desc" },
  })

  if (entries.length === 0) return { saved: 0 }

  // Rank entries by score (descending)
  // Handle ties: entries with the same score share the same rank
  const total = entries.length
  const snapshots: Array<{
    entryId: string
    gameId: string
    score: number
    rank: number
    percentile: number
  }> = []

  let currentRank = 1
  for (let i = 0; i < entries.length; i++) {
    // If not the first entry, check if score differs from previous
    if (i > 0 && entries[i].score < entries[i - 1].score) {
      currentRank = i + 1 // Standard competition ranking (1, 1, 3, 4...)
    }

    snapshots.push({
      entryId: entries[i].id,
      gameId,
      score: entries[i].score,
      rank: currentRank,
      percentile: computePercentile(currentRank, total),
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
 * Round label mapping for checkpoints
 * Maps round numbers to human-readable checkpoint labels
 */
const ROUND_CHECKPOINT_MAP: Record<number, string> = {
  0: "First Four",
  1: "Round of 64",
  2: "Round of 32",
  3: "Sweet 16",
  4: "Elite 8",
  5: "Final Four",
  6: "National Championship",
}

/**
 * Check if a completed game triggers a session checkpoint.
 * A session checkpoint is created when ALL games in a round-day are complete.
 *
 * The 10 session checkpoints from the spec:
 * - Round of 64 Day 1/2, Round of 32 Day 1/2, Sweet 16 Day 1/2,
 *   Elite 8 Day 1/2, Final Four, National Championship
 *
 * For simplicity, we detect "all games of this round are complete" as a
 * checkpoint trigger. The day-level split can be refined later when we have
 * game scheduling data.
 *
 * @param gameId - The TournamentGame.id that just completed
 * @returns Whether a checkpoint was created
 */
export async function checkAndCreateCheckpoint(gameId: string): Promise<{
  checkpointCreated: boolean
  checkpointId?: string
}> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  const seasonId = settings?.currentSeasonId
  if (!seasonId) return { checkpointCreated: false }

  // Get the game that just completed to know its round
  const game = await prisma.tournamentGame.findUnique({
    where: { id: gameId },
    select: { round: true },
  })
  if (!game) return { checkpointCreated: false }

  const round = game.round

  // Count total and completed games for this round
  const [totalGamesInRound, completedGamesInRound] = await Promise.all([
    prisma.tournamentGame.count({ where: { round } }),
    prisma.tournamentGame.count({ where: { round, isComplete: true } }),
  ])

  // If not all games in this round are complete, no checkpoint yet
  if (completedGamesInRound < totalGamesInRound) {
    return { checkpointCreated: false }
  }

  // All games in this round are complete — create a session checkpoint
  // Use the total number of completed games as the gameIndex
  const totalCompletedGames = await prisma.tournamentGame.count({
    where: { isComplete: true },
  })

  const roundLabel = ROUND_CHECKPOINT_MAP[round] ?? `Round ${round}`

  // Upsert to avoid duplicates (idempotent)
  const checkpoint = await prisma.checkpoint.upsert({
    where: {
      seasonId_gameIndex: {
        seasonId,
        gameIndex: totalCompletedGames,
      },
    },
    create: {
      seasonId,
      gameIndex: totalCompletedGames,
      roundLabel,
      isSession: true,
    },
    update: {
      roundLabel,
      isSession: true,
    },
  })

  // Create dimension snapshots for this checkpoint
  await createDimensionSnapshots(checkpoint.id, seasonId)

  return { checkpointCreated: true, checkpointId: checkpoint.id }
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
      leagueId: true,
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

  // 6. Private league dimension
  const byLeague = new Map<string, typeof entries>()
  for (const e of entries) {
    if (!e.leagueId) continue
    if (!byLeague.has(e.leagueId)) byLeague.set(e.leagueId, [])
    byLeague.get(e.leagueId)!.push(e)
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
