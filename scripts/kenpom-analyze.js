/**
 * Analyze KenPom data for team-data-2025.ts
 * Uses: archive (pre-tournament ratings) + ratings (final) + fanmatch (game predictions)
 *
 * Run: node scripts/kenpom-analyze.js
 */
const fs = require('fs');
const path = require('path');

// Load data files
const archive = JSON.parse(fs.readFileSync(path.join(__dirname, 'kenpom_archive_2025_0316.json'), 'utf8'));
const ratings = JSON.parse(fs.readFileSync(path.join(__dirname, 'kenpom_ratings_2025.json'), 'utf8'));
const teams = JSON.parse(fs.readFileSync(path.join(__dirname, 'kenpom_teams_2025.json'), 'utf8'));

// KenPom TeamName → our team ID mapping
const KENPOM_TO_OUR_ID = {
  "Duke": "duke", "Houston": "houston", "Florida": "florida", "Auburn": "auburn",
  "Tennessee": "tennessee", "Alabama": "alabama", "Michigan St.": "michigan-st",
  "St. John's": "st-johns", "Texas Tech": "texas-tech", "Iowa St.": "iowa-st",
  "Wisconsin": "wisconsin", "Kentucky": "kentucky", "Maryland": "maryland",
  "Arizona": "arizona", "Purdue": "purdue", "Texas A&M": "texas-am",
  "Michigan": "michigan", "Clemson": "clemson", "Oregon": "oregon", "Memphis": "memphis",
  "Illinois": "illinois", "Missouri": "missouri", "Mississippi": "ole-miss", "BYU": "byu",
  "UCLA": "ucla", "Kansas": "kansas", "Saint Mary's": "saint-marys",
  "Marquette": "marquette", "Gonzaga": "gonzaga", "Louisville": "louisville",
  "Connecticut": "uconn", "Mississippi St.": "mississippi-st", "Baylor": "baylor",
  "Creighton": "creighton", "Georgia": "georgia", "Oklahoma": "oklahoma",
  "Arkansas": "arkansas", "New Mexico": "new-mexico", "Vanderbilt": "vanderbilt",
  "Utah St.": "utah-st", "North Carolina": "north-carolina", "VCU": "vcu",
  "Xavier": "xavier", "Texas": "texas", "San Diego St.": "san-diego-st",
  "Drake": "drake", "UC San Diego": "uc-san-diego", "Colorado St.": "colorado-st",
  "McNeese": "mcneese-st", "Liberty": "liberty", "Yale": "yale",
  "High Point": "high-point", "Akron": "akron", "Grand Canyon": "grand-canyon",
  "Lipscomb": "lipscomb", "Troy": "troy", "UNC Wilmington": "unc-wilmington",
  "Montana": "montana", "Wofford": "wofford", "Robert Morris": "robert-morris",
  "Bryant": "bryant", "Nebraska Omaha": "omaha", "Norfolk St.": "norfolk-st",
  "SIUE": "siu-edwardsville", "Mount St. Mary's": "mount-st-marys",
  "American": "american", "Alabama St.": "alabama-st", "Saint Francis": "saint-francis",
};

// Build archive map (pre-tournament rankings, March 16)
const archiveMap = {};
archive.forEach(t => {
  const ourId = KENPOM_TO_OUR_ID[t.TeamName];
  if (ourId) {
    archiveMap[ourId] = {
      preTourneyKenpom: t.RankAdjEM,
      preTourneyAdjEM: t.AdjEM,
      seed: t.Seed,
    };
  }
});

// Build final ratings map
const finalMap = {};
ratings.filter(t => t.Seed > 0).forEach(t => {
  const ourId = KENPOM_TO_OUR_ID[t.TeamName];
  if (ourId) {
    finalMap[ourId] = {
      finalKenpom: t.RankAdjEM,
      finalAdjEM: t.AdjEM,
      seed: t.Seed,
      wins: t.Wins,
      losses: t.Losses,
      record: `${t.Wins}-${t.Losses}`,
      conf: t.ConfShort,
    };
  }
});

