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

export interface SBVersion {
  checkpoint: number
  timestamp: string
  teams: SilverBulletinTeam[]
}

// ─── Version 0: Pre-tournament (20260319_0h) ──────────────────────────────────

const SB_VERSION_0: SBVersion = {
  checkpoint: 0,
  timestamp: "20260319_0h",
  teams: [
  // -- East --
  { teamId: "150",  sbName: "Duke",                    seed: 1,  region: "East",    playIn: false, cumulative: [1, 0.9877, 0.8449, 0.6578, 0.5056, 0.3273, 0.1909] },
  { teamId: "41",   sbName: "UConn",                   seed: 2,  region: "East",    playIn: false, cumulative: [1, 0.9418, 0.6714, 0.3775, 0.1346, 0.0568, 0.0206] },
  { teamId: "127",  sbName: "Michigan St.",            seed: 3,  region: "East",    playIn: false, cumulative: [1, 0.924, 0.5403, 0.2834, 0.0941, 0.0389, 0.0139] },
  { teamId: "2305",   sbName: "Kansas",                  seed: 4,  region: "East",    playIn: false, cumulative: [1, 0.8626, 0.4165, 0.1011, 0.0482, 0.0174, 0.0055] },
  { teamId: "2599",   sbName: "St. John's",             seed: 5,  region: "East",    playIn: false, cumulative: [1, 0.8254, 0.5067, 0.1658, 0.0946, 0.0404, 0.0149] },
  { teamId: "97",   sbName: "Louisville",              seed: 6,  region: "East",    playIn: false, cumulative: [1, 0.6986, 0.3556, 0.1828, 0.0582, 0.0244, 0.0086] },
  { teamId: "26",   sbName: "UCLA",                    seed: 7,  region: "East",    playIn: false, cumulative: [1, 0.6916, 0.252, 0.1051, 0.0257, 0.0082, 0.0024] },
  { teamId: "194",  sbName: "Ohio St.",                seed: 8,  region: "East",    playIn: false, cumulative: [1, 0.6417, 0.1134, 0.0534, 0.0244, 0.0082, 0.0024] },
  { teamId: "2628",   sbName: "TCU",                     seed: 9,  region: "East",    playIn: false, cumulative: [1, 0.3583, 0.041, 0.0144, 0.0048, 0.0011, 0.0002] },
  { teamId: "2116",   sbName: "UCF",                     seed: 10, region: "East",    playIn: false, cumulative: [1, 0.3084, 0.0679, 0.0183, 0.0026, 0.0005, 0.0001] },
  { teamId: "58",   sbName: "South Florida",           seed: 11, region: "East",    playIn: false, cumulative: [1, 0.3014, 0.0941, 0.0308, 0.0054, 0.001, 0.0002] },
  { teamId: "2460",   sbName: "Northern Iowa",           seed: 12, region: "East",    playIn: false, cumulative: [1, 0.1746, 0.0536, 0.0065, 0.0017, 0.0003, 0.0001] },
  { teamId: "2856",   sbName: "California Baptist",      seed: 13, region: "East",    playIn: false, cumulative: [1, 0.1375, 0.0232, 0.0011, 0.0002, 0, 0] },
  { teamId: "2449",   sbName: "North Dakota St.",        seed: 14, region: "East",    playIn: false, cumulative: [1, 0.0761, 0.01, 0.0012, 0.0001, 0, 0] },
  { teamId: "231",  sbName: "Furman",                  seed: 15, region: "East",    playIn: false, cumulative: [1, 0.0582, 0.0088, 0.001, 0, 0, 0] },
  { teamId: "2561",   sbName: "Siena",                   seed: 16, region: "East",    playIn: false, cumulative: [1, 0.0124, 0.0007, 0, 0, 0, 0] },
  // -- South --
  { teamId: "57",   sbName: "Florida",                 seed: 1,  region: "South",   playIn: false, cumulative: [1, 0.9916, 0.8357, 0.6008, 0.3438, 0.1851, 0.0937] },
  { teamId: "248",  sbName: "Houston",                 seed: 2,  region: "South",   playIn: false, cumulative: [1, 0.9684, 0.7514, 0.4925, 0.2888, 0.1389, 0.0627] },
  { teamId: "356",  sbName: "Illinois",                seed: 3,  region: "South",   playIn: false, cumulative: [1, 0.971, 0.7881, 0.3765, 0.1867, 0.0903, 0.0404] },
  { teamId: "158",  sbName: "Nebraska",                seed: 4,  region: "South",   playIn: false, cumulative: [1, 0.9268, 0.4469, 0.1401, 0.0487, 0.0166, 0.0055] },
  { teamId: "238",  sbName: "Vanderbilt",              seed: 5,  region: "South",   playIn: false, cumulative: [1, 0.8404, 0.5013, 0.1879, 0.0785, 0.0312, 0.0118] },
  { teamId: "153",  sbName: "North Carolina",          seed: 6,  region: "South",   playIn: false, cumulative: [1, 0.5022, 0.1049, 0.0221, 0.0047, 0.001, 0.0002] },
  { teamId: "2608",   sbName: "Saint Mary's (CA)",      seed: 7,  region: "South",   playIn: false, cumulative: [1, 0.5819, 0.1578, 0.0581, 0.0178, 0.005, 0.0013] },
  { teamId: "228",  sbName: "Clemson",                 seed: 8,  region: "South",   playIn: false, cumulative: [1, 0.4028, 0.0621, 0.0229, 0.0059, 0.0015, 0.0003] },
  { teamId: "2294",   sbName: "Iowa",                    seed: 9,  region: "South",   playIn: false, cumulative: [1, 0.5972, 0.1018, 0.0414, 0.0118, 0.0034, 0.001] },
  { teamId: "245",  sbName: "Texas A&M",               seed: 10, region: "South",   playIn: false, cumulative: [1, 0.4181, 0.0873, 0.0286, 0.0071, 0.0016, 0.0003] },
  { teamId: "2670",   sbName: "VCU",                     seed: 11, region: "South",   playIn: false, cumulative: [1, 0.4978, 0.1027, 0.0218, 0.0048, 0.0009, 0.0002] },
  { teamId: "2377",   sbName: "McNeese",                 seed: 12, region: "South",   playIn: false, cumulative: [1, 0.1596, 0.0451, 0.0065, 0.0012, 0.0002, 0] },
  { teamId: "2653",   sbName: "Troy",                    seed: 13, region: "South",   playIn: false, cumulative: [1, 0.0732, 0.0067, 0.0003, 0, 0, 0] },
  { teamId: "219",  sbName: "Penn",                    seed: 14, region: "South",   playIn: false, cumulative: [1, 0.029, 0.0043, 0.0002, 0, 0, 0] },
  { teamId: "70",   sbName: "Idaho",                   seed: 15, region: "South",   playIn: false, cumulative: [1, 0.0316, 0.0036, 0.0002, 0, 0, 0] },
  { teamId: "2504",   sbName: "Prairie View A&M",        seed: 16, region: "South",   playIn: true , cumulative: [1, 0.0084, 0.0003, 0, 0, 0, 0] },
  { teamId: "2329",   sbName: "Lehigh",                  seed: 16, region: "South",   playIn: true , cumulative: [0, 0, 0, 0, 0, 0, 0] },
  // -- West --
  { teamId: "12",   sbName: "Arizona",                 seed: 1,  region: "West",    playIn: false, cumulative: [1, 0.9898, 0.8899, 0.7212, 0.5294, 0.2934, 0.1662] },
  { teamId: "2509",   sbName: "Purdue",                  seed: 2,  region: "West",    playIn: false, cumulative: [1, 0.9781, 0.7676, 0.4602, 0.1821, 0.0824, 0.0395] },
  { teamId: "2250",   sbName: "Gonzaga",                 seed: 3,  region: "West",    playIn: false, cumulative: [1, 0.9645, 0.7136, 0.3683, 0.1336, 0.0457, 0.0165] },
  { teamId: "8",    sbName: "Arkansas",                seed: 4,  region: "West",    playIn: false, cumulative: [1, 0.9271, 0.5521, 0.1407, 0.0658, 0.0224, 0.0077] },
  { teamId: "275",  sbName: "Wisconsin",               seed: 5,  region: "West",    playIn: false, cumulative: [1, 0.8312, 0.4032, 0.0936, 0.0398, 0.0125, 0.0043] },
  { teamId: "252",  sbName: "BYU",                     seed: 6,  region: "West",    playIn: false, cumulative: [1, 0.5628, 0.1655, 0.056, 0.0118, 0.0025, 0.0006] },
  { teamId: "2390",   sbName: "U Miami (FL)",            seed: 7,  region: "West",    playIn: false, cumulative: [1, 0.5601, 0.1363, 0.0504, 0.0109, 0.0025, 0.0006] },
  { teamId: "222",  sbName: "Villanova",               seed: 8,  region: "West",    playIn: false, cumulative: [1, 0.4088, 0.0387, 0.0131, 0.0036, 0.0008, 0.0002] },
  { teamId: "328",  sbName: "Utah St.",                seed: 9,  region: "West",    playIn: false, cumulative: [1, 0.5912, 0.0707, 0.0284, 0.0103, 0.0023, 0.0006] },
  { teamId: "142",  sbName: "Missouri",                seed: 10, region: "West",    playIn: false, cumulative: [1, 0.4399, 0.0941, 0.0289, 0.005, 0.001, 0.0002] },
  { teamId: "251",  sbName: "Texas",                   seed: 11, region: "West",    playIn: true , cumulative: [1, 0.4372, 0.1173, 0.036, 0.0072, 0.0016, 0.0005] },
  { teamId: "152",  sbName: "NC State",                seed: 11, region: "West",    playIn: true , cumulative: [0, 0, 0, 0, 0, 0, 0] },
  { teamId: "2272",   sbName: "High Point",              seed: 12, region: "West",    playIn: false, cumulative: [1, 0.1688, 0.0334, 0.0024, 0.0005, 0.0001, 0] },
  { teamId: "62",   sbName: "Hawaii",                  seed: 13, region: "West",    playIn: false, cumulative: [1, 0.0729, 0.0113, 0.0006, 0.0001, 0, 0] },
  { teamId: "338",  sbName: "Kennesaw St.",            seed: 14, region: "West",    playIn: false, cumulative: [1, 0.0355, 0.0036, 0.0002, 0, 0, 0] },
  { teamId: "2511",   sbName: "Queens",                  seed: 15, region: "West",    playIn: false, cumulative: [1, 0.0219, 0.0021, 0.0001, 0, 0, 0] },
  { teamId: "112358", sbName: "LIU",                     seed: 16, region: "West",    playIn: false, cumulative: [1, 0.0102, 0.0008, 0, 0, 0, 0] },
  // -- Midwest --
  { teamId: "130",  sbName: "Michigan",                seed: 1,  region: "Midwest", playIn: false, cumulative: [1, 0.9806, 0.8802, 0.7385, 0.5146, 0.3219, 0.1939] },
  { teamId: "66",   sbName: "Iowa St.",                seed: 2,  region: "Midwest", playIn: false, cumulative: [1, 0.9752, 0.7487, 0.5125, 0.2406, 0.1248, 0.0625] },
  { teamId: "258",  sbName: "Virginia",                seed: 3,  region: "Midwest", playIn: false, cumulative: [1, 0.9443, 0.5578, 0.2215, 0.073, 0.0284, 0.0106] },
  { teamId: "333",  sbName: "Alabama",                 seed: 4,  region: "Midwest", playIn: false, cumulative: [1, 0.8731, 0.6162, 0.1515, 0.0627, 0.0225, 0.0081] },
  { teamId: "2641",   sbName: "Texas Tech",              seed: 5,  region: "Midwest", playIn: false, cumulative: [1, 0.7037, 0.2768, 0.049, 0.0149, 0.004, 0.0011] },
  { teamId: "2633",   sbName: "Tennessee",               seed: 6,  region: "Midwest", playIn: false, cumulative: [1, 0.8752, 0.4165, 0.1562, 0.0492, 0.0178, 0.0061] },
  { teamId: "96",   sbName: "Kentucky",                seed: 7,  region: "Midwest", playIn: false, cumulative: [1, 0.639, 0.1797, 0.0837, 0.0245, 0.0087, 0.0028] },
  { teamId: "61",   sbName: "Georgia",                 seed: 8,  region: "Midwest", playIn: false, cumulative: [1, 0.5743, 0.0716, 0.0319, 0.0093, 0.0024, 0.0006] },
  { teamId: "139",  sbName: "Saint Louis",             seed: 9,  region: "Midwest", playIn: false, cumulative: [1, 0.4257, 0.0454, 0.0189, 0.005, 0.0012, 0.0003] },
  { teamId: "2541",   sbName: "Santa Clara",             seed: 10, region: "Midwest", playIn: false, cumulative: [1, 0.361, 0.0692, 0.0236, 0.0047, 0.0011, 0.0002] },
  { teamId: "193",  sbName: "Miami University (OH)",   seed: 11, region: "Midwest", playIn: true , cumulative: [1, 0.1248, 0.0193, 0.002, 0.0002, 0, 0] },
  { teamId: "2567",   sbName: "SMU",                     seed: 11, region: "Midwest", playIn: true , cumulative: [0, 0, 0, 0, 0, 0, 0] },
  { teamId: "2006",   sbName: "Akron",                   seed: 12, region: "Midwest", playIn: false, cumulative: [1, 0.2963, 0.0675, 0.0067, 0.001, 0.0002, 0] },
  { teamId: "2275",   sbName: "Hofstra",                 seed: 13, region: "Midwest", playIn: false, cumulative: [1, 0.1269, 0.0396, 0.0031, 0.0004, 0.0001, 0] },
  { teamId: "2750",   sbName: "Wright St.",              seed: 14, region: "Midwest", playIn: false, cumulative: [1, 0.0557, 0.0064, 0.0004, 0, 0, 0] },
  { teamId: "2634",   sbName: "Tennessee St.",           seed: 15, region: "Midwest", playIn: false, cumulative: [1, 0.0249, 0.0023, 0.0002, 0, 0, 0] },
  { teamId: "2692",   sbName: "UMBC",                    seed: 16, region: "Midwest", playIn: true , cumulative: [0, 0, 0, 0, 0, 0, 0] },
  { teamId: "47",   sbName: "Howard",                  seed: 16, region: "Midwest", playIn: true , cumulative: [1, 0.0194, 0.0028, 0.0004, 0, 0, 0] },
  ],
}

