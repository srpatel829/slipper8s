/**
 * Silver Bulletin 2025 pre-tournament win probabilities.
 *
 * Source: Sbcb_Mens_Odds_March_16_2025.xlsx (Nate Silver / Silver Bulletin)
 *
 * Each team has 7 cumulative win probabilities:
 *   cumulative[0] = P(in tournament)         — 1.0 for non-play-in, <1.0 for play-in
 *   cumulative[1] = P(win ≥ 1 game)          — P(reach Round of 32)
 *   cumulative[2] = P(win ≥ 2 games)         — P(reach Sweet 16)
 *   cumulative[3] = P(win ≥ 3 games)         — P(reach Elite 8)
 *   cumulative[4] = P(win ≥ 4 games)         — P(reach Final Four)
 *   cumulative[5] = P(win ≥ 5 games)         — P(reach Championship)
 *   cumulative[6] = P(win ≥ 6 games = champ) — P(win it all)
 *
 * Expected wins (pre-tournament) = cumulative[1] + cumulative[2] + ... + cumulative[6]
 * This follows the identity: E[X] = Σ P(X ≥ k) for non-negative integer X.
 *
 * Expected score = seed × expected_wins
 *
 * Mid-tournament: for a team with w wins still alive,
 *   remaining expected wins = Σ cumulative[k] / cumulative[w] for k = w+1 to 6
 *   (conditional probability of winning additional games given survival to this point)
 */

