/**
 * Extended team data for the 2025 NCAA tournament.
 *
 * Used for pre-tournament team cards. Contains rankings, record,
 * conference championship flags, and cinderella/upset indicators.
 *
 * Sources:
 *   S-Curve: Official NCAA bracket + CBS Sports seed list (aligned with demo-data.ts)
 *   KenPom rankings: KenPom API archive endpoint (pre-tournament, March 16 2025)
 *   BPI: ESPN (pre-tournament, March 2025) — confirmed top 25, estimated below
 *   Records: KenPom API ratings (final) minus tournament games from demo-data.ts
 *   Conf champs: Conference tournament & regular season results
 *   Cinderella/upset: KenPom fanmatch (rankings at game time) × ESPN schedules (W/L results)
 *
 * For 2026: automated via KenPom API + ESPN API
 */

export interface TeamExtendedData {
  teamId: string
  /** NCAA committee S-Curve (1 = overall #1 seed, 68 = last team in) */
  sCurveRank: number
  /** Pre-tournament KenPom ranking */
  kenpomRank: number
  /** Pre-tournament ESPN BPI ranking */
  bpiRank: number
  /** Overall record entering tournament, e.g. "28-5" */
  record: string
  /** Won conference regular season title */
  confRegSeasonChamp: boolean
  /** Won conference tournament title (earned auto-bid) */
  confTourneyChamp: boolean
  /** Games won as KenPom underdog during the season */
  cinderellaWins: number
  /** Games lost as KenPom favorite during the season */
  upsetLosses: number
}

/**
 * All 68 teams in S-Curve order (1 = overall #1 seed, 68 = last team in).
 * S-Curve positions aligned with demo-data.ts sCurveRank values.
 * Includes First Four play-in losers at positions 41, 43, 65, 68.
 */
