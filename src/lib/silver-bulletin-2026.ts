/**
 * Silver Bulletin 2026 pre-tournament win probabilities.
 *
 * PLACEHOLDER — update when Nate Silver publishes 2026 probabilities.
 * Until then, all lookup functions return null and the UI gracefully
 * hides the expected-score fields.
 *
 * Data format (when populated):
 *   cumulative[0] = P(in tournament)         — 1.0 for non-play-in, <1.0 for play-in
 *   cumulative[1] = P(win ≥ 1 game)          — P(reach Round of 32)
 *   cumulative[2] = P(win ≥ 2 games)         — P(reach Sweet 16)
 *   cumulative[3] = P(win ≥ 3 games)         — P(reach Elite 8)
 *   cumulative[4] = P(win ≥ 4 games)         — P(reach Final Four)
 *   cumulative[5] = P(win ≥ 5 games)         — P(reach Championship)
 *   cumulative[6] = P(win ≥ 6 games = champ) — P(win it all)
 */

export interface SilverBulletinTeam {
  /** Team ID slug (matches team-data-2026.ts teamIds) */
  teamId: string
  /** Display name from Silver Bulletin */
  sbName: string
  /** Numeric seed */
  seed: number
  /** Region */
  region: string
  /** Whether this is a play-in team */
  playIn: boolean
  /**
   * Cumulative win probabilities [P(in tourney), P(≥1 win), P(≥2), P(≥3), P(≥4), P(≥5), P(≥6)]
   * 7 values, indices 0-6
   */
  cumulative: [number, number, number, number, number, number, number]
}

// ─── 2026 Silver Bulletin Probability Data ──────────────────────────────────
// TODO: populate when Silver Bulletin publishes 2026 pre-tournament probabilities

export const SILVER_BULLETIN_2026: SilverBulletinTeam[] = []

// ── Lookup Map ──────────────────────────────────────────────────────────────

export const SB_2026_MAP: Map<string, SilverBulletinTeam> = new Map(
  SILVER_BULLETIN_2026.map((t) => [t.teamId, t]),
)

/**
 * Pre-tournament expected score for a team.
 * Returns null if no probability data available.
 */
export function pretournamentExpectedScore(teamId: string): number | null {
  const team = SB_2026_MAP.get(teamId)
  if (!team) return null

  let expectedWins = 0
  for (let k = 1; k <= 6; k++) {
    expectedWins += team.cumulative[k]
  }
  return Math.round(team.seed * expectedWins * 10) / 10
}

/**
 * Expected score at a given tournament state (wins so far, eliminated or not).
 * Returns null if no probability data available.
 */
export function expectedScoreAtState(
  teamId: string,
  wins: number,
  eliminated: boolean,
): number | null {
  const team = SB_2026_MAP.get(teamId)
  if (!team) return null

  if (eliminated) {
    return team.seed * wins
  }

  // Conditional probability of additional wins given survival
  const denominator = wins === 0 ? team.cumulative[0] : team.cumulative[wins]
  if (denominator <= 0) return team.seed * wins

  let remainingExpectedWins = 0
  for (let k = wins + 1; k <= 6; k++) {
    remainingExpectedWins += team.cumulative[k] / denominator
  }

  return team.seed * (wins + remainingExpectedWins)
}

/**
 * Calculate total expected score for an entry (array of team IDs) at a given game state.
 */
export function calculateEntryExpectedScore(
  teamIds: string[],
  teamStates: Map<string, { wins: number; eliminated: boolean }>,
  preTournament: boolean = false,
): number | null {
  let total = 0
  let hasData = false

  for (const teamId of teamIds) {
    let score: number | null

    if (preTournament) {
      score = pretournamentExpectedScore(teamId)
    } else {
      const state = teamStates.get(teamId)
      if (state) {
        score = expectedScoreAtState(teamId, state.wins, state.eliminated)
      } else {
        score = expectedScoreAtState(teamId, 0, false)
      }
    }

    if (score !== null) {
      total += score
      hasData = true
    }
  }

  return hasData ? Math.round(total * 10) / 10 : null
}
