/**
 * Maximum Possible Score — Bracket-Path Collision Analysis
 *
 * CLAUDE.md spec:
 * "The naive calculation (seed × remaining games) is WRONG. Never use it."
 *
 * Collision resolution rule:
 *   When two of a player's picks collide, the HIGHER-SEEDED team
 *   (larger seed number) survives. Exception: identical seeds at
 *   Final Four or Championship — route through either one, math is identical.
 *
 * Algorithm:
 *   1. Map all 8 picks to current bracket positions
 *   2. Trace each team's forward path through bracket
 *   3. Identify collision points (where two picks would meet)
 *   4. At each collision, route through the higher-seeded pick
 *   5. Check for further downstream collisions for the survivor
 *   6. Sum optimal-path scores assuming all surviving picks win every remaining game
 *
 * This is computed as a batch job after game results, NOT per-user-request.
 */

import { seedToSlot, type TeamBracketInfo } from "@/lib/bracket-ppr"

// ─── Types ──────────────────────────────────────────────────────────────────

interface PickState {
  id: string
  seed: number
  region: string
  wins: number
  eliminated: boolean
  slot: number       // bracket position 0-7 within region
  maxWins: number    // max wins this team can accumulate (starts at 6)
}

export interface MaxPossibleScoreResult {
  maxPossibleScore: number
  breakdown: Array<{
    teamId: string
    seed: number
    currentWins: number
    maxWins: number
    currentScore: number
    maxScore: number
    collisionWith?: string  // teamId it collided with, if any
    cappedAtRound?: number  // round where it was capped due to collision
  }>
}

// ─── Standard bracket merges within a region ────────────────────────────────

/** [mergeRound, slotsInGroupA, slotsInGroupB] */
const REGION_MERGES: Array<[number, number[], number[]]> = [
  // R32 merges (wins after round 1): adjacent R64 slots
  [2, [0], [1]],
  [2, [2], [3]],
  [2, [4], [5]],
  [2, [6], [7]],
  // S16 merges (wins after round 2)
  [3, [0, 1], [2, 3]],
  [3, [4, 5], [6, 7]],
  // E8 merge (wins after round 3)
  [4, [0, 1, 2, 3], [4, 5, 6, 7]],
]

/** Cross-region F4 pairings (2026 NCAA bracket: East vs South, West vs Midwest) */
const F4_REGION_MATCHUPS: [string, string][] = [
  ["East", "South"],
  ["West", "Midwest"],
]

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Compute the maximum possible score for a set of picked teams.
 *
 * @param pickedTeamIds - The entry's 8 picked team IDs
 * @param teamInfoMap   - Map of teamId → { seed, region, wins, eliminated }
 * @returns MaxPossibleScoreResult with total and per-team breakdown
 */
