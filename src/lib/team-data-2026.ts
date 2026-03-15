/**
 * Extended team data for the 2026 NCAA tournament.
 *
 * Used for pre-tournament team cards. Contains rankings, record,
 * conference championship flags, and cinderella/upset indicators.
 *
 * Sources:
 *   S-Curve: Official NCAA bracket (Selection Sunday, March 15 2026)
 *   KenPom rankings: KenPom.com (pre-tournament, March 15 2026)
 *   BPI: ESPN BPI (pre-tournament, March 2026) — estimated from KenPom + seed delta
 *   Records: Conference tournament results (final pre-NCAA records)
 *   Conf champs: Conference tournament & regular season results
 *   Cinderella/upset: placeholder — update from KenPom fanmatch later
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
 * Duke is the No. 1 overall seed per the Selection Sunday reveal.
 */
export const TEAM_DATA_2026: TeamExtendedData[] = [
  // ── 1-seeds (S-Curve 1–4) ──
  { teamId: "duke",        sCurveRank: 1,  kenpomRank: 1,   bpiRank: 1,   record: "32-2",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 1, upsetLosses: 2 },
  { teamId: "arizona",     sCurveRank: 2,  kenpomRank: 3,   bpiRank: 2,   record: "32-2",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 1, upsetLosses: 2 },
  { teamId: "michigan",    sCurveRank: 3,  kenpomRank: 2,   bpiRank: 3,   record: "31-3",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 2, upsetLosses: 3 },
  { teamId: "florida",     sCurveRank: 4,  kenpomRank: 4,   bpiRank: 4,   record: "29-5",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 3, upsetLosses: 4 },

  // ── 2-seeds (S-Curve 5–8) ──
  { teamId: "uconn",       sCurveRank: 5,  kenpomRank: 12,  bpiRank: 10,  record: "29-5",  confRegSeasonChamp: false, confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 4 },
  { teamId: "purdue",      sCurveRank: 6,  kenpomRank: 8,   bpiRank: 7,   record: "27-8",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 2, upsetLosses: 6 },
  { teamId: "iowa-state",  sCurveRank: 7,  kenpomRank: 6,   bpiRank: 6,   record: "27-7",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 5 },
  { teamId: "houston",     sCurveRank: 8,  kenpomRank: 5,   bpiRank: 5,   record: "28-5",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 2, upsetLosses: 4 },

  // ── 3-seeds (S-Curve 9–12) ──
  { teamId: "michigan-state", sCurveRank: 9,  kenpomRank: 9,  bpiRank: 9,  record: "25-7",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 3, upsetLosses: 5 },
  { teamId: "gonzaga",     sCurveRank: 10, kenpomRank: 10,  bpiRank: 11,  record: "30-3",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 1, upsetLosses: 3 },
  { teamId: "virginia",    sCurveRank: 11, kenpomRank: 13,  bpiRank: 13,  record: "29-5",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 4 },
  { teamId: "illinois",    sCurveRank: 12, kenpomRank: 7,   bpiRank: 8,   record: "27-7",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 5 },

  // ── 4-seeds (S-Curve 13–16) ──
  { teamId: "kansas",      sCurveRank: 13, kenpomRank: 21,  bpiRank: 18,  record: "23-10", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 7 },
  { teamId: "arkansas",    sCurveRank: 14, kenpomRank: 18,  bpiRank: 16,  record: "26-8",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 5 },
  { teamId: "alabama",     sCurveRank: 15, kenpomRank: 17,  bpiRank: 15,  record: "23-9",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 6 },
  { teamId: "nebraska",    sCurveRank: 16, kenpomRank: 14,  bpiRank: 14,  record: "24-9",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 5 },

  // ── 5-seeds (S-Curve 17–20) ──
  { teamId: "st-johns",    sCurveRank: 17, kenpomRank: 16,  bpiRank: 17,  record: "28-6",  confRegSeasonChamp: true,  confTourneyChamp: false, cinderellaWins: 3, upsetLosses: 5 },
  { teamId: "wisconsin",   sCurveRank: 18, kenpomRank: 22,  bpiRank: 20,  record: "24-10", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 6 },
  { teamId: "texas-tech",  sCurveRank: 19, kenpomRank: 20,  bpiRank: 19,  record: "22-10", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 3, upsetLosses: 7 },
  { teamId: "vanderbilt",  sCurveRank: 20, kenpomRank: 11,  bpiRank: 12,  record: "24-9",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 5 },

  // ── 6-seeds (S-Curve 21–24) ──
  { teamId: "louisville",  sCurveRank: 21, kenpomRank: 19,  bpiRank: 21,  record: "23-10", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 6 },
  { teamId: "byu",         sCurveRank: 22, kenpomRank: 23,  bpiRank: 22,  record: "23-11", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 7 },
  { teamId: "tennessee",   sCurveRank: 23, kenpomRank: 15,  bpiRank: 23,  record: "22-11", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 6 },
  { teamId: "north-carolina", sCurveRank: 24, kenpomRank: 29, bpiRank: 25, record: "23-10", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 6 },

  // ── 7-seeds (S-Curve 25–28) ──
  { teamId: "ucla",        sCurveRank: 25, kenpomRank: 27,  bpiRank: 26,  record: "23-11", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 7 },
  { teamId: "miami-fl",    sCurveRank: 26, kenpomRank: 31,  bpiRank: 28,  record: "25-8",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 3, upsetLosses: 5 },
  { teamId: "kentucky",    sCurveRank: 27, kenpomRank: 28,  bpiRank: 27,  record: "21-13", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 6, upsetLosses: 7 },
  { teamId: "saint-marys", sCurveRank: 28, kenpomRank: 24,  bpiRank: 24,  record: "28-5",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 2, upsetLosses: 4 },

  // ── 8-seeds (S-Curve 29–32) ──
  { teamId: "ohio-state",  sCurveRank: 29, kenpomRank: 26,  bpiRank: 29,  record: "21-12", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 7 },
  { teamId: "villanova",   sCurveRank: 30, kenpomRank: 33,  bpiRank: 30,  record: "24-8",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 3, upsetLosses: 5 },
  { teamId: "georgia",     sCurveRank: 31, kenpomRank: 32,  bpiRank: 32,  record: "22-10", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 6 },
  { teamId: "clemson",     sCurveRank: 32, kenpomRank: 36,  bpiRank: 34,  record: "22-11", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 7 },

  // ── 9-seeds (S-Curve 33–36) ──
  { teamId: "tcu",         sCurveRank: 33, kenpomRank: 43,  bpiRank: 38,  record: "22-11", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 6 },
  { teamId: "utah-state",  sCurveRank: 34, kenpomRank: 30,  bpiRank: 31,  record: "28-6",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 4 },
  { teamId: "saint-louis", sCurveRank: 35, kenpomRank: 41,  bpiRank: 36,  record: "28-5",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 2, upsetLosses: 3 },
  { teamId: "iowa",        sCurveRank: 36, kenpomRank: 25,  bpiRank: 33,  record: "22-12", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 6, upsetLosses: 6 },

  // ── 10-seeds (S-Curve 37–40) ──
  { teamId: "ucf",         sCurveRank: 37, kenpomRank: 54,  bpiRank: 42,  record: "21-11", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 5 },
  { teamId: "missouri",    sCurveRank: 38, kenpomRank: 52,  bpiRank: 40,  record: "20-12", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 6 },
  { teamId: "santa-clara", sCurveRank: 39, kenpomRank: 35,  bpiRank: 35,  record: "26-8",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 4, upsetLosses: 5 },
  { teamId: "texas-am",    sCurveRank: 40, kenpomRank: 39,  bpiRank: 37,  record: "22-11", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 6 },

  // ── 11-seeds (S-Curve 41–46 — includes First Four at-large) ──
  { teamId: "south-florida", sCurveRank: 41, kenpomRank: 49, bpiRank: 43, record: "25-8",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 5, upsetLosses: 4 },
  { teamId: "vcu",         sCurveRank: 42, kenpomRank: 46,  bpiRank: 44,  record: "25-9",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 5 },
  { teamId: "texas",       sCurveRank: 43, kenpomRank: 37,  bpiRank: 39,  record: "21-13", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 8 },
  { teamId: "nc-state",    sCurveRank: 44, kenpomRank: 34,  bpiRank: 41,  record: "21-13", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 7 },
  { teamId: "smu",         sCurveRank: 45, kenpomRank: 42,  bpiRank: 45,  record: "23-10", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 6 },
  { teamId: "miami-oh",    sCurveRank: 46, kenpomRank: 93,  bpiRank: 65,  record: "31-1",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 1, upsetLosses: 1 },

  // ── 12-seeds (S-Curve 47–50) ──
  { teamId: "northern-iowa", sCurveRank: 47, kenpomRank: 75, bpiRank: 58, record: "23-12", confRegSeasonChamp: false, confTourneyChamp: true,  cinderellaWins: 5, upsetLosses: 6 },
  { teamId: "high-point",  sCurveRank: 48, kenpomRank: 72,  bpiRank: 55,  record: "30-4",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 3 },
  { teamId: "akron",       sCurveRank: 49, kenpomRank: 64,  bpiRank: 52,  record: "29-5",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 2, upsetLosses: 4 },
  { teamId: "mcneese",     sCurveRank: 50, kenpomRank: 68,  bpiRank: 56,  record: "27-7",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 2, upsetLosses: 4 },

  // ── 13-seeds (S-Curve 51–54) ──
  { teamId: "cal-baptist",  sCurveRank: 51, kenpomRank: 85,  bpiRank: 70,  record: "25-8",  confRegSeasonChamp: false, confTourneyChamp: true,  cinderellaWins: 2, upsetLosses: 5 },
  { teamId: "hawaii",      sCurveRank: 52, kenpomRank: 80,  bpiRank: 65,  record: "24-8",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 5 },
  { teamId: "hofstra",     sCurveRank: 53, kenpomRank: 78,  bpiRank: 68,  record: "24-10", confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 6 },
  { teamId: "troy",        sCurveRank: 54, kenpomRank: 90,  bpiRank: 75,  record: "24-10", confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 6 },

  // ── 14-seeds (S-Curve 55–58) ──
  { teamId: "north-dakota-state", sCurveRank: 55, kenpomRank: 110, bpiRank: 90, record: "27-7", confRegSeasonChamp: true, confTourneyChamp: true, cinderellaWins: 4, upsetLosses: 4 },
  { teamId: "kennesaw-state", sCurveRank: 56, kenpomRank: 115, bpiRank: 95, record: "21-13", confRegSeasonChamp: false, confTourneyChamp: true, cinderellaWins: 3, upsetLosses: 7 },
  { teamId: "wright-state", sCurveRank: 57, kenpomRank: 120, bpiRank: 100, record: "23-11", confRegSeasonChamp: true, confTourneyChamp: true, cinderellaWins: 4, upsetLosses: 5 },
  { teamId: "penn",        sCurveRank: 58, kenpomRank: 100, bpiRank: 85,  record: "22-8",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 2, upsetLosses: 4 },

  // ── 15-seeds (S-Curve 59–62) ──
  { teamId: "furman",      sCurveRank: 59, kenpomRank: 95,  bpiRank: 80,  record: "22-12", confRegSeasonChamp: false, confTourneyChamp: true,  cinderellaWins: 4, upsetLosses: 7 },
  { teamId: "queens",      sCurveRank: 60, kenpomRank: 130, bpiRank: 110, record: "21-13", confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 5, upsetLosses: 6 },
  { teamId: "tennessee-state", sCurveRank: 61, kenpomRank: 150, bpiRank: 125, record: "23-9", confRegSeasonChamp: true, confTourneyChamp: true, cinderellaWins: 4, upsetLosses: 4 },
  { teamId: "idaho",       sCurveRank: 62, kenpomRank: 140, bpiRank: 115, record: "24-10", confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 5, upsetLosses: 5 },

  // ── 16-seeds (S-Curve 63–68 — includes First Four auto-bid) ──
  { teamId: "siena",       sCurveRank: 63, kenpomRank: 160, bpiRank: 135, record: "23-11", confRegSeasonChamp: false, confTourneyChamp: true,  cinderellaWins: 4, upsetLosses: 6 },
  { teamId: "liu",         sCurveRank: 64, kenpomRank: 200, bpiRank: 175, record: "24-10", confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 5, upsetLosses: 5 },
  { teamId: "umbc",        sCurveRank: 65, kenpomRank: 180, bpiRank: 155, record: "22-12", confRegSeasonChamp: false, confTourneyChamp: true,  cinderellaWins: 4, upsetLosses: 6 },
  { teamId: "howard",      sCurveRank: 66, kenpomRank: 210, bpiRank: 185, record: "21-13", confRegSeasonChamp: false, confTourneyChamp: true,  cinderellaWins: 5, upsetLosses: 7 },
  { teamId: "prairie-view", sCurveRank: 67, kenpomRank: 250, bpiRank: 220, record: "22-11", confRegSeasonChamp: true, confTourneyChamp: true, cinderellaWins: 4, upsetLosses: 6 },
  { teamId: "lehigh",      sCurveRank: 68, kenpomRank: 170, bpiRank: 145, record: "23-10", confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 5, upsetLosses: 5 },
]

// ── Lookup Map ──────────────────────────────────────────────────────────────

export const TEAM_DATA_2026_MAP: Map<string, TeamExtendedData> = new Map(
  TEAM_DATA_2026.map(t => [t.teamId, t])
)

export function getTeamExtendedData(teamId: string): TeamExtendedData | null {
  return TEAM_DATA_2026_MAP.get(teamId) ?? null
}
