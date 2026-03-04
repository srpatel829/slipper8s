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

/** Cross-region F4 pairings */
const F4_REGION_MATCHUPS: [string, string][] = [
  ["East", "West"],
  ["South", "Midwest"],
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
