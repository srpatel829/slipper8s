/**
 * Apply computed cinderella wins and upset losses to team-data-2025.ts
 *
 * Run: node scripts/apply-cinderella-updates.js
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'lib', 'team-data-2025.ts');
const dataPath = path.join(__dirname, 'cinderella_upsets_2025.json');

let content = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let changes = 0;

for (const [teamId, vals] of Object.entries(data)) {
  // Match pattern: teamId: "xxx", ... cinderellaWins: N, upsetLosses: M
  const regex = new RegExp(
    `(teamId:\\s*"${teamId}"[^}]*?cinderellaWins:\\s*)(\\d+)(,\\s*upsetLosses:\\s*)(\\d+)`,
    'g'
  );

  content = content.replace(regex, (match, prefix, oldCW, middle, oldUL) => {
    if (parseInt(oldCW) !== vals.cinderellaWins || parseInt(oldUL) !== vals.upsetLosses) {
      changes++;
      console.log(`${teamId}: CW ${oldCW}→${vals.cinderellaWins}, UL ${oldUL}→${vals.upsetLosses}`);
    }
    return `${prefix}${vals.cinderellaWins}${middle}${vals.upsetLosses}`;
  });
}

fs.writeFileSync(filePath, content);
console.log(`\n${changes} values updated in team-data-2025.ts`);
