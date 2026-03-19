/**
 * Bracket-Aware PPR (Points of Potential Remaining)
 *
 * The naive PPR formula (seed × (6 - wins)) assumes each alive team can
 * independently win all remaining games. This ignores bracket conflicts:
 * two picked teams in the same region sharing a bracket path can't both
 * advance past their collision point.
 *
 * This module computes a bracket-aware PPR that resolves conflicts at
 * each bracket merge level, choosing the team that maximizes total PPR
 * to advance at each collision.
 *
 * Bracket tree per region (8 leaf slots from R64 seed matchups):
 *   Slots:  [0:{1,16}] [1:{8,9}] [2:{5,12}] [3:{4,13}] [4:{6,11}] [5:{3,14}] [6:{7,10}] [7:{2,15}]
 *   R32:    (0,1)  (2,3)  (4,5)  (6,7)
 *   S16:    (0-1, 2-3)  (4-5, 6-7)
 *   E8:     (0-3, 4-7)
 *
 * Cross-region:
 *   F4:     East vs South, West vs Midwest
 *   Championship: F4 winner A vs F4 winner B
 */

// ─── Constants ───────────────────────────────────────────────────────────────

/** Standard R64 seed pairings — index = bracket slot */
const R64_SEED_MATCHUPS = [
  [1, 16], [8, 9], [5, 12], [4, 13], [6, 11], [3, 14], [7, 10], [2, 15],
] as const

/** Cross-region pairings for Final Four (2026 NCAA: East vs South, West vs Midwest) */
const F4_REGION_MATCHUPS: [string, string][] = [
  ["East", "South"],
  ["West", "Midwest"],
]

/**
 * Merge definitions for the bracket tree within a region.
 * Each entry: [mergeRound, slotsGroupA, slotsGroupB]
 * mergeRound = the round at which teams from groupA and groupB would meet.
 * Round 2 = R32, Round 3 = S16, Round 4 = E8.
 */
const REGION_MERGES: Array<[number, number[], number[]]> = [
  // R32 merges (round 2): adjacent R64 slots
  [2, [0], [1]],
  [2, [2], [3]],
  [2, [4], [5]],
  [2, [6], [7]],
  // S16 merges (round 3): pairs of R32 groups
  [3, [0, 1], [2, 3]],
  [3, [4, 5], [6, 7]],
  // E8 merge (round 4): full region
  [4, [0, 1, 2, 3], [4, 5, 6, 7]],
]

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TeamBracketInfo {
  seed: number
  region: string
  wins: number
  eliminated: boolean
}

