/**
 * Extracts Silver Bulletin probability data from the Excel file
 * and outputs it as TypeScript constants ready to embed.
 */
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.resolve('C:/Users/srpat/OneDrive/Documents/GitHub/slipper8s/data/silverbulletin/Sbcb_Mens_Odds_March_16_2025.xlsx');
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

// Row 0 is headers: team_name, team_seed, team_region, playin_flag, team_alive, rd1_win, rd2_win, rd3_win, rd4_win, rd5_win, rd6_win, rd7_win, win_odds, timestamp
const headers = data[0];
console.log('Headers:', headers);
console.log('---');

const teams = [];
for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row || !row[0]) continue;

  const team = {
    name: row[0],
    seed: row[1],
    region: row[2],
    playinFlag: row[3],
    alive: row[4],
    rd1: row[5],
    rd2: row[6],
    rd3: row[7],
    rd4: row[8],
    rd5: row[9],
    rd6: row[10],
    rd7: row[11],
  };

  // Calculate expected wins = sum of cumulative probabilities for rounds where team plays
  // rd2 through rd7 represent P(win at least N games)
  // Expected wins = rd2 + rd3 + rd4 + rd5 + rd6 + rd7
  const expectedWins = (team.rd2 || 0) + (team.rd3 || 0) + (team.rd4 || 0) +
                       (team.rd5 || 0) + (team.rd6 || 0) + (team.rd7 || 0);

  // Parse seed number (handle "16a", "16b" etc)
  const seedNum = parseInt(String(team.seed).replace(/[ab]$/, ''));
  const expectedScore = seedNum * expectedWins;

  teams.push({
    ...team,
    seedNum,
    expectedWins: Math.round(expectedWins * 1000) / 1000,
    expectedScore: Math.round(expectedScore * 100) / 100,
  });
}

// Sort by expected score descending to verify
teams.sort((a, b) => b.expectedScore - a.expectedScore);

console.log('\nAll teams sorted by expected score:');
console.log('Name | Seed | Region | ExpWins | ExpScore');
console.log('─'.repeat(60));
for (const t of teams) {
  console.log(`${t.name.padEnd(22)} | ${String(t.seed).padEnd(4)} | ${t.region.padEnd(8)} | ${t.expectedWins.toFixed(3).padStart(6)} | ${t.expectedScore.toFixed(2).padStart(7)}`);
}

// Calculate what the "Optimal 8" expected score would be (top 8 by expected score)
const top8 = teams.slice(0, 8);
const optimalExpected = top8.reduce((sum, t) => sum + t.expectedScore, 0);
console.log('\n--- TOP 8 by Expected Score ---');
for (const t of top8) {
  console.log(`  ${t.name} (${t.seed}-seed, ${t.region}): ${t.expectedScore.toFixed(2)}`);
}
console.log(`  TOTAL expected: ${optimalExpected.toFixed(2)}`);

// Now output the TypeScript data
console.log('\n\n=== TypeScript Output ===\n');
const regionOrder = { South: 0, East: 1, West: 2, Midwest: 3 };
teams.sort((a, b) => {
  const ra = regionOrder[a.region] ?? 99;
  const rb = regionOrder[b.region] ?? 99;
  if (ra !== rb) return ra - rb;
  return a.seedNum - b.seedNum;
});

console.log('export const SILVER_BULLETIN_2025: SilverBulletinTeam[] = [');
for (const t of teams) {
  console.log(`  { name: "${t.name}", seed: "${t.seed}", seedNum: ${t.seedNum}, region: "${t.region}", playIn: ${t.playinFlag === 1}, cumulative: [${t.rd1}, ${t.rd2}, ${t.rd3}, ${t.rd4}, ${t.rd5}, ${t.rd6}, ${t.rd7}] },`);
}
console.log('];');
