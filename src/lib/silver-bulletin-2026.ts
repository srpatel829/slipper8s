/**
 * Silver Bulletin 2026 win probabilities.
 *
 * Data format:
 *   cumulative[0] = P(in tournament)         — 1.0 for non-play-in, <1.0 for play-in (pre-play-in), 0 for eliminated play-in losers
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
// Source: Sb_Mens_Ncaa_Projections_20260319_00h.xlsx (19 Mar 2026 00:00 ET)
// Updated post-play-in games. teamId = ESPN ID (used as lookup key via team.espnId)

export const SILVER_BULLETIN_2026: SilverBulletinTeam[] = [
  // ── East ──
  { teamId: "150",    sbName: "Duke",              seed: 1,  region: "East",    playIn: false, cumulative: [1, 0.98765, 0.84485, 0.65777, 0.50559, 0.32734, 0.19089] },
  { teamId: "41",     sbName: "UConn",             seed: 2,  region: "East",    playIn: false, cumulative: [1, 0.94179, 0.67136, 0.37751, 0.1346, 0.05682, 0.02058] },
  { teamId: "127",    sbName: "Michigan St.",       seed: 3,  region: "East",    playIn: false, cumulative: [1, 0.92395, 0.54029, 0.2834, 0.09408, 0.0389, 0.01392] },
  { teamId: "2305",   sbName: "Kansas",            seed: 4,  region: "East",    playIn: false, cumulative: [1, 0.86255, 0.4165, 0.10107, 0.04823, 0.01738, 0.00547] },
  { teamId: "2599",   sbName: "St. John's",        seed: 5,  region: "East",    playIn: false, cumulative: [1, 0.8254, 0.50669, 0.1658, 0.09463, 0.04037, 0.0149] },
  { teamId: "97",     sbName: "Louisville",         seed: 6,  region: "East",    playIn: false, cumulative: [1, 0.69861, 0.35559, 0.18279, 0.05817, 0.02436, 0.00858] },
  { teamId: "26",     sbName: "UCLA",               seed: 7,  region: "East",    playIn: false, cumulative: [1, 0.69158, 0.25197, 0.10511, 0.02567, 0.00815, 0.00238] },
  { teamId: "194",    sbName: "Ohio St.",           seed: 8,  region: "East",    playIn: false, cumulative: [1, 0.64172, 0.11337, 0.05335, 0.02439, 0.00815, 0.00237] },
  { teamId: "2628",   sbName: "TCU",               seed: 9,  region: "East",    playIn: false, cumulative: [1, 0.35828, 0.04104, 0.01439, 0.00477, 0.0011, 0.00024] },
  { teamId: "2116",   sbName: "UCF",               seed: 10, region: "East",    playIn: false, cumulative: [1, 0.30842, 0.06788, 0.01827, 0.00255, 0.00049, 0.0001] },
  { teamId: "58",     sbName: "South Florida",      seed: 11, region: "East",    playIn: false, cumulative: [1, 0.30139, 0.09413, 0.03079, 0.00537, 0.00104, 0.0002] },
  { teamId: "2460",   sbName: "Northern Iowa",      seed: 12, region: "East",    playIn: false, cumulative: [1, 0.1746, 0.05364, 0.00646, 0.00165, 0.0003, 0.00005] },
  { teamId: "2856",   sbName: "California Baptist", seed: 13, region: "East",    playIn: false, cumulative: [1, 0.13745, 0.02317, 0.00113, 0.00015, 0.00002, 0] },
  { teamId: "2449",   sbName: "North Dakota St.",   seed: 14, region: "East",    playIn: false, cumulative: [1, 0.07605, 0.00999, 0.00117, 0.00011, 0.00001, 0] },
  { teamId: "231",    sbName: "Furman",             seed: 15, region: "East",    playIn: false, cumulative: [1, 0.05821, 0.00879, 0.00096, 0.00004, 0.00001, 0] },
  { teamId: "2561",   sbName: "Siena",             seed: 16, region: "East",    playIn: false, cumulative: [1, 0.01235, 0.00074, 0.00003, 0, 0, 0] },

  // ── South ──
  { teamId: "57",     sbName: "Florida",            seed: 1,  region: "South",   playIn: false, cumulative: [1, 0.99156, 0.83572, 0.60083, 0.34377, 0.18505, 0.0937] },
  { teamId: "248",    sbName: "Houston",            seed: 2,  region: "South",   playIn: false, cumulative: [1, 0.96836, 0.75138, 0.49247, 0.28882, 0.13887, 0.06265] },
  { teamId: "356",    sbName: "Illinois",           seed: 3,  region: "South",   playIn: false, cumulative: [1, 0.97103, 0.78811, 0.37647, 0.18672, 0.09034, 0.04041] },
  { teamId: "158",    sbName: "Nebraska",           seed: 4,  region: "South",   playIn: false, cumulative: [1, 0.92681, 0.44691, 0.14009, 0.04872, 0.01658, 0.00553] },
  { teamId: "238",    sbName: "Vanderbilt",         seed: 5,  region: "South",   playIn: false, cumulative: [1, 0.84041, 0.50126, 0.18793, 0.07854, 0.03119, 0.0118] },
  { teamId: "153",    sbName: "North Carolina",     seed: 6,  region: "South",   playIn: false, cumulative: [1, 0.50222, 0.10489, 0.02206, 0.00474, 0.00098, 0.00015] },
  { teamId: "2608",   sbName: "Saint Mary's (CA)",  seed: 7,  region: "South",   playIn: false, cumulative: [1, 0.58189, 0.15777, 0.05814, 0.01779, 0.00501, 0.00131] },
  { teamId: "228",    sbName: "Clemson",            seed: 8,  region: "South",   playIn: false, cumulative: [1, 0.40279, 0.06214, 0.02285, 0.00594, 0.00148, 0.00031] },
  { teamId: "2294",   sbName: "Iowa",               seed: 9,  region: "South",   playIn: false, cumulative: [1, 0.59721, 0.10183, 0.04144, 0.01176, 0.00342, 0.00099] },
  { teamId: "245",    sbName: "Texas A&M",          seed: 10, region: "South",   playIn: false, cumulative: [1, 0.41811, 0.08725, 0.0286, 0.00712, 0.00155, 0.00034] },
  { teamId: "2670",   sbName: "VCU",                seed: 11, region: "South",   playIn: false, cumulative: [1, 0.49778, 0.10272, 0.02183, 0.00476, 0.00094, 0.00019] },
  { teamId: "2377",   sbName: "McNeese",            seed: 12, region: "South",   playIn: false, cumulative: [1, 0.15959, 0.04511, 0.00651, 0.00124, 0.00015, 0.00004] },
  { teamId: "2653",   sbName: "Troy",               seed: 13, region: "South",   playIn: false, cumulative: [1, 0.07319, 0.00672, 0.00034, 0.00003, 0, 0] },
  { teamId: "219",    sbName: "Penn",               seed: 14, region: "South",   playIn: false, cumulative: [1, 0.02897, 0.00428, 0.00019, 0.00002, 0, 0] },
  { teamId: "70",     sbName: "Idaho",              seed: 15, region: "South",   playIn: false, cumulative: [1, 0.03164, 0.0036, 0.00024, 0.00003, 0, 0] },
  { teamId: "2504",   sbName: "Prairie View A&M",   seed: 16, region: "South",   playIn: true,  cumulative: [1, 0.00844, 0.00031, 0.00001, 0, 0, 0] },
  { teamId: "2329",   sbName: "Lehigh",             seed: 16, region: "South",   playIn: true,  cumulative: [0, 0, 0, 0, 0, 0, 0] },

  // ── West ──
  { teamId: "12",     sbName: "Arizona",            seed: 1,  region: "West",    playIn: false, cumulative: [1, 0.9898, 0.88988, 0.72124, 0.52939, 0.29335, 0.16619] },
  { teamId: "2509",   sbName: "Purdue",             seed: 2,  region: "West",    playIn: false, cumulative: [1, 0.97808, 0.76761, 0.4602, 0.1821, 0.08242, 0.0395] },
  { teamId: "2250",   sbName: "Gonzaga",            seed: 3,  region: "West",    playIn: false, cumulative: [1, 0.96452, 0.71363, 0.36826, 0.13363, 0.0457, 0.01652] },
  { teamId: "8",      sbName: "Arkansas",           seed: 4,  region: "West",    playIn: false, cumulative: [1, 0.92713, 0.55207, 0.14069, 0.06581, 0.02243, 0.00766] },
  { teamId: "275",    sbName: "Wisconsin",          seed: 5,  region: "West",    playIn: false, cumulative: [1, 0.83124, 0.40322, 0.09358, 0.03977, 0.0125, 0.00426] },
  { teamId: "252",    sbName: "BYU",                seed: 6,  region: "West",    playIn: false, cumulative: [1, 0.56284, 0.1655, 0.05595, 0.01181, 0.00247, 0.00061] },
  { teamId: "2390",   sbName: "U Miami (FL)",       seed: 7,  region: "West",    playIn: false, cumulative: [1, 0.56008, 0.13626, 0.05035, 0.01085, 0.00249, 0.00059] },
  { teamId: "222",    sbName: "Villanova",          seed: 8,  region: "West",    playIn: false, cumulative: [1, 0.40882, 0.03867, 0.01309, 0.00357, 0.00081, 0.00015] },
  { teamId: "328",    sbName: "Utah St.",           seed: 9,  region: "West",    playIn: false, cumulative: [1, 0.59118, 0.07065, 0.02837, 0.0103, 0.00228, 0.00055] },
  { teamId: "142",    sbName: "Missouri",           seed: 10, region: "West",    playIn: false, cumulative: [1, 0.43992, 0.09407, 0.02888, 0.00497, 0.00104, 0.00024] },
  { teamId: "251",    sbName: "Texas",              seed: 11, region: "West",    playIn: true,  cumulative: [1, 0.43716, 0.11725, 0.03604, 0.00721, 0.00158, 0.00045] },
  { teamId: "152",    sbName: "NC State",           seed: 11, region: "West",    playIn: true,  cumulative: [0, 0, 0, 0, 0, 0, 0] },
  { teamId: "2272",   sbName: "High Point",         seed: 12, region: "West",    playIn: false, cumulative: [1, 0.16876, 0.03342, 0.0024, 0.00046, 0.00005, 0.00001] },
  { teamId: "62",     sbName: "Hawaii",             seed: 13, region: "West",    playIn: false, cumulative: [1, 0.07287, 0.01129, 0.00061, 0.0001, 0, 0] },
  { teamId: "338",    sbName: "Kennesaw St.",       seed: 14, region: "West",    playIn: false, cumulative: [1, 0.03548, 0.00362, 0.00022, 0.00002, 0, 0] },
  { teamId: "2511",   sbName: "Queens",             seed: 15, region: "West",    playIn: false, cumulative: [1, 0.02192, 0.00206, 0.0001, 0.00001, 0, 0] },
  { teamId: "112358", sbName: "LIU",                seed: 16, region: "West",    playIn: false, cumulative: [1, 0.0102, 0.0008, 0.00002, 0, 0, 0] },

  // ── Midwest ──
  { teamId: "130",    sbName: "Michigan",           seed: 1,  region: "Midwest", playIn: false, cumulative: [1, 0.98063, 0.88024, 0.73849, 0.51463, 0.32191, 0.19389] },
  { teamId: "66",     sbName: "Iowa St.",           seed: 2,  region: "Midwest", playIn: false, cumulative: [1, 0.97515, 0.74873, 0.51248, 0.24062, 0.12484, 0.06253] },
  { teamId: "258",    sbName: "Virginia",           seed: 3,  region: "Midwest", playIn: false, cumulative: [1, 0.94428, 0.55775, 0.2215, 0.07298, 0.02835, 0.01056] },
  { teamId: "333",    sbName: "Alabama",            seed: 4,  region: "Midwest", playIn: false, cumulative: [1, 0.87314, 0.61617, 0.1515, 0.06267, 0.02248, 0.00813] },
  { teamId: "2641",   sbName: "Texas Tech",         seed: 5,  region: "Midwest", playIn: false, cumulative: [1, 0.70369, 0.27677, 0.04902, 0.01485, 0.00399, 0.00107] },
  { teamId: "2633",   sbName: "Tennessee",          seed: 6,  region: "Midwest", playIn: false, cumulative: [1, 0.87517, 0.41651, 0.15616, 0.04918, 0.01779, 0.00612] },
  { teamId: "96",     sbName: "Kentucky",           seed: 7,  region: "Midwest", playIn: false, cumulative: [1, 0.63897, 0.17973, 0.08373, 0.02447, 0.00869, 0.00278] },
  { teamId: "61",     sbName: "Georgia",            seed: 8,  region: "Midwest", playIn: false, cumulative: [1, 0.57429, 0.07162, 0.0319, 0.00926, 0.00237, 0.00055] },
  { teamId: "139",    sbName: "Saint Louis",        seed: 9,  region: "Midwest", playIn: false, cumulative: [1, 0.42571, 0.04539, 0.0189, 0.00503, 0.00119, 0.0003] },
  { teamId: "2541",   sbName: "Santa Clara",        seed: 10, region: "Midwest", playIn: false, cumulative: [1, 0.36103, 0.06924, 0.02355, 0.00469, 0.00107, 0.00021] },
  { teamId: "193",    sbName: "Miami University (OH)", seed: 11, region: "Midwest", playIn: true,  cumulative: [1, 0.12483, 0.01932, 0.00199, 0.00017, 0, 0] },
  { teamId: "2567",   sbName: "SMU",                seed: 11, region: "Midwest", playIn: true,  cumulative: [0, 0, 0, 0, 0, 0, 0] },
  { teamId: "2006",   sbName: "Akron",              seed: 12, region: "Midwest", playIn: false, cumulative: [1, 0.29631, 0.06745, 0.00669, 0.00102, 0.00015, 0.00003] },
  { teamId: "2275",   sbName: "Hofstra",            seed: 13, region: "Midwest", playIn: false, cumulative: [1, 0.12686, 0.03961, 0.00314, 0.00043, 0.00005, 0] },
  { teamId: "2750",   sbName: "Wright St.",         seed: 14, region: "Midwest", playIn: false, cumulative: [1, 0.05572, 0.00642, 0.00041, 0, 0, 0] },
  { teamId: "2634",   sbName: "Tennessee St.",      seed: 15, region: "Midwest", playIn: false, cumulative: [1, 0.02485, 0.0023, 0.00018, 0, 0, 0] },
  { teamId: "47",     sbName: "Howard",             seed: 16, region: "Midwest", playIn: true,  cumulative: [1, 0.01937, 0.00275, 0.00036, 0, 0, 0] },
  { teamId: "2692",   sbName: "UMBC",               seed: 16, region: "Midwest", playIn: true,  cumulative: [0, 0, 0, 0, 0, 0, 0] },
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