// ─── Version 1: Post R64 D1 (20260320_01h) ────────────────────────────────────

const SB_VERSION_1: SBVersion = {
  checkpoint: 1,
  timestamp: "20260320_01h",
  teams: [
  // -- East --
  { teamId: "150",  sbName: "Duke",                    seed: 1,  region: "East",    playIn: false, cumulative: [1, 1, 0.87915, 0.65419, 0.47422, 0.28054, 0.15591] },
  { teamId: "41",   sbName: "UConn",                   seed: 2,  region: "East",    playIn: false, cumulative: [1, 0.94178, 0.66941, 0.35791, 0.13917, 0.05702, 0.021] },
  { teamId: "127",  sbName: "Michigan St.",            seed: 3,  region: "East",    playIn: false, cumulative: [1, 1, 0.59141, 0.32183, 0.11794, 0.04823, 0.01828] },
  { teamId: "2305",   sbName: "Kansas",                  seed: 4,  region: "East",    playIn: false, cumulative: [1, 0.86255, 0.41675, 0.11309, 0.05163, 0.01912, 0.00608] },
  { teamId: "2599",   sbName: "St. John's",             seed: 5,  region: "East",    playIn: false, cumulative: [1, 0.8254, 0.50756, 0.18389, 0.10351, 0.04339, 0.01672] },
  { teamId: "97",   sbName: "Louisville",              seed: 6,  region: "East",    playIn: false, cumulative: [1, 1, 0.40859, 0.20645, 0.06933, 0.02582, 0.00903] },
  { teamId: "26",   sbName: "UCLA",                    seed: 7,  region: "East",    playIn: false, cumulative: [1, 0.72189, 0.26109, 0.09906, 0.02676, 0.00816, 0.0022] },
  { teamId: "194",  sbName: "Ohio St.",                seed: 8,  region: "East",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2628",   sbName: "TCU",                     seed: 9,  region: "East",    playIn: false, cumulative: [1, 1, 0.12085, 0.04089, 0.01329, 0.00335, 0.0007] },
  { teamId: "2116",   sbName: "UCF",                     seed: 10, region: "East",    playIn: false, cumulative: [1, 0.27811, 0.06059, 0.01401, 0.00221, 0.00039, 0.00008] },
  { teamId: "58",   sbName: "South Florida",           seed: 11, region: "East",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2460",   sbName: "Northern Iowa",           seed: 12, region: "East",    playIn: false, cumulative: [1, 0.1746, 0.05286, 0.00653, 0.0017, 0.00027, 0.00003] },
  { teamId: "2856",   sbName: "California Baptist",      seed: 13, region: "East",    playIn: false, cumulative: [1, 0.13745, 0.02283, 0.00141, 0.00019, 0.00002, 0] },
  { teamId: "2449",   sbName: "North Dakota St.",        seed: 14, region: "East",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "231",  sbName: "Furman",                  seed: 15, region: "East",    playIn: false, cumulative: [1, 0.05822, 0.00891, 0.00074, 0.00005, 0, 0] },
  { teamId: "2561",   sbName: "Siena",                   seed: 16, region: "East",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  // -- South --
  { teamId: "57",   sbName: "Florida",                 seed: 1,  region: "South",   playIn: false, cumulative: [1, 0.99271, 0.83692, 0.58641, 0.32105, 0.18209, 0.09355] },
  { teamId: "248",  sbName: "Houston",                 seed: 2,  region: "South",   playIn: false, cumulative: [1, 1, 0.81309, 0.51842, 0.30983, 0.16113, 0.07468] },
  { teamId: "356",  sbName: "Illinois",                seed: 3,  region: "South",   playIn: false, cumulative: [1, 1, 0.83565, 0.39425, 0.2015, 0.10635, 0.04976] },
  { teamId: "158",  sbName: "Nebraska",                seed: 4,  region: "South",   playIn: false, cumulative: [1, 1, 0.46403, 0.15595, 0.05557, 0.02166, 0.00712] },
  { teamId: "238",  sbName: "Vanderbilt",              seed: 5,  region: "South",   playIn: false, cumulative: [1, 1, 0.53597, 0.19803, 0.07506, 0.03196, 0.01152] },
  { teamId: "153",  sbName: "North Carolina",          seed: 6,  region: "South",   playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2608",   sbName: "Saint Mary's (CA)",      seed: 7,  region: "South",   playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "228",  sbName: "Clemson",                 seed: 8,  region: "South",   playIn: false, cumulative: [1, 0.40276, 0.06132, 0.02099, 0.00491, 0.00152, 0.0003] },
  { teamId: "2294",   sbName: "Iowa",                    seed: 9,  region: "South",   playIn: false, cumulative: [1, 0.59724, 0.1014, 0.03861, 0.01027, 0.00344, 0.00108] },
  { teamId: "245",  sbName: "Texas A&M",               seed: 10, region: "South",   playIn: false, cumulative: [1, 1, 0.18691, 0.05746, 0.01537, 0.00394, 0.00085] },
  { teamId: "2670",   sbName: "VCU",                     seed: 11, region: "South",   playIn: false, cumulative: [1, 1, 0.16435, 0.02987, 0.00643, 0.0016, 0.00029] },
  { teamId: "2377",   sbName: "McNeese",                 seed: 12, region: "South",   playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2653",   sbName: "Troy",                    seed: 13, region: "South",   playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "219",  sbName: "Penn",                    seed: 14, region: "South",   playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "70",   sbName: "Idaho",                   seed: 15, region: "South",   playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2504",   sbName: "Prairie View A&M",        seed: 16, region: "South",   playIn: true , cumulative: [1, 0.00729, 0.00036, 0.00001, 0.00001, 0, 0] },
  { teamId: "2329",   sbName: "Lehigh",                  seed: 16, region: "South",   playIn: true , cumulative: [0, 0, 0, 0, 0, 0, 0] },
  // -- West --
  { teamId: "12",   sbName: "Arizona",                 seed: 1,  region: "West",    playIn: false, cumulative: [1, 0.9898, 0.88965, 0.73268, 0.54198, 0.30272, 0.17461] },
  { teamId: "2509",   sbName: "Purdue",                  seed: 2,  region: "West",    playIn: false, cumulative: [1, 0.97808, 0.76662, 0.47795, 0.18866, 0.08608, 0.04148] },
  { teamId: "2250",   sbName: "Gonzaga",                 seed: 3,  region: "West",    playIn: false, cumulative: [1, 1, 0.70137, 0.34792, 0.11877, 0.04042, 0.01407] },
  { teamId: "8",    sbName: "Arkansas",                seed: 4,  region: "West",    playIn: false, cumulative: [1, 1, 0.84739, 0.20977, 0.09837, 0.03195, 0.01166] },
  { teamId: "275",  sbName: "Wisconsin",               seed: 5,  region: "West",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "252",  sbName: "BYU",                     seed: 6,  region: "West",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2390",   sbName: "U Miami (FL)",            seed: 7,  region: "West",    playIn: false, cumulative: [1, 0.55934, 0.1369, 0.05233, 0.01144, 0.00267, 0.00062] },
  { teamId: "222",  sbName: "Villanova",               seed: 8,  region: "West",    playIn: false, cumulative: [1, 0.40882, 0.03816, 0.01396, 0.00417, 0.00087, 0.00015] },
  { teamId: "328",  sbName: "Utah St.",                seed: 9,  region: "West",    playIn: false, cumulative: [1, 0.59118, 0.07137, 0.03105, 0.01116, 0.00256, 0.00061] },
  { teamId: "142",  sbName: "Missouri",                seed: 10, region: "West",    playIn: false, cumulative: [1, 0.44066, 0.09415, 0.03126, 0.0052, 0.00095, 0.00023] },
  { teamId: "251",  sbName: "Texas",                   seed: 11, region: "West",    playIn: true , cumulative: [1, 1, 0.29863, 0.09041, 0.01793, 0.00371, 0.00082] },
  { teamId: "152",  sbName: "NC State",                seed: 11, region: "West",    playIn: true , cumulative: [0, 0, 0, 0, 0, 0, 0] },
  { teamId: "2272",   sbName: "High Point",              seed: 12, region: "West",    playIn: false, cumulative: [1, 1, 0.15261, 0.01247, 0.00231, 0.00032, 0.00005] },
  { teamId: "62",   sbName: "Hawaii",                  seed: 13, region: "West",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "338",  sbName: "Kennesaw St.",            seed: 14, region: "West",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2511",   sbName: "Queens",                  seed: 15, region: "West",    playIn: false, cumulative: [1, 0.02192, 0.00233, 0.00013, 0.00001, 0, 0] },
  { teamId: "112358", sbName: "LIU",                     seed: 16, region: "West",    playIn: false, cumulative: [1, 0.0102, 0.00082, 0.00007, 0, 0, 0] },
  // -- Midwest --
  { teamId: "130",  sbName: "Michigan",                seed: 1,  region: "Midwest", playIn: false, cumulative: [1, 1, 0.8927, 0.74432, 0.51244, 0.31661, 0.19212] },
  { teamId: "66",   sbName: "Iowa St.",                seed: 2,  region: "Midwest", playIn: false, cumulative: [1, 0.97545, 0.74889, 0.51045, 0.24353, 0.12642, 0.06437] },
  { teamId: "258",  sbName: "Virginia",                seed: 3,  region: "Midwest", playIn: false, cumulative: [1, 0.94428, 0.55799, 0.22119, 0.07315, 0.02777, 0.01092] },
  { teamId: "333",  sbName: "Alabama",                 seed: 4,  region: "Midwest", playIn: false, cumulative: [1, 0.87314, 0.61757, 0.15098, 0.06221, 0.0218, 0.00773] },
  { teamId: "2641",   sbName: "Texas Tech",              seed: 5,  region: "Midwest", playIn: false, cumulative: [1, 0.70387, 0.27566, 0.04697, 0.01463, 0.00412, 0.00098] },
  { teamId: "2633",   sbName: "Tennessee",               seed: 6,  region: "Midwest", playIn: false, cumulative: [1, 0.87516, 0.41685, 0.15647, 0.04862, 0.01809, 0.00651] },
  { teamId: "96",   sbName: "Kentucky",                seed: 7,  region: "Midwest", playIn: false, cumulative: [1, 0.63897, 0.17942, 0.08492, 0.02425, 0.00819, 0.00267] },
  { teamId: "61",   sbName: "Georgia",                 seed: 8,  region: "Midwest", playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "139",  sbName: "Saint Louis",             seed: 9,  region: "Midwest", playIn: false, cumulative: [1, 1, 0.1073, 0.04871, 0.01435, 0.00331, 0.00086] },
  { teamId: "2541",   sbName: "Santa Clara",             seed: 10, region: "Midwest", playIn: false, cumulative: [1, 0.36103, 0.06931, 0.0244, 0.00505, 0.00123, 0.0003] },
  { teamId: "193",  sbName: "Miami University (OH)",   seed: 11, region: "Midwest", playIn: true , cumulative: [1, 0.12484, 0.01839, 0.00207, 0.0002, 0.00002, 0.00002] },
  { teamId: "2567",   sbName: "SMU",                     seed: 11, region: "Midwest", playIn: true , cumulative: [0, 0, 0, 0, 0, 0, 0] },
  { teamId: "2006",   sbName: "Akron",                   seed: 12, region: "Midwest", playIn: false, cumulative: [1, 0.29613, 0.06657, 0.00602, 0.0011, 0.00011, 0.00002] },
  { teamId: "2275",   sbName: "Hofstra",                 seed: 13, region: "Midwest", playIn: false, cumulative: [1, 0.12686, 0.0402, 0.003, 0.00044, 0.00008, 0.00002] },
  { teamId: "2750",   sbName: "Wright St.",              seed: 14, region: "Midwest", playIn: false, cumulative: [1, 0.05572, 0.00677, 0.00035, 0.00003, 0, 0] },
  { teamId: "2634",   sbName: "Tennessee St.",           seed: 15, region: "Midwest", playIn: false, cumulative: [1, 0.02455, 0.00238, 0.00015, 0, 0, 0] },
  { teamId: "2692",   sbName: "UMBC",                    seed: 16, region: "Midwest", playIn: true , cumulative: [0, 0, 0, 0, 0, 0, 0] },
  { teamId: "47",   sbName: "Howard",                  seed: 16, region: "Midwest", playIn: true , cumulative: [1, 0, 0, 0, 0, 0, 0] },
  ],
}

// ─── Version 2: Post R64 D2 (20260321_01h) ────────────────────────────────────

const SB_VERSION_2: SBVersion = {
  checkpoint: 2,
  timestamp: "20260321_01h",
  teams: [
  // -- East --
  { teamId: "150",  sbName: "Duke",                    seed: 1,  region: "East",    playIn: false, cumulative: [1, 1, 0.85613, 0.60747, 0.44359, 0.25553, 0.1389] },
  { teamId: "41",   sbName: "UConn",                   seed: 2,  region: "East",    playIn: false, cumulative: [1, 1, 0.70408, 0.36697, 0.13747, 0.05246, 0.01909] },
  { teamId: "127",  sbName: "Michigan St.",            seed: 3,  region: "East",    playIn: false, cumulative: [1, 1, 0.59161, 0.31487, 0.11517, 0.04443, 0.01657] },
  { teamId: "2305",   sbName: "Kansas",                  seed: 4,  region: "East",    playIn: false, cumulative: [1, 1, 0.38328, 0.10572, 0.04741, 0.01494, 0.00498] },
  { teamId: "2599",   sbName: "St. John's",             seed: 5,  region: "East",    playIn: false, cumulative: [1, 1, 0.61672, 0.24439, 0.14486, 0.0608, 0.02418] },
  { teamId: "97",   sbName: "Louisville",              seed: 6,  region: "East",    playIn: false, cumulative: [1, 1, 0.40839, 0.20385, 0.06677, 0.02443, 0.00811] },
  { teamId: "26",   sbName: "UCLA",                    seed: 7,  region: "East",    playIn: false, cumulative: [1, 1, 0.29592, 0.11431, 0.03061, 0.00929, 0.00265] },
  { teamId: "194",  sbName: "Ohio St.",                seed: 8,  region: "East",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2628",   sbName: "TCU",                     seed: 9,  region: "East",    playIn: false, cumulative: [1, 1, 0.14387, 0.04242, 0.01412, 0.00304, 0.00063] },
  { teamId: "2116",   sbName: "UCF",                     seed: 10, region: "East",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "58",   sbName: "South Florida",           seed: 11, region: "East",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2460",   sbName: "Northern Iowa",           seed: 12, region: "East",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2856",   sbName: "California Baptist",      seed: 13, region: "East",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2449",   sbName: "North Dakota St.",        seed: 14, region: "East",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "231",  sbName: "Furman",                  seed: 15, region: "East",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2561",   sbName: "Siena",                   seed: 16, region: "East",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  // -- South --
  { teamId: "57",   sbName: "Florida",                 seed: 1,  region: "South",   playIn: false, cumulative: [1, 1, 0.86557, 0.63846, 0.37435, 0.22676, 0.12375] },
  { teamId: "248",  sbName: "Houston",                 seed: 2,  region: "South",   playIn: false, cumulative: [1, 1, 0.81309, 0.51942, 0.29071, 0.15171, 0.07032] },
  { teamId: "356",  sbName: "Illinois",                seed: 3,  region: "South",   playIn: false, cumulative: [1, 1, 0.83565, 0.39283, 0.18757, 0.10078, 0.04697] },
  { teamId: "158",  sbName: "Nebraska",                seed: 4,  region: "South",   playIn: false, cumulative: [1, 1, 0.46403, 0.13703, 0.04778, 0.01882, 0.00593] },
  { teamId: "238",  sbName: "Vanderbilt",              seed: 5,  region: "South",   playIn: false, cumulative: [1, 1, 0.53597, 0.17311, 0.06506, 0.02732, 0.01036] },
  { teamId: "153",  sbName: "North Carolina",          seed: 6,  region: "South",   playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2608",   sbName: "Saint Mary's (CA)",      seed: 7,  region: "South",   playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "228",  sbName: "Clemson",                 seed: 8,  region: "South",   playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2294",   sbName: "Iowa",                    seed: 9,  region: "South",   playIn: false, cumulative: [1, 1, 0.13443, 0.0514, 0.0136, 0.00456, 0.00124] },
  { teamId: "245",  sbName: "Texas A&M",               seed: 10, region: "South",   playIn: false, cumulative: [1, 1, 0.18691, 0.05817, 0.01508, 0.00386, 0.00088] },
  { teamId: "2670",   sbName: "VCU",                     seed: 11, region: "South",   playIn: false, cumulative: [1, 1, 0.16435, 0.02958, 0.00585, 0.00127, 0.00028] },
  { teamId: "2377",   sbName: "McNeese",                 seed: 12, region: "South",   playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2653",   sbName: "Troy",                    seed: 13, region: "South",   playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "219",  sbName: "Penn",                    seed: 14, region: "South",   playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "70",   sbName: "Idaho",                   seed: 15, region: "South",   playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2504",   sbName: "Prairie View A&M",        seed: 16, region: "South",   playIn: true , cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2329",   sbName: "Lehigh",                  seed: 16, region: "South",   playIn: true , cumulative: [0, 0, 0, 0, 0, 0, 0] },
  // -- West --
  { teamId: "12",   sbName: "Arizona",                 seed: 1,  region: "West",    playIn: false, cumulative: [1, 1, 0.89021, 0.73564, 0.53967, 0.30211, 0.17321] },
  { teamId: "2509",   sbName: "Purdue",                  seed: 2,  region: "West",    playIn: false, cumulative: [1, 1, 0.77516, 0.49439, 0.20141, 0.09335, 0.04477] },
  { teamId: "2250",   sbName: "Gonzaga",                 seed: 3,  region: "West",    playIn: false, cumulative: [1, 1, 0.7058, 0.33382, 0.11142, 0.03748, 0.01325] },
  { teamId: "8",    sbName: "Arkansas",                seed: 4,  region: "West",    playIn: false, cumulative: [1, 1, 0.84315, 0.20342, 0.09359, 0.03024, 0.01086] },
  { teamId: "275",  sbName: "Wisconsin",               seed: 5,  region: "West",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "252",  sbName: "BYU",                     seed: 6,  region: "West",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2390",   sbName: "U Miami (FL)",            seed: 7,  region: "West",    playIn: false, cumulative: [1, 1, 0.22484, 0.08936, 0.01912, 0.00466, 0.00123] },
  { teamId: "222",  sbName: "Villanova",               seed: 8,  region: "West",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "328",  sbName: "Utah St.",                seed: 9,  region: "West",    playIn: false, cumulative: [1, 1, 0.10979, 0.04916, 0.01727, 0.00359, 0.00081] },
  { teamId: "142",  sbName: "Missouri",                seed: 10, region: "West",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "251",  sbName: "Texas",                   seed: 11, region: "West",    playIn: true , cumulative: [1, 1, 0.2942, 0.08243, 0.01561, 0.00309, 0.00063] },
  { teamId: "152",  sbName: "NC State",                seed: 11, region: "West",    playIn: true , cumulative: [0, 0, 0, 0, 0, 0, 0] },
  { teamId: "2272",   sbName: "High Point",              seed: 12, region: "West",    playIn: false, cumulative: [1, 1, 0.15685, 0.01178, 0.00191, 0.00022, 0] },
  { teamId: "62",   sbName: "Hawaii",                  seed: 13, region: "West",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "338",  sbName: "Kennesaw St.",            seed: 14, region: "West",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2511",   sbName: "Queens",                  seed: 15, region: "West",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "112358", sbName: "LIU",                     seed: 16, region: "West",    playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  // -- Midwest --
  { teamId: "130",  sbName: "Michigan",                seed: 1,  region: "Midwest", playIn: false, cumulative: [1, 1, 0.8927, 0.72755, 0.49222, 0.30016, 0.17897] },
  { teamId: "66",   sbName: "Iowa St.",                seed: 2,  region: "Midwest", playIn: false, cumulative: [1, 1, 0.72668, 0.51172, 0.25617, 0.13697, 0.07119] },
  { teamId: "258",  sbName: "Virginia",                seed: 3,  region: "Midwest", playIn: false, cumulative: [1, 1, 0.51202, 0.18513, 0.05834, 0.02147, 0.007] },
  { teamId: "333",  sbName: "Alabama",                 seed: 4,  region: "Midwest", playIn: false, cumulative: [1, 1, 0.56583, 0.14934, 0.0632, 0.02349, 0.0085] },
  { teamId: "2641",   sbName: "Texas Tech",              seed: 5,  region: "Midwest", playIn: false, cumulative: [1, 1, 0.43417, 0.07844, 0.02453, 0.00652, 0.00193] },
  { teamId: "2633",   sbName: "Tennessee",               seed: 6,  region: "Midwest", playIn: false, cumulative: [1, 1, 0.48798, 0.17885, 0.05776, 0.02195, 0.00821] },
  { teamId: "96",   sbName: "Kentucky",                seed: 7,  region: "Midwest", playIn: false, cumulative: [1, 1, 0.27332, 0.1243, 0.03442, 0.01136, 0.00365] },
  { teamId: "61",   sbName: "Georgia",                 seed: 8,  region: "Midwest", playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "139",  sbName: "Saint Louis",             seed: 9,  region: "Midwest", playIn: false, cumulative: [1, 1, 0.1073, 0.04467, 0.01336, 0.00334, 0.00095] },
  { teamId: "2541",   sbName: "Santa Clara",             seed: 10, region: "Midwest", playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "193",  sbName: "Miami University (OH)",   seed: 11, region: "Midwest", playIn: true , cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2567",   sbName: "SMU",                     seed: 11, region: "Midwest", playIn: true , cumulative: [0, 0, 0, 0, 0, 0, 0] },
  { teamId: "2006",   sbName: "Akron",                   seed: 12, region: "Midwest", playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2275",   sbName: "Hofstra",                 seed: 13, region: "Midwest", playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2750",   sbName: "Wright St.",              seed: 14, region: "Midwest", playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2634",   sbName: "Tennessee St.",           seed: 15, region: "Midwest", playIn: false, cumulative: [1, 0, 0, 0, 0, 0, 0] },
  { teamId: "2692",   sbName: "UMBC",                    seed: 16, region: "Midwest", playIn: true , cumulative: [0, 0, 0, 0, 0, 0, 0] },
  { teamId: "47",   sbName: "Howard",                  seed: 16, region: "Midwest", playIn: true , cumulative: [1, 0, 0, 0, 0, 0, 0] },
  ],
}

// ─── Versions array (ordered by checkpoint) ───────────────────────────────────

export const SB_VERSIONS: SBVersion[] = [SB_VERSION_0, SB_VERSION_1, SB_VERSION_2]

// ─── Helper to get SB data for a given checkpoint ─────────────────────────────

/**
 * Get the correct SB data for a given checkpoint.
 * A version with checkpoint=N was published AFTER checkpoint N completed,
 * so it's active starting from checkpoint N+1 (i.e., v.checkpoint < cp).
 * Exception: version 0 (pre-tournament) is always the baseline.
 */
export function getSBDataForCheckpoint(cp: number): SilverBulletinTeam[] {
  let version = SB_VERSIONS[0]
  for (const v of SB_VERSIONS) {
    if (v.checkpoint < cp) version = v
    else break
  }
  return version.teams
}

// ─── Backward-compatible exports ──────────────────────────────────────────────
// These use the LATEST version by default for backward compatibility

export const SILVER_BULLETIN_2026: SilverBulletinTeam[] =
  SB_VERSIONS[SB_VERSIONS.length - 1].teams

export const SB_2026_MAP: Map<string, SilverBulletinTeam> = new Map(
  SILVER_BULLETIN_2026.map((t) => [t.teamId, t]),
)

// ─── Helper: build a local map from an array of teams ─────────────────────────

function buildMap(sbData: SilverBulletinTeam[]): Map<string, SilverBulletinTeam> {
  return new Map(sbData.map((t) => [t.teamId, t]))
}

/**
 * Pre-tournament expected score for a team.
 * Returns null if no probability data available.
 *
 * @param sbData - optional team array to use instead of the global latest data
 */
export function pretournamentExpectedScore(
  teamId: string,
  sbData?: SilverBulletinTeam[],
): number | null {
  const map = sbData ? buildMap(sbData) : SB_2026_MAP
  const team = map.get(teamId)
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
 *
 * @param sbData - optional team array to use instead of the global latest data
 */
export function expectedScoreAtState(
  teamId: string,
  wins: number,
  eliminated: boolean,
  sbData?: SilverBulletinTeam[],
): number | null {
  const map = sbData ? buildMap(sbData) : SB_2026_MAP
  const team = map.get(teamId)
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
 *
 * @param sbData - optional team array to use instead of the global latest data
 */
export function calculateEntryExpectedScore(
  teamIds: string[],
  teamStates: Map<string, { wins: number; eliminated: boolean }>,
  preTournament: boolean = false,
  sbData?: SilverBulletinTeam[],
): number | null {
  let total = 0
  let hasData = false

  for (const teamId of teamIds) {
    let score: number | null

    if (preTournament) {
      score = pretournamentExpectedScore(teamId, sbData)
    } else {
      const state = teamStates.get(teamId)
      if (state) {
        score = expectedScoreAtState(teamId, state.wins, state.eliminated, sbData)
      } else {
        score = expectedScoreAtState(teamId, 0, false, sbData)
      }
    }

    if (score !== null) {
      total += score
      hasData = true
    }
  }

  return hasData ? Math.round(total * 10) / 10 : null
}