// Compute pre-tournament records by subtracting tournament wins from final record
// First, we need to figure out how many tournament games each team played.
// From the bracket: look at Event field from ratings which shows "NCAA"

// For computing cinderella wins / upset losses, we need game-by-game data.
// Since the fanmatch endpoint only gives predictions (no results),
// we'll derive pre-tournament records from archive data instead.

// The archive endpoint from March 16 (Selection Sunday) doesn't have W-L directly,
// but the archive from the LAST regular season game day before Selection Sunday would.
// Actually, let's check what fields the archive has...

console.log("=== ARCHIVE DATA SAMPLE (March 16, 2025) ===");
const sampleArchive = archive.find(t => KENPOM_TO_OUR_ID[t.TeamName] === "duke");
if (sampleArchive) {
  console.log("Fields:", Object.keys(sampleArchive).join(', '));
  console.log("Duke archive:", JSON.stringify(sampleArchive, null, 2));
}

console.log("\n=== PRE-TOURNAMENT vs FINAL KenPom Rankings ===\n");
console.log("OurID".padEnd(22) + "Seed".padStart(4) + " | " +
  "Pre-KP".padStart(6) + " | " +
  "Final-KP".padStart(8) + " | " +
  "Record".padEnd(8) + " | " +
  "Conf".padEnd(5));
console.log("-".repeat(70));

// Sort by seed then pre-tournament KenPom
const allTeams = Object.keys(finalMap)
  .map(id => ({
    id,
    ...finalMap[id],
    preKP: archiveMap[id]?.preTourneyKenpom ?? 999,
  }))
  .sort((a, b) => a.seed - b.seed || a.preKP - b.preKP);

allTeams.forEach(t => {
  console.log(
    t.id.padEnd(22) +
    String(t.seed).padStart(4) + " | " +
    String(t.preKP).padStart(6) + " | " +
    String(t.finalKenpom).padStart(8) + " | " +
    t.record.padEnd(8) + " | " +
    t.conf.padEnd(5)
  );
});

console.log(`\nTotal: ${allTeams.length} teams`);

// Now figure out pre-tournament records
// We know the final record and can estimate pre-tournament by looking at conference tournament end date
// Conference tournaments typically end March 15-16, Selection Sunday is March 16
// First Four: March 18-19, R64: March 20-21, R32: March 22-23

// Actually, the archive endpoint doesn't have W-L. Let me check if we can use ratings from March 15
// (just before tournament bracket announcement) to get pre-tournament records.

console.log("\n\n=== ARCHIVE FIELDS AVAILABLE ===");
if (sampleArchive) {
  Object.entries(sampleArchive).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}`);
  });
}

// For pre-tournament records, let's use the March 16 ratings endpoint (via archive)
// and compare with final to count tournament games
// Actually the archive endpoint doesn't have W-L, only efficiency metrics.
//
// The RATINGS endpoint has final records including tournament games.
// For pre-tournament records, we need to subtract tournament wins/losses.
//
// From the tournament results we know:
// - 32 games in Round of 64 (32 winners, 32 losers)
// - 16 games in Round of 32 (16 winners, 16 losers)
// - etc.
// Each team plays at least 1 tournament game (except First Four losers who play 1)
// Actually wait - First Four losers play 1 game (lose), First Four winners play 2+ games

// Let me compute tournament wins from the bracket data in demo-data.ts
console.log("\n\n=== GENERATING TypeScript DATA (pre-tournament KenPom, final records) ===\n");

// For the team cards, we should use:
// - kenpomRank: PRE-TOURNAMENT (from archive March 16) — this is what players see before picking
// - record: We'll use the final record since archive doesn't have W-L
//   But add a note that these are post-tournament records

allTeams.forEach(t => {
  const preKP = archiveMap[t.id]?.preTourneyKenpom;
  console.log(
    `  { teamId: "${t.id}",`.padEnd(38) +
    `kenpomRank: ${String(preKP || t.finalKenpom).padStart(3)}, ` +
    `record: "${t.record}" },`
  );
});
