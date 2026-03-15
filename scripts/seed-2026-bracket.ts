/**
 * Seed the 2026 NCAA Tournament bracket into the database.
 *
 * Creates all 68 teams + 4 play-in slots.
 * Run with: npx tsx -r dotenv/config scripts/seed-2026-bracket.ts
 */
import { PrismaClient } from "../src/generated/prisma"
import { PrismaNeon } from "@prisma/adapter-neon"

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

interface BracketTeam {
  espnId: string
  name: string
  shortName: string
  seed: number
  region: "East" | "West" | "South" | "Midwest"
  isPlayIn: boolean
  conference: string
}

const logo = (id: string) => `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`

// ─── Complete 2026 NCAA Tournament Bracket (68 teams) ──────────────────────

const BRACKET_2026: BracketTeam[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // EAST REGION (Washington, D.C.)
  // ═══════════════════════════════════════════════════════════════════════════
  { espnId: "150",  name: "Duke",               shortName: "DUKE", seed: 1,  region: "East", isPlayIn: false, conference: "ACC" },
  { espnId: "41",   name: "UConn",              shortName: "UCONN", seed: 2, region: "East", isPlayIn: false, conference: "Big East" },
  { espnId: "127",  name: "Michigan State",      shortName: "MSU",  seed: 3,  region: "East", isPlayIn: false, conference: "Big Ten" },
  { espnId: "2305", name: "Kansas",             shortName: "KU",   seed: 4,  region: "East", isPlayIn: false, conference: "Big 12" },
  { espnId: "2599", name: "St. John's",         shortName: "SJU",  seed: 5,  region: "East", isPlayIn: false, conference: "Big East" },
  { espnId: "97",   name: "Louisville",         shortName: "LOU",  seed: 6,  region: "East", isPlayIn: false, conference: "ACC" },
  { espnId: "26",   name: "UCLA",               shortName: "UCLA", seed: 7,  region: "East", isPlayIn: false, conference: "Big Ten" },
  { espnId: "194",  name: "Ohio State",         shortName: "OSU",  seed: 8,  region: "East", isPlayIn: false, conference: "Big Ten" },
  { espnId: "2628", name: "TCU",                shortName: "TCU",  seed: 9,  region: "East", isPlayIn: false, conference: "Big 12" },
  { espnId: "2116", name: "UCF",                shortName: "UCF",  seed: 10, region: "East", isPlayIn: false, conference: "Big 12" },
  { espnId: "58",   name: "South Florida",      shortName: "USF",  seed: 11, region: "East", isPlayIn: false, conference: "AAC" },
  { espnId: "2460", name: "Northern Iowa",      shortName: "UNI",  seed: 12, region: "East", isPlayIn: false, conference: "MVC" },
  { espnId: "2856", name: "California Baptist", shortName: "CBU",  seed: 13, region: "East", isPlayIn: false, conference: "WAC" },
  { espnId: "2449", name: "North Dakota State", shortName: "NDSU", seed: 14, region: "East", isPlayIn: false, conference: "Summit" },
  { espnId: "231",  name: "Furman",             shortName: "FUR",  seed: 15, region: "East", isPlayIn: false, conference: "SoCon" },
  { espnId: "2561", name: "Siena",              shortName: "SIEN", seed: 16, region: "East", isPlayIn: false, conference: "MAAC" },

  // ═══════════════════════════════════════════════════════════════════════════
  // WEST REGION (San Jose)
  // ═══════════════════════════════════════════════════════════════════════════
  { espnId: "12",     name: "Arizona",          shortName: "ARIZ", seed: 1,  region: "West", isPlayIn: false, conference: "Big 12" },
  { espnId: "2509",   name: "Purdue",           shortName: "PUR",  seed: 2,  region: "West", isPlayIn: false, conference: "Big Ten" },
  { espnId: "2250",   name: "Gonzaga",          shortName: "GONZ", seed: 3,  region: "West", isPlayIn: false, conference: "WCC" },
  { espnId: "8",      name: "Arkansas",         shortName: "ARK",  seed: 4,  region: "West", isPlayIn: false, conference: "SEC" },
  { espnId: "275",    name: "Wisconsin",        shortName: "WISC", seed: 5,  region: "West", isPlayIn: false, conference: "Big Ten" },
  { espnId: "252",    name: "BYU",              shortName: "BYU",  seed: 6,  region: "West", isPlayIn: false, conference: "Big 12" },
  { espnId: "2390",   name: "Miami",            shortName: "MIA",  seed: 7,  region: "West", isPlayIn: false, conference: "ACC" },
  { espnId: "222",    name: "Villanova",        shortName: "VILL", seed: 8,  region: "West", isPlayIn: false, conference: "Big East" },
  { espnId: "328",    name: "Utah State",       shortName: "USU",  seed: 9,  region: "West", isPlayIn: false, conference: "MWC" },
  { espnId: "142",    name: "Missouri",         shortName: "MIZZ", seed: 10, region: "West", isPlayIn: false, conference: "SEC" },
  // West 11: First Four — Texas vs NC State
  { espnId: "251",    name: "Texas",            shortName: "TEX",  seed: 11, region: "West", isPlayIn: true, conference: "SEC" },
  { espnId: "152",    name: "NC State",         shortName: "NCST", seed: 11, region: "West", isPlayIn: true, conference: "ACC" },
  { espnId: "2314",   name: "High Point",       shortName: "HPU",  seed: 12, region: "West", isPlayIn: false, conference: "Big South" },
  { espnId: "62",     name: "Hawaii",           shortName: "HAW",  seed: 13, region: "West", isPlayIn: false, conference: "Big West" },
  { espnId: "338",    name: "Kennesaw State",   shortName: "KENN", seed: 14, region: "West", isPlayIn: false, conference: "ASUN" },
  { espnId: "2511",   name: "Queens",           shortName: "QUC",  seed: 15, region: "West", isPlayIn: false, conference: "ASUN" },
  { espnId: "112358", name: "LIU",              shortName: "LIU",  seed: 16, region: "West", isPlayIn: false, conference: "NEC" },

  // ═══════════════════════════════════════════════════════════════════════════
  // MIDWEST REGION (Chicago)
  // ═══════════════════════════════════════════════════════════════════════════
  { espnId: "130",  name: "Michigan",           shortName: "MICH", seed: 1,  region: "Midwest", isPlayIn: false, conference: "Big Ten" },
  { espnId: "66",   name: "Iowa State",         shortName: "ISU",  seed: 2,  region: "Midwest", isPlayIn: false, conference: "Big 12" },
  { espnId: "258",  name: "Virginia",           shortName: "UVA",  seed: 3,  region: "Midwest", isPlayIn: false, conference: "ACC" },
  { espnId: "333",  name: "Alabama",            shortName: "ALA",  seed: 4,  region: "Midwest", isPlayIn: false, conference: "SEC" },
  { espnId: "2641", name: "Texas Tech",         shortName: "TTU",  seed: 5,  region: "Midwest", isPlayIn: false, conference: "Big 12" },
  { espnId: "2633", name: "Tennessee",          shortName: "TENN", seed: 6,  region: "Midwest", isPlayIn: false, conference: "SEC" },
  { espnId: "96",   name: "Kentucky",           shortName: "UK",   seed: 7,  region: "Midwest", isPlayIn: false, conference: "SEC" },
  { espnId: "61",   name: "Georgia",            shortName: "UGA",  seed: 8,  region: "Midwest", isPlayIn: false, conference: "SEC" },
  { espnId: "139",  name: "Saint Louis",        shortName: "SLU",  seed: 9,  region: "Midwest", isPlayIn: false, conference: "A-10" },
  { espnId: "2541", name: "Santa Clara",        shortName: "SCU",  seed: 10, region: "Midwest", isPlayIn: false, conference: "WCC" },
  // Midwest 11: First Four — SMU vs Miami (OH)
  { espnId: "2567", name: "SMU",                shortName: "SMU",  seed: 11, region: "Midwest", isPlayIn: true, conference: "ACC" },
  { espnId: "193",  name: "Miami (OH)",         shortName: "M-OH", seed: 11, region: "Midwest", isPlayIn: true, conference: "MAC" },
  { espnId: "2006", name: "Akron",              shortName: "AKR",  seed: 12, region: "Midwest", isPlayIn: false, conference: "MAC" },
  { espnId: "2275", name: "Hofstra",            shortName: "HOF",  seed: 13, region: "Midwest", isPlayIn: false, conference: "CAA" },
  { espnId: "2918", name: "Wright State",       shortName: "WSU",  seed: 14, region: "Midwest", isPlayIn: false, conference: "Horizon" },
  { espnId: "2634", name: "Tennessee State",    shortName: "TNST", seed: 15, region: "Midwest", isPlayIn: false, conference: "OVC" },
  // Midwest 16: First Four — UMBC vs Howard
  { espnId: "2692", name: "UMBC",               shortName: "UMBC", seed: 16, region: "Midwest", isPlayIn: true, conference: "AE" },
  { espnId: "47",   name: "Howard",             shortName: "HOW",  seed: 16, region: "Midwest", isPlayIn: true, conference: "MEAC" },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOUTH REGION (Houston)
  // ═══════════════════════════════════════════════════════════════════════════
  { espnId: "57",   name: "Florida",            shortName: "FLA",  seed: 1,  region: "South", isPlayIn: false, conference: "SEC" },
  { espnId: "248",  name: "Houston",            shortName: "HOU",  seed: 2,  region: "South", isPlayIn: false, conference: "Big 12" },
  { espnId: "356",  name: "Illinois",           shortName: "ILL",  seed: 3,  region: "South", isPlayIn: false, conference: "Big Ten" },
  { espnId: "158",  name: "Nebraska",           shortName: "NEB",  seed: 4,  region: "South", isPlayIn: false, conference: "Big Ten" },
  { espnId: "238",  name: "Vanderbilt",         shortName: "VAN",  seed: 5,  region: "South", isPlayIn: false, conference: "SEC" },
  { espnId: "153",  name: "North Carolina",     shortName: "UNC",  seed: 6,  region: "South", isPlayIn: false, conference: "ACC" },
  { espnId: "2608", name: "Saint Mary's",       shortName: "SMC",  seed: 7,  region: "South", isPlayIn: false, conference: "WCC" },
  { espnId: "228",  name: "Clemson",            shortName: "CLEM", seed: 8,  region: "South", isPlayIn: false, conference: "ACC" },
  { espnId: "2294", name: "Iowa",               shortName: "IOWA", seed: 9,  region: "South", isPlayIn: false, conference: "Big Ten" },
  { espnId: "245",  name: "Texas A&M",          shortName: "TAMU", seed: 10, region: "South", isPlayIn: false, conference: "SEC" },
  { espnId: "2670", name: "VCU",                shortName: "VCU",  seed: 11, region: "South", isPlayIn: false, conference: "A-10" },
  { espnId: "2377", name: "McNeese",            shortName: "MCN",  seed: 12, region: "South", isPlayIn: false, conference: "Southland" },
  { espnId: "2653", name: "Troy",               shortName: "TROY", seed: 13, region: "South", isPlayIn: false, conference: "Sun Belt" },
  { espnId: "219",  name: "Penn",               shortName: "PENN", seed: 14, region: "South", isPlayIn: false, conference: "Ivy" },
  { espnId: "70",   name: "Idaho",              shortName: "IDHO", seed: 15, region: "South", isPlayIn: false, conference: "Big Sky" },
  // South 16: First Four — Prairie View A&M vs Lehigh
  { espnId: "2504", name: "Prairie View A&M",   shortName: "PVAM", seed: 16, region: "South", isPlayIn: true, conference: "SWAC" },
  { espnId: "2329", name: "Lehigh",             shortName: "LEH",  seed: 16, region: "South", isPlayIn: true, conference: "Patriot" },
]

