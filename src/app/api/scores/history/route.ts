import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSeasonCheckpoints } from "@/lib/snapshots"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { type TeamBracketInfo } from "@/lib/bracket-ppr"
import { computeOptimal8 } from "@/lib/scoring"
import { computeMaxPossibleScore, computeMaxScoreProjection } from "@/lib/max-possible-score"

/**
 * GET /api/scores/history — Score history for the chart/timeline feature
 *
 * Returns both per-checkpoint and per-game score data.
 *
 * Per-checkpoint (11 data points):
 *   `entries[id].scores` — array of length 11, indexed by checkpoint (0-10).
 *   Each value is the entry's score at the END of that checkpoint's last game,
 *   or null if that checkpoint hasn't happened yet.
 *
 * Per-game (up to 63 data points):
 *   `entryGameScores[id]` — array of { gameIndex, score } from ScoreSnapshots.
 *   `games` — ordered game metadata with round and checkpoint info.
 *   `checkpointBoundaries` — last game index in each completed checkpoint.
 *   `leaderLine` / `medianLine` — per-game leader and median across ALL entries.
 *   `optimal8Line` — optimal 8 score at checkpoint boundaries.
 *
 * Checkpoint mapping:
 *   0 = Pre-Tournament (score 0)
 *   1 = R64 D1, 2 = R64 D2
 *   3 = R32 D1, 4 = R32 D2
 *   5 = S16 D1, 6 = S16 D2
 *   7 = E8 D1, 8 = E8 D2
 *   9 = F4, 10 = Championship
 */
