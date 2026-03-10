/**
 * Maps KenPom 2025 tournament team data to our team IDs in team-data-2025.ts.
 * Run: node scripts/kenpom-update-team-data.js
 */
const fs = require('fs');
const path = require('path');

const ratings = JSON.parse(fs.readFileSync(path.join(__dirname, 'kenpom_ratings_2025.json'), 'utf8'));
const teams = JSON.parse(fs.readFileSync(path.join(__dirname, 'kenpom_teams_2025.json'), 'utf8'));

// Build TeamID map
const teamIdMap = new Map();
teams.forEach(t => teamIdMap.set(t.TeamName, t.TeamID));

// KenPom TeamName → our team ID mapping
const KENPOM_TO_OUR_ID = {
  "Duke": "duke",
  "Houston": "houston",
  "Florida": "florida",
  "Auburn": "auburn",
  "Tennessee": "tennessee",
  "Alabama": "alabama",
  "Michigan St.": "michigan-st",
  "St. John's": "st-johns",
  "Texas Tech": "texas-tech",
  "Iowa St.": "iowa-st",
  "Wisconsin": "wisconsin",
  "Kentucky": "kentucky",
  "Maryland": "maryland",
  "Arizona": "arizona",
  "Purdue": "purdue",
  "Texas A&M": "texas-am",
  "Michigan": "michigan",
  "Clemson": "clemson",
  "Oregon": "oregon",
  "Memphis": "memphis",
  "Illinois": "illinois",
  "Missouri": "missouri",
  "Mississippi": "ole-miss",
  "BYU": "byu",
  "UCLA": "ucla",
  "Kansas": "kansas",
  "Saint Mary's": "saint-marys",
  "Marquette": "marquette",
  "Gonzaga": "gonzaga",
  "Louisville": "louisville",
  "Connecticut": "uconn",
  "Mississippi St.": "mississippi-st",
  "Baylor": "baylor",
  "Creighton": "creighton",
  "Georgia": "georgia",
  "Oklahoma": "oklahoma",
  "Arkansas": "arkansas",
  "New Mexico": "new-mexico",
  "Vanderbilt": "vanderbilt",
  "Utah St.": "utah-st",
  "North Carolina": "north-carolina",
  "VCU": "vcu",
  "Xavier": "xavier",
  "Texas": "texas",
  "San Diego St.": "san-diego-st",
  "Drake": "drake",
  "UC San Diego": "uc-san-diego",
  "Colorado St.": "colorado-st",
  "McNeese": "mcneese-st",
  "Liberty": "liberty",
  "Yale": "yale",
  "High Point": "high-point",
  "Akron": "akron",
  "Grand Canyon": "grand-canyon",
  "Lipscomb": "lipscomb",
  "Troy": "troy",
  "UNC Wilmington": "unc-wilmington",
  "Montana": "montana",
  "Wofford": "wofford",
  "Robert Morris": "robert-morris",
  "Bryant": "bryant",
  "Nebraska Omaha": "omaha",
  "Norfolk St.": "norfolk-st",
  "SIUE": "siu-edwardsville",
  "Mount St. Mary's": "mount-st-marys",
  "American": "american",
  "Alabama St.": "alabama-st",
  "Saint Francis": "saint-francis",
};

// Filter tournament teams (Seed > 0)
const tourneyTeams = ratings.filter(t => t.Seed > 0);

console.log("=== TOURNAMENT TEAMS — DATA FOR team-data-2025.ts ===\n");

// Group by seed for readability
const bySeed = {};
tourneyTeams.forEach(t => {
  if (!bySeed[t.Seed]) bySeed[t.Seed] = [];
  bySeed[t.Seed].push(t);
});

const allOutput = [];

for (let seed = 1; seed <= 16; seed++) {
  const group = bySeed[seed] || [];
  group.sort((a, b) => a.RankAdjEM - b.RankAdjEM);

  group.forEach(t => {
    const ourId = KENPOM_TO_OUR_ID[t.TeamName];
    const kpId = teamIdMap.get(t.TeamName);
    const record = `${t.Wins}-${t.Losses}`;

    if (!ourId) {
      console.error(`WARNING: No mapping for KenPom team "${t.TeamName}"`);
      return;
    }

    allOutput.push({
      ourId,
      seed: t.Seed,
      kenpomRank: t.RankAdjEM,
      record,
      kenpomTeamId: kpId,
      teamName: t.TeamName,
      adjEM: t.AdjEM,
      conf: t.ConfShort,
    });
  });
}

// Print as TypeScript-ready lines sorted by S-Curve (approximate by seed then KenPom rank)
let sCurve = 0;
allOutput.sort((a, b) => a.seed - b.seed || a.kenpomRank - b.kenpomRank);

console.log("// Sorted by seed then KenPom rank within seed\n");
allOutput.forEach(t => {
  sCurve++;
  console.log(
    `  // ${t.teamName} (Seed ${t.seed}, KenPom #${t.kenpomRank}, ${t.record}, ${t.conf})`
  );
  console.log(
    `  { teamId: "${t.ourId}",`.padEnd(36) +
    `kenpomRank: ${String(t.kenpomRank).padStart(3)}, ` +
    `record: "${t.record}", ` +
    `kenpomTeamId: ${t.kenpomTeamId} },`
  );
});

console.log(`\nTotal: ${allOutput.length} teams`);

// Print comparison with our current data
console.log("\n\n=== DIFFERENCES FROM CURRENT team-data-2025.ts ===\n");

// Read current file
const currentFile = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'lib', 'team-data-2025.ts'), 'utf8'
);

// Extract current records
const recordRegex = /teamId:\s*"([^"]+)".*?kenpomRank:\s*(\d+).*?record:\s*"([^"]+)"/g;
const current = {};
let match;
while ((match = recordRegex.exec(currentFile)) !== null) {
  current[match[1]] = { kenpomRank: parseInt(match[2]), record: match[3] };
}

allOutput.forEach(t => {
  const cur = current[t.ourId];
  if (!cur) {
    console.log(`NEW: ${t.ourId} (KP#${t.kenpomRank}, ${t.record})`);
    return;
  }
  const diffs = [];
  if (cur.kenpomRank !== t.kenpomRank) {
    diffs.push(`kenpomRank: ${cur.kenpomRank} → ${t.kenpomRank}`);
  }
  if (cur.record !== t.record) {
    diffs.push(`record: ${cur.record} → ${t.record}`);
  }
  if (diffs.length > 0) {
    console.log(`${t.ourId}: ${diffs.join(', ')}`);
  }
});
