/**
 * Extended team data for the 2026 NCAA tournament.
 *
 * Used for pre-tournament team cards. Contains rankings, record,
 * conference championship flags, and cinderella/upset indicators.
 *
 * KEYED BY ESPN ID — live teams use CUID IDs, so we look up by espnId.
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
  /** ESPN team ID (used as lookup key for live DB teams) */
  espnId: string
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
 * Keyed by ESPN ID for lookup from live DB team objects.
 */
export const TEAM_DATA_2026: TeamExtendedData[] = [
  // ── 1-seeds (S-Curve 1–4) ──
  { espnId: "150",  sCurveRank: 1,  kenpomRank: 1,   bpiRank: 1,   record: "32-2",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 1, upsetLosses: 2 },  // Duke
  { espnId: "12",   sCurveRank: 2,  kenpomRank: 3,   bpiRank: 2,   record: "32-2",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 1, upsetLosses: 2 },  // Arizona
  { espnId: "130",  sCurveRank: 3,  kenpomRank: 2,   bpiRank: 3,   record: "31-3",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 2, upsetLosses: 3 },  // Michigan
  { espnId: "57",   sCurveRank: 4,  kenpomRank: 4,   bpiRank: 4,   record: "29-5",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 3, upsetLosses: 4 },  // Florida

  // ── 2-seeds (S-Curve 5–8) ──
  { espnId: "41",   sCurveRank: 5,  kenpomRank: 12,  bpiRank: 10,  record: "29-5",  confRegSeasonChamp: false, confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 4 },  // UConn
  { espnId: "2509", sCurveRank: 6,  kenpomRank: 8,   bpiRank: 7,   record: "27-8",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 2, upsetLosses: 6 },  // Purdue
  { espnId: "66",   sCurveRank: 7,  kenpomRank: 6,   bpiRank: 6,   record: "27-7",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 5 },  // Iowa State
  { espnId: "248",  sCurveRank: 8,  kenpomRank: 5,   bpiRank: 5,   record: "28-5",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 2, upsetLosses: 4 },  // Houston

  // ── 3-seeds (S-Curve 9–12) ──
  { espnId: "127",  sCurveRank: 9,  kenpomRank: 9,   bpiRank: 9,   record: "25-7",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 3, upsetLosses: 5 },  // Michigan State
  { espnId: "2250", sCurveRank: 10, kenpomRank: 10,  bpiRank: 11,  record: "30-3",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 1, upsetLosses: 3 },  // Gonzaga
  { espnId: "258",  sCurveRank: 11, kenpomRank: 13,  bpiRank: 13,  record: "29-5",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 4 },  // Virginia
  { espnId: "356",  sCurveRank: 12, kenpomRank: 7,   bpiRank: 8,   record: "27-7",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 5 },  // Illinois

  // ── 4-seeds (S-Curve 13–16) ──
  { espnId: "2305", sCurveRank: 13, kenpomRank: 21,  bpiRank: 18,  record: "23-10", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 7 },  // Kansas
  { espnId: "8",    sCurveRank: 14, kenpomRank: 18,  bpiRank: 16,  record: "26-8",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 5 },  // Arkansas
  { espnId: "333",  sCurveRank: 15, kenpomRank: 17,  bpiRank: 15,  record: "23-9",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 6 },  // Alabama
  { espnId: "158",  sCurveRank: 16, kenpomRank: 14,  bpiRank: 14,  record: "24-9",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 5 },  // Nebraska

  // ── 5-seeds (S-Curve 17–20) ──
  { espnId: "2599", sCurveRank: 17, kenpomRank: 16,  bpiRank: 17,  record: "28-6",  confRegSeasonChamp: true,  confTourneyChamp: false, cinderellaWins: 3, upsetLosses: 5 },  // St. John's
  { espnId: "275",  sCurveRank: 18, kenpomRank: 22,  bpiRank: 20,  record: "24-10", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 6 },  // Wisconsin
  { espnId: "2641", sCurveRank: 19, kenpomRank: 20,  bpiRank: 19,  record: "22-10", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 3, upsetLosses: 7 },  // Texas Tech
  { espnId: "238",  sCurveRank: 20, kenpomRank: 11,  bpiRank: 12,  record: "24-9",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 5 },  // Vanderbilt

  // ── 6-seeds (S-Curve 21–24) ──
  { espnId: "97",   sCurveRank: 21, kenpomRank: 19,  bpiRank: 21,  record: "23-10", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 6 },  // Louisville
  { espnId: "252",  sCurveRank: 22, kenpomRank: 23,  bpiRank: 22,  record: "23-11", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 7 },  // BYU
  { espnId: "2633", sCurveRank: 23, kenpomRank: 15,  bpiRank: 23,  record: "22-11", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 6 },  // Tennessee
  { espnId: "153",  sCurveRank: 24, kenpomRank: 29,  bpiRank: 25,  record: "23-10", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 6 },  // North Carolina

  // ── 7-seeds (S-Curve 25–28) ──
  { espnId: "26",   sCurveRank: 25, kenpomRank: 27,  bpiRank: 26,  record: "23-11", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 7 },  // UCLA
  { espnId: "2390", sCurveRank: 26, kenpomRank: 31,  bpiRank: 28,  record: "25-8",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 3, upsetLosses: 5 },  // Miami
  { espnId: "96",   sCurveRank: 27, kenpomRank: 28,  bpiRank: 27,  record: "21-13", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 6, upsetLosses: 7 },  // Kentucky
  { espnId: "2608", sCurveRank: 28, kenpomRank: 24,  bpiRank: 24,  record: "28-5",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 2, upsetLosses: 4 },  // Saint Mary's

  // ── 8-seeds (S-Curve 29–32) ──
  { espnId: "194",  sCurveRank: 29, kenpomRank: 26,  bpiRank: 29,  record: "21-12", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 7 },  // Ohio State
  { espnId: "222",  sCurveRank: 30, kenpomRank: 33,  bpiRank: 30,  record: "24-8",  confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 3, upsetLosses: 5 },  // Villanova
  { espnId: "61",   sCurveRank: 31, kenpomRank: 32,  bpiRank: 32,  record: "22-10", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 6 },  // Georgia
  { espnId: "228",  sCurveRank: 32, kenpomRank: 36,  bpiRank: 34,  record: "22-11", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 7 },  // Clemson

  // ── 9-seeds (S-Curve 33–36) ──
  { espnId: "2628", sCurveRank: 33, kenpomRank: 43,  bpiRank: 38,  record: "22-11", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 6 },  // TCU
  { espnId: "328",  sCurveRank: 34, kenpomRank: 30,  bpiRank: 31,  record: "28-6",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 4 },  // Utah State
  { espnId: "139",  sCurveRank: 35, kenpomRank: 41,  bpiRank: 36,  record: "28-5",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 2, upsetLosses: 3 },  // Saint Louis
  { espnId: "2294", sCurveRank: 36, kenpomRank: 25,  bpiRank: 33,  record: "22-12", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 6, upsetLosses: 6 },  // Iowa

  // ── 10-seeds (S-Curve 37–40) ──
  { espnId: "2116", sCurveRank: 37, kenpomRank: 54,  bpiRank: 42,  record: "21-11", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 5 },  // UCF
  { espnId: "142",  sCurveRank: 38, kenpomRank: 52,  bpiRank: 40,  record: "20-12", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 6 },  // Missouri
  { espnId: "2541", sCurveRank: 39, kenpomRank: 35,  bpiRank: 35,  record: "26-8",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 4, upsetLosses: 5 },  // Santa Clara
  { espnId: "245",  sCurveRank: 40, kenpomRank: 39,  bpiRank: 37,  record: "22-11", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 6 },  // Texas A&M

  // ── 11-seeds (S-Curve 41–46 — includes First Four at-large) ──
  { espnId: "58",   sCurveRank: 41, kenpomRank: 49,  bpiRank: 43,  record: "25-8",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 5, upsetLosses: 4 },  // South Florida
  { espnId: "2670", sCurveRank: 42, kenpomRank: 46,  bpiRank: 44,  record: "25-9",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 5 },  // VCU
  { espnId: "251",  sCurveRank: 43, kenpomRank: 37,  bpiRank: 39,  record: "21-13", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 8 },  // Texas
  { espnId: "152",  sCurveRank: 44, kenpomRank: 34,  bpiRank: 41,  record: "21-13", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 5, upsetLosses: 7 },  // NC State
  { espnId: "2567", sCurveRank: 45, kenpomRank: 42,  bpiRank: 45,  record: "23-10", confRegSeasonChamp: false, confTourneyChamp: false, cinderellaWins: 4, upsetLosses: 6 },  // SMU
  { espnId: "193",  sCurveRank: 46, kenpomRank: 93,  bpiRank: 65,  record: "31-1",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 1, upsetLosses: 1 },  // Miami (OH)

  // ── 12-seeds (S-Curve 47–50) ──
  { espnId: "2460", sCurveRank: 47, kenpomRank: 75,  bpiRank: 58,  record: "23-12", confRegSeasonChamp: false, confTourneyChamp: true,  cinderellaWins: 5, upsetLosses: 6 },  // Northern Iowa
  { espnId: "2272", sCurveRank: 48, kenpomRank: 72,  bpiRank: 55,  record: "30-4",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 3 },  // High Point
  { espnId: "2006", sCurveRank: 49, kenpomRank: 64,  bpiRank: 52,  record: "29-5",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 2, upsetLosses: 4 },  // Akron
  { espnId: "2377", sCurveRank: 50, kenpomRank: 68,  bpiRank: 56,  record: "27-7",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 2, upsetLosses: 4 },  // McNeese

  // ── 13-seeds (S-Curve 51–54) ──
  { espnId: "2856", sCurveRank: 51, kenpomRank: 85,  bpiRank: 70,  record: "25-8",  confRegSeasonChamp: false, confTourneyChamp: true,  cinderellaWins: 2, upsetLosses: 5 },  // Cal Baptist
  { espnId: "62",   sCurveRank: 52, kenpomRank: 80,  bpiRank: 65,  record: "24-8",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 5 },  // Hawaii
  { espnId: "2275", sCurveRank: 53, kenpomRank: 78,  bpiRank: 68,  record: "24-10", confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 6 },  // Hofstra
  { espnId: "2653", sCurveRank: 54, kenpomRank: 90,  bpiRank: 75,  record: "24-10", confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 6 },  // Troy

  // ── 14-seeds (S-Curve 55–58) ──
  { espnId: "2449", sCurveRank: 55, kenpomRank: 110, bpiRank: 90,  record: "27-7",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 4, upsetLosses: 4 },  // North Dakota State
  { espnId: "338",  sCurveRank: 56, kenpomRank: 115, bpiRank: 95,  record: "21-13", confRegSeasonChamp: false, confTourneyChamp: true,  cinderellaWins: 3, upsetLosses: 7 },  // Kennesaw State
  { espnId: "2918", sCurveRank: 57, kenpomRank: 120, bpiRank: 100, record: "23-11", confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 4, upsetLosses: 5 },  // Wright State
  { espnId: "219",  sCurveRank: 58, kenpomRank: 100, bpiRank: 85,  record: "22-8",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 2, upsetLosses: 4 },  // Penn

  // ── 15-seeds (S-Curve 59–62) ──
  { espnId: "231",  sCurveRank: 59, kenpomRank: 95,  bpiRank: 80,  record: "22-12", confRegSeasonChamp: false, confTourneyChamp: true,  cinderellaWins: 4, upsetLosses: 7 },  // Furman
  { espnId: "2511", sCurveRank: 60, kenpomRank: 130, bpiRank: 110, record: "21-13", confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 5, upsetLosses: 6 },  // Queens
  { espnId: "2634", sCurveRank: 61, kenpomRank: 150, bpiRank: 125, record: "23-9",  confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 4, upsetLosses: 4 },  // Tennessee State
  { espnId: "70",   sCurveRank: 62, kenpomRank: 140, bpiRank: 115, record: "24-10", confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 5, upsetLosses: 5 },  // Idaho

  // ── 16-seeds (S-Curve 63–68 — includes First Four auto-bid) ──
  { espnId: "2561", sCurveRank: 63, kenpomRank: 160, bpiRank: 135, record: "23-11", confRegSeasonChamp: false, confTourneyChamp: true,  cinderellaWins: 4, upsetLosses: 6 },  // Siena
  { espnId: "112358", sCurveRank: 64, kenpomRank: 200, bpiRank: 175, record: "24-10", confRegSeasonChamp: true, confTourneyChamp: true, cinderellaWins: 5, upsetLosses: 5 },  // LIU
  { espnId: "2692", sCurveRank: 65, kenpomRank: 180, bpiRank: 155, record: "22-12", confRegSeasonChamp: false, confTourneyChamp: true,  cinderellaWins: 4, upsetLosses: 6 },  // UMBC
  { espnId: "47",   sCurveRank: 66, kenpomRank: 210, bpiRank: 185, record: "21-13", confRegSeasonChamp: false, confTourneyChamp: true,  cinderellaWins: 5, upsetLosses: 7 },  // Howard
  { espnId: "2504", sCurveRank: 67, kenpomRank: 250, bpiRank: 220, record: "22-11", confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 4, upsetLosses: 6 },  // Prairie View A&M
  { espnId: "2329", sCurveRank: 68, kenpomRank: 170, bpiRank: 145, record: "23-10", confRegSeasonChamp: true,  confTourneyChamp: true,  cinderellaWins: 5, upsetLosses: 5 },  // Lehigh
]

// ── Lookup Map (keyed by ESPN ID) ──────────────────────────────────────────

export const TEAM_DATA_2026_MAP: Map<string, TeamExtendedData> = new Map(
  TEAM_DATA_2026.map(t => [t.espnId, t])
)

/**
 * Look up extended team data by ESPN ID.
 * Live DB teams should pass team.espnId, demo mode should pass slug IDs (will miss).
 */
export function getTeamExtendedData(espnId: string): TeamExtendedData | null {
  return TEAM_DATA_2026_MAP.get(espnId) ?? null
}
