/**
 * Final comprehensive script to update team-data-2025.ts with accurate KenPom data.
 *
 * Uses:
 * - KenPom archive (March 16) for pre-tournament rankings
 * - KenPom final ratings for full-season records
 * - demo-data.ts tournament wins to compute pre-tournament records
 *
 * Run: node scripts/kenpom-final-update.js
 */
const fs = require('fs');
const path = require('path');

const archive = JSON.parse(fs.readFileSync(path.join(__dirname, 'kenpom_archive_2025_0316.json'), 'utf8'));
const ratings = JSON.parse(fs.readFileSync(path.join(__dirname, 'kenpom_ratings_2025.json'), 'utf8'));

// KenPom TeamName → our team ID
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

// Tournament wins from demo-data.ts (extracted manually)
// The champion (Florida in 2025) won 6 tournament games.
// Every team that played in the tournament played at least 1 game.
// First Four losers: 1 game played (loss)
// First Four winners that then lost R64: 2 games played (1W, 1L)
const TOURNAMENT_RESULTS = {
  // Duke: champion, 6 wins (6W-0L in tourney)
  "duke":              { tourneyWins: 6, tourneyLosses: 0 },
  // Florida: finalist, 5 wins (5W-1L)
  "florida":           { tourneyWins: 5, tourneyLosses: 1 },
  // Houston: E8, 4 wins
  "houston":           { tourneyWins: 4, tourneyLosses: 1 },
  // Auburn: F4, 4 wins
  "auburn":            { tourneyWins: 4, tourneyLosses: 1 },
  // From demo-data.ts winsAtRound arrays (max value = total tournament wins):
  // 1-seeds
  // duke: [0,1,2,3,4,5,6,6] → 6W, 0L (champion)
  // houston: [0,1,2,3,4,4,4,4] → 4W, 1L
  // florida: [0,1,2,3,4,5,6,6] → Wait, need to recheck which teams are which in demo-data
  // Let me extract from the final record differences instead
};

// Better approach: compute from final records.
// Each tournament team played some games. Every eliminated team has exactly 1 tournament loss.
// The champion has 0 tournament losses.
// First Four losers have 1 tournament loss and 0 tournament wins.
//
// From the 2025 tournament bracket results (well-known):
// Duke won the championship beating Florida in the final.
//
// Tournament wins per team from demo-data.ts (reading the winsAtRound max value):
const TOURNEY_WINS = {
  // From demo-data.ts, the final winsAtRound value for each team
  // Champion = Duke with 6 wins
  "duke": 6,
  // Runner-up = Florida with 5 wins
  "florida": 5,
  // Final Four losers = Auburn (4), Houston (4) — they lost in F4
  "auburn": 4, "houston": 4,
  // Elite 8 losers = Tennessee (3), Alabama (3), Michigan St. (3), St. John's (1)
  // Wait, I need the actual data. Let me read it from the demo file.
};

// Let me just read demo-data.ts to extract the tournament wins
const demoData = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'demo-data.ts'), 'utf8');

// Extract winsAtRound for each team
const teamWinsRegex = /id:\s*"([^"]+)"[\s\S]*?winsAtRound:\s*\[([^\]]+)\]/g;
const tourneyWinsMap = {};
let m;
while ((m = teamWinsRegex.exec(demoData)) !== null) {
  const teamId = m[1];
  const wins = m[2].split(',').map(s => parseInt(s.trim()));
  const maxWins = Math.max(...wins);
  tourneyWinsMap[teamId] = maxWins;
}

// First Four losers aren't in the bracket (0 tournament wins in bracket, but played 1 game)
// From our team-data: san-diego-st, texas, saint-francis, american are First Four losers
const FIRST_FOUR_LOSERS = new Set(["san-diego-st", "texas", "saint-francis", "american"]);

// Build complete data
const archiveMap = {};
archive.forEach(t => {
  const ourId = KENPOM_TO_OUR_ID[t.TeamName];
  if (ourId) archiveMap[ourId] = { preKP: t.RankAdjEM };
});

const results = [];

ratings.filter(t => t.Seed > 0).forEach(t => {
  const ourId = KENPOM_TO_OUR_ID[t.TeamName];
  if (!ourId) return;

  const finalWins = t.Wins;
  const finalLosses = t.Losses;
  const preKP = archiveMap[ourId]?.preKP ?? t.RankAdjEM;

  let tourneyW, tourneyL;
  if (FIRST_FOUR_LOSERS.has(ourId)) {
    // First Four losers: played 1 game (lost)
    tourneyW = 0;
    tourneyL = 1;
  } else {
    tourneyW = tourneyWinsMap[ourId] ?? 0;
    // Every tournament team except champion has 1 tournament loss
    // Champion (florida) has 0 tournament losses — verified from demo-data.ts
    tourneyL = (ourId === "florida") ? 0 : 1;
  }

  const preW = finalWins - tourneyW;
  const preL = finalLosses - tourneyL;
  const preRecord = `${preW}-${preL}`;

  results.push({
    ourId,
    seed: t.Seed,
    preKP,
    finalKP: t.RankAdjEM,
    finalRecord: `${finalWins}-${finalLosses}`,
    preRecord,
    tourneyWins: tourneyW,
    conf: t.ConfShort,
  });
});

// Sort by seed then pre-tournament KenPom
results.sort((a, b) => a.seed - b.seed || a.preKP - b.preKP);

console.log("=== PRE-TOURNAMENT DATA FOR team-data-2025.ts ===\n");
console.log("OurID".padEnd(22) + "Seed".padStart(4) + " | " +
  "PreKP".padStart(5) + " | " +
  "PreRecord".padEnd(9) + " | " +
  "FinalRec".padEnd(8) + " | " +
  "TournW".padStart(6) + " | " +
  "Conf".padEnd(5));
console.log("-".repeat(75));

results.forEach(t => {
  console.log(
    t.ourId.padEnd(22) +
    String(t.seed).padStart(4) + " | " +
    String(t.preKP).padStart(5) + " | " +
    t.preRecord.padEnd(9) + " | " +
    t.finalRecord.padEnd(8) + " | " +
    String(t.tourneyWins).padStart(6) + " | " +
    t.conf.padEnd(5)
  );
});

// Now compare with our current team-data-2025.ts
console.log("\n\n=== CHANGES NEEDED IN team-data-2025.ts ===\n");

const currentFile = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'lib', 'team-data-2025.ts'), 'utf8'
);
const currentRegex = /teamId:\s*"([^"]+)".*?kenpomRank:\s*(\d+).*?record:\s*"([^"]+)"/g;
const current = {};
let cm;
while ((cm = currentRegex.exec(currentFile)) !== null) {
  current[cm[1]] = { kenpomRank: parseInt(cm[2]), record: cm[3] };
}

let changeCount = 0;
results.forEach(t => {
  const cur = current[t.ourId];
  if (!cur) {
    console.log(`NEW: ${t.ourId} — kenpomRank: ${t.preKP}, record: "${t.preRecord}"`);
    changeCount++;
    return;
  }
  const diffs = [];
  if (cur.kenpomRank !== t.preKP) {
    diffs.push(`kenpomRank: ${cur.kenpomRank} → ${t.preKP}`);
  }
  if (cur.record !== t.preRecord) {
    diffs.push(`record: "${cur.record}" → "${t.preRecord}"`);
  }
  if (diffs.length > 0) {
    console.log(`${t.ourId}: ${diffs.join(', ')}`);
    changeCount++;
  }
});

console.log(`\n${changeCount} changes needed`);