// ─── Play-In Slot definitions (First Four) ─────────────────────────────────

interface PlayInDef {
  seed: number
  region: string
  team1EspnId: string
  team2EspnId: string
}

const PLAY_IN_SLOTS: PlayInDef[] = [
  { seed: 11, region: "West",    team1EspnId: "251",  team2EspnId: "152"  }, // Texas vs NC State
  { seed: 11, region: "Midwest", team1EspnId: "2567", team2EspnId: "193"  }, // SMU vs Miami (OH)
  { seed: 16, region: "Midwest", team1EspnId: "2692", team2EspnId: "47"   }, // UMBC vs Howard
  { seed: 16, region: "South",   team1EspnId: "2504", team2EspnId: "2329" }, // Prairie View A&M vs Lehigh
]

async function main() {
  console.log("🏀 Seeding 2026 NCAA Tournament bracket...")
  console.log(`   ${BRACKET_2026.length} teams total`)

  // First clear any existing teams from a previous bracket (e.g. 2025 demo data)
  // We do NOT delete — we upsert so any existing picks/entries remain valid
  let created = 0
  let updated = 0

  for (const team of BRACKET_2026) {
    const result = await prisma.team.upsert({
      where: { espnId: team.espnId },
      create: {
        espnId: team.espnId,
        name: team.name,
        shortName: team.shortName,
        seed: team.seed,
        region: team.region,
        isPlayIn: team.isPlayIn,
        logoUrl: logo(team.espnId),
        conference: team.conference,
        wins: 0,
        eliminated: false,
      },
      update: {
        name: team.name,
        shortName: team.shortName,
        seed: team.seed,
        region: team.region,
        isPlayIn: team.isPlayIn,
        logoUrl: logo(team.espnId),
        conference: team.conference,
        // Don't reset wins/eliminated in case this is re-run during tournament
      },
    })
    // Check if it was created or updated by comparing createdAt/updatedAt
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++
    } else {
      updated++
    }
  }

  console.log(`   ✓ Teams: ${created} created, ${updated} updated`)

  // ── Create play-in slots ──────────────────────────────────────────────────
  let playInCreated = 0
  for (const slot of PLAY_IN_SLOTS) {
    const team1 = await prisma.team.findUnique({ where: { espnId: slot.team1EspnId } })
    const team2 = await prisma.team.findUnique({ where: { espnId: slot.team2EspnId } })
    if (!team1 || !team2) {
      console.error(`   ✗ Could not find teams for play-in slot: seed ${slot.seed} ${slot.region}`)
      continue
    }

    await prisma.playInSlot.upsert({
      where: { seed_region: { seed: slot.seed, region: slot.region } },
      create: {
        seed: slot.seed,
        region: slot.region,
        team1Id: team1.id,
        team2Id: team2.id,
      },
      update: {
        team1Id: team1.id,
        team2Id: team2.id,
      },
    })
    playInCreated++
  }

  console.log(`   ✓ Play-in slots: ${playInCreated} created/updated`)

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalTeams = await prisma.team.count()
  const totalPlayIn = await prisma.playInSlot.count()
  console.log(`\n🏁 Done! DB now has ${totalTeams} teams and ${totalPlayIn} play-in slots.`)
}

main()
  .catch((err) => {
    console.error("Fatal error:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
