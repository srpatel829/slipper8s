import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSeasonCheckpoints } from "@/lib/snapshots"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { computeBracketAwarePPR, type TeamBracketInfo } from "@/lib/bracket-ppr"

/**
 * GET /api/scores/history — Score history for the chart/timeline feature
 *
 * Returns per-checkpoint scores (not raw per-game snapshots).
 *
 * For each entry, `scores` is an array of length 11 (checkpoints 0-10).
 * Each value is the entry's score at the END of that checkpoint's last game,
 * or null if that checkpoint hasn't happened yet.
 *
 * Checkpoint mapping:
 *   0 = Pre-Tournament (score 0)
 *   1 = R64 D1, 2 = R64 D2
 *   3 = R32 D1, 4 = R32 D2
 *   5 = S16 D1, 6 = S16 D2
 *   7 = E8 D1, 8 = E8 D2
 *   9 = F4, 10 = Championship
 *
 * Leader and median are determined from CURRENT entry scores.
 */
export async function GET(req: NextRequest) {
  const rateLimitResponse = rateLimit(getClientIp(req))
  if (rateLimitResponse) return rateLimitResponse

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const params = req.nextUrl.searchParams
  const entryIds = params.get("entryIds")?.split(",").filter(Boolean) ?? []
  const includeLeaderMedian = params.get("includeLeaderMedian") !== "false"

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
    select: { id: true, round: true, startTime: true },
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

  // Determine leader and median from CURRENT scores
  let currentLeaderId: string | null = null
  let currentMedianId: string | null = null

  if (includeLeaderMedian) {
    const allEntries = await prisma.entry.findMany({
      where: {
        seasonId,
        draftInProgress: false,
        entryPicks: { some: {} },
      },
      select: { id: true, score: true },
      orderBy: { score: "desc" },
    })

    if (allEntries.length > 0) {
      currentLeaderId = allEntries[0].id
      const medianIdx = Math.floor(allEntries.length / 2)
      currentMedianId = allEntries[medianIdx].id

      if (currentLeaderId && !entryIds.includes(currentLeaderId)) {
        entryIds.push(currentLeaderId)
      }
      if (currentMedianId && !entryIds.includes(currentMedianId)) {
        entryIds.push(currentMedianId)
      }
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
      user: { select: { name: true, email: true } },
      entryPicks: {
        select: {
          teamId: true,
          team: {
            select: { id: true, seed: true, region: true, wins: true, eliminated: true, isPlayIn: true },
          },
        },
      },
    },
  })

  // Round-to-last-checkpoint mapping for projections
  const ROUND_TO_LAST_CP: Record<number, number> = {
    1: 2, 2: 4, 3: 6, 4: 8, 5: 9, 6: 10,
  }

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

    // ── PPR projections ──
    const teamInfoMap = new Map<string, TeamBracketInfo>()
    const validPicks: string[] = []
    for (const pick of entry.entryPicks) {
      if (!pick.team || pick.team.isPlayIn) continue
      validPicks.push(pick.team.id)
      teamInfoMap.set(pick.team.id, {
        seed: pick.team.seed,
        region: pick.team.region,
        wins: pick.team.wins,
        eliminated: pick.team.eliminated,
      })
    }

    const pprResult = validPicks.length > 0
      ? computeBracketAwarePPR(validPicks, teamInfoMap)
      : { totalPPR: 0, perTeam: new Map<string, number>() }

    // Distribute PPR across future checkpoints
    const futurePointsByCheckpoint = new Map<number, number>()
    for (const pick of entry.entryPicks) {
      if (!pick.team || pick.team.isPlayIn || pick.team.eliminated) continue
      const teamPPR = pprResult.perTeam.get(pick.team.id) || 0
      if (teamPPR === 0) continue
      const additionalWins = teamPPR / pick.team.seed
      for (let w = 1; w <= additionalWins; w++) {
        const futureRound = pick.team.wins + w
        const cp = ROUND_TO_LAST_CP[futureRound]
        if (cp !== undefined) {
          futurePointsByCheckpoint.set(cp, (futurePointsByCheckpoint.get(cp) || 0) + pick.team.seed)
        }
      }
    }

    // Build cumulative projection array
    const projections: (number | null)[] = new Array(11).fill(null)
    let cumScore = entry.score
    // Set overlap point at the latest checkpoint
    if (latestCpIndex >= 0 && latestCpIndex <= 10) {
      projections[latestCpIndex] = cumScore
    }
    // Fill future checkpoints with cumulative projected scores
    for (let cp = (latestCpIndex >= 0 ? latestCpIndex + 1 : 0); cp <= 10; cp++) {
      cumScore += futurePointsByCheckpoint.get(cp) || 0
      projections[cp] = cumScore
    }

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

  // ── Build optimal 8 line from DB checkpoint dimension snapshots ──────────
  // Map by checkpoint index for easy lookup
  const optimal8ByCheckpoint = new Map<number, { rolling: number | null; hindsight: number | null }>()
  for (const cp of dbCheckpoints) {
    const globalD = cp.dimensions.find((d) => d.dimensionType === "global")
    optimal8ByCheckpoint.set(cp.gameIndex, {
      rolling: globalD?.rollingOptimal8Score ?? null,
      hindsight: globalD?.hindsightOptimal8Score ?? null,
    })
  }

  // Build optimal 8 array indexed by checkpoint (0-10)
  const optimal8: Array<{
    checkpointIndex: number
    rollingOptimal8Score: number | null
    hindsightOptimal8Score: number | null
  }> = []
  for (let cp = 0; cp <= 10; cp++) {
    const data = optimal8ByCheckpoint.get(cp)
    optimal8.push({
      checkpointIndex: cp,
      rollingOptimal8Score: data?.rolling ?? null,
      hindsightOptimal8Score: data?.hindsight ?? null,
    })
  }

  return NextResponse.json({
    entries: entryHistories,
    optimal8,
    latestCheckpointIndex: latestCpIndex,
    seasonId,
  })
}
