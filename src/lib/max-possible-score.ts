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
 * Score entry B's picks under entry A's optimal bracket.
 *
 * Entry A's optimal bracket (from computeMaxPossibleScore) defines which of A's
 * teams advance and how far. For each of B's picks:
 *   - Eliminated: locked at seed × currentWins
 *   - Same team as one of A's picks: B benefits, team advances to A's maxWins
 *   - Conflicts with A's advancing pick: B's team capped at meetingRound - 1
 *   - No interaction with A's picks: stays at currentWins (best case for A = minimize B)
 *
 * @param entryB_pickIds - B's 8 picked team IDs
 * @param entryA_breakdown - A's breakdown from computeMaxPossibleScore
 * @param teamInfoMap - Global team info
 * @returns B's total score under A's optimal bracket
 */
export function computeScoreUnderBracket(
  entryB_pickIds: string[],
  entryA_breakdown: MaxPossibleScoreResult["breakdown"],
  teamInfoMap: Map<string, TeamBracketInfo>
): number {
  // Build lookup from A's breakdown: teamId → { seed, region, maxWins }
  const aTeamMap = new Map<string, { seed: number; region: string; maxWins: number }>()
  for (const item of entryA_breakdown) {
    const info = teamInfoMap.get(item.teamId)
    if (info) {
      aTeamMap.set(item.teamId, {
        seed: info.seed,
        region: info.region,
        maxWins: item.maxWins,
      })
    }
  }

  let totalScore = 0

  for (const bTeamId of entryB_pickIds) {
    const bInfo = teamInfoMap.get(bTeamId)
    if (!bInfo) continue

    // Eliminated teams: locked score
    if (bInfo.eliminated) {
      totalScore += bInfo.seed * bInfo.wins
      continue
    }

    // Play-in teams without standard slot: locked at current
    const bSlot = seedToSlot(bInfo.seed)
    if (bSlot === -1) {
      totalScore += bInfo.seed * bInfo.wins
      continue
    }

    // Check if B picked the same team as A
    const aMatch = aTeamMap.get(bTeamId)
    if (aMatch) {
      // Same team — B benefits from A's team advancing
      totalScore += bInfo.seed * aMatch.maxWins
      continue
    }

    // Check for bracket collision with any of A's advancing picks
    let bMaxWins = bInfo.wins // default: stays at currentWins (best case for A)

    for (const [aTeamId, aData] of aTeamMap) {
      if (aTeamId === bTeamId) continue // already handled above
      // Only check A's alive advancing picks
      const aInfo = teamInfoMap.get(aTeamId)
      if (!aInfo || aInfo.eliminated) continue

      const round = meetingRound(
        { seed: bInfo.seed, region: bInfo.region },
        { seed: aInfo.seed, region: aInfo.region }
      )

      if (round !== null && aData.maxWins >= round) {
        // A's pick reaches this meeting round → A's pick wins, B's team is capped
        // B's team can advance UP TO round - 1 (it loses at this round)
        // But for maxRank we want to MINIMIZE B's score, so only give B credit
        // if B's team already has enough wins to reach this point
        const capWins = round - 1
        // B's team gets min(capWins, what we'd otherwise give it)
        // Since default is currentWins, only upgrade if capWins > currentWins
        // (B's team must have at least currentWins, and could advance up to round-1)
        // For maxRank: we give B the MINIMUM possible, which is currentWins
        // UNLESS B's team is the one that A's team would beat — in which case
        // B's team still gets to round-1 (they advanced to face A's team)
        // Wait — no. For maxRank, B's teams that conflict get capped at round-1
        // but only if they WOULD have met. Since we're constructing A's bracket,
        // A's team is in that bracket path. B's team would need to reach that round
        // to meet A's team. Since we're minimizing B's score, we assume B's team
        // DOESN'T advance to that round (stays at currentWins).
        // The cap only matters if currentWins is already >= round - 1.
        bMaxWins = Math.min(bMaxWins, capWins)
        break // first collision is the earliest, no need to check further
      }
    }

    totalScore += bInfo.seed * bMaxWins
  }

  return totalScore
}

