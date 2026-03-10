/**
 * Fetch fanmatch predictions for entire 2024-25 season to compute
 * cinderella wins (won as KenPom underdog) and upset losses (lost as KenPom fav).
 *
 * We need to fetch day-by-day for the regular season + tournament.
 * NCAA season runs roughly Nov 4, 2024 through April 7, 2025.
 *
 * Run: node scripts/kenpom-fanmatch-fetch.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'ad64aa89582359a3c4b0e349dd4add8b88aa74dea04d9d734f05d76f3da28fd6';
const OUTPUT_DIR = path.join(__dirname);

// Our tournament team names from KenPom
const TOURNEY_TEAMS = new Set([
  "Duke", "Houston", "Florida", "Auburn",
  "Tennessee", "Alabama", "Michigan St.", "St. John's",
  "Texas Tech", "Iowa St.", "Wisconsin", "Kentucky",
  "Maryland", "Arizona", "Purdue", "Texas A&M",
  "Michigan", "Clemson", "Oregon", "Memphis",
  "Illinois", "Missouri", "Mississippi", "BYU",
  "UCLA", "Kansas", "Saint Mary's", "Marquette",
  "Gonzaga", "Louisville", "Connecticut", "Mississippi St.",
  "Baylor", "Creighton", "Georgia", "Oklahoma",
  "Arkansas", "New Mexico", "Vanderbilt", "Utah St.",
  "North Carolina", "VCU", "Xavier", "Texas",
  "San Diego St.", "Drake", "UC San Diego", "Colorado St.",
  "McNeese", "Liberty", "Yale", "High Point",
  "Akron", "Grand Canyon", "Lipscomb", "Troy",
  "UNC Wilmington", "Montana", "Wofford", "Robert Morris",
  "Bryant", "Nebraska Omaha", "Norfolk St.", "SIUE",
  "Mount St. Mary's", "American", "Alabama St.", "Saint Francis",
]);

function fetchDay(dateStr) {
  return new Promise((resolve, reject) => {
    const url = `https://kenpom.com/api.php?endpoint=fanmatch&d=${dateStr}`;
    const options = {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            resolve([]); // No games or error
            return;
          }
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            resolve(parsed);
          } else {
            resolve([]);
          }
        } catch (e) {
          resolve([]);
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // Generate dates from Nov 4, 2024 through April 8, 2025
  const start = new Date('2024-11-04');
  const end = new Date('2025-04-08');
  const dates = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }

  console.log(`Fetching fanmatch data for ${dates.length} days...`);

  const allGames = [];
  let fetchCount = 0;

  for (const date of dates) {
    const games = await fetchDay(date);
    if (games.length > 0) {
      // Filter to games involving tournament teams
      const relevant = games.filter(g =>
        TOURNEY_TEAMS.has(g.Home) || TOURNEY_TEAMS.has(g.Visitor)
      );
      if (relevant.length > 0) {
        allGames.push(...relevant);
      }
      fetchCount++;
      if (fetchCount % 10 === 0) {
        process.stdout.write(`  ${date} (${allGames.length} relevant games so far)\r`);
      }
    }
    // Be nice to the API - small delay
    await sleep(100);
  }

  console.log(`\nFetched ${allGames.length} relevant games total`);

  // Save raw data
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'kenpom_fanmatch_2025.json'),
    JSON.stringify(allGames, null, 2)
  );
  console.log('Saved to kenpom_fanmatch_2025.json');

  // Compute cinderella wins and upset losses
  computeStats(allGames);
}

function computeStats(games) {
  // For each tournament team, count:
  // cinderellaWins: games where team was KenPom underdog (lower win prob) and won
  // upsetLosses: games where team was KenPom favorite (higher win prob) and lost

  const stats = {};
  TOURNEY_TEAMS.forEach(name => {
    stats[name] = { cinderellaWins: 0, upsetLosses: 0, totalGames: 0 };
  });

  games.forEach(g => {
    // HomeWP is home team win probability
    // If HomeWP > 0.5, home is favored; if < 0.5, visitor is favored
    const homeWP = g.HomeWP;

    // We need to know who actually won - KenPom fanmatch gives predictions, not results
    // We'd need actual results to determine W/L. But the scores shown are PREDICTIONS.
    // Let's check if we have actual scores somewhere...

    // Actually, for the fanmatch endpoint, these are PRE-GAME predictions.
    // We don't have actual results from this endpoint.
    // We need the team's W-L record from the ratings endpoint instead.
    //
    // But we can still use the predictions to identify WHO was the underdog in each game.
    // Then cross-reference with actual results...

    // NOTE: The fanmatch data may include actual results for past dates.
    // Let's check the data structure more carefully.
  });

  console.log('\nNote: Fanmatch gives predictions, not results.');
  console.log('Need to determine actual game outcomes to compute cinderella wins / upset losses.');
  console.log('Checking if HomeScore/VisitorScore or result fields exist...');

  if (games.length > 0) {
    console.log('\nSample game fields:', Object.keys(games[0]).join(', '));
    console.log('Sample game:', JSON.stringify(games[0], null, 2));
  }
}

main().catch(console.error);