export interface SilverBulletinTeam {
  /** Demo team ID (matches DemoTeam.id and DB team identifiers) */
  teamId: string
  /** Display name from Silver Bulletin */
  sbName: string
  /** Numeric seed (16 for play-in 16a/16b, 11 for play-in 11a/11b) */
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

// ─── 2025 Silver Bulletin Probability Data ──────────────────────────────────
// Keyed by demo team ID for direct lookup. Play-in losers (not in the 64-team
// bracket) are included for completeness but won't match any demo team.

export const SILVER_BULLETIN_2025: SilverBulletinTeam[] = [
  // ── South Region ──
  { teamId: "auburn",         sbName: "Auburn",               seed: 1,  region: "South",   playIn: false, cumulative: [1, 0.9874, 0.7146, 0.5647, 0.3991, 0.2287, 0.1189] },
  { teamId: "michigan-st",    sbName: "Michigan St.",          seed: 2,  region: "South",   playIn: false, cumulative: [1, 0.9344, 0.6612, 0.4027, 0.1852, 0.0863, 0.0364] },
  { teamId: "iowa-st",        sbName: "Iowa St.",              seed: 3,  region: "South",   playIn: false, cumulative: [1, 0.8833, 0.5404, 0.2597, 0.1029, 0.0439, 0.0169] },
  { teamId: "texas-am",       sbName: "Texas A&M",             seed: 4,  region: "South",   playIn: false, cumulative: [1, 0.7537, 0.4108, 0.1216, 0.0560, 0.0245, 0.0097] },
  { teamId: "michigan",       sbName: "Michigan",              seed: 5,  region: "South",   playIn: false, cumulative: [1, 0.5907, 0.3200, 0.0965, 0.0451, 0.0169, 0.0057] },
  { teamId: "ole-miss",       sbName: "Ole Miss",              seed: 6,  region: "South",   playIn: false, cumulative: [1, 0.5448, 0.2438, 0.1067, 0.0384, 0.0143, 0.0048] },
  { teamId: "marquette",      sbName: "Marquette",             seed: 7,  region: "South",   playIn: false, cumulative: [1, 0.6318, 0.2271, 0.1069, 0.0367, 0.0132, 0.0043] },
  { teamId: "louisville",     sbName: "Louisville",            seed: 8,  region: "South",   playIn: false, cumulative: [1, 0.6350, 0.2016, 0.1216, 0.0617, 0.0249, 0.0090] },
  { teamId: "creighton",      sbName: "Creighton",             seed: 9,  region: "South",   playIn: false, cumulative: [1, 0.3650, 0.0832, 0.0430, 0.0184, 0.0067, 0.0022] },
  { teamId: "new-mexico",     sbName: "New Mexico",            seed: 10, region: "South",   playIn: false, cumulative: [1, 0.3682, 0.0991, 0.0389, 0.0110, 0.0038, 0.0012] },
  { teamId: "north-carolina", sbName: "North Carolina",        seed: 11, region: "South",   playIn: true,  cumulative: [0.6629, 0.3280, 0.1467, 0.0643, 0.0231, 0.0082, 0.0026] },
  { teamId: "san-diego-st",   sbName: "San Diego St.",          seed: 11, region: "South",   playIn: true,  cumulative: [0.3371, 0.1271, 0.0442, 0.0141, 0.0037, 0.0012, 0.0003] },
  { teamId: "uc-san-diego",   sbName: "UC San Diego",           seed: 12, region: "South",   playIn: false, cumulative: [1, 0.4093, 0.1914, 0.0395, 0.0138, 0.0044, 0.0013] },
  { teamId: "yale",           sbName: "Yale",                  seed: 13, region: "South",   playIn: false, cumulative: [1, 0.2463, 0.0779, 0.0130, 0.0038, 0.0009, 0.0002] },
  { teamId: "lipscomb",       sbName: "Lipscomb",              seed: 14, region: "South",   playIn: false, cumulative: [1, 0.1167, 0.0250, 0.0046, 0.0007, 0.0001, 0.0000] },
  { teamId: "bryant",         sbName: "Bryant",                seed: 15, region: "South",   playIn: false, cumulative: [1, 0.0656, 0.0126, 0.0021, 0.0002, 0.0000, 0.0000] },
  { teamId: "alabama-st",     sbName: "Alabama St.",            seed: 16, region: "South",   playIn: true,  cumulative: [0.5404, 0.0074, 0.0004, 0.0000, 0.0000, 0.0000, 0.0000] },
  { teamId: "saint-francis",  sbName: "Saint Francis (PA)",     seed: 16, region: "South",   playIn: true,  cumulative: [0.4596, 0.0052, 0.0002, 0.0000, 0.0000, 0.0000, 0.0000] },

  // ── East Region ──
  { teamId: "duke",            sbName: "Duke",                  seed: 1,  region: "East",    playIn: false, cumulative: [1, 0.9851, 0.8691, 0.7100, 0.5130, 0.3073, 0.1850] },
  { teamId: "alabama",         sbName: "Alabama",               seed: 2,  region: "East",    playIn: false, cumulative: [1, 0.9273, 0.6932, 0.4546, 0.1991, 0.1027, 0.0535] },
  { teamId: "wisconsin",       sbName: "Wisconsin",             seed: 3,  region: "East",    playIn: false, cumulative: [1, 0.8978, 0.4682, 0.2066, 0.0692, 0.0271, 0.0109] },
  { teamId: "arizona",         sbName: "Arizona",               seed: 4,  region: "East",    playIn: false, cumulative: [1, 0.8844, 0.5618, 0.1521, 0.0717, 0.0317, 0.0142] },
  { teamId: "oregon",          sbName: "Oregon",                seed: 5,  region: "East",    playIn: false, cumulative: [1, 0.7397, 0.3399, 0.0623, 0.0219, 0.0069, 0.0022] },
  { teamId: "byu",             sbName: "BYU",                   seed: 6,  region: "East",    playIn: false, cumulative: [1, 0.5987, 0.3289, 0.1275, 0.0372, 0.0142, 0.0056] },
  { teamId: "saint-marys",     sbName: "Saint Mary's (CA)",      seed: 7,  region: "East",    playIn: false, cumulative: [1, 0.6864, 0.2235, 0.1047, 0.0303, 0.0115, 0.0044] },
  { teamId: "mississippi-st",  sbName: "Mississippi St.",        seed: 8,  region: "East",    playIn: false, cumulative: [1, 0.4722, 0.0584, 0.0268, 0.0096, 0.0031, 0.0010] },
  { teamId: "baylor",          sbName: "Baylor",                seed: 9,  region: "East",    playIn: false, cumulative: [1, 0.5278, 0.0704, 0.0343, 0.0131, 0.0051, 0.0020] },
  { teamId: "vanderbilt",      sbName: "Vanderbilt",            seed: 10, region: "East",    playIn: false, cumulative: [1, 0.3136, 0.0654, 0.0207, 0.0039, 0.0009, 0.0002] },
  { teamId: "vcu",             sbName: "VCU",                   seed: 11, region: "East",    playIn: false, cumulative: [1, 0.4013, 0.1885, 0.0809, 0.0263, 0.0091, 0.0032] },
  { teamId: "liberty",         sbName: "Liberty",               seed: 12, region: "East",    playIn: false, cumulative: [1, 0.2603, 0.0707, 0.0113, 0.0035, 0.0008, 0.0002] },
  { teamId: "akron",           sbName: "Akron",                 seed: 13, region: "East",    playIn: false, cumulative: [1, 0.1156, 0.0277, 0.0028, 0.0006, 0.0001, 0.0000] },
  { teamId: "montana",         sbName: "Montana",               seed: 14, region: "East",    playIn: false, cumulative: [1, 0.1022, 0.0144, 0.0016, 0.0001, 0.0000, 0.0000] },
  { teamId: "robert-morris",   sbName: "Robert Morris",          seed: 15, region: "East",    playIn: false, cumulative: [1, 0.0727, 0.0180, 0.0033, 0.0004, 0.0000, 0.0000] },
  { teamId: "mount-st-marys",  sbName: "Mount St. Mary's (MD)", seed: 16, region: "East",    playIn: true,  cumulative: [0.5263, 0.0080, 0.0012, 0.0002, 0.0000, 0.0000, 0.0000] },
  { teamId: "american",        sbName: "American",              seed: 16, region: "East",    playIn: true,  cumulative: [0.4737, 0.0068, 0.0010, 0.0001, 0.0000, 0.0000, 0.0000] },

  // ── West Region ──
  { teamId: "florida",         sbName: "Florida",               seed: 1,  region: "West",    playIn: false, cumulative: [1, 0.9728, 0.7824, 0.5861, 0.3974, 0.2504, 0.1380] },
  { teamId: "st-johns",        sbName: "St. John's",             seed: 2,  region: "West",    playIn: false, cumulative: [1, 0.9553, 0.6840, 0.3893, 0.1735, 0.0835, 0.0345] },
  { teamId: "texas-tech",      sbName: "Texas Tech",             seed: 3,  region: "West",    playIn: false, cumulative: [1, 0.8971, 0.5904, 0.3120, 0.1398, 0.0702, 0.0303] },
  { teamId: "maryland",        sbName: "Maryland",              seed: 4,  region: "West",    playIn: false, cumulative: [1, 0.8143, 0.5393, 0.1979, 0.1009, 0.0464, 0.0183] },
  { teamId: "memphis",         sbName: "Memphis",               seed: 5,  region: "West",    playIn: false, cumulative: [1, 0.4866, 0.1896, 0.0472, 0.0178, 0.0063, 0.0019] },
  { teamId: "missouri",        sbName: "Missouri",              seed: 6,  region: "West",    playIn: false, cumulative: [1, 0.5825, 0.2400, 0.0950, 0.0318, 0.0121, 0.0039] },
  { teamId: "kansas",          sbName: "Kansas",                seed: 7,  region: "West",    playIn: false, cumulative: [1, 0.7218, 0.2529, 0.1297, 0.0513, 0.0225, 0.0084] },
  { teamId: "uconn",           sbName: "UConn",                 seed: 8,  region: "West",    playIn: false, cumulative: [1, 0.6861, 0.1670, 0.0853, 0.0374, 0.0146, 0.0049] },
  { teamId: "oklahoma",        sbName: "Oklahoma",              seed: 9,  region: "West",    playIn: false, cumulative: [1, 0.3139, 0.0465, 0.0195, 0.0070, 0.0024, 0.0007] },
  { teamId: "arkansas",        sbName: "Arkansas",              seed: 10, region: "West",    playIn: false, cumulative: [1, 0.2782, 0.0564, 0.0197, 0.0052, 0.0017, 0.0005] },
  { teamId: "drake",           sbName: "Drake",                 seed: 11, region: "West",    playIn: false, cumulative: [1, 0.4175, 0.1464, 0.0494, 0.0142, 0.0046, 0.0013] },
  { teamId: "colorado-st",     sbName: "Colorado St.",           seed: 12, region: "West",    playIn: false, cumulative: [1, 0.5134, 0.2052, 0.0522, 0.0200, 0.0065, 0.0018] },
  { teamId: "grand-canyon",    sbName: "Grand Canyon",           seed: 13, region: "West",    playIn: false, cumulative: [1, 0.1857, 0.0658, 0.0114, 0.0032, 0.0007, 0.0001] },
  { teamId: "unc-wilmington",  sbName: "UNC Wilmington",         seed: 14, region: "West",    playIn: false, cumulative: [1, 0.1029, 0.0232, 0.0039, 0.0006, 0.0001, 0.0000] },
  { teamId: "omaha",           sbName: "Omaha",                 seed: 15, region: "West",    playIn: false, cumulative: [1, 0.0447, 0.0068, 0.0010, 0.0001, 0.0000, 0.0000] },
  { teamId: "norfolk-st",      sbName: "Norfolk St.",             seed: 16, region: "West",    playIn: false, cumulative: [1, 0.0272, 0.0041, 0.0005, 0.0001, 0.0000, 0.0000] },

  // ── Midwest Region ──
  { teamId: "houston",         sbName: "Houston",               seed: 1,  region: "Midwest", playIn: false, cumulative: [1, 0.9823, 0.7356, 0.5625, 0.3821, 0.2404, 0.1560] },
  { teamId: "tennessee",       sbName: "Tennessee",             seed: 2,  region: "Midwest", playIn: false, cumulative: [1, 0.9343, 0.7320, 0.4743, 0.2312, 0.1048, 0.0508] },
  { teamId: "kentucky",        sbName: "Kentucky",              seed: 3,  region: "Midwest", playIn: false, cumulative: [1, 0.8377, 0.4227, 0.1852, 0.0694, 0.0232, 0.0086] },
  { teamId: "purdue",          sbName: "Purdue",                seed: 4,  region: "Midwest", playIn: false, cumulative: [1, 0.7126, 0.3490, 0.1061, 0.0485, 0.0152, 0.0053] },
  { teamId: "clemson",         sbName: "Clemson",               seed: 5,  region: "Midwest", playIn: false, cumulative: [1, 0.7867, 0.4854, 0.1537, 0.0724, 0.0261, 0.0104] },
  { teamId: "illinois",        sbName: "Illinois",              seed: 6,  region: "Midwest", playIn: false, cumulative: [1, 0.5986, 0.3446, 0.1539, 0.0588, 0.0199, 0.0074] },
  { teamId: "ucla",            sbName: "UCLA",                  seed: 7,  region: "Midwest", playIn: false, cumulative: [1, 0.6350, 0.1772, 0.0759, 0.0228, 0.0075, 0.0027] },
  { teamId: "gonzaga",         sbName: "Gonzaga",               seed: 8,  region: "Midwest", playIn: false, cumulative: [1, 0.7100, 0.2132, 0.1296, 0.0668, 0.0287, 0.0133] },
  { teamId: "georgia",         sbName: "Georgia",               seed: 9,  region: "Midwest", playIn: false, cumulative: [1, 0.2900, 0.0498, 0.0234, 0.0091, 0.0027, 0.0009] },
  { teamId: "utah-st",         sbName: "Utah St.",               seed: 10, region: "Midwest", playIn: false, cumulative: [1, 0.3650, 0.0737, 0.0241, 0.0054, 0.0013, 0.0004] },
  { teamId: "xavier",          sbName: "Xavier",                seed: 11, region: "Midwest", playIn: true,  cumulative: [0.6374, 0.2733, 0.1425, 0.0585, 0.0205, 0.0062, 0.0021] },
  { teamId: "texas",           sbName: "Texas",                 seed: 11, region: "Midwest", playIn: true,  cumulative: [0.3626, 0.1281, 0.0579, 0.0191, 0.0053, 0.0019, 0.0007] },
  { teamId: "mcneese-st",      sbName: "McNeese",               seed: 12, region: "Midwest", playIn: false, cumulative: [1, 0.2133, 0.0750, 0.0110, 0.0029, 0.0007, 0.0002] },
  { teamId: "high-point",      sbName: "High Point",             seed: 13, region: "Midwest", playIn: false, cumulative: [1, 0.2874, 0.0906, 0.0136, 0.0036, 0.0007, 0.0002] },
  { teamId: "troy",            sbName: "Troy",                  seed: 14, region: "Midwest", playIn: false, cumulative: [1, 0.1623, 0.0324, 0.0058, 0.0009, 0.0001, 0.0000] },
  { teamId: "wofford",         sbName: "Wofford",               seed: 15, region: "Midwest", playIn: false, cumulative: [1, 0.0657, 0.0172, 0.0031, 0.0004, 0.0000, 0.0000] },
  { teamId: "siu-edwardsville", sbName: "SIU Edwardsville",     seed: 16, region: "Midwest", playIn: false, cumulative: [1, 0.0177, 0.0014, 0.0002, 0.0000, 0.0000, 0.0000] },
]

// ─── Lookup Map ─────────────────────────────────────────────────────────────

/** Map from demo team ID → Silver Bulletin probability data */
export const SB_2025_MAP: Map<string, SilverBulletinTeam> = new Map(
  SILVER_BULLETIN_2025.map(t => [t.teamId, t])
)

// ─── Expected Score Calculation ─────────────────────────────────────────────

/**
 * Pre-tournament expected score for a team.
 * Expected wins = sum of cumulative[1] through cumulative[6]
 * (each cumulative[k] = P(win ≥ k games), and E[wins] = Σ P(wins ≥ k) for k=1..6)
 * Expected score = seed × expected_wins
 */
export function pretournamentExpectedScore(teamId: string): number | null {
  const team = SB_2025_MAP.get(teamId)
  if (!team) return null

  const expectedWins =
    team.cumulative[1] + team.cumulative[2] + team.cumulative[3] +
    team.cumulative[4] + team.cumulative[5] + team.cumulative[6]

  return team.seed * expectedWins
}

/**
 * Expected score for a team at a given point in the tournament.
 *
 * @param teamId  - Demo team ID
 * @param wins    - Number of games the team has already won
 * @param eliminated - Whether the team has been eliminated
 * @returns Expected total score (actual + remaining expected)
 *
 * If the team is eliminated: expected score = seed × wins (no future value).
 * If still alive with w wins: expected score = seed × (w + remaining_expected_wins)
 *   where remaining_expected_wins uses conditional probabilities:
 *   Σ cumulative[k] / cumulative[w] for k = w+1 to 6
 */
export function expectedScoreAtState(
  teamId: string,
  wins: number,
  eliminated: boolean,
): number | null {
  const team = SB_2025_MAP.get(teamId)
  if (!team) return null

  // Eliminated: only actual score, no future expected value
  if (eliminated) {
    return team.seed * wins
  }

  // Team has won the championship — max 6 wins
  if (wins >= 6) {
    return team.seed * 6
  }

  // Team is alive with `wins` wins.
  // Denominator = P(win ≥ w games) = cumulative[w]
  // For w=0: cumulative[0] = P(in tournament), which is 1.0 for non-play-in teams
  const denominator = team.cumulative[wins]

  if (denominator <= 0) {
    // Edge case: probability essentially zero (shouldn't happen for alive team)
    return team.seed * wins
  }

  // Remaining expected wins = Σ P(win ≥ k | win ≥ w) for k = w+1 to 6
  //                         = Σ cumulative[k] / cumulative[w] for k = w+1 to 6
  let remainingExpectedWins = 0
  for (let k = wins + 1; k <= 6; k++) {
    remainingExpectedWins += team.cumulative[k] / denominator
  }

  return team.seed * (wins + remainingExpectedWins)
}

/**
 * Calculate total expected score for an entry (array of team IDs) at a given game state.
 *
 * @param teamIds - Array of team IDs (typically 8)
 * @param teamStates - Map of teamId → { wins, eliminated }
 * @param preTournament - If true, use pre-tournament probabilities (ignore teamStates)
 * @returns Total expected score, or null if no probability data available
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
        // Team not in state map — hasn't played yet, treat as alive with 0 wins
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
