/**
 * Fetch KenPom fanmatch data for ALL game days of the 2024-25 college basketball season.
 * Date range: 2024-11-04 to 2025-04-07
 * 
 * Output: scripts/kenpom_fanmatch_all_2025.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_TOKEN = 'ad64aa89582359a3c4b0e349dd4add8b88aa74dea04d9d734f05d76f3da28fd6';
const BASE_URL = 'https://kenpom.com/api.php';
const START_DATE = new Date('2024-11-04');
const END_DATE = new Date('2025-04-07');
const DELAY_MS = 200;
const OUTPUT_FILE = path.join(__dirname, 'kenpom_fanmatch_all_2025.json');

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fetchFanmatch(dateStr) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}?endpoint=fanmatch&d=${dateStr}`;
    const options = {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${dateStr}: ${data.substring(0, 200)}`));
          return;
        }
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`JSON parse error for ${dateStr}: ${e.message} -- raw: ${data.substring(0, 200)}`));
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getDatesInRange(start, end) {
  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

async function main() {
  const dates = getDatesInRange(START_DATE, END_DATE);
  console.log(`Fetching fanmatch data for ${dates.length} dates: ${formatDate(START_DATE)} to ${formatDate(END_DATE)}`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log('');

  const allGames = [];
  let datesWithGames = 0;
  let totalGames = 0;
  let errors = 0;

  for (let i = 0; i < dates.length; i++) {
    const dateStr = formatDate(dates[i]);

    try {
      const games = await fetchFanmatch(dateStr);

      if (Array.isArray(games) && games.length > 0) {
        // Tag each game with the date it was fetched for
        for (const game of games) {
          game._fetchDate = dateStr;
        }
        allGames.push(...games);
        datesWithGames++;
        totalGames += games.length;
      }
    } catch (err) {
      console.error(`  ERROR on ${dateStr}: ${err.message}`);
      errors++;
    }

    // Progress update every 10 dates
    if ((i + 1) % 10 === 0 || i === dates.length - 1) {
      console.log(`[${i + 1}/${dates.length}] ${dateStr} -- ${totalGames} games from ${datesWithGames} game days so far (${errors} errors)`);
    }

    // Respectful delay between requests
    if (i < dates.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log('');
  console.log(`Done. ${totalGames} total games across ${datesWithGames} game days. ${errors} errors.`);

  // Save output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allGames, null, 2), 'utf-8');
  console.log(`Saved to ${OUTPUT_FILE} (${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
