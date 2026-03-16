/**
 * Test script: Send a confirmation email simulating 4 regular picks + 4 play-in picks.
 * Run: npx tsx scripts/test-email.ts
 */

import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/index.js"
import { PrismaNeon } from "@prisma/adapter-neon"
import { sendEntryConfirmationEmail } from "../src/lib/email.js"
import { computeBracketAwarePPR, type TeamBracketInfo } from "../src/lib/bracket-ppr.js"
import { calculateEntryExpectedScore } from "../src/lib/silver-bulletin-2026.js"
import { classifyArchetypes } from "../src/lib/archetypes.js"

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Get 4 distinct regular teams (one per region, mid-seeds for variety)
  const regularTeams = await prisma.team.findMany({
    where: { seed: { in: [5, 7, 10, 14] } },
    select: { id: true, name: true, shortName: true, seed: true, region: true, logoUrl: true, espnId: true, wins: true, eliminated: true },
    orderBy: [{ region: "asc" }, { seed: "asc" }],
  })

  // Pick one per region to get 4 unique
  const regionsSeen = new Set<string>()
  const picked: typeof regularTeams = []
  for (const t of regularTeams) {
    if (!regionsSeen.has(t.region!) && picked.length < 4) {
      regionsSeen.add(t.region!)
      picked.push(t)
    }
  }

  // Get all play-in slots (should be ~4)
  const playInSlots = await prisma.playInSlot.findMany({
    include: {
      team1: { select: { id: true, name: true, shortName: true, seed: true, region: true, logoUrl: true, espnId: true, wins: true, eliminated: true } },
      team2: { select: { id: true, name: true, shortName: true, seed: true, region: true, logoUrl: true, espnId: true, wins: true, eliminated: true } },
      winner: true,
    },
  })

  console.log(`Found ${picked.length} regular teams and ${playInSlots.length} play-in slots`)
  console.log("Regular picks:")
  picked.forEach(t => console.log(`  #${t.seed} ${t.name} (${t.region})`))
  console.log("Play-in slots:")
  playInSlots.forEach(s => console.log(`  #${s.seed} ${s.region}: ${s.team1.name} vs ${s.team2.name} (winner: ${s.winner?.name ?? "unresolved"})`))

  // Build effective team list: regular picks + play-in representatives
  type TeamData = typeof picked[number]
  const effectiveTeams: TeamData[] = [...picked]
  for (const slot of playInSlots) {
    const rep = slot.winner ?? slot.team1
    effectiveTeams.push(rep as TeamData)
  }

  // Build pick details for email — show both team names + logos for unresolved play-in slots
  const pickDetails: { name: string; seed: number; region: string; logoUrl?: string | null; logoUrl2?: string | null }[] = []
  for (const t of picked) {
    pickDetails.push({
      name: t.name,
      seed: t.seed,
      region: t.region ?? "",
      logoUrl: t.logoUrl ?? null,
    })
  }
  for (const slot of playInSlots) {
    if (slot.winner) {
      pickDetails.push({
        name: slot.winner.name,
        seed: (slot.winner as any).seed ?? slot.seed,
        region: (slot.winner as any).region ?? slot.region ?? "",
        logoUrl: (slot.winner as any).logoUrl ?? null,
      })
    } else {
      // Unresolved — show "Team1 / Team2" with both logos
      pickDetails.push({
        name: `${slot.team1.name} / ${slot.team2.name}`,
        seed: slot.seed,
        region: slot.region ?? "",
        logoUrl: slot.team1.logoUrl ?? null,
        logoUrl2: slot.team2.logoUrl ?? null,
      })
    }
  }

  // Compute TPS (bracket-aware)
  const infoMap = new Map<string, TeamBracketInfo>()
  for (const t of effectiveTeams) {
    infoMap.set(t.id, {
      seed: t.seed,
      region: t.region ?? "",
      wins: t.wins ?? 0,
      eliminated: t.eliminated ?? false,
    })
  }
  const { totalPPR } = computeBracketAwarePPR(
    effectiveTeams.map(t => t.id),
    infoMap,
  )
  const currentScore = effectiveTeams.reduce((s, t) => s + t.seed * (t.wins ?? 0), 0)
  const tps = currentScore + totalPPR

  // Compute expected score — include BOTH play-in teams for unresolved slots
  const sbTeamIds: string[] = []
  const teamStates = new Map<string, { wins: number; eliminated: boolean }>()

  for (const t of picked) {
    const espnId = t.espnId ?? t.id
    sbTeamIds.push(espnId)
    teamStates.set(espnId, { wins: t.wins ?? 0, eliminated: t.eliminated ?? false })
  }
  for (const slot of playInSlots) {
    if (slot.winner) {
      const espnId = slot.winner.espnId ?? slot.winner.id
      sbTeamIds.push(espnId)
      teamStates.set(espnId, { wins: (slot.winner as any).wins ?? 0, eliminated: (slot.winner as any).eliminated ?? false })
    } else {
      for (const t of [slot.team1, slot.team2]) {
        const espnId = t.espnId ?? t.id
        sbTeamIds.push(espnId)
        teamStates.set(espnId, { wins: 0, eliminated: false })
      }
    }
  }

  const allZeroWins = effectiveTeams.every(t => (t.wins ?? 0) === 0)
  const preTournament = allZeroWins && !effectiveTeams.some(t => t.eliminated)
  const expectedScore = calculateEntryExpectedScore(sbTeamIds, teamStates, preTournament)

  // Classify archetypes
  const archetypes = classifyArchetypes(
    effectiveTeams.map(t => t.seed),
    effectiveTeams.map(t => t.region ?? ""),
  )

  console.log(`\nMax score: ${tps}`)
  console.log(`Expected score: ${expectedScore?.toFixed(1) ?? "N/A"}`)
  console.log(`Archetypes: ${archetypes.map(a => `${a.emoji} ${a.label}`).join(", ")}`)

  // Send the email
  console.log("\nSending email to srpatel21@gmail.com...")
  const result = await sendEntryConfirmationEmail(
    "srpatel21@gmail.com",
    "Sumeet",
    pickDetails,
    "Test Entry (4 Play-Ins)",
    1,
    tps,
    expectedScore,
    archetypes,
  )
  console.log("Email result:", result)

  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
