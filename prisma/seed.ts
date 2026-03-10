import { PrismaClient } from "../src/generated/prisma"
import { PrismaNeon } from "@prisma/adapter-neon"

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Create 2026 season
  const season2026 = await prisma.season.upsert({
    where: { year: 2026 },
    create: {
      year: 2026,
      status: "REGISTRATION",
      // March 19, 2026 12:15pm EDT = 16:15 UTC (DST starts March 8)
      entryDeadlineUtc: new Date("2026-03-19T16:15:00.000Z"),
    },
    update: {
      entryDeadlineUtc: new Date("2026-03-19T16:15:00.000Z"),
    },
  })

  // Create AppSettings singleton and link to 2026 season
  await prisma.appSettings.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      currentSeasonId: season2026.id,
      picksDeadline: new Date("2026-03-19T16:15:00.000Z"),
      payoutStructure: [
        { place: 1, label: "Champion", amount: "" },
        { place: 2, label: "Runner-Up", amount: "" },
        { place: 3, label: "3rd Place", amount: "" },
        { place: 4, label: "4th Place", amount: "" },
        { place: 5, label: "Sweet 16", amount: "" },
        { place: 6, label: "Elite 8", amount: "" },
      ],
      defaultCharities: [],
    },
    update: {
      currentSeasonId: season2026.id,
      picksDeadline: new Date("2026-03-19T16:15:00.000Z"),
    },
  })

  // Create default content pages
  const defaultPages = [
    {
      slug: "rules",
      title: "Pool Rules",
      content: `# Pool Rules

## How it works

1. **Pick 8 teams** from the NCAA Tournament bracket before the deadline
2. **Scoring**: seed × wins for each team
3. Play-in games do not count toward wins
4. One entry per person

## Scoring Example

A #12 seed that wins 3 games earns: 12 × 3 = **36 points**

A #1 seed that wins 5 games earns: 1 × 5 = **5 points**

Higher seeds that go on big runs are extremely valuable!

## Play-in Games

Some seeds (11, 16) have play-in games. You can pick those slots — your pick
auto-resolves to the winner of the play-in game.

## Leaderboard

- **Score**: points earned so far (seed × wins)
- **PPR**: possible points remaining (if all your alive teams win out)
- **TPS**: total potential score = Score + PPR
`,
      isPublished: true,
    },
    {
      slug: "prizes",
      title: "Prizes & Payouts",
      content: `# Prizes & Payouts

Prizes will be updated by the pool administrator.

## Charitable Component

$25 per entry is donated to charity. The top 4 finishers choose the charity.
`,
      isPublished: false,
    },
  ]

  for (const page of defaultPages) {
    await prisma.contentPage.upsert({
      where: { slug: page.slug },
      create: page,
      update: {},
    })
  }

  console.log(`✓ Created 2026 season (id: ${season2026.id})`)
  console.log("✓ Seeded AppSettings with currentSeasonId and picks deadline (Mar 19 12pm EDT)")
  console.log("✓ Seeded default content pages")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