export function computeMaxPossibleScore(
  pickedTeamIds: string[],
  teamInfoMap: Map<string, TeamBracketInfo>
): MaxPossibleScoreResult {
  const breakdown: MaxPossibleScoreResult["breakdown"] = []

  // Build pick states for all alive teams
  const picks: PickState[] = []
  for (const id of pickedTeamIds) {
    const info = teamInfoMap.get(id)
    if (!info) continue

    if (info.eliminated) {
      // Eliminated teams contribute only their current score
      breakdown.push({
        teamId: id,
        seed: info.seed,
        currentWins: info.wins,
        maxWins: info.wins,
        currentScore: info.seed * info.wins,
        maxScore: info.seed * info.wins,
      })
      continue
    }

    const slot = seedToSlot(info.seed)
    if (slot === -1) {
      // Play-in team without standard slot — use current score only
      breakdown.push({
        teamId: id,
        seed: info.seed,
        currentWins: info.wins,
        maxWins: info.wins,
        currentScore: info.seed * info.wins,
        maxScore: info.seed * info.wins,
      })
      continue
    }

    picks.push({
      id,
      seed: info.seed,
      region: info.region,
      wins: info.wins,
      eliminated: false,
      slot,
      maxWins: 6, // optimistic: could win championship
    })
  }

  if (picks.length === 0) {
    return {
      maxPossibleScore: breakdown.reduce((sum, b) => sum + b.maxScore, 0),
      breakdown,
    }
  }

  // ── Phase 1: Intra-region collisions (rounds 2-4) ───────────────────────

  const regions = ["East", "West", "South", "Midwest"]
  const regionChampionMap = new Map<string, PickState>()

  for (const region of regions) {
    const regionPicks = picks.filter((p) => p.region === region)
    if (regionPicks.length === 0) continue

    for (const [mergeRound, groupA, groupB] of REGION_MERGES) {
      // Find picks in each group that could still reach this merge point
      const inA = regionPicks.filter(
        (p) => groupA.includes(p.slot) && p.maxWins >= mergeRound
      )
      const inB = regionPicks.filter(
        (p) => groupB.includes(p.slot) && p.maxWins >= mergeRound
      )

      if (inA.length > 0 && inB.length > 0) {
        // Collision! Pick the HIGHER SEED NUMBER to survive (more points per win)
        const bestA = getHighestSeed(inA)
        const bestB = getHighestSeed(inB)

        resolveCollision(bestA, bestB, mergeRound)
      }
    }

    // Find region champion (pick that can still reach E8 win = round 4)
    const champion = regionPicks
      .filter((p) => p.maxWins >= 4)
      .sort((a, b) => b.seed - a.seed)[0] // highest seed number

    if (champion) {
      regionChampionMap.set(region, champion)
    }
  }

  // ── Phase 2: Cross-region collisions (Final Four, round 5) ──────────────

  const f4Winners: PickState[] = []

  for (const [regionA, regionB] of F4_REGION_MATCHUPS) {
    const champA = regionChampionMap.get(regionA)
    const champB = regionChampionMap.get(regionB)

    if (champA && champB) {
      // Collision at Final Four
      resolveCollision(champA, champB, 5)

      // Winner advances
      const winner = champA.maxWins >= 5 ? champA : champB
      f4Winners.push(winner)
    } else if (champA) {
      f4Winners.push(champA)
    } else if (champB) {
      f4Winners.push(champB)
    }
  }

  // ── Phase 3: Championship collision (round 6) ───────────────────────────

  if (f4Winners.length === 2) {
    resolveCollision(f4Winners[0], f4Winners[1], 6)
  }

  // ── Build final breakdown ───────────────────────────────────────────────

  for (const pick of picks) {
    breakdown.push({
      teamId: pick.id,
      seed: pick.seed,
      currentWins: pick.wins,
      maxWins: pick.maxWins,
      currentScore: pick.seed * pick.wins,
      maxScore: pick.seed * pick.maxWins,
    })
  }

  const maxPossibleScore = breakdown.reduce((sum, b) => sum + b.maxScore, 0)

  return { maxPossibleScore, breakdown }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Get the team with the highest seed number from a group.
 * Higher seed = more points per win = survives collision per spec.
 */
function getHighestSeed(teams: PickState[]): PickState {
  return teams.reduce((best, t) => (t.seed > best.seed ? t : best))
}

/**
 * Resolve a collision between two picks at a given round.
 *
 * Spec rule: HIGHER-SEEDED team (larger seed number) survives.
 * Exception: identical seeds — route through either one (math is same).
 */
function resolveCollision(a: PickState, b: PickState, atRound: number): void {
  if (a.seed === b.seed) {
    // Identical seeds: math is the same either way. Cap one arbitrarily.
    b.maxWins = Math.min(b.maxWins, atRound - 1)
    return
  }

  if (a.seed > b.seed) {
    // A has higher seed number → A survives, B capped
    b.maxWins = Math.min(b.maxWins, atRound - 1)
  } else {
    // B has higher seed number → B survives, A capped
    a.maxWins = Math.min(a.maxWins, atRound - 1)
  }
}

/**
 * Batch compute max possible scores for all entries.
 * Called as part of the recalculation pipeline after game results.
 *
 * @param entries - Array of { entryId, pickTeamIds[] }
 * @param teamInfoMap - Map of teamId → TeamBracketInfo
 * @returns Array of { entryId, maxPossibleScore }
 */
export function batchComputeMaxPossibleScores(
  entries: Array<{ entryId: string; pickTeamIds: string[] }>,
  teamInfoMap: Map<string, TeamBracketInfo>
): Array<{ entryId: string; maxPossibleScore: number }> {
  return entries.map(({ entryId, pickTeamIds }) => {
    const result = computeMaxPossibleScore(pickTeamIds, teamInfoMap)
    return { entryId, maxPossibleScore: result.maxPossibleScore }
  })
}

// ─── Cross-Entry Bracket Simulation ─────────────────────────────────────────

/** R64 seed matchups — index = bracket slot (same as bracket-ppr.ts) */
const R64_MATCHUPS: [number, number][] = [
  [1, 16], [8, 9], [5, 12], [4, 13], [6, 11], [3, 14], [7, 10], [2, 15],
]

interface BracketTeam {
  teamId: string | null
  seed: number
  wins: number
  eliminated: boolean
  isAPick: boolean
  aMaxWins: number
}

/**
 * Determine the round at which two teams would meet in the bracket.
 *
 * @param teamA - { seed, region } with slot derived from seedToSlot
 * @param teamB - { seed, region } with slot derived from seedToSlot
 * @returns The round number (2-6) when they'd collide, or null if they never meet.
 *
 * Same region → rounds 2-4 (walk REGION_MERGES for slot collision)
 * F4-paired regions (East/South, West/Midwest) → round 5
 * Cross-F4 pairing → round 6
 */
export function meetingRound(
  teamA: { seed: number; region: string },
  teamB: { seed: number; region: string }
): number | null {
  const slotA = seedToSlot(teamA.seed)
  const slotB = seedToSlot(teamB.seed)
  if (slotA === -1 || slotB === -1) return null

  if (teamA.region === teamB.region) {
    // Same region: walk merges to find when their slots converge
    for (const [mergeRound, groupA, groupB] of REGION_MERGES) {
      const aInGroupA = groupA.includes(slotA)
      const aInGroupB = groupB.includes(slotA)
      const bInGroupA = groupA.includes(slotB)
      const bInGroupB = groupB.includes(slotB)

      // They collide at this merge if they're on opposite sides
      if ((aInGroupA && bInGroupB) || (aInGroupB && bInGroupA)) {
        return mergeRound
      }
    }
    // Same region but somehow never merge (shouldn't happen with valid slots)
    return null
  }

  // Different regions: check F4 pairings
  for (const [r1, r2] of F4_REGION_MATCHUPS) {
    const aInPair = teamA.region === r1 || teamA.region === r2
    const bInPair = teamB.region === r1 || teamB.region === r2
    if (aInPair && bInPair) {
      return 5 // Final Four
    }
  }

  // Cross-F4 pairing → Championship
  return 6
}

/**
 * Simulate the full tournament bracket under entry A's optimal scenario + chalk.
 *
 * For past games: uses actual results (team wins from teamInfoMap).
 * For future games: A's alive picks advance to their maxWins, everything else
 * follows chalk (lower seed number = favorite wins).
 *
 * Play-in teams are already resolved before this is called.
 *
 * @param aBreakdown - A's breakdown from computeMaxPossibleScore
 * @param teamInfoMap - Global team info (all picked teams across all entries)
 * @returns Map<teamId, totalWins> — simulated total wins for every team in teamInfoMap
 */
function simulateBracketWins(
  aBreakdown: MaxPossibleScoreResult["breakdown"],
  teamInfoMap: Map<string, TeamBracketInfo>
): Map<string, number> {
  const winsResult = new Map<string, number>()

  // Initialize all known teams with their current (actual) wins
  for (const [teamId, info] of teamInfoMap) {
    winsResult.set(teamId, info.wins)
  }

  // Build A's pick lookup: teamId → maxWins
  const aMaxWinsById = new Map<string, number>()
  for (const item of aBreakdown) {
    aMaxWinsById.set(item.teamId, item.maxWins)
  }

  // Build seed+region → BracketTeam lookup (for finding teams at bracket slots)
  const seedRegionLookup = new Map<string, BracketTeam>()
  for (const [teamId, info] of teamInfoMap) {
    const key = `${info.region}:${info.seed}`
    const existing = seedRegionLookup.get(key)
    // Prefer the non-eliminated team, or the one with more wins
    if (!existing ||
        (existing.eliminated && !info.eliminated) ||
        (!existing.eliminated && !info.eliminated && info.wins > existing.wins)) {
      seedRegionLookup.set(key, {
        teamId,
        seed: info.seed,
        wins: info.wins,
        eliminated: info.eliminated,
        isAPick: aMaxWinsById.has(teamId),
        aMaxWins: aMaxWinsById.get(teamId) ?? 0,
      })
    }
  }

  function getTeam(region: string, seed: number): BracketTeam {
    return seedRegionLookup.get(`${region}:${seed}`) ?? {
      teamId: null, seed, wins: 0, eliminated: false, isAPick: false, aMaxWins: 0,
    }
  }

  function resolveMatchup(a: BracketTeam, b: BracketTeam, round: number): BracketTeam {
    // Actual result: one team already won this round in the real tournament
    if (a.wins >= round) return a
    if (b.wins >= round) return b

    // One eliminated before this round → the other advances
    if (a.eliminated && !b.eliminated) {
      if (b.teamId) winsResult.set(b.teamId, Math.max(winsResult.get(b.teamId) ?? 0, round))
      return b
    }
    if (b.eliminated && !a.eliminated) {
      if (a.teamId) winsResult.set(a.teamId, Math.max(winsResult.get(a.teamId) ?? 0, round))
      return a
    }
    if (a.eliminated && b.eliminated) {
      // Both out — return whoever lasted longer (no new win to record)
      return a.wins >= b.wins ? a : b
    }

    // Future game — simulate
    const aAdv = a.isAPick && a.aMaxWins >= round
    const bAdv = b.isAPick && b.aMaxWins >= round

    let winner: BracketTeam
    if (aAdv && !bAdv) winner = a
    else if (bAdv && !aAdv) winner = b
    else if (aAdv && bAdv) winner = a.aMaxWins >= b.aMaxWins ? a : b
    else winner = a.seed <= b.seed ? a : b // chalk: lower seed (favorite) wins

    if (winner.teamId) winsResult.set(winner.teamId, Math.max(winsResult.get(winner.teamId) ?? 0, round))
    return winner
  }

  // ── Simulate each region (rounds 1–4) ──────────────────────────────────────

  const regions = ["East", "West", "South", "Midwest"]
  const regionWinners = new Map<string, BracketTeam>()

  for (const region of regions) {
    // R64: 8 matchups
    const r64Winners: BracketTeam[] = []
    for (let i = 0; i < 8; i++) {
      const [s1, s2] = R64_MATCHUPS[i]
      r64Winners.push(resolveMatchup(getTeam(region, s1), getTeam(region, s2), 1))
    }

    // R32: 4 matchups
    const r32Winners: BracketTeam[] = []
    for (let i = 0; i < 4; i++) {
      r32Winners.push(resolveMatchup(r64Winners[i * 2], r64Winners[i * 2 + 1], 2))
    }

    // S16: 2 matchups
    const s16Winners: BracketTeam[] = []
    for (let i = 0; i < 2; i++) {
      s16Winners.push(resolveMatchup(r32Winners[i * 2], r32Winners[i * 2 + 1], 3))
    }

    // E8: 1 matchup → region champion
    regionWinners.set(region, resolveMatchup(s16Winners[0], s16Winners[1], 4))
  }

  // ── F4 matchups (round 5) ──────────────────────────────────────────────────

  const f4Winners: BracketTeam[] = []
  for (const [rA, rB] of F4_REGION_MATCHUPS) {
    const cA = regionWinners.get(rA)
    const cB = regionWinners.get(rB)
    if (!cA && !cB) continue
    if (!cA) { f4Winners.push(cB!); continue }
    if (!cB) { f4Winners.push(cA!); continue }
    f4Winners.push(resolveMatchup(cA, cB, 5))
  }

  // ── Championship (round 6) ─────────────────────────────────────────────────

  if (f4Winners.length === 2) {
    resolveMatchup(f4Winners[0], f4Winners[1], 6)
  }

  return winsResult
}

/**
 * Compute collision-aware maxRank and floorRank for all entries.
 *
 * maxRank: For each entry A, simulate the full bracket under A's optimal scenario
 *          (A's picks advance + chalk elsewhere). Score all other entries under
 *          that bracket, count how many score > A's maxPossibleScore.
 *          Entries with all teams eliminated: maxRank = currentRank.
 *
 * floorRank: Count entries whose maxPossibleScore > A's currentScore.
 *            (Equivalent to A's worst bracket where all A's teams lose.)
 *
 * Tie handling: strictly greater counts as "beating" — ties don't penalize.
 *
 * @param entries - Scored entries with picks and current state
 * @param teamInfoMap - Global team info map
 * @returns Map of entryId → { maxRank, floorRank }
 */
export function computeCollisionAwareRanks(
  entries: Array<{
    entryId: string
    pickTeamIds: string[]
    currentScore: number
    maxPossibleScore: number
    teamsRemaining: number
    currentRank: number
  }>,
  teamInfoMap: Map<string, TeamBracketInfo>
): Map<string, { maxRank: number; floorRank: number }> {
  const result = new Map<string, { maxRank: number; floorRank: number }>()

  // Pre-compute breakdowns for entries with alive teams (need it for maxRank)
  const breakdownCache = new Map<string, MaxPossibleScoreResult>()
  for (const entry of entries) {
    if (entry.teamsRemaining > 0) {
      breakdownCache.set(entry.entryId, computeMaxPossibleScore(entry.pickTeamIds, teamInfoMap))
    }
  }

  // Pre-compute all maxPossibleScores for floorRank
  const allMaxPossibleScores = entries.map(e => e.maxPossibleScore)

  for (const entryA of entries) {
    // ── floorRank: always computed ──
    // Count entries whose maxPossibleScore > A's currentScore (strictly greater)
    let floorBetter = 0
    for (const ms of allMaxPossibleScores) {
      if (ms > entryA.currentScore) floorBetter++
    }
    // Don't count self: if A's own maxPossibleScore > A's currentScore, subtract 1
    if (entryA.maxPossibleScore > entryA.currentScore) floorBetter--
    const floorRank = floorBetter + 1

    // ── maxRank ──
    if (entryA.teamsRemaining === 0) {
      // All teams eliminated: maxRank = currentRank (score is locked)
      result.set(entryA.entryId, { maxRank: entryA.currentRank, floorRank })
      continue
    }

    // Simulate full bracket under A's optimal scenario + chalk
    const breakdownA = breakdownCache.get(entryA.entryId)!
    const bracketWins = simulateBracketWins(breakdownA.breakdown, teamInfoMap)

    // Score all other entries under this bracket
    let maxBetter = 0
    for (const entryB of entries) {
      if (entryB.entryId === entryA.entryId) continue

      let bScore = 0
      for (const bTeamId of entryB.pickTeamIds) {
        const bInfo = teamInfoMap.get(bTeamId)
        if (!bInfo) continue
        const wins = bracketWins.get(bTeamId) ?? bInfo.wins
        bScore += bInfo.seed * wins
      }

      if (bScore > entryA.maxPossibleScore) {
        maxBetter++
      }
    }

    const maxRank = maxBetter + 1
    result.set(entryA.entryId, { maxRank, floorRank })
  }

  return result
}

// ─── Projection Helper ──────────────────────────────────────────────────────

/**
 * D1/D2 checkpoint mapping for rounds with 2-day scheduling.
 * Round 1 (R64) through Round 4 (E8) each have D1 and D2 checkpoints.
 * Rounds 5 (F4) and 6 (Championship) are single-day events.
 */
const ROUND_D1_D2: Record<number, [number, number]> = {
  1: [1, 2],  // R64: D1=CP1, D2=CP2
  2: [3, 4],  // R32: D1=CP3, D2=CP4
  3: [5, 6],  // S16: D1=CP5, D2=CP6
  4: [7, 8],  // E8: D1=CP7, D2=CP8
}

/**
 * Compute a projection array (length 11) showing the day-by-day path to max score.
 *
 * Uses the per-team breakdown from computeMaxPossibleScore to trace each team's
 * bracket path day by day, placing each future win at the correct D1/D2 checkpoint
 * based on the team's established track.
 *
 * Track assignment: if a team's last completed game was on a D1 checkpoint (odd: 1,3,5,7),
 * they play D1 for all future 2-day rounds. If D2 (even: 2,4,6,8), they play D2.
 * Teams with 0 wins (haven't played yet) default to D2 (they'll play R64 D2).
 *
 * @param breakdown - Per-team breakdown from computeMaxPossibleScore
 * @param currentScore - Entry's current actual score
 * @param latestCpIndex - The most recent completed checkpoint index
 * @param teamCheckpointMap - Optional: teamId → checkpoint index of their last completed game
 *                            (for D1/D2 track assignment)
 * @returns Array of length 11 with cumulative projected scores at each checkpoint
 */
export function computeMaxScoreProjection(
  breakdown: MaxPossibleScoreResult["breakdown"],
  currentScore: number,
  latestCpIndex: number,
  teamCheckpointMap?: Map<string, number>
): (number | null)[] {
  const projections: (number | null)[] = new Array(11).fill(null)
  const futurePointsByCheckpoint = new Map<number, number>()

  for (const team of breakdown) {
    const additionalWins = team.maxWins - team.currentWins
    if (additionalWins <= 0) continue

    // Determine team's track (D1 or D2) from their last completed game checkpoint.
    // Odd checkpoints (1,3,5,7) = D1, even checkpoints (2,4,6,8) = D2.
    // Teams with no completed games (0 wins) default to D2 (they play R64 D2).
    let teamTrack: "D1" | "D2" = "D2"
    if (teamCheckpointMap) {
      const lastCp = teamCheckpointMap.get(team.teamId)
      if (lastCp !== undefined && lastCp >= 1 && lastCp <= 8) {
        teamTrack = lastCp % 2 === 1 ? "D1" : "D2"
      }
    }

    for (let w = 1; w <= additionalWins; w++) {
      const futureRound = team.currentWins + w // round number (1=R64 ... 6=Champ)

      let cp: number
      if (futureRound === 5) {
        cp = 9 // F4 = single day
      } else if (futureRound === 6) {
        cp = 10 // Championship = single day
      } else if (futureRound >= 1 && futureRound <= 4) {
        // 2-day round: place on D1 or D2 based on team's track
        const [d1, d2] = ROUND_D1_D2[futureRound]
        cp = teamTrack === "D1" ? d1 : d2
      } else {
        cp = 10 // fallback
      }

      futurePointsByCheckpoint.set(cp, (futurePointsByCheckpoint.get(cp) ?? 0) + team.seed)
    }
  }

  // Build cumulative projection array
  let cumScore = currentScore
  if (latestCpIndex >= 0 && latestCpIndex <= 10) {
    projections[latestCpIndex] = cumScore
  }
  for (let cp = (latestCpIndex >= 0 ? latestCpIndex + 1 : 0); cp <= 10; cp++) {
    cumScore += futurePointsByCheckpoint.get(cp) ?? 0
    projections[cp] = cumScore
  }

  return projections
}
