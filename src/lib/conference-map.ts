/**
 * Conference mappings, state abbreviation expansion, and favorite team normalization.
 * Used for leaderboard dimension filtering.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TEAM → CONFERENCE (2025 tournament, abbreviations)
// ═══════════════════════════════════════════════════════════════════════════════

export const TEAM_CONFERENCE_2025: Record<string, string> = {
  // ACC
  "duke": "ACC",
  "clemson": "ACC",
  "louisville": "ACC",

  // SEC
  "alabama": "SEC",
  "florida": "SEC",
  "auburn": "SEC",
  "tennessee": "SEC",
  "kentucky": "SEC",
  "texas-am": "SEC",
  "ole-miss": "SEC",
  "mississippi-st": "SEC",
  "missouri": "SEC",
  "vanderbilt": "SEC",
  "arkansas": "SEC",
  "georgia": "SEC",
  "oklahoma": "SEC",

  // Big Ten
  "wisconsin": "Big Ten",
  "oregon": "Big Ten",
  "michigan-st": "Big Ten",
  "michigan": "Big Ten",
  "purdue": "Big Ten",
  "illinois": "Big Ten",
  "ucla": "Big Ten",
  "maryland": "Big Ten",
  "iowa-st": "Big Ten",

  // Big 12
  "arizona": "Big 12",
  "byu": "Big 12",
  "baylor": "Big 12",
  "kansas": "Big 12",
  "texas-tech": "Big 12",
  "houston": "Big 12",
  "utah-st": "Big 12",
  "colorado-st": "Big 12",

  // Big East
  "st-johns": "Big East",
  "uconn": "Big East",
  "marquette": "Big East",
  "creighton": "Big East",
  "xavier": "Big East",

  // AAC
  "memphis": "AAC",

  // WCC
  "saint-marys": "WCC",
  "gonzaga": "WCC",

  // Atlantic 10
  "vcu": "A-10",

  // ASUN
  "liberty": "ASUN",
  "lipscomb": "ASUN",

  // MAC
  "akron": "MAC",

  // Big Sky
  "montana": "Big Sky",

  // NEC
  "robert-morris": "NEC",
  "mount-st-marys": "NEC",

  // MVC
  "drake": "MVC",

  // WAC
  "grand-canyon": "WAC",
  "uc-san-diego": "WAC",

  // CAA
  "unc-wilmington": "CAA",

  // Summit
  "omaha": "Summit",

  // MEAC
  "norfolk-st": "MEAC",

  // Ivy
  "yale": "Ivy",

  // NE Conference
  "bryant": "NEC",

  // SWAC
  "alabama-st": "SWAC",

  // Southland
  "mcneese-st": "Southland",

  // Big South
  "high-point": "Big South",

  // Sun Belt
  "troy": "Sun Belt",

  // SoCon
  "wofford": "SoCon",

  // Ohio Valley
  "siu-edwardsville": "OVC",

  // Mountain West
  "new-mexico": "MWC",
}

export function getConferenceForTeam(teamId: string): string | null {
  return TEAM_CONFERENCE_2025[teamId] ?? null
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE ABBREVIATION → FULL NAME
// ═══════════════════════════════════════════════════════════════════════════════

export const STATE_ABBREV_TO_NAME: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
  CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii",
  ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine",
  MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska",
  NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
  NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island",
  SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas",
  UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
}

export function expandStateAbbrev(abbrev: string): string {
  return STATE_ABBREV_TO_NAME[abbrev.toUpperCase()] ?? abbrev
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAVORITE TEAM NORMALIZATION (Excel values → team IDs)
// ═══════════════════════════════════════════════════════════════════════════════

export const FAVORITE_TEAM_NORMALIZE: Record<string, string> = {
  "Duke": "duke",
  "duke": "duke",
  "Florida Gators": "florida",
  "Florida": "florida",
  "florida": "florida",
  "FSU": "florida-st",
  "fsu": "florida-st",
  "Florida State": "florida-st",
  "UNC": "north-carolina",
  "unc": "north-carolina",
  "North Carolina": "north-carolina",
  "Georgia Tech": "georgia-tech",
  "georgia tech": "georgia-tech",
  "Michigan": "michigan",
  "michigan": "michigan",
  "Kentucky": "kentucky",
  "kentucky": "kentucky",
  "Maryland": "maryland",
  "maryland": "maryland",
  "Penn State": "penn-st",
  "penn state": "penn-st",
  "Illinois": "illinois",
  "illinois": "illinois",
  "Stanford": "stanford",
  "stanford": "stanford",
  "Miami": "miami",
  "miami": "miami",
  "UCF": "ucf",
  "ucf": "ucf",
  "Virginia": "virginia",
  "virginia": "virginia",
  "Uconn": "uconn",
  "UConn": "uconn",
  "uconn": "uconn",
  "Villlanova": "villanova",  // typo in Excel (3 L's)
  "Villanova": "villanova",
  "villanova": "villanova",
}

/**
 * Normalize a favorite team string from Excel to a team ID.
 * Returns null if the value is empty or unrecognized.
 */
