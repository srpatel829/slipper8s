/**
 * 2025 NCAA Tournament data for demo/test mode.
 *
 * Teams are the actual 2025 bracket with real seeds and results.
 * Wins accumulate per round. The "roundSnapshots" array drives the
 * time-slider: index 0 = just after Selection Sunday (0 wins),
 * index 1 = after First Four / Round of 64, etc.
 *
 * Scoring: seed × wins  (same as Slipper8s rules)
 */

export interface DemoTeam {
  id: string
  name: string
  shortName: string
  seed: number
  region: "East" | "West" | "South" | "Midwest"
  logoUrl: string | null
  isPlayIn: boolean
  winsAtRound: number[]
  elimAtRound: boolean[]
}

export interface DemoUser {
  id: string
  name: string
  email: string
  isPaid: boolean
  charityPreference: string | null
  role?: "USER" | "ADMIN" | "SUPERADMIN"
  picks: string[]
}

export const ROUND_LABELS = [
  "Selection Sunday",
  "First Four / R64",
  "Round of 32",
  "Sweet Sixteen",
  "Elite Eight",
  "Final Four",
  "Championship",
  "Champion Crowned",
]

export const DEMO_TEAMS: DemoTeam[] = [
  {
    id: "duke", name: "Duke", shortName: "DUKE", seed: 1, region: "East", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/150.png", isPlayIn: false,
    winsAtRound: [0, 1, 2, 3, 4, 4, 4, 4], elimAtRound: [false, false, false, false, false, true, true, true]
  },
  {
    id: "alabama", name: "Alabama", shortName: "ALA", seed: 2, region: "East", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/333.png", isPlayIn: false,
    winsAtRound: [0, 1, 2, 3, 3, 3, 3, 3], elimAtRound: [false, false, false, false, true, true, true, true]
  },
  {
    id: "wisconsin", name: "Wisconsin", shortName: "WISC", seed: 3, region: "East", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/275.png", isPlayIn: false,
    winsAtRound: [0, 1, 1, 1, 1, 1, 1, 1], elimAtRound: [false, false, true, true, true, true, true, true]
  },
  {
    id: "arizona", name: "Arizona", shortName: "ARIZ", seed: 4, region: "East", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/12.png", isPlayIn: false,
    winsAtRound: [0, 1, 2, 2, 2, 2, 2, 2], elimAtRound: [false, false, false, true, true, true, true, true]
  },
  {
    id: "oregon", name: "Oregon", shortName: "ORE", seed: 5, region: "East", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2483.png", isPlayIn: false,
    winsAtRound: [0, 1, 1, 1, 1, 1, 1, 1], elimAtRound: [false, false, true, true, true, true, true, true]
  },
  {
    id: "byu", name: "BYU", shortName: "BYU", seed: 6, region: "East", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/252.png", isPlayIn: false,
    winsAtRound: [0, 1, 2, 2, 2, 2, 2, 2], elimAtRound: [false, false, false, true, true, true, true, true]
  },
  {
    id: "saint-marys", name: "Saint Mary's", shortName: "SMC", seed: 7, region: "East", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2608.png", isPlayIn: false,
    winsAtRound: [0, 1, 1, 1, 1, 1, 1, 1], elimAtRound: [false, false, true, true, true, true, true, true]
  },
  {
    id: "mississippi-st", name: "Mississippi State", shortName: "MSST", seed: 8, region: "East", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/344.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "baylor", name: "Baylor", shortName: "BAY", seed: 9, region: "East", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/239.png", isPlayIn: false,
    winsAtRound: [0, 1, 1, 1, 1, 1, 1, 1], elimAtRound: [false, false, true, true, true, true, true, true]
  },
  {
    id: "vanderbilt", name: "Vanderbilt", shortName: "VAN", seed: 10, region: "East", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/238.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "vcu", name: "VCU", shortName: "VCU", seed: 11, region: "East", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2670.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "liberty", name: "Liberty", shortName: "LIB", seed: 12, region: "East", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2335.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "akron", name: "Akron", shortName: "AKR", seed: 13, region: "East", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2006.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "montana", name: "Montana", shortName: "MONT", seed: 14, region: "East", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/149.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "robert-morris", name: "Robert Morris", shortName: "RMU", seed: 15, region: "East", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2523.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "mount-st-marys", name: "Mount St. Mary's", shortName: "MTST", seed: 16, region: "East", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/116.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "florida", name: "Florida", shortName: "FLA", seed: 1, region: "West", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/57.png", isPlayIn: false,
    winsAtRound: [0, 1, 2, 3, 4, 5, 6, 6], elimAtRound: [false, false, false, false, false, false, false, true]
  },
  {
    id: "st-johns", name: "St. John's", shortName: "SJU", seed: 2, region: "West", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2599.png", isPlayIn: false,
    winsAtRound: [0, 1, 1, 1, 1, 1, 1, 1], elimAtRound: [false, false, true, true, true, true, true, true]
  },
  {
    id: "texas-tech", name: "Texas Tech", shortName: "TTU", seed: 3, region: "West", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2641.png", isPlayIn: false,
    winsAtRound: [0, 1, 2, 3, 3, 3, 3, 3], elimAtRound: [false, false, false, false, true, true, true, true]
  },
  {
    id: "maryland", name: "Maryland", shortName: "MD", seed: 4, region: "West", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/120.png", isPlayIn: false,
    winsAtRound: [0, 1, 2, 2, 2, 2, 2, 2], elimAtRound: [false, false, false, true, true, true, true, true]
  },
  {
    id: "memphis", name: "Memphis", shortName: "MEM", seed: 5, region: "West", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/235.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "missouri", name: "Missouri", shortName: "MIZ", seed: 6, region: "West", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/142.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "kansas", name: "Kansas", shortName: "KU", seed: 7, region: "West", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2305.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "uconn", name: "UConn", shortName: "CONN", seed: 8, region: "West", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/41.png", isPlayIn: false,
    winsAtRound: [0, 1, 1, 1, 1, 1, 1, 1], elimAtRound: [false, false, true, true, true, true, true, true]
  },
  {
    id: "oklahoma", name: "Oklahoma", shortName: "OU", seed: 9, region: "West", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/201.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "arkansas", name: "Arkansas", shortName: "ARK", seed: 10, region: "West", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/8.png", isPlayIn: false,
    winsAtRound: [0, 1, 2, 2, 2, 2, 2, 2], elimAtRound: [false, false, false, true, true, true, true, true]
  },
  {
    id: "drake", name: "Drake", shortName: "DRK", seed: 11, region: "West", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2181.png", isPlayIn: false,
    winsAtRound: [0, 1, 1, 1, 1, 1, 1, 1], elimAtRound: [false, false, true, true, true, true, true, true]
  },
  {
    id: "colorado-st", name: "Colorado State", shortName: "CSU", seed: 12, region: "West", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/36.png", isPlayIn: false,
    winsAtRound: [0, 1, 1, 1, 1, 1, 1, 1], elimAtRound: [false, false, true, true, true, true, true, true]
  },
  {
    id: "grand-canyon", name: "Grand Canyon", shortName: "GCU", seed: 13, region: "West", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2253.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "unc-wilmington", name: "UNC Wilmington", shortName: "UNCW", seed: 14, region: "West", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/350.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "omaha", name: "Omaha", shortName: "OMA", seed: 15, region: "West", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2437.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "norfolk-st", name: "Norfolk State", shortName: "NORF", seed: 16, region: "West", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2458.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "auburn", name: "Auburn", shortName: "AUB", seed: 1, region: "South", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2.png", isPlayIn: false,
    winsAtRound: [0, 1, 2, 3, 4, 4, 4, 4], elimAtRound: [false, false, false, false, false, true, true, true]
  },
  {
    id: "michigan-st", name: "Michigan State", shortName: "MSU", seed: 2, region: "South", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/127.png", isPlayIn: false,
    winsAtRound: [0, 1, 2, 3, 3, 3, 3, 3], elimAtRound: [false, false, false, false, true, true, true, true]
  },
  {
    id: "iowa-st", name: "Iowa State", shortName: "ISU", seed: 3, region: "South", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/66.png", isPlayIn: false,
    winsAtRound: [0, 1, 1, 1, 1, 1, 1, 1], elimAtRound: [false, false, true, true, true, true, true, true]
  },
  {
    id: "texas-am", name: "Texas A&M", shortName: "TAMU", seed: 4, region: "South", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/245.png", isPlayIn: false,
    winsAtRound: [0, 1, 1, 1, 1, 1, 1, 1], elimAtRound: [false, false, true, true, true, true, true, true]
  },
  {
    id: "michigan", name: "Michigan", shortName: "MICH", seed: 5, region: "South", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/130.png", isPlayIn: false,
    winsAtRound: [0, 1, 2, 2, 2, 2, 2, 2], elimAtRound: [false, false, false, true, true, true, true, true]
  },
  {
    id: "ole-miss", name: "Ole Miss", shortName: "MISS", seed: 6, region: "South", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/145.png", isPlayIn: false,
    winsAtRound: [0, 1, 2, 2, 2, 2, 2, 2], elimAtRound: [false, false, false, true, true, true, true, true]
  },
  {
    id: "marquette", name: "Marquette", shortName: "MARQ", seed: 7, region: "South", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/269.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "louisville", name: "Louisville", shortName: "LOU", seed: 8, region: "South", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/97.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "creighton", name: "Creighton", shortName: "CREI", seed: 9, region: "South", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/156.png", isPlayIn: false,
    winsAtRound: [0, 1, 1, 1, 1, 1, 1, 1], elimAtRound: [false, false, true, true, true, true, true, true]
  },
  {
    id: "new-mexico", name: "New Mexico", shortName: "UNM", seed: 10, region: "South", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/167.png", isPlayIn: false,
    winsAtRound: [0, 1, 1, 1, 1, 1, 1, 1], elimAtRound: [false, false, true, true, true, true, true, true]
  },
  {
    id: "north-carolina", name: "North Carolina", shortName: "UNC", seed: 11, region: "South", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/153.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "uc-san-diego", name: "UC San Diego", shortName: "UCSD", seed: 12, region: "South", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2724.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "yale", name: "Yale", shortName: "YALE", seed: 13, region: "South", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/43.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "lipscomb", name: "Lipscomb", shortName: "LIP", seed: 14, region: "South", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/165.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "bryant", name: "Bryant", shortName: "BRY", seed: 15, region: "South", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2803.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "alabama-st", name: "Alabama State", shortName: "ALST", seed: 16, region: "South", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2010.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "houston", name: "Houston", shortName: "HOU", seed: 1, region: "Midwest", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/248.png", isPlayIn: false,
    winsAtRound: [0, 1, 2, 3, 4, 5, 5, 5], elimAtRound: [false, false, false, false, false, false, true, true]
  },
  {
    id: "tennessee", name: "Tennessee", shortName: "TENN", seed: 2, region: "Midwest", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2633.png", isPlayIn: false,
    winsAtRound: [0, 1, 2, 3, 3, 3, 3, 3], elimAtRound: [false, false, false, false, true, true, true, true]
  },
  {
    id: "kentucky", name: "Kentucky", shortName: "UK", seed: 3, region: "Midwest", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/96.png", isPlayIn: false,
    winsAtRound: [0, 1, 2, 2, 2, 2, 2, 2], elimAtRound: [false, false, false, true, true, true, true, true]
  },
  {
    id: "purdue", name: "Purdue", shortName: "PUR", seed: 4, region: "Midwest", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2509.png", isPlayIn: false,
    winsAtRound: [0, 1, 2, 2, 2, 2, 2, 2], elimAtRound: [false, false, false, true, true, true, true, true]
  },
  {
    id: "clemson", name: "Clemson", shortName: "CLEM", seed: 5, region: "Midwest", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/228.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "illinois", name: "Illinois", shortName: "ILL", seed: 6, region: "Midwest", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/356.png", isPlayIn: false,
    winsAtRound: [0, 1, 1, 1, 1, 1, 1, 1], elimAtRound: [false, false, true, true, true, true, true, true]
  },
  {
    id: "ucla", name: "UCLA", shortName: "UCLA", seed: 7, region: "Midwest", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/26.png", isPlayIn: false,
    winsAtRound: [0, 1, 1, 1, 1, 1, 1, 1], elimAtRound: [false, false, true, true, true, true, true, true]
  },
  {
    id: "gonzaga", name: "Gonzaga", shortName: "GONZ", seed: 8, region: "Midwest", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2250.png", isPlayIn: false,
    winsAtRound: [0, 1, 1, 1, 1, 1, 1, 1], elimAtRound: [false, false, true, true, true, true, true, true]
  },
  {
    id: "georgia", name: "Georgia", shortName: "UGA", seed: 9, region: "Midwest", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/61.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "utah-st", name: "Utah State", shortName: "USU", seed: 10, region: "Midwest", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/328.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "xavier", name: "Xavier", shortName: "XAV", seed: 11, region: "Midwest", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2752.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "mcneese-st", name: "McNeese State", shortName: "MCN", seed: 12, region: "Midwest", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2377.png", isPlayIn: false,
    winsAtRound: [0, 1, 1, 1, 1, 1, 1, 1], elimAtRound: [false, false, true, true, true, true, true, true]
  },
  {
    id: "high-point", name: "High Point", shortName: "HPU", seed: 13, region: "Midwest", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2274.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "troy", name: "Troy", shortName: "TROY", seed: 14, region: "Midwest", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2653.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "wofford", name: "Wofford", shortName: "WOF", seed: 15, region: "Midwest", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2747.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
  {
    id: "siu-edwardsville", name: "SIU Edwardsville", shortName: "SIUE", seed: 16, region: "Midwest", logoUrl: "https://a.espncdn.com/i/teamlogos/ncaa/500/2565.png", isPlayIn: false,
    winsAtRound: [0, 0, 0, 0, 0, 0, 0, 0], elimAtRound: [false, true, true, true, true, true, true, true]
  },
]

import { REAL_2025_USERS } from "./demo-users-2025"

export const YOU_DEMO_USER: DemoUser = {
  id: "user-you",
  name: "You (Demo)",
  email: "you@demo.test",
  isPaid: true,
  charityPreference: "UNICEF",
  picks: ["duke", "gonzaga", "tennessee", "iowa-st", "michigan-st", "missouri", "wisconsin", "oregon"],
}

// ─── Demographic info is same
export const DEMO_USERS: DemoUser[] = [
  YOU_DEMO_USER,
  ...(REAL_2025_USERS as DemoUser[])
]

export function generateRandomUsers(count: number, teams: DemoTeam[]): DemoUser[] {
  const users: DemoUser[] = [YOU_DEMO_USER]
  const teamIds = teams.map((t) => t.id)

  for (let i = 0; i < count; i++) {
    // Pick 8 random unique teams
    const shuffled = [...teamIds].sort(() => 0.5 - Math.random())
    const picks = shuffled.slice(0, 8)

    users.push({
      id: `random-user-${i}`,
      name: `Random Picker ${i + 1}`,
      email: `random${i}@demo.test`,
      isPaid: Math.random() > 0.2,
      charityPreference: null,
      picks,
    })
  }
  return users
}

export const DEMO_USER_SETS = {
  real_2025: { label: "Real 2025 Picks", users: DEMO_USERS },
  random_15: { label: "15 Random Users", users: generateRandomUsers(15, DEMO_TEAMS) },
  random_30: { label: "30 Random Users", users: generateRandomUsers(30, DEMO_TEAMS) },
  random_64: { label: "64 Random Users", users: generateRandomUsers(64, DEMO_TEAMS) },
}

// ─── Scoring helpers ───────────────────────────────────────────────────────────

export function getTeamAtRound(teamId: string, roundIdx: number): { wins: number; eliminated: boolean } | null {
  const team = DEMO_TEAMS.find((t) => t.id === teamId)
  if (!team) return null
  return {
    wins: team.winsAtRound[roundIdx] ?? 0,
    eliminated: team.elimAtRound[roundIdx] ?? true,
  }
}

export interface DemoLeaderboardEntry {
  rank: number
  userId: string
  name: string
  email: string
  isPaid: boolean
  charityPreference: string | null
  currentScore: number
  ppr: number
  tps: number
  teamsRemaining: number
  picks: Array<{
    teamId: string
    name: string
    shortName: string
    seed: number
    region: string
    wins: number
    eliminated: boolean
    logoUrl: string | null
    score: number
    ppr: number
  }>
}

export function computeDemoLeaderboard(roundIdx: number): DemoLeaderboardEntry[] {
  const teamMap = new Map(DEMO_TEAMS.map((t) => [t.id, t]))

  const entries = DEMO_USERS.map((user) => {
    let currentScore = 0
    let ppr = 0
    let teamsRemaining = 0

    const picks = user.picks.map((teamId) => {
      const team = teamMap.get(teamId)
      if (!team) return null
      const state = getTeamAtRound(teamId, roundIdx)!
      const score = team.seed * state.wins
      const teamPPR = state.eliminated ? 0 : team.seed * Math.max(0, 6 - state.wins)

      currentScore += score
      ppr += teamPPR
      if (!state.eliminated) teamsRemaining++

      return {
        teamId,
        name: team.name,
        shortName: team.shortName,
        seed: team.seed,
        region: team.region,
        wins: state.wins,
        eliminated: state.eliminated,
        logoUrl: team.logoUrl,
        score,
        ppr: teamPPR,
      }
    }).filter(Boolean) as DemoLeaderboardEntry["picks"]

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      isPaid: user.isPaid,
      charityPreference: user.charityPreference,
      currentScore,
      ppr,
      tps: currentScore + ppr,
      teamsRemaining,
      picks,
    }
  })

  entries.sort((a, b) => b.tps - a.tps || b.currentScore - a.currentScore || a.name.localeCompare(b.name))

  return entries.map((e, i) => ({ ...e, rank: i + 1 }))
}