interface PickedTeamState {
  id: string
  seed: number
  region: string
  wins: number
  slot: number          // bracket position 0-7 within region
  maxRound: number      // max reachable round (starts at 6, reduced by conflicts)
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Maps a team's seed to its bracket slot index (0-7).
 * Returns -1 if the seed doesn't map to a standard slot (play-in teams).
 */
export function seedToSlot(seed: number): number {
  for (let i = 0; i < R64_SEED_MATCHUPS.length; i++) {
    if ((R64_SEED_MATCHUPS[i] as readonly number[]).includes(seed)) return i
  }
  return -1
}

/**
 * Computes bracket-aware PPR for a user's picks at the current game state.
 *
 * @param pickedTeamIds - The user's 8 (or fewer) picked team IDs
 * @param teamInfoMap   - Map of teamId → { seed, region, wins, eliminated }
 * @returns totalPPR and per-team PPR breakdown
 */
export function computeBracketAwarePPR(
  pickedTeamIds: string[],
  teamInfoMap: Map<string, TeamBracketInfo>
): { totalPPR: number; perTeam: Map<string, number> } {
  const perTeam = new Map<string, number>()

  // Initialize all picked teams with 0 PPR
  for (const id of pickedTeamIds) {
    perTeam.set(id, 0)
  }

  // Build alive picked team state with bracket positions
  const aliveTeams: PickedTeamState[] = []
  for (const id of pickedTeamIds) {
    const info = teamInfoMap.get(id)
    if (!info || info.eliminated) continue
    const slot = seedToSlot(info.seed)
    if (slot === -1) continue // skip play-in teams without a standard slot
    aliveTeams.push({
      id,
      seed: info.seed,
      region: info.region,
      wins: info.wins,
      slot,
      maxRound: 6, // start optimistic: could win championship
    })
  }

  if (aliveTeams.length === 0) {
    return { totalPPR: 0, perTeam }
  }

  // ── Phase 1: Intra-region conflicts (rounds 2-4) ──────────────────────

  const regions = ["East", "West", "South", "Midwest"]
  const regionChampionMap = new Map<string, PickedTeamState>() // region → team that could be champion

  for (const region of regions) {
    const regionTeams = aliveTeams.filter(t => t.region === region)
    if (regionTeams.length === 0) continue

    // Walk merge levels from R32 → E8
    for (const [mergeRound, groupA, groupB] of REGION_MERGES) {
      const inA = regionTeams.filter(t => groupA.includes(t.slot) && t.maxRound >= mergeRound)
      const inB = regionTeams.filter(t => groupB.includes(t.slot) && t.maxRound >= mergeRound)

      if (inA.length > 0 && inB.length > 0) {
        // Collision! Teams from both sides would meet at mergeRound.
        // Find the best team from each side (highest potential if they continue).
        const bestA = pickBestTeam(inA, mergeRound)
        const bestB = pickBestTeam(inB, mergeRound)

        // Compare: which team continuing past this merge gives more PPR?
        // PPR from this merge onward = seed × max(0, currentMaxRound - mergeRound + 1)
        // But simplified: we just compare seed × (rounds beyond this merge).
        // The team that doesn't advance has maxRound capped to mergeRound - 1.
        const pprA = bestA.seed * Math.max(0, bestA.maxRound - (mergeRound - 1))
        const pprB = bestB.seed * Math.max(0, bestB.maxRound - (mergeRound - 1))

        if (pprA >= pprB) {
          // A advances, B stops at mergeRound - 1
          bestB.maxRound = Math.min(bestB.maxRound, mergeRound - 1)
        } else {
          // B advances, A stops
          bestA.maxRound = Math.min(bestA.maxRound, mergeRound - 1)
        }
      }
    }

    // Determine region champion (team with maxRound >= 4)
    const champion = regionTeams
      .filter(t => t.maxRound >= 4)
      .sort((a, b) => {
        const pprA = a.seed * Math.max(0, a.maxRound - a.wins)
        const pprB = b.seed * Math.max(0, b.maxRound - b.wins)
        return pprB - pprA
      })[0]

    if (champion) {
      regionChampionMap.set(region, champion)
    }
  }

  // ── Phase 2: Cross-region conflicts (F4, round 5) ─────────────────────

  const f4Winners: PickedTeamState[] = []

  for (const [regionA, regionB] of F4_REGION_MATCHUPS) {
    const champA = regionChampionMap.get(regionA)
    const champB = regionChampionMap.get(regionB)

    if (champA && champB) {
      // Both are picked alive teams — they'd meet in F4
      const pprA = champA.seed * Math.max(0, champA.maxRound - 4) // rounds 5-6
      const pprB = champB.seed * Math.max(0, champB.maxRound - 4)

      if (pprA >= pprB) {
        champB.maxRound = Math.min(champB.maxRound, 4) // stops at E8 champion
        f4Winners.push(champA)
      } else {
        champA.maxRound = Math.min(champA.maxRound, 4)
        f4Winners.push(champB)
      }
    } else if (champA) {
      f4Winners.push(champA)
    } else if (champB) {
      f4Winners.push(champB)
    }
  }

  // ── Phase 3: Championship conflict (round 6) ─────────────────────────

  if (f4Winners.length === 2) {
    const [a, b] = f4Winners
    const pprA = a.seed * Math.max(0, a.maxRound - 5) // round 6 only
    const pprB = b.seed * Math.max(0, b.maxRound - 5)

    if (pprA >= pprB) {
      b.maxRound = Math.min(b.maxRound, 5) // stops at F4 winner
    } else {
      a.maxRound = Math.min(a.maxRound, 5)
    }
  }

  // ── Compute final per-team PPR ────────────────────────────────────────

  for (const t of aliveTeams) {
    const additionalWins = Math.max(0, t.maxRound - t.wins)
    perTeam.set(t.id, t.seed * additionalWins)
  }

  const totalPPR = Array.from(perTeam.values()).reduce((s, v) => s + v, 0)
  return { totalPPR, perTeam }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * From a set of alive picked teams in a bracket group, find the one with
 * the highest PPR potential if it continues advancing.
 */
function pickBestTeam(teams: PickedTeamState[], fromRound: number): PickedTeamState {
  return teams.reduce((best, t) => {
    const pprT = t.seed * Math.max(0, t.maxRound - (fromRound - 1))
    const pprBest = best.seed * Math.max(0, best.maxRound - (fromRound - 1))
    return pprT > pprBest ? t : best
  })
}