export function normalizeFavoriteTeam(rawValue: string | null | undefined): string | null {
  if (!rawValue || rawValue.trim() === "") return null
  const trimmed = rawValue.trim()
  return FAVORITE_TEAM_NORMALIZE[trimmed] ?? trimmed.toLowerCase().replace(/\s+/g, "-")
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEAM DISPLAY NAMES (ESPN-style — includes non-tournament favorites)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ESPN-style display names for all team IDs that might appear as favorites.
 * Tournament teams are also covered here so lookups don't need the DemoTeam array.
 */
export const TEAM_DISPLAY_NAMES: Record<string, string> = {
  // Non-tournament favorites (not in DemoTeam[])
  "florida-st": "Florida State",
  "georgia-tech": "Georgia Tech",
  "penn-st": "Penn State",
  "ucf": "UCF",
  "stanford": "Stanford",
  "villanova": "Villanova",
  "miami": "Miami",
  "virginia": "Virginia",

  // Tournament teams (mirror DemoTeam names for consistency)
  "duke": "Duke",
  "alabama": "Alabama",
  "wisconsin": "Wisconsin",
  "arizona": "Arizona",
  "oregon": "Oregon",
  "byu": "BYU",
  "saint-marys": "Saint Mary's",
  "mississippi-st": "Mississippi State",
  "baylor": "Baylor",
  "vanderbilt": "Vanderbilt",
  "vcu": "VCU",
  "liberty": "Liberty",
  "akron": "Akron",
  "montana": "Montana",
  "robert-morris": "Robert Morris",
  "mount-st-marys": "Mount St. Mary's",
  "florida": "Florida",
  "st-johns": "St. John's",
  "texas-tech": "Texas Tech",
  "maryland": "Maryland",
  "memphis": "Memphis",
  "missouri": "Missouri",
  "kansas": "Kansas",
  "uconn": "UConn",
  "oklahoma": "Oklahoma",
  "arkansas": "Arkansas",
  "drake": "Drake",
  "colorado-st": "Colorado State",
  "grand-canyon": "Grand Canyon",
  "unc-wilmington": "UNC Wilmington",
  "omaha": "Omaha",
  "norfolk-st": "Norfolk State",
  "auburn": "Auburn",
  "michigan-st": "Michigan State",
  "iowa-st": "Iowa State",
  "texas-am": "Texas A&M",
  "michigan": "Michigan",
  "ole-miss": "Ole Miss",
  "marquette": "Marquette",
  "louisville": "Louisville",
  "creighton": "Creighton",
  "new-mexico": "New Mexico",
  "north-carolina": "North Carolina",
  "uc-san-diego": "UC San Diego",
  "yale": "Yale",
  "lipscomb": "Lipscomb",
  "bryant": "Bryant",
  "alabama-st": "Alabama State",
  "houston": "Houston",
  "tennessee": "Tennessee",
  "kentucky": "Kentucky",
  "purdue": "Purdue",
  "clemson": "Clemson",
  "illinois": "Illinois",
  "ucla": "UCLA",
  "gonzaga": "Gonzaga",
  "georgia": "Georgia",
  "utah-st": "Utah State",
  "xavier": "Xavier",
  "mcneese-st": "McNeese State",
  "high-point": "High Point",
  "troy": "Troy",
  "wofford": "Wofford",
  "siu-edwardsville": "SIU Edwardsville",
}

/**
 * Get ESPN-style display name for a team ID.
 * First checks the canonical display name map, then falls back to the teams array.
 */
export function getTeamDisplayName(
  teamId: string,
  teams?: Array<{ id: string; name: string }>
): string {
  if (TEAM_DISPLAY_NAMES[teamId]) return TEAM_DISPLAY_NAMES[teamId]
  if (teams) {
    const team = teams.find(t => t.id === teamId)
    if (team) return team.name
  }
  return teamId
}
