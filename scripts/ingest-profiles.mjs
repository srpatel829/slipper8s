/**
 * One-time script to ingest player profile data from Excel into demo-users-2025.ts
 * Run: node scripts/ingest-profiles.mjs
 */
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const STATE_MAP = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
  CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',
  LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',
  MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',
  NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',
  OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',
  WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'
};

const FAV_NORMALIZE = {
  'Duke':'duke','Florida Gators':'florida','FSU':'florida-st','Uconn':'uconn','UConn':'uconn',
  'UNC':'north-carolina','Georgia Tech':'georgia-tech','Michigan':'michigan','Kentucky':'kentucky',
  'Maryland':'maryland','Penn State':'penn-st','Illinois':'illinois','Stanford':'stanford',
  'Miami':'miami','UCF':'ucf','Virginia':'virginia','Villlanova':'villanova','Villanova':'villanova',
};

// 1. Read Excel profiles
const wb = XLSX.readFile(path.join(root, 'data', 'historical', 'Super 8s_2025.xlsx'));
const ws = wb.Sheets['Player Profiles'];
const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
console.log(`Read ${rows.length} profile rows from Excel`);

// 2. Build profile maps (by name and by email)
const byName = new Map();
const byEmail = new Map();

for (const row of rows) {
  const name = (row['Name'] || '').trim();
  const email = (row['Email Address'] || '').trim().toLowerCase();
  const country = row['Country'] ? String(row['Country']).trim() : null;
  const stateRaw = row['State'] ? String(row['State']).trim() : null;
  const state = stateRaw ? (STATE_MAP[stateRaw.toUpperCase()] || stateRaw) : null;
  const gender = row['Gender'] ? String(row['Gender']).trim() : null;
  const favRaw = row['Favorite Team'] ? String(row['Favorite Team']).trim() : null;
  const favoriteTeam = favRaw ? (FAV_NORMALIZE[favRaw] || favRaw.toLowerCase().replace(/\s+/g, '-')) : null;

  const profile = { country, state, gender, favoriteTeam };
  byName.set(name, profile);
  byEmail.set(email, profile);
}

// 3. Read current demo-users-2025.ts and parse
const usersFile = path.join(root, 'src', 'lib', 'demo-users-2025.ts');
const usersContent = fs.readFileSync(usersFile, 'utf8');

// Extract the array literal
const startIdx = usersContent.indexOf('[');
const endIdx = usersContent.lastIndexOf(']');
if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find array bounds in demo-users-2025.ts');
  process.exit(1);
}

const jsonStr = usersContent.slice(startIdx, endIdx + 1);
const users = JSON.parse(jsonStr);
console.log(`Parsed ${users.length} users from demo-users-2025.ts`);

// 4. Match and merge
let matched = 0, unmatched = 0;
for (const user of users) {
  let profile = byName.get(user.name);
  if (!profile) {
    // Skip the demo user
    if (user.name === 'You (Demo)') {
      user.country = 'USA';
      user.state = 'Georgia';
      user.gender = 'Male';
      user.favoriteTeam = 'florida';
      matched++;
      continue;
    }
    unmatched++;
    user.country = null;
    user.state = null;
    user.gender = null;
    user.favoriteTeam = null;
    continue;
  }

  user.country = profile.country;
  user.state = profile.state;
  user.gender = profile.gender;
  user.favoriteTeam = profile.favoriteTeam;
  matched++;
}

console.log(`\nMatched: ${matched}, Unmatched: ${unmatched}`);

// Show first 5
console.log('\nFirst 5 users:');
for (const u of users.slice(0, 5)) {
  console.log(`  ${u.name} -> ${u.country}, ${u.state}, ${u.gender}, ${u.favoriteTeam}`);
}

// Show unmatched
const unmatchedList = users.filter(u => u.country === null);
if (unmatchedList.length > 0) {
  console.log(`\nUnmatched users (${unmatchedList.length}):`);
  unmatchedList.forEach(u => console.log(`  ${u.name}`));
}

// 5. Generate updated file
const output = '\nexport const REAL_2025_USERS = ' + JSON.stringify(users, null, 2) + ';\n';
fs.writeFileSync(usersFile, output);
console.log(`\nWrote updated ${usersFile} (${output.length} chars)`);