// Games at each checkpoint for display in scores view
export interface DemoGame {
  id: string
  round: string
  roundNum: number
  homeTeam: { id: string; name: string; shortName: string; seed: number; logo: string | null; score: number; winner: boolean }
  awayTeam: { id: string; name: string; shortName: string; seed: number; logo: string | null; score: number; winner: boolean }
  status: "pre" | "final" | "upset"
  isUpset: boolean // higher seed won
}

// Generate a plausible score given seed (lower seed = lower score generally)
function fakeScore(seed: number, winner: boolean): number {
  const base = winner ? 72 + Math.floor(Math.random() * 12) : 65 + Math.floor(Math.random() * 8)
  return Math.max(50, base - seed * 0.5)
}

export function getDemoGamesForRound(roundIdx: number): DemoGame[] {
  if (roundIdx === 0) return [] // Selection Sunday - no games yet

  const roundNames: Record<number, string> = {
    1: "First Round",
    2: "Second Round",
    3: "Sweet Sixteen",
    4: "Elite Eight",
    5: "Final Four",
    6: "National Championship",
    7: "Champion",
  }

  // Return teams that played in this specific round (went from roundIdx-1 to roundIdx)
  const teamsInRound = DEMO_TEAMS.filter((t) => {
    // Team played in this round if they had 0 elim before this round
    // and got their result (win or loss) at this round
    const prevElim = t.elimAtRound[roundIdx - 1]
    return !prevElim // was alive before this round
  })

  // Group by matchup (winner advances, loser is eliminated at this round)
  // Simplification: create fake matchups for display
  const games: DemoGame[] = []
  const processed = new Set<string>()

  teamsInRound.forEach((team) => {
    if (processed.has(team.id)) return
    processed.add(team.id)

    // Find a team they "played" - for demo we pair consecutive seeds in same region
    const opponent = teamsInRound.find((t) => {
      if (processed.has(t.id)) return false
      if (t.region !== team.region) return false
      // Different result at this round: one won (not elim) one lost (elim)
      const teamElim = team.elimAtRound[roundIdx]
      const tElim = t.elimAtRound[roundIdx]
      return teamElim !== tElim
    })

    if (!opponent) {
      // Handle byes or unpaired teams
      processed.add(team.id)
      return
    }

    processed.add(opponent.id)

    const winner = team.elimAtRound[roundIdx] ? opponent : team
    const loser = team.elimAtRound[roundIdx] ? team : opponent
    const isUpset = winner.seed > loser.seed

    games.push({
      id: `${team.id}-vs-${opponent.id}-r${roundIdx}`,
      round: roundNames[roundIdx] ?? `Round ${roundIdx}`,
      roundNum: roundIdx,
      homeTeam: {
        id: winner.id,
        name: winner.name,
        shortName: winner.shortName,
        seed: winner.seed,
        logo: winner.logoUrl,
        score: Math.round(fakeScore(winner.seed, true)),
        winner: true,
      },
      awayTeam: {
        id: loser.id,
        name: loser.name,
        shortName: loser.shortName,
        seed: loser.seed,
        logo: loser.logoUrl,
        score: Math.round(fakeScore(loser.seed, false)),
        winner: false,
      },
      status: "final",
      isUpset,
    })
  })

  return games
}
