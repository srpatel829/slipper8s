// Script to extract tournament team data from KenPom API responses
const fs = require('fs');

const path = require('path');
const ratings = JSON.parse(fs.readFileSync(path.join(__dirname, 'kenpom_ratings_2025.json'), 'utf8'));
const teams = JSON.parse(fs.readFileSync(path.join(__dirname, 'kenpom_teams_2025.json'), 'utf8'));

// Build teamID -> teamName map
const idMap = new Map();
teams.forEach(t => idMap.set(t.TeamName, t.TeamID));

// Filter tournament teams (those with Seed set)
const tourney = ratings
  .filter(t => t.Seed != null)
  .sort((a, b) => a.Seed - b.Seed || a.RankAdjEM - b.RankAdjEM);

console.log("=== TOURNAMENT TEAMS (KenPom 2025 Final Ratings) ===\n");
console.log("Seed | TeamName | KenPom# | Record | Conf | AdjEM | Event | TeamID");
console.log("-----|----------|---------|--------|------|-------|-------|-------");

tourney.forEach(t => {
  const tid = idMap.get(t.TeamName) || '?';
  console.log(
    `${String(t.Seed).padStart(2)} | ${t.TeamName.padEnd(20)} | ${String(t.RankAdjEM).padStart(4)} | ${t.Wins}-${t.Losses} | ${(t.ConfShort || '').padEnd(5)} | ${t.AdjEM.toFixed(2).padStart(7)} | ${(t.Event || 'N/A').padEnd(15)} | ${tid}`
  );
});

console.log(`\nTotal tournament teams: ${tourney.length}`);

// Also output teams NOT in tournament that have Seed but lost in First Four
const firstFourLosers = tourney.filter(t => t.Event && t.Event.includes('First Four'));
if (firstFourLosers.length > 0) {
  console.log("\n=== FIRST FOUR PARTICIPANTS ===");
  firstFourLosers.forEach(t => {
    console.log(`  ${t.Seed} | ${t.TeamName} | KP#${t.RankAdjEM} | ${t.Wins}-${t.Losses} | Event: ${t.Event}`);
  });
}