export const TEAM_DATA_2025: TeamExtendedData[] = [
  // ── 1-seeds (S-Curve 1–4) ──
  { teamId: "auburn",      sCurveRank: 1,  kenpomRank: 4,   bpiRank: 3,   record: "28-5",  confRegSeasonChamp: true,  confTourneyChamp: false, cinderellaWins: 1, upsetLosses: 5 },
  { teamId: "duke",        sCurveRank: 2,  kenpomRank: 1,   bpiRank: 1,   record: "31-3",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 1, upsetLosses: 3 },
  { teamId: "houston",     sCurveRank: 3,  kenpomRank: 3,   bpiRank: 2,   record: "30-4",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 1, upsetLosses: 4 },
  { teamId: "florida",     sCurveRank: 4,  kenpomRank: 2,   bpiRank: 4,   record: "30-4",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 6, upsetLosses: 3 },

  // ── 2-seeds (S-Curve 5–8) ──
  { teamId: "tennessee",   sCurveRank: 5,  kenpomRank: 5,   bpiRank: 5,   record: "27-7",  confRegSeasonChamp: false, confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 3 },
  { teamId: "alabama",     sCurveRank: 6,  kenpomRank: 6,   bpiRank: 6,   record: "25-8",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 1 },
  { teamId: "michigan-st", sCurveRank: 7,  kenpomRank: 8,   bpiRank: 11,  record: "27-6",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 4 },
  { teamId: "st-johns",    sCurveRank: 8,  kenpomRank: 12,  bpiRank: 8,   record: "30-4",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 0, upsetLosses: 4 },

  // ── 3-seeds (S-Curve 9–12) ──
  { teamId: "texas-tech",  sCurveRank: 9,  kenpomRank: 7,   bpiRank: 7,   record: "25-8",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 2, upsetLosses: 6 },
  { teamId: "iowa-st",     sCurveRank: 10, kenpomRank: 10,  bpiRank: 12,  record: "24-9",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 3, upsetLosses: 7 },
  { teamId: "kentucky",    sCurveRank: 11, kenpomRank: 16,  bpiRank: 17,  record: "22-11", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 10, upsetLosses: 5 },
  { teamId: "wisconsin",   sCurveRank: 12, kenpomRank: 11,  bpiRank: 18,  record: "26-9",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 6 },

  // ── 4-seeds (S-Curve 13–16) ──
  { teamId: "texas-am",    sCurveRank: 13, kenpomRank: 17,  bpiRank: 22,  record: "22-10", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 7 },
  { teamId: "purdue",      sCurveRank: 14, kenpomRank: 19,  bpiRank: 21,  record: "22-11", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 0, upsetLosses: 9 },
  { teamId: "maryland",    sCurveRank: 15, kenpomRank: 13,  bpiRank: 13,  record: "25-8",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 6, upsetLosses: 5 },
  { teamId: "arizona",     sCurveRank: 16, kenpomRank: 14,  bpiRank: 9,   record: "22-12", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 6 },

  // ── 5-seeds (S-Curve 17–20) ──
  { teamId: "michigan",    sCurveRank: 17, kenpomRank: 26,  bpiRank: 29,  record: "25-9",  confRegSeasonChamp: false, confTourneyChamp: true,  cinderellaWins: 5, upsetLosses: 5 },
  { teamId: "clemson",     sCurveRank: 18, kenpomRank: 18,  bpiRank: 15,  record: "27-6",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 2, upsetLosses: 6 },
  { teamId: "oregon",      sCurveRank: 19, kenpomRank: 31,  bpiRank: 30,  record: "24-9",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 5 },
  { teamId: "memphis",     sCurveRank: 20, kenpomRank: 52,  bpiRank: 37,  record: "29-5",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 3 },

  // ── 6-seeds (S-Curve 21–24) ──
  { teamId: "byu",         sCurveRank: 21, kenpomRank: 24,  bpiRank: 24,  record: "24-9",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 5 },
  { teamId: "illinois",    sCurveRank: 22, kenpomRank: 20,  bpiRank: 23,  record: "21-12", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 8, upsetLosses: 7 },
  { teamId: "missouri",    sCurveRank: 23, kenpomRank: 15,  bpiRank: 28,  record: "22-11", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 5 },
  { teamId: "ole-miss",    sCurveRank: 24, kenpomRank: 25,  bpiRank: 26,  record: "22-11", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 6 },

  // ── 7-seeds (S-Curve 25–28) ──
  { teamId: "ucla",        sCurveRank: 25, kenpomRank: 27,  bpiRank: 27,  record: "22-10", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 5 },
  { teamId: "marquette",   sCurveRank: 26, kenpomRank: 28,  bpiRank: 20,  record: "23-10", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 1, upsetLosses: 6 },
  { teamId: "saint-marys", sCurveRank: 27, kenpomRank: 22,  bpiRank: 31,  record: "28-5",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 4 },
  { teamId: "kansas",      sCurveRank: 28, kenpomRank: 21,  bpiRank: 14,  record: "21-12", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 8, upsetLosses: 6 },

  // ── 8-seeds (S-Curve 29–32) ──
  { teamId: "louisville",  sCurveRank: 29, kenpomRank: 23,  bpiRank: 32,  record: "27-7",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 3 },
  { teamId: "gonzaga",     sCurveRank: 30, kenpomRank: 9,   bpiRank: 10,  record: "25-8",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 0, upsetLosses: 8 },
  { teamId: "uconn",       sCurveRank: 31, kenpomRank: 35,  bpiRank: 16,  record: "23-10", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 6, upsetLosses: 8 },
  { teamId: "mississippi-st", sCurveRank: 32, kenpomRank: 32, bpiRank: 33, record: "21-12", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 7 },

  // ── 9-seeds (S-Curve 33–36) ──
  { teamId: "creighton",   sCurveRank: 33, kenpomRank: 37,  bpiRank: 34,  record: "24-10", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 6, upsetLosses: 5 },
  { teamId: "georgia",     sCurveRank: 34, kenpomRank: 34,  bpiRank: 36,  record: "20-12", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 0 },
  { teamId: "baylor",      sCurveRank: 35, kenpomRank: 29,  bpiRank: 19,  record: "19-14", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 2, upsetLosses: 5 },
  { teamId: "oklahoma",    sCurveRank: 36, kenpomRank: 38,  bpiRank: 35,  record: "20-13", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 8, upsetLosses: 1 },

  // ── 10-seeds (S-Curve 37–40) ──
  { teamId: "arkansas",    sCurveRank: 37, kenpomRank: 40,  bpiRank: 38,  record: "20-13", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 9, upsetLosses: 1 },
  { teamId: "new-mexico",  sCurveRank: 38, kenpomRank: 41,  bpiRank: 39,  record: "26-7",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 7, upsetLosses: 5 },
  { teamId: "vanderbilt",  sCurveRank: 39, kenpomRank: 49,  bpiRank: 42,  record: "20-12", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 6, upsetLosses: 3 },
  { teamId: "utah-st",     sCurveRank: 40, kenpomRank: 51,  bpiRank: 44,  record: "26-7",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 5 },

  // ── 11-seeds (S-Curve 41–46 — includes First Four at-large) ──
  { teamId: "san-diego-st", sCurveRank: 41, kenpomRank: 46,  bpiRank: 40,  record: "21-9",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 7 },
  { teamId: "xavier",      sCurveRank: 42, kenpomRank: 43,  bpiRank: 43,  record: "22-11", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 3 },
  { teamId: "texas",       sCurveRank: 43, kenpomRank: 44,  bpiRank: 41,  record: "19-15", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 9 },
  { teamId: "drake",       sCurveRank: 44, kenpomRank: 58,  bpiRank: 48,  record: "30-3",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 4, upsetLosses: 3 },
  { teamId: "vcu",         sCurveRank: 45, kenpomRank: 30,  bpiRank: 45,  record: "28-6",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 0, upsetLosses: 6 },
  { teamId: "north-carolina", sCurveRank: 46, kenpomRank: 33, bpiRank: 25, record: "23-13", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 5 },

  // ── 12-seeds (S-Curve 47–50) ──
  { teamId: "uc-san-diego", sCurveRank: 47, kenpomRank: 36, bpiRank: 50,  record: "30-4",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 5, upsetLosses: 3 },
  { teamId: "colorado-st", sCurveRank: 48, kenpomRank: 42,  bpiRank: 46,  record: "25-9",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 10, upsetLosses: 1 },
  { teamId: "mcneese-st",  sCurveRank: 49, kenpomRank: 59,  bpiRank: 55,  record: "27-6",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 1, upsetLosses: 3 },
  { teamId: "liberty",     sCurveRank: 50, kenpomRank: 62,  bpiRank: 52,  record: "28-6",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 0, upsetLosses: 5 },

  // ── 13-seeds (S-Curve 51–54) ──
  { teamId: "yale",        sCurveRank: 51, kenpomRank: 74,  bpiRank: 60,  record: "22-7",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 0, upsetLosses: 4 },
  { teamId: "high-point",  sCurveRank: 52, kenpomRank: 84,  bpiRank: 65,  record: "29-5",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 2, upsetLosses: 5 },
  { teamId: "akron",       sCurveRank: 53, kenpomRank: 99,  bpiRank: 70,  record: "28-6",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 0, upsetLosses: 3 },
  { teamId: "grand-canyon", sCurveRank: 54, kenpomRank: 93, bpiRank: 72,  record: "26-7",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 1, upsetLosses: 5 },

  // ── 14-seeds (S-Curve 55–58) ──
  { teamId: "lipscomb",    sCurveRank: 55, kenpomRank: 83,  bpiRank: 75,  record: "25-9",  confRegSeasonChamp: false, confTourneyChamp: true,  cinderellaWins: 1, upsetLosses: 6 },
  { teamId: "troy",        sCurveRank: 56, kenpomRank: 98,  bpiRank: 78,  record: "23-10", confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 5 },
  { teamId: "unc-wilmington", sCurveRank: 57, kenpomRank: 105, bpiRank: 85, record: "27-7", confRegSeasonChamp: true, confTourneyChamp: true, cinderellaWins: 3, upsetLosses: 6 },
  { teamId: "montana",     sCurveRank: 58, kenpomRank: 157, bpiRank: 110, record: "25-9",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 7, upsetLosses: 2 },

  // ── 15-seeds (S-Curve 59–62) ──
  { teamId: "robert-morris", sCurveRank: 59, kenpomRank: 139, bpiRank: 100, record: "26-8", confRegSeasonChamp: true, confTourneyChamp: true, cinderellaWins: 10, upsetLosses: 2 },
  { teamId: "wofford",     sCurveRank: 60, kenpomRank: 120, bpiRank: 90,  record: "19-15", confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 11 },
  { teamId: "omaha",       sCurveRank: 61, kenpomRank: 156, bpiRank: 115, record: "22-12", confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 12, upsetLosses: 2 },
  { teamId: "bryant",      sCurveRank: 62, kenpomRank: 149, bpiRank: 105, record: "23-11", confRegSeasonChamp: false, confTourneyChamp: true,  cinderellaWins: 1, upsetLosses: 7 },

  // ── 16-seeds (S-Curve 63–68 — includes First Four auto-bid) ──
  { teamId: "norfolk-st",      sCurveRank: 63, kenpomRank: 180, bpiRank: 130, record: "24-10", confRegSeasonChamp: true, confTourneyChamp: true, cinderellaWins: 3, upsetLosses: 6 },
  { teamId: "siu-edwardsville", sCurveRank: 64, kenpomRank: 217, bpiRank: 170, record: "22-11", confRegSeasonChamp: false, confTourneyChamp: true, cinderellaWins: 5, upsetLosses: 6 },
  { teamId: "saint-francis",   sCurveRank: 65, kenpomRank: 311, bpiRank: 260, record: "16-17", confRegSeasonChamp: false, confTourneyChamp: true, cinderellaWins: 8, upsetLosses: 4 },
  { teamId: "mount-st-marys",  sCurveRank: 66, kenpomRank: 250, bpiRank: 200, record: "23-12", confRegSeasonChamp: false, confTourneyChamp: true, cinderellaWins: 9, upsetLosses: 5 },
  { teamId: "alabama-st",      sCurveRank: 67, kenpomRank: 273, bpiRank: 230, record: "20-15", confRegSeasonChamp: false, confTourneyChamp: true, cinderellaWins: 3, upsetLosses: 8 },
  { teamId: "american",        sCurveRank: 68, kenpomRank: 237, bpiRank: 240, record: "22-12", confRegSeasonChamp: false, confTourneyChamp: true, cinderellaWins: 7, upsetLosses: 7 },
]

// ── Lookup Map ──────────────────────────────────────────────────────────────

export const TEAM_DATA_2025_MAP: Map<string, TeamExtendedData> = new Map(
  TEAM_DATA_2025.map(t => [t.teamId, t])
)

export function getTeamExtendedData(teamId: string): TeamExtendedData | null {
  return TEAM_DATA_2025_MAP.get(teamId) ?? null
}
