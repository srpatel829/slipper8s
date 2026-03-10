/**
 * Compute accurate cinderella wins and upset losses for each tournament team.
 *
 * Uses:
 * - KenPom fanmatch data (all season) → KenPom rankings AT THE TIME of each game
 * - ESPN team schedules → actual game results (W/L)
 * - Cross-references by date + opponent name to determine cinderella/upset games
 *
 * A "cinderella win" = team won a game where they had a HIGHER KenPom rank number
 *   (worse ranking) than their opponent at game time → they were the KenPom underdog and won
 *
 * An "upset loss" = team lost a game where they had a LOWER KenPom rank number
 *   (better ranking) than their opponent at game time → they were the KenPom favorite and lost
 *
 * Run: node scripts/compute-cinderella-upsets.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

// ──────────────────────────────────────────────
// KenPom name → our ID
// ──────────────────────────────────────────────

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

// Our ID → known ESPN team IDs (pre-mapped for reliability)
// These are the ESPN numeric IDs for each team
const OUR_ID_TO_ESPN_ID = {
  "duke": 150, "houston": 248, "florida": 57, "auburn": 2,
  "tennessee": 2633, "alabama": 333, "michigan-st": 127,
  "st-johns": 2599, "texas-tech": 2641, "iowa-st": 66,
  "wisconsin": 275, "kentucky": 96, "maryland": 120,
  "arizona": 12, "purdue": 2509, "texas-am": 245,
  "michigan": 130, "clemson": 228, "oregon": 2483, "memphis": 235,
  "illinois": 356, "missouri": 142, "ole-miss": 145, "byu": 252,
  "ucla": 26, "kansas": 2305, "saint-marys": 2608,
  "marquette": 269, "gonzaga": 2250, "louisville": 97,
  "uconn": 41, "mississippi-st": 344, "baylor": 239,
  "creighton": 156, "georgia": 61, "oklahoma": 201,
  "arkansas": 8, "new-mexico": 167, "vanderbilt": 238,
  "utah-st": 328, "north-carolina": 153, "vcu": 2670,
  "xavier": 2752, "texas": 251, "san-diego-st": 21,
  "drake": 2181, "uc-san-diego": 28, "colorado-st": 36,
  "mcneese-st": 2377, "liberty": 2335, "yale": 43,
  "high-point": 2272, "akron": 2006, "grand-canyon": 2253,
  "lipscomb": 288, "troy": 2653, "unc-wilmington": 350,
  "montana": 149, "wofford": 2747, "robert-morris": 2523,
  "bryant": 2803, "omaha": 2437, "norfolk-st": 2450,
  "siu-edwardsville": 2565, "mount-st-marys": 116,
  "american": 44, "alabama-st": 2011, "saint-francis": 2598,
};

// ──────────────────────────────────────────────
// HTTP helper
// ──────────────────────────────────────────────

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error: ${e.message}\nURL: ${url}\nBody: ${data.substring(0, 300)}`)); }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// ──────────────────────────────────────────────
// Build KenPom fanmatch index
// ──────────────────────────────────────────────

function buildFanmatchIndex(fanmatchData) {
  // date → kenpomTeamName → { rank, opponentRank, opponentName }
  const index = {};
  for (const game of fanmatchData) {
    const date = game.DateOfGame;
    if (!index[date]) index[date] = {};

    index[date][game.Home] = {
      rank: game.HomeRank,
      opponentRank: game.VisitorRank,
      opponentName: game.Visitor,
    };
    index[date][game.Visitor] = {
      rank: game.VisitorRank,
      opponentRank: game.HomeRank,
      opponentName: game.Home,
    };
  }
  return index;
}

// ──────────────────────────────────────────────
// Name normalization for cross-referencing
// ──────────────────────────────────────────────

function normalize(name) {
  return (name || '').toLowerCase()
    .replace(/\(.*\)/g, '')   // remove parentheticals
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ESPN location/displayName → KenPom name mapping
const ESPN_LOC_TO_KENPOM = {};
// Build from OUR_ID_TO_ESPN_ID + KENPOM_TO_ID
const idToKenpom = {};
for (const [kp, id] of Object.entries(KENPOM_TO_ID)) {
  idToKenpom[id] = kp;
}

// ──────────────────────────────────────────────
// Fetch ESPN schedule for a team
// ──────────────────────────────────────────────

async function fetchTeamSchedule(espnTeamId) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${espnTeamId}/schedule?season=2025`;
  const data = await fetchJSON(url);

  const teamLocation = data.team?.location || data.team?.displayName || '';
  const games = [];

  if (data.events) {
    for (const event of data.events) {
      const comp = event.competitions?.[0];
      if (!comp) continue;
      const competitors = comp.competitors || [];
      if (competitors.length < 2) continue;

      // Check completion via competition status
      const isCompleted = comp.status?.type?.completed;
      if (!isCompleted) continue;

      const homeComp = competitors.find(c => c.homeAway === 'home');
      const awayComp = competitors.find(c => c.homeAway === 'away');
      if (!homeComp || !awayComp) continue;

      // Use ESPN team ID for exact matching (not substring-based name matching)
      const ourTeamIsHome = String(homeComp.team?.id) === String(espnTeamId);

      // ESPN event date (YYYY-MM-DDTHH:MMZ) → YYYY-MM-DD
      const gameDate = (event.date || comp.date || '').split('T')[0];

      games.push({
        date: gameDate,
        ourTeamIsHome,
        homeTeamLoc: homeComp.team?.location || homeComp.team?.displayName || '',
        awayTeamLoc: awayComp.team?.location || awayComp.team?.displayName || '',
        homeWinner: homeComp.winner === true,
        awayWinner: awayComp.winner === true,
      });
    }
  }

  return { teamLocation, games };
}

// ──────────────────────────────────────────────
// Try to find a fanmatch entry for a game
// ──────────────────────────────────────────────

function findFanmatchEntry(fanmatchIndex, kenpomName, gameDate) {
  // Try the exact date and adjacent dates (ESPN timezone issues)
  const datesToTry = [gameDate];
  const d = new Date(gameDate + 'T12:00:00Z');
  const prev = new Date(d); prev.setDate(prev.getDate() - 1);
  const next = new Date(d); next.setDate(next.getDate() + 1);
  datesToTry.push(prev.toISOString().split('T')[0]);
  datesToTry.push(next.toISOString().split('T')[0]);

  for (const tryDate of datesToTry) {
    const dayGames = fanmatchIndex[tryDate];
    if (!dayGames) continue;

    // Direct name match
    if (dayGames[kenpomName]) return dayGames[kenpomName];

    // Normalized match
    const normKP = normalize(kenpomName);
    for (const [name, entry] of Object.entries(dayGames)) {
      if (normalize(name) === normKP) return entry;
      // Partial containment
      const normName = normalize(name);
      if (normName.includes(normKP) || normKP.includes(normName)) return entry;
    }
  }

  return null;
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────

async function main() {
  console.log("Loading fanmatch data...");
  const fanmatchData = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'kenpom_fanmatch_all_2025.json'), 'utf8')
  );
  console.log(`  ${fanmatchData.length} games loaded`);

  const fanmatchIndex = buildFanmatchIndex(fanmatchData);
  const dateCount = Object.keys(fanmatchIndex).length;
  console.log(`  ${dateCount} game dates indexed\n`);

  // Pre-tournament cutoff: March 18, 2025 (First Four starts)
  const PRE_TOURNEY_CUTOFF = '2025-03-18';

  const results = {};
  const ourTeamIds = Object.keys(OUR_ID_TO_ESPN_ID);
  let processed = 0;

  for (const ourId of ourTeamIds) {
    const espnId = OUR_ID_TO_ESPN_ID[ourId];
    const kenpomName = idToKenpom[ourId];

    await sleep(100);
    let scheduleData;
    try {
      scheduleData = await fetchTeamSchedule(espnId);
    } catch (e) {
      console.log(`⚠ Failed: ${ourId} (ESPN ${espnId}): ${e.message.substring(0, 100)}`);
      results[ourId] = { cinderellaWins: 0, upsetLosses: 0, gamesMatched: 0, gamesTotal: 0 };
      processed++;
      continue;
    }

    const { teamLocation, games } = scheduleData;

    // Pre-tournament games only
    const preTourneyGames = games.filter(g => g.date < PRE_TOURNEY_CUTOFF);

    let cinderellaWins = 0;
    let upsetLosses = 0;
    let gamesMatched = 0;

    for (const game of preTourneyGames) {
      // Determine if our team won (using ESPN team ID, not name matching)
      const won = game.ourTeamIsHome ? game.homeWinner : game.awayWinner;

      // Find in fanmatch
      const fm = findFanmatchEntry(fanmatchIndex, kenpomName, game.date);
      if (!fm) continue;

      gamesMatched++;

      const ourRank = fm.rank;
      const oppRank = fm.opponentRank;

      // Higher rank number = worse team in KenPom
      if (won && ourRank > oppRank) cinderellaWins++;
      if (!won && ourRank < oppRank) upsetLosses++;
    }

    results[ourId] = {
      cinderellaWins,
      upsetLosses,
      gamesMatched,
      gamesTotal: preTourneyGames.length,
    };

    processed++;
    if (processed % 10 === 0 || processed === ourTeamIds.length) {
      console.log(`  Processed ${processed}/${ourTeamIds.length} teams... (${ourId}: ${gamesMatched}/${preTourneyGames.length} matched, CW=${cinderellaWins} UL=${upsetLosses})`);
    }
  }

  // Print results
  console.log("\n\n=== CINDERELLA WINS & UPSET LOSSES (Pre-Tournament, KenPom-ranked games) ===\n");
  console.log(
    "TeamID".padEnd(22) +
    "CinW".padStart(5) +
    "UpsL".padStart(5) +
    "  Matched/Total"
  );
  console.log("-".repeat(55));

  const sortedIds = Object.keys(results).sort();
  for (const id of sortedIds) {
    const r = results[id];
    console.log(
      id.padEnd(22) +
      String(r.cinderellaWins).padStart(5) +
      String(r.upsetLosses).padStart(5) +
      `  ${r.gamesMatched}/${r.gamesTotal}`
    );
  }

  // Save raw results
  const outputPath = path.join(__dirname, 'cinderella_upsets_2025.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nSaved to ${outputPath}`);

  // Diff against current team-data-2025.ts
  console.log("\n\n=== CHANGES FOR team-data-2025.ts ===\n");
  const currentFile = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'lib', 'team-data-2025.ts'), 'utf8'
  );
  const currentRegex = /teamId:\s*"([^"]+)".*?cinderellaWins:\s*(\d+),\s*upsetLosses:\s*(\d+)/g;
  let changes = 0;
  let match;
  while ((match = currentRegex.exec(currentFile)) !== null) {
    const id = match[1];
    const curCW = parseInt(match[2]);
    const curUL = parseInt(match[3]);
    const newData = results[id];
    if (!newData) continue;
    if (curCW !== newData.cinderellaWins || curUL !== newData.upsetLosses) {
      console.log(`${id}: cinderellaWins ${curCW}→${newData.cinderellaWins}, upsetLosses ${curUL}→${newData.upsetLosses}  (${newData.gamesMatched}/${newData.gamesTotal} matched)`);
      changes++;
    }
  }
  console.log(`\n${changes} changes needed`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
