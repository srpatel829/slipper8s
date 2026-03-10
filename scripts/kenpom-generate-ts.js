/**
 * Generates updated team-data-2025.ts with KenPom-verified data.
 * Applies pre-tournament KenPom rankings and pre-tournament records.
 * Preserves S-Curve, BPI, conference champ flags, and cinderella/upset estimates.
 *
 * Run: node scripts/kenpom-generate-ts.js
 */
const fs = require('fs');
const path = require('path');

const archive = JSON.parse(fs.readFileSync(path.join(__dirname, 'kenpom_archive_2025_0316.json'), 'utf8'));
const ratings = JSON.parse(fs.readFileSync(path.join(__dirname, 'kenpom_ratings_2025.json'), 'utf8'));

// KenPom name → our ID
const KENPOM_TO_ID = {
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

// Tournament wins from demo-data.ts
const demoData = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'demo-data.ts'), 'utf8');
const teamWinsRegex = /id:\s*"([^"]+)"[\s\S]*?winsAtRound:\s*\[([^\]]+)\]/g;
const tourneyWinsMap = {};
let m;
while ((m = teamWinsRegex.exec(demoData)) !== null) {
  const wins = m[2].split(',').map(s => parseInt(s.trim()));
  tourneyWinsMap[m[1]] = Math.max(...wins);
}

const FIRST_FOUR_LOSERS = new Set(["san-diego-st", "texas", "saint-francis", "american"]);

// Build pre-tournament KenPom map
const preKPMap = {};
archive.forEach(t => {
  const id = KENPOM_TO_ID[t.TeamName];
  if (id) preKPMap[id] = t.RankAdjEM;
});

// Build pre-tournament records
const preRecords = {};
ratings.filter(t => t.Seed > 0).forEach(t => {
  const id = KENPOM_TO_ID[t.TeamName];
  if (!id) return;

  let tW, tL;
  if (FIRST_FOUR_LOSERS.has(id)) {
    tW = 0; tL = 1;
  } else {
    tW = tourneyWinsMap[id] || 0;
    tL = (id === "florida") ? 0 : 1; // Florida = 2025 champion
  }

  preRecords[id] = `${t.Wins - tW}-${t.Losses - tL}`;
});

// Read the current team-data file to preserve unchanged fields
const currentFile = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'lib', 'team-data-2025.ts'), 'utf8'
);

// Parse all teams from current file
const teamRegex = /\{\s*teamId:\s*"([^"]+)",\s*sCurveRank:\s*(\d+),\s*kenpomRank:\s*(\d+),\s*bpiRank:\s*(\d+),\s*record:\s*"([^"]+)",\s*confRegSeasonChamp:\s*(true|false),\s*confTourneyChamp:\s*(true|false),\s*cinderellaWins:\s*(\d+),\s*upsetLosses:\s*(\d+)\s*\}/g;
const teams = [];
let tm;
while ((tm = teamRegex.exec(currentFile)) !== null) {
  teams.push({
    teamId: tm[1],
    sCurveRank: parseInt(tm[2]),
    kenpomRank: preKPMap[tm[1]] || parseInt(tm[3]), // Use pre-tournament KP
    bpiRank: parseInt(tm[4]), // Keep BPI as-is (no BPI endpoint in KenPom API)
    record: preRecords[tm[1]] || tm[5], // Use computed pre-tournament record
    confRegSeasonChamp: tm[6] === 'true',
    confTourneyChamp: tm[7] === 'true',
    cinderellaWins: parseInt(tm[8]),
    upsetLosses: parseInt(tm[9]),
  });
}

// Format as TypeScript entry
function formatEntry(t) {
  const id = `"${t.teamId}",`.padEnd(20);
  const sc = `sCurveRank: ${String(t.sCurveRank).padStart(2)},`;
  const kp = ` kenpomRank: ${String(t.kenpomRank).padStart(3)},`;
  const bp = ` bpiRank: ${String(t.bpiRank).padStart(3)},`;
  const rec = ` record: "${t.record}",`.padEnd(18);
  const crs = ` confRegSeasonChamp: ${String(t.confRegSeasonChamp).padEnd(5)},`;
  const ct = ` confTourneyChamp: ${String(t.confTourneyChamp).padEnd(5)},`;
  const cw = ` cinderellaWins: ${t.cinderellaWins},`;
  const ul = ` upsetLosses: ${t.upsetLosses}`;
  return `  { teamId: ${id} ${sc}${kp}${bp}${rec}${crs}${ct}${cw}${ul} },`;
}

// Group by seed tier
const groups = [
  { label: "1-seeds (S-Curve 1–4)", range: [1, 4] },
  { label: "2-seeds (S-Curve 5–8)", range: [5, 8] },
  { label: "3-seeds (S-Curve 9–12)", range: [9, 12] },
  { label: "4-seeds (S-Curve 13–16)", range: [13, 16] },
  { label: "5-seeds (S-Curve 17–20)", range: [17, 20] },
  { label: "6-seeds (S-Curve 21–24)", range: [21, 24] },
  { label: "7-seeds (S-Curve 25–28)", range: [25, 28] },
  { label: "8-seeds (S-Curve 29–32)", range: [29, 32] },
  { label: "9-seeds (S-Curve 33–36)", range: [33, 36] },
  { label: "10-seeds (S-Curve 37–40)", range: [37, 40] },
  { label: "11-seeds (S-Curve 41–46 — includes First Four at-large)", range: [41, 46] },
  { label: "12-seeds (S-Curve 47–50)", range: [47, 50] },
  { label: "13-seeds (S-Curve 51–54)", range: [51, 54] },
  { label: "14-seeds (S-Curve 55–58)", range: [55, 58] },
  { label: "15-seeds (S-Curve 59–62)", range: [59, 62] },
  { label: "16-seeds (S-Curve 63–68 — includes First Four auto-bid)", range: [63, 68] },
];

let output = [];
groups.forEach(g => {
  output.push(`  // ── ${g.label} ──`);
  const inGroup = teams.filter(t => t.sCurveRank >= g.range[0] && t.sCurveRank <= g.range[1]);
  inGroup.sort((a, b) => a.sCurveRank - b.sCurveRank);
  inGroup.forEach(t => output.push(formatEntry(t)));
  output.push('');
});

// Print the complete array body
console.log(output.join('\n'));
