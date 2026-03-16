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
// Source: Sb_Mens_Ncaa_Projections_20260315_20h.xlsx (15 Mar 2026 20:44 ET)
// teamId = ESPN ID (used as lookup key via team.espnId)

export const SILVER_BULLETIN_2026: SilverBulletinTeam[] = [
  // ── East ──
  { teamId: "150",    sbName: "Duke",              seed: 1,  region: "East",    playIn: false, cumulative: [1, 0.98966, 0.75904, 0.55190, 0.40906, 0.25824, 0.15779] },
  { teamId: "41",     sbName: "UConn",             seed: 2,  region: "East",    playIn: false, cumulative: [1, 0.89507, 0.60342, 0.36255, 0.15241, 0.06644, 0.02774] },
  { teamId: "127",    sbName: "Michigan St.",       seed: 3,  region: "East",    playIn: false, cumulative: [1, 0.91162, 0.52147, 0.25391, 0.08479, 0.03186, 0.01090] },
  { teamId: "2305",   sbName: "Kansas",            seed: 4,  region: "East",    playIn: false, cumulative: [1, 0.88050, 0.45669, 0.14608, 0.07384, 0.02744, 0.01017] },
  { teamId: "2599",   sbName: "St. John's",        seed: 5,  region: "East",    playIn: false, cumulative: [1, 0.81094, 0.46842, 0.18205, 0.10462, 0.04480, 0.01723] },
  { teamId: "97",     sbName: "Louisville",         seed: 6,  region: "East",    playIn: false, cumulative: [1, 0.69160, 0.35895, 0.18227, 0.06597, 0.02754, 0.01085] },
  { teamId: "26",     sbName: "UCLA",               seed: 7,  region: "East",    playIn: false, cumulative: [1, 0.70638, 0.29782, 0.14029, 0.04186, 0.01323, 0.00383] },
  { teamId: "194",    sbName: "Ohio St.",           seed: 8,  region: "East",    playIn: false, cumulative: [1, 0.68235, 0.18774, 0.09309, 0.04792, 0.01918, 0.00706] },
  { teamId: "2628",   sbName: "TCU",               seed: 9,  region: "East",    playIn: false, cumulative: [1, 0.31765, 0.05298, 0.01765, 0.00633, 0.00170, 0.00035] },
  { teamId: "2116",   sbName: "UCF",               seed: 10, region: "East",    playIn: false, cumulative: [1, 0.29362, 0.07544, 0.02158, 0.00336, 0.00063, 0.00007] },
  { teamId: "58",     sbName: "South Florida",      seed: 11, region: "East",    playIn: false, cumulative: [1, 0.30840, 0.10629, 0.03360, 0.00680, 0.00139, 0.00026] },
  { teamId: "2460",   sbName: "Northern Iowa",      seed: 12, region: "East",    playIn: false, cumulative: [1, 0.18906, 0.05401, 0.00797, 0.00235, 0.00049, 0.00007] },
  { teamId: "2856",   sbName: "California Baptist", seed: 13, region: "East",    playIn: false, cumulative: [1, 0.11950, 0.02088, 0.00126, 0.00015, 0.00003, 0.00001] },
  { teamId: "2449",   sbName: "North Dakota St.",   seed: 14, region: "East",    playIn: false, cumulative: [1, 0.08838, 0.01329, 0.00169, 0.00016, 0.00001, 0] },
  { teamId: "231",    sbName: "Furman",             seed: 15, region: "East",    playIn: false, cumulative: [1, 0.10493, 0.02332, 0.00411, 0.00038, 0.00002, 0] },
  { teamId: "2561",   sbName: "Siena",             seed: 16, region: "East",    playIn: false, cumulative: [1, 0.01034, 0.00024, 0, 0, 0, 0] },

  // ── South ──
  { teamId: "57",     sbName: "Florida",            seed: 1,  region: "South",   playIn: false, cumulative: [1, 0.99132, 0.85001, 0.60447, 0.33720, 0.18961, 0.09950] },
  { teamId: "248",    sbName: "Houston",            seed: 2,  region: "South",   playIn: false, cumulative: [1, 0.96730, 0.75058, 0.46373, 0.26948, 0.13492, 0.06327] },
  { teamId: "356",    sbName: "Illinois",           seed: 3,  region: "South",   playIn: false, cumulative: [1, 0.98125, 0.82920, 0.42456, 0.22297, 0.11837, 0.05908] },
  { teamId: "158",    sbName: "Nebraska",           seed: 4,  region: "South",   playIn: false, cumulative: [1, 0.91424, 0.42921, 0.13331, 0.04529, 0.01655, 0.00532] },
  { teamId: "238",    sbName: "Vanderbilt",         seed: 5,  region: "South",   playIn: false, cumulative: [1, 0.83960, 0.51430, 0.19805, 0.07969, 0.03477, 0.01383] },
  { teamId: "153",    sbName: "North Carolina",     seed: 6,  region: "South",   playIn: false, cumulative: [1, 0.45606, 0.07196, 0.01328, 0.00252, 0.00058, 0.00005] },
  { teamId: "2608",   sbName: "Saint Mary's (CA)",  seed: 7,  region: "South",   playIn: false, cumulative: [1, 0.58767, 0.16035, 0.05389, 0.01665, 0.00532, 0.00142] },
  { teamId: "228",    sbName: "Clemson",            seed: 8,  region: "South",   playIn: false, cumulative: [1, 0.34795, 0.03843, 0.01213, 0.00233, 0.00072, 0.00013] },
  { teamId: "2294",   sbName: "Iowa",               seed: 9,  region: "South",   playIn: false, cumulative: [1, 0.65205, 0.11105, 0.04412, 0.01210, 0.00374, 0.00117] },
  { teamId: "245",    sbName: "Texas A&M",          seed: 10, region: "South",   playIn: false, cumulative: [1, 0.41233, 0.08493, 0.02384, 0.00626, 0.00128, 0.00020] },
  { teamId: "2670",   sbName: "VCU",                seed: 11, region: "South",   playIn: false, cumulative: [1, 0.54394, 0.09650, 0.02028, 0.00414, 0.00094, 0.00019] },
  { teamId: "2377",   sbName: "McNeese",            seed: 12, region: "South",   playIn: false, cumulative: [1, 0.16040, 0.04774, 0.00732, 0.00129, 0.00018, 0.00006] },
  { teamId: "2653",   sbName: "Troy",               seed: 13, region: "South",   playIn: false, cumulative: [1, 0.08576, 0.00875, 0.00059, 0.00003, 0.00001, 0] },
  { teamId: "219",    sbName: "Penn",               seed: 14, region: "South",   playIn: false, cumulative: [1, 0.01875, 0.00234, 0.00008, 0.00001, 0, 0] },
  { teamId: "70",     sbName: "Idaho",              seed: 15, region: "South",   playIn: false, cumulative: [1, 0.03270, 0.00414, 0.00034, 0.00004, 0.00001, 0] },
  { teamId: "2504",   sbName: "Prairie View A&M",   seed: 16, region: "South",   playIn: true,  cumulative: [0.46058, 0.00375, 0.00023, 0, 0, 0, 0] },
  { teamId: "2329",   sbName: "Lehigh",             seed: 16, region: "South",   playIn: true,  cumulative: [0.53942, 0.00493, 0.00028, 0.00001, 0, 0, 0] },

  // ── West ──
  { teamId: "12",     sbName: "Arizona",            seed: 1,  region: "West",    playIn: false, cumulative: [1, 0.99004, 0.89883, 0.73994, 0.54519, 0.32746, 0.18814] },
  { teamId: "2509",   sbName: "Purdue",             seed: 2,  region: "West",    playIn: false, cumulative: [1, 0.97808, 0.74918, 0.46165, 0.17945, 0.08688, 0.04142] },
  { teamId: "2250",   sbName: "Gonzaga",            seed: 3,  region: "West",    playIn: false, cumulative: [1, 0.97007, 0.72562, 0.36792, 0.13334, 0.05422, 0.02291] },
  { teamId: "8",      sbName: "Arkansas",           seed: 4,  region: "West",    playIn: false, cumulative: [1, 0.93042, 0.49727, 0.10746, 0.04606, 0.01525, 0.00477] },
  { teamId: "275",    sbName: "Wisconsin",          seed: 5,  region: "West",    playIn: false, cumulative: [1, 0.78589, 0.43518, 0.10711, 0.04947, 0.01892, 0.00706] },
  { teamId: "252",    sbName: "BYU",                seed: 6,  region: "West",    playIn: false, cumulative: [1, 0.46935, 0.11986, 0.03175, 0.00521, 0.00077, 0.00014] },
  { teamId: "2390",   sbName: "U Miami (FL)",       seed: 7,  region: "West",    playIn: false, cumulative: [1, 0.53694, 0.13756, 0.05573, 0.01227, 0.00360, 0.00114] },
  { teamId: "222",    sbName: "Villanova",          seed: 8,  region: "West",    playIn: false, cumulative: [1, 0.33873, 0.02352, 0.00726, 0.00160, 0.00027, 0.00005] },
  { teamId: "328",    sbName: "Utah St.",           seed: 9,  region: "West",    playIn: false, cumulative: [1, 0.66127, 0.07671, 0.03216, 0.01083, 0.00259, 0.00064] },
  { teamId: "142",    sbName: "Missouri",           seed: 10, region: "West",    playIn: false, cumulative: [1, 0.46306, 0.11140, 0.03895, 0.00754, 0.00203, 0.00039] },
  { teamId: "251",    sbName: "Texas",              seed: 11, region: "West",    playIn: true,  cumulative: [0.43150, 0.22094, 0.06054, 0.01715, 0.00303, 0.00058, 0.00014] },
  { teamId: "152",    sbName: "NC State",           seed: 11, region: "West",    playIn: true,  cumulative: [0.56850, 0.30971, 0.09095, 0.02654, 0.00479, 0.00109, 0.00020] },
  { teamId: "2272",   sbName: "High Point",         seed: 12, region: "West",    playIn: false, cumulative: [1, 0.21411, 0.05948, 0.00570, 0.00115, 0.00018, 0.00003] },
  { teamId: "2314",   sbName: "High Point",         seed: 12, region: "West",    playIn: false, cumulative: [1, 0.21411, 0.05948, 0.00570, 0.00115, 0.00018, 0.00003] },
  { teamId: "62",     sbName: "Hawaii",             seed: 13, region: "West",    playIn: false, cumulative: [1, 0.06958, 0.00807, 0.00032, 0.00005, 0, 0] },
  { teamId: "338",    sbName: "Kennesaw St.",       seed: 14, region: "West",    playIn: false, cumulative: [1, 0.02993, 0.00303, 0.00016, 0, 0, 0] },
  { teamId: "2511",   sbName: "Queens",             seed: 15, region: "West",    playIn: false, cumulative: [1, 0.02192, 0.00186, 0.00015, 0.00001, 0, 0] },
  { teamId: "112358", sbName: "LIU",                seed: 16, region: "West",    playIn: false, cumulative: [1, 0.00996, 0.00094, 0.00005, 0.00001, 0, 0] },

  // ── Midwest ──
  { teamId: "130",    sbName: "Michigan",           seed: 1,  region: "Midwest", playIn: false, cumulative: [1, 0.95450, 0.80345, 0.61135, 0.39079, 0.22255, 0.12432] },
  { teamId: "66",     sbName: "Iowa St.",           seed: 2,  region: "Midwest", playIn: false, cumulative: [1, 0.97405, 0.72966, 0.50117, 0.27353, 0.14218, 0.07261] },
  { teamId: "258",    sbName: "Virginia",           seed: 3,  region: "Midwest", playIn: false, cumulative: [1, 0.94306, 0.54672, 0.21477, 0.08335, 0.03149, 0.01207] },
  { teamId: "333",    sbName: "Alabama",            seed: 4,  region: "Midwest", playIn: false, cumulative: [1, 0.89964, 0.72645, 0.26986, 0.12198, 0.04811, 0.01925] },
  { teamId: "2641",   sbName: "Texas Tech",         seed: 5,  region: "Midwest", playIn: false, cumulative: [1, 0.63431, 0.16894, 0.03196, 0.00792, 0.00150, 0.00032] },
  { teamId: "2633",   sbName: "Tennessee",          seed: 6,  region: "Midwest", playIn: false, cumulative: [1, 0.80984, 0.39810, 0.15379, 0.05844, 0.02146, 0.00801] },
  { teamId: "96",     sbName: "Kentucky",           seed: 7,  region: "Midwest", playIn: false, cumulative: [1, 0.65761, 0.20038, 0.09553, 0.03303, 0.01167, 0.00418] },
  { teamId: "61",     sbName: "Georgia",            seed: 8,  region: "Midwest", playIn: false, cumulative: [1, 0.57429, 0.11502, 0.04577, 0.01354, 0.00350, 0.00076] },
  { teamId: "139",    sbName: "Saint Louis",        seed: 9,  region: "Midwest", playIn: false, cumulative: [1, 0.42571, 0.07174, 0.02659, 0.00686, 0.00141, 0.00035] },
  { teamId: "2541",   sbName: "Santa Clara",        seed: 10, region: "Midwest", playIn: false, cumulative: [1, 0.34239, 0.06772, 0.02352, 0.00579, 0.00126, 0.00032] },
  { teamId: "2567",   sbName: "SMU",                seed: 11, region: "Midwest", playIn: true,  cumulative: [0.70776, 0.16288, 0.04574, 0.01033, 0.00241, 0.00072, 0.00018] },
  { teamId: "193",    sbName: "Miami (OH)",         seed: 11, region: "Midwest", playIn: true,  cumulative: [0.29224, 0.02728, 0.00333, 0.00030, 0.00002, 0, 0] },
  { teamId: "2006",   sbName: "Akron",              seed: 12, region: "Midwest", playIn: false, cumulative: [1, 0.36569, 0.06719, 0.00876, 0.00149, 0.00023, 0.00004] },
  { teamId: "2275",   sbName: "Hofstra",            seed: 13, region: "Midwest", playIn: false, cumulative: [1, 0.10036, 0.03742, 0.00425, 0.00064, 0.00008, 0.00001] },
  { teamId: "2750",   sbName: "Wright St.",         seed: 14, region: "Midwest", playIn: false, cumulative: [1, 0.05694, 0.00611, 0.00041, 0.00003, 0, 0] },
  { teamId: "2918",   sbName: "Wright St.",         seed: 14, region: "Midwest", playIn: false, cumulative: [1, 0.05694, 0.00611, 0.00041, 0.00003, 0, 0] },
  { teamId: "2634",   sbName: "Tennessee St.",      seed: 15, region: "Midwest", playIn: false, cumulative: [1, 0.02595, 0.00224, 0.00018, 0.00001, 0, 0] },
  { teamId: "2692",   sbName: "UMBC",               seed: 16, region: "Midwest", playIn: true,  cumulative: [0.39330, 0.01415, 0.00249, 0.00023, 0.00002, 0, 0] },
  { teamId: "47",     sbName: "Howard",             seed: 16, region: "Midwest", playIn: true,  cumulative: [0.60670, 0.03135, 0.00730, 0.00123, 0.00015, 0, 0] },
]

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