/**
 * Compute collision-aware maxRank and floorRank for all entries.
 *
 * maxRank: For each entry A, construct A's optimal bracket, score all other
 *          entries under that bracket, count how many score > A's maxPossibleScore.
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
  const total = entries.length

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

    // Full bracket simulation: score all other entries under A's bracket
    const breakdownA = breakdownCache.get(entryA.entryId)!
    let maxBetter = 0

    for (const entryB of entries) {
      if (entryB.entryId === entryA.entryId) continue

      const bScore = computeScoreUnderBracket(
        entryB.pickTeamIds,
        breakdownA.breakdown,
        teamInfoMap
      )

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

/** Maps tournament round (1-6) to the LAST checkpoint of that round */
const ROUND_TO_LAST_CP: Record<number, number> = {
  1: 2,  // R64 → CP 2
  2: 4,  // R32 → CP 4
  3: 6,  // S16 → CP 6
  4: 8,  // E8 → CP 8
  5: 9,  // F4 → CP 9
  6: 10, // Championship → CP 10
}

/**
 * Track pairing for D1/D2 checkpoint resolution.
 * R64→R32 share a track, S16→E8 share a track.
 * Maps round to its D1 and D2 checkpoint indices.
 */
const ROUND_D1_D2: Record<number, [number, number]> = {
  1: [1, 2],  // R64: D1=CP1, D2=CP2
  2: [3, 4],  // R32: D1=CP3, D2=CP4
  3: [5, 6],  // S16: D1=CP5, D2=CP6
  4: [7, 8],  // E8: D1=CP7, D2=CP8
}

/**
 * Track groups: rounds that share a D1/D2 track.
 * If a team plays on D1 of round X, it plays D1 of round Y (within same group).
 */
const TRACK_GROUPS: number[][] = [
  [1, 2], // R64 and R32 share track
  [3, 4], // S16 and E8 share track
]

/**
 * Compute a projection array (length 11) showing the round-by-round path to max score.
 *
 * Uses the per-team breakdown from computeMaxPossibleScore to distribute future wins
 * across checkpoints, respecting day-specific scheduling where known.
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

    // Determine team's track (D1 or D2) from their last completed game checkpoint
    let teamTrack: "D1" | "D2" | null = null
    if (teamCheckpointMap) {
      const lastCp = teamCheckpointMap.get(team.teamId)
      if (lastCp !== undefined) {
        // Check if lastCp is a D1 or D2 checkpoint
        for (const [round, [d1, d2]] of Object.entries(ROUND_D1_D2)) {
          if (lastCp === d1) { teamTrack = "D1"; break }
          if (lastCp === d2) { teamTrack = "D2"; break }
        }
      }
    }

    for (let w = 1; w <= additionalWins; w++) {
      const futureRound = team.currentWins + w

      let cp: number
      if (futureRound === 5) {
        cp = 9 // F4 = single day
      } else if (futureRound === 6) {
        cp = 10 // Championship = single day
      } else if (futureRound >= 1 && futureRound <= 4 && teamTrack && ROUND_D1_D2[futureRound]) {
        // Check if future round is in the same track group as the team's known track
        const currentRound = team.currentWins // round the team just completed
        const inSameGroup = TRACK_GROUPS.some(
          group => group.includes(currentRound) && group.includes(futureRound)
        )
        // Also handle: team is at 0 wins (pre-tournament) going to round 1
        // In that case, we don't know track yet, use fallback
        if (inSameGroup && currentRound >= 1) {
          const [d1, d2] = ROUND_D1_D2[futureRound]
          cp = teamTrack === "D1" ? d1 : d2
        } else {
          // Different track group or unknown → use end of round
          cp = ROUND_TO_LAST_CP[futureRound] ?? 10
        }
      } else {
        cp = ROUND_TO_LAST_CP[futureRound] ?? 10
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