export async function GET(req: NextRequest) {
  const rateLimitResponse = rateLimit(getClientIp(req))
  if (rateLimitResponse) return rateLimitResponse

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const params = req.nextUrl.searchParams
  const entryIds = params.get("entryIds")?.split(",").filter(Boolean) ?? []
  const includeLeaderMedian = params.get("includeLeaderMedian") !== "false"
  // Optional: filter leader/median to only these entry IDs (for dimension/league filtering)
  const filterEntryIds = params.get("filterEntryIds")?.split(",").filter(Boolean) ?? []

  // Resolve season
  let seasonId = params.get("seasonId")
  if (!seasonId) {
    const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
    seasonId = settings?.currentSeasonId ?? null
  }
  if (!seasonId) {
    return NextResponse.json({ checkpoints: [], entries: {}, error: "No active season" })
  }

  // ── Build checkpoint boundaries from actual game data ──────────────────────
  // This maps each checkpoint index (1-10) to the game IDs that belong to it.
  // We need this to correctly map per-game snapshots → per-checkpoint scores.

  const completedGames = await prisma.tournamentGame.findMany({
    where: { isComplete: true, round: { gte: 1 } },
    select: { id: true, round: true, startTime: true, winnerId: true, team1Id: true, team2Id: true },
    orderBy: { startTime: "asc" },
  })

  // Round → checkpoint index mapping (rounds 1-4 split into D1/D2)
  const ROUND_TO_CP: Record<number, [number, number] | [number]> = {
    1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8],
    5: [9], 6: [10],
  }

  // Group games by round
  const gamesByRound = new Map<number, typeof completedGames>()
  for (const g of completedGames) {
    if (!gamesByRound.has(g.round)) gamesByRound.set(g.round, [])
    gamesByRound.get(g.round)!.push(g)
  }

  // Map: gameId → checkpoint index
  const gameToCheckpoint = new Map<string, number>()
  // Map: checkpoint index → last game ID in that checkpoint (for boundary tracking)
  const checkpointLastGameId = new Map<number, string>()
  // Track which checkpoints are "active" (have at least one game)
  const activeCheckpoints = new Set<number>()

  const dateOfStart = (g: { startTime: Date | null }) => {
    if (!g.startTime) return "unknown"
    return g.startTime.toLocaleDateString("en-US", { timeZone: "America/New_York" })
  }

  for (const [round, cpIndices] of Object.entries(ROUND_TO_CP)) {
    const rGames = gamesByRound.get(parseInt(round))
    if (!rGames || rGames.length === 0) continue

    if (cpIndices.length === 2) {
      // Split by start date (ET) into D1/D2
      const uniqueDates = [...new Set(rGames.map(dateOfStart))]
      uniqueDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

      const day1Games = uniqueDates.length >= 1
        ? rGames.filter(g => dateOfStart(g) === uniqueDates[0])
        : rGames
      const day2Games = uniqueDates.length >= 2
        ? rGames.filter(g => dateOfStart(g) !== uniqueDates[0])
        : []

      for (const g of day1Games) {
        gameToCheckpoint.set(g.id, cpIndices[0])
      }
      if (day1Games.length > 0) {
        activeCheckpoints.add(cpIndices[0])
        checkpointLastGameId.set(cpIndices[0], day1Games[day1Games.length - 1].id)
      }

      for (const g of day2Games) {
        gameToCheckpoint.set(g.id, cpIndices[1])
      }
      if (day2Games.length > 0) {
        activeCheckpoints.add(cpIndices[1])
        checkpointLastGameId.set(cpIndices[1], day2Games[day2Games.length - 1].id)
      }
    } else {
      for (const g of rGames) {
        gameToCheckpoint.set(g.id, cpIndices[0])
      }
      activeCheckpoints.add(cpIndices[0])
      checkpointLastGameId.set(cpIndices[0], rGames[rGames.length - 1].id)
    }
  }

  // Determine latest completed checkpoint from boundaries
  const latestCpIndex = activeCheckpoints.size > 0
    ? Math.max(...activeCheckpoints)
    : completedGames.length > 0 ? 0 : -1

  // ── Build team → last game checkpoint map (for D1/D2 track assignment) ──
  // Uses completedGames which already has winnerId
  const teamLastGameCheckpoint = new Map<string, number>()
  for (const g of completedGames) {
    if (!g.winnerId) continue
    const cp = gameToCheckpoint.get(g.id)
    if (cp !== undefined) {
      // Overwrite: later games (ordered asc) are the latest checkpoint
      teamLastGameCheckpoint.set(g.winnerId, cp)
    }
  }

  // Get DB checkpoints (for optimal 8 data) — filter to valid indices
  const allCheckpoints = await getSeasonCheckpoints(seasonId)
  const VALID_CP_INDICES = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  const dbCheckpoints = allCheckpoints.filter(cp => VALID_CP_INDICES.has(cp.gameIndex))

  // If no specific entries requested, get the user's entries
  if (entryIds.length === 0) {
    const userEntries = await prisma.entry.findMany({
      where: { userId: session.user.id, seasonId },
      select: { id: true },
    })
    entryIds.push(...userEntries.map((e) => e.id))
  }

  // Determine leader, median, and build available players list
  let currentLeaderId: string | null = null
  let currentMedianId: string | null = null
  let availablePlayers: Array<{ id: string; name: string }> = []

  // Always fetch all entries for the available players list
  const allSeasonEntries = await prisma.entry.findMany({
    where: {
      seasonId,
      draftInProgress: false,
      entryPicks: { some: {} },
    },
    select: {
      id: true,
      score: true,
      entryNumber: true,
      nickname: true,
      userId: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { score: "desc" },
  })

  // Build available players list
  availablePlayers = allSeasonEntries.map(e => {
    const displayName = e.user.name ?? e.user.email ?? "Unknown"
    const name = e.entryNumber > 1
      ? (e.nickname ? `${e.nickname} (${displayName} ${e.entryNumber})` : `${displayName} ${e.entryNumber}`)
      : displayName
    return { id: e.id, name }
  })

  // ── Compute per-game leader/median from snapshots (BEFORE entry fetch) ────
  // This determines the actual leader/median from ScoreSnapshots so we can
  // add those entries to entryIds and fetch their full projection data.
  let leaderLine: Array<{ gameIndex: number; score: number; entryId: string }> = []
  let medianLine: Array<{ gameIndex: number; score: number }> = []
  let snapshotLeaderId: string | null = null
  let snapshotMedianId: string | null = null

  if (includeLeaderMedian && completedGames.length > 0) {
    const snapshotFilter: Record<string, unknown> = { gameId: { in: completedGames.map(g => g.id) } }
    if (filterEntryIds.length > 0) {
      snapshotFilter.entryId = { in: filterEntryIds }
    }

    const allSnapshots = await prisma.scoreSnapshot.findMany({
      where: snapshotFilter,
      select: { gameId: true, score: true, entryId: true },
    })

    const snapshotsByGame = new Map<string, Array<{ score: number; entryId: string }>>()
    for (const s of allSnapshots) {
      if (!s.gameId) continue
      if (!snapshotsByGame.has(s.gameId)) snapshotsByGame.set(s.gameId, [])
      snapshotsByGame.get(s.gameId)!.push({ score: s.score, entryId: s.entryId })
    }

    for (const [idx, game] of completedGames.entries()) {
      const gameSnaps = snapshotsByGame.get(game.id) ?? []
      if (gameSnaps.length === 0) continue

      // Leader = max score
      let maxScore = -Infinity
      let maxEntryId = ""
      for (const s of gameSnaps) {
        if (s.score > maxScore) {
          maxScore = s.score
          maxEntryId = s.entryId
        }
      }
      leaderLine.push({ gameIndex: idx, score: maxScore, entryId: maxEntryId })

      // Median
      const sorted = gameSnaps.map(s => s.score).sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      const medianScore = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid]
      medianLine.push({ gameIndex: idx, score: medianScore })
    }

    // Identify the snapshot-derived leader and median entry
    if (leaderLine.length > 0) {
      snapshotLeaderId = leaderLine[leaderLine.length - 1].entryId
    }
    if (medianLine.length > 0) {
      // Find the entry whose latest snapshot score is closest to median
      const latestMedianScore = medianLine[medianLine.length - 1].score
      const lastGameId = completedGames[completedGames.length - 1].id
      const lastGameSnaps = snapshotsByGame.get(lastGameId) ?? []
      let bestDist = Infinity
      for (const s of lastGameSnaps) {
        const dist = Math.abs(s.score - latestMedianScore)
        if (dist < bestDist) {
          bestDist = dist
          snapshotMedianId = s.entryId
        }
      }
    }
  }

  // Add snapshot-derived leader/median to entryIds so we fetch their projection data
  if (includeLeaderMedian) {
    // Also keep live-derived leader/median as fallback
    if (allSeasonEntries.length > 0) {
      currentLeaderId = snapshotLeaderId ?? allSeasonEntries[0].id
      const medianIdx = Math.floor(allSeasonEntries.length / 2)
      currentMedianId = snapshotMedianId ?? allSeasonEntries[medianIdx].id
    }

    if (currentLeaderId && !entryIds.includes(currentLeaderId)) {
      entryIds.push(currentLeaderId)
    }
    if (currentMedianId && !entryIds.includes(currentMedianId)) {
      entryIds.push(currentMedianId)
    }
    // Also add the snapshot-derived IDs if different
    if (snapshotLeaderId && !entryIds.includes(snapshotLeaderId)) {
      entryIds.push(snapshotLeaderId)
    }
    if (snapshotMedianId && !entryIds.includes(snapshotMedianId)) {
      entryIds.push(snapshotMedianId)
    }
  }

  // ── Build entry data ───────────────────────────────────────────────────────

  const entryHistories: Record<string, {
    entryId: string
    name: string
    isCurrentUser: boolean
    isLeader: boolean
    isMedian: boolean
    scores: (number | null)[]      // length 11, indexed by checkpoint (0-10)
    projections: (number | null)[]  // length 11, indexed by checkpoint (0-10)
  }> = {}

  // Get entry metadata with picks + team data for PPR computation
  const entries = await prisma.entry.findMany({
    where: { id: { in: entryIds } },
    select: {
      id: true,
      userId: true,
      entryNumber: true,
      nickname: true,
      score: true,
      maxPossibleScore: true,
      user: { select: { name: true, email: true } },
      entryPicks: {
        select: {
          teamId: true,
          playInSlotId: true,
          team: {
            select: { id: true, seed: true, region: true, wins: true, eliminated: true, isPlayIn: true },
          },
          playInSlot: {
            select: { winner: { select: { id: true, seed: true, region: true, wins: true, eliminated: true, isPlayIn: true } } },
          },
        },
      },
    },
  })

  for (const entry of entries) {
    const displayName = entry.user.name ?? entry.user.email

    // ── Per-checkpoint scores from ScoreSnapshots ──
    // Get all snapshots for this entry (one per completed game)
    const snapshots = await prisma.scoreSnapshot.findMany({
      where: { entryId: entry.id },
      orderBy: { savedAt: "asc" },
      select: { score: true, gameId: true },
    })

    // Map snapshots to checkpoints: for each checkpoint, take the LAST snapshot's score
    const scoreByCheckpoint = new Map<number, number>()
    for (const snap of snapshots) {
      if (!snap.gameId) continue
      const cpIdx = gameToCheckpoint.get(snap.gameId)
      if (cpIdx !== undefined) {
        // Always overwrite — snapshots are ordered by savedAt asc,
        // so the last one for each checkpoint wins
        scoreByCheckpoint.set(cpIdx, snap.score)
      }
    }

    // Build cumulative scores array (checkpoints are cumulative, later includes earlier)
    // Checkpoint 0 = pre-tournament = 0
    const scores: (number | null)[] = new Array(11).fill(null)
    scores[0] = 0 // Pre-tournament is always 0

    // For each active checkpoint, use the last snapshot's score.
    // Scores are already cumulative in the snapshots (entry.score accumulates).
    for (let cp = 1; cp <= 10; cp++) {
      if (activeCheckpoints.has(cp)) {
        // Use the last snapshot score in this checkpoint
        const cpScore = scoreByCheckpoint.get(cp)
        if (cpScore !== undefined) {
          scores[cp] = cpScore
        } else {
          // Checkpoint is active but this entry has no snapshot for it yet
          // Use the previous checkpoint's score (score hasn't changed)
          scores[cp] = scores[cp - 1]
        }
      }
    }

    // ── Max score projections (using computeMaxPossibleScore — unified algorithm) ──
    const teamInfoMap = new Map<string, TeamBracketInfo>()
    const validPicks: string[] = []
    for (const pick of entry.entryPicks) {
      // Resolve play-in: use winner of play-in slot if pick was via playInSlotId (team is null)
      // or if pick.team is a play-in team that has a resolved winner
      let team = pick.team
      if (!team && pick.playInSlot?.winner) {
        team = pick.playInSlot.winner
      } else if (team?.isPlayIn && pick.playInSlot?.winner) {
        team = pick.playInSlot.winner
      }
      if (!team || team.isPlayIn) continue  // skip unresolved play-in slots
      validPicks.push(team.id)
      if (!teamInfoMap.has(team.id)) {
        teamInfoMap.set(team.id, {
          seed: team.seed,
          region: team.region,
          wins: team.wins,
          eliminated: team.eliminated,
        })
      }
    }

    const maxResult = validPicks.length > 0
      ? computeMaxPossibleScore(validPicks, teamInfoMap)
      : { maxPossibleScore: 0, breakdown: [] }

    // Build team→checkpoint map for D1/D2 track assignment
    // Uses the teamLastGameCheckpoint map built from completed games
    const projections = computeMaxScoreProjection(
      maxResult.breakdown,
      entry.score,
      latestCpIndex,
      teamLastGameCheckpoint
    )
    // Force final projection to exactly match computeMaxPossibleScore
    // (avoids any rounding or distribution drift)
    projections[10] = maxResult.maxPossibleScore

    entryHistories[entry.id] = {
      entryId: entry.id,
      name: entry.entryNumber > 1
        ? (entry.nickname ? `${entry.nickname} (${displayName} ${entry.entryNumber})` : `${displayName} ${entry.entryNumber}`)
        : displayName,
      isCurrentUser: entry.userId === session.user.id,
      isLeader: entry.id === currentLeaderId,
      isMedian: entry.id === currentMedianId,
      scores,
      projections,
    }
  }

  // ── Build optimal 8 line ──────────────────────────────────────────────────
  // First try DB checkpoint dimension snapshots
  const optimal8ByCheckpoint = new Map<number, { rolling: number | null; hindsight: number | null }>()
  for (const cp of dbCheckpoints) {
    const globalD = cp.dimensions.find((d) => d.dimensionType === "global")
    optimal8ByCheckpoint.set(cp.gameIndex, {
      rolling: globalD?.rollingOptimal8Score ?? null,
      hindsight: globalD?.hindsightOptimal8Score ?? null,
    })
  }

  // If no DB optimal 8 data exists, compute it live from current team states
  // Always fetch teams for projection computation
  const allTeams = await prisma.team.findMany({
    where: { isPlayIn: false },
    select: { id: true, seed: true, region: true, wins: true, eliminated: true, name: true, shortName: true, sCurveRank: true },
  })

  const teamInfoForOpt = new Map<string, TeamBracketInfo>()
  const opt8Teams = allTeams.map(t => {
    teamInfoForOpt.set(t.id, { seed: t.seed, region: t.region, wins: t.wins, eliminated: t.eliminated })
    return { id: t.id, seed: t.seed, region: t.region, wins: t.wins, eliminated: t.eliminated, isPlayIn: false, sCurveRank: t.sCurveRank ?? undefined }
  })

  const opt8Result = computeOptimal8(opt8Teams, teamInfoForOpt)

  if (!optimal8ByCheckpoint.has(latestCpIndex) || optimal8ByCheckpoint.get(latestCpIndex)?.rolling == null) {
    // Pre-tournament (cp 0) = 0
    optimal8ByCheckpoint.set(0, { rolling: 0, hindsight: null })
    // Current checkpoint = live score
    if (latestCpIndex >= 1) {
      optimal8ByCheckpoint.set(latestCpIndex, { rolling: opt8Result.score, hindsight: null })
    }
  }

  // ── Compute Optimal 8 projection (using computeMaxPossibleScore — unified algorithm) ──
  const opt8MaxResult = computeMaxPossibleScore(opt8Result.teamIds, teamInfoForOpt)
  const opt8Projections = computeMaxScoreProjection(
    opt8MaxResult.breakdown,
    opt8Result.score,
    latestCpIndex,
    teamLastGameCheckpoint
  )
  // Force final projection to exactly match computeMaxPossibleScore
  opt8Projections[10] = opt8MaxResult.maxPossibleScore

  // Build optimal 8 array indexed by checkpoint (0-10)
  const optimal8: Array<{
    checkpointIndex: number
    rollingOptimal8Score: number | null
    hindsightOptimal8Score: number | null
    rollingProjection: number | null
  }> = []
  for (let cp = 0; cp <= 10; cp++) {
    const cpData = optimal8ByCheckpoint.get(cp)
    optimal8.push({
      checkpointIndex: cp,
      rollingOptimal8Score: cpData?.rolling ?? null,
      hindsightOptimal8Score: cpData?.hindsight ?? null,
      rollingProjection: opt8Projections[cp],
    })
  }

  // ── Per-game data ──────────────────────────────────────────────────────────

  // Game metadata ordered by completion
  const gameMetadata = completedGames.map((g, idx) => ({
    gameIndex: idx,
    gameId: g.id,
    round: g.round,
    checkpoint: gameToCheckpoint.get(g.id) ?? 0,
  }))

  // Checkpoint boundaries — last game index in each completed checkpoint
  const CHECKPOINT_LABELS_SHORT = [
    "Pre", "R64 D1", "R64 D2", "R32 D1", "R32 D2",
    "S16 D1", "S16 D2", "E8 D1", "E8 D2", "F4", "Champ",
  ]
  const checkpointBoundaries: Array<{ checkpoint: number; label: string; afterGameIndex: number }> = []
  for (const [cpIdx, lastGameId] of checkpointLastGameId.entries()) {
    const gameIdx = completedGames.findIndex(g => g.id === lastGameId)
    if (gameIdx >= 0) {
      checkpointBoundaries.push({
        checkpoint: cpIdx,
        label: CHECKPOINT_LABELS_SHORT[cpIdx] ?? `CP ${cpIdx}`,
        afterGameIndex: gameIdx,
      })
    }
  }
  checkpointBoundaries.sort((a, b) => a.checkpoint - b.checkpoint)

  // gameId → gameIndex lookup
  const gameIdToIndex = new Map(completedGames.map((g, idx) => [g.id, idx]))

  // Per-entry game-level scores from ScoreSnapshots
  const entryGameScores: Record<string, Array<{ gameIndex: number; score: number }>> = {}
  for (const entryId of entryIds) {
    const snapshots = await prisma.scoreSnapshot.findMany({
      where: { entryId },
      orderBy: { savedAt: "asc" },
      select: { score: true, gameId: true },
    })
    entryGameScores[entryId] = snapshots
      .filter(s => s.gameId && gameIdToIndex.has(s.gameId!))
      .map(s => ({
        gameIndex: gameIdToIndex.get(s.gameId!)!,
        score: s.score,
      }))
  }

  // leaderLine and medianLine already computed above (before entry fetch)

  // Optimal 8 line — per-game rolling computation
  // Reconstruct team states game by game and compute optimal 8 at each step
  const optimal8Line: Array<{ gameIndex: number; score: number }> = []
  {
    // Build team seed lookup from allTeams (already fetched above)
    const teamSeedMap = new Map(allTeams.map(t => [t.id, t.seed]))
    const teamRegionMap = new Map(allTeams.map(t => [t.id, t.region]))

    // Track cumulative team states as games are played
    const rollingWins = new Map<string, number>()
    const rollingEliminated = new Set<string>()

    for (let gi = 0; gi < completedGames.length; gi++) {
      const game = completedGames[gi]
      if (!game.winnerId) continue

      // Update wins for the winner
      rollingWins.set(game.winnerId, (rollingWins.get(game.winnerId) ?? 0) + 1)

      // Determine loser and mark eliminated
      const loserId = game.team1Id === game.winnerId ? game.team2Id : game.team1Id
      if (loserId) rollingEliminated.add(loserId)

      // Build teamInfoMap and aliveTeams at this point
      const stepTeamInfo = new Map<string, TeamBracketInfo>()
      const stepAliveTeams: Array<{ id: string; seed: number; region: string; wins: number; eliminated: boolean; isPlayIn: boolean; sCurveRank?: number | null }> = []

      for (const t of allTeams) {
        const wins = rollingWins.get(t.id) ?? 0
        const eliminated = rollingEliminated.has(t.id)
        stepTeamInfo.set(t.id, { seed: t.seed, region: t.region, wins, eliminated })
        if (!eliminated) {
          stepAliveTeams.push({ id: t.id, seed: t.seed, region: t.region, wins, eliminated, isPlayIn: false, sCurveRank: t.sCurveRank ?? undefined })
        }
      }

      const stepOpt8 = computeOptimal8(stepAliveTeams, stepTeamInfo)
      optimal8Line.push({ gameIndex: gi, score: stepOpt8.score })
    }
  }

  return NextResponse.json({
    // Existing fields
    entries: entryHistories,
    optimal8,
    latestCheckpointIndex: latestCpIndex,
    seasonId,
    availablePlayers,
    // Per-game fields
    games: gameMetadata,
    checkpointBoundaries,
    entryGameScores,
    leaderLine,
    medianLine,
    snapshotLeaderId,
    snapshotMedianId,
    optimal8Line,
    totalGames: 63 as const,
    latestGameIndex: completedGames.length > 0 ? completedGames.length - 1 : -1,
  })
}
