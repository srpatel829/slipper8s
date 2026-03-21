/**
 * Recalculate all Entry.expectedScore values using the latest SilverBulletin data
 * and current team states from the database.
 *
 * Usage: npx tsx scripts/recalc-expected-scores.ts
 *
 * This script:
 * 1. Fetches all teams (current wins/eliminated state) keyed by espnId
 * 2. Fetches all entries with their picks (resolving play-in slots)
 * 3. Calculates expectedScore using the latest SB version
 * 4. Batch-updates all Entry records where score changed
 */

import dotenv from "dotenv"
dotenv.config({ path: ".env" })

import { PrismaNeon } from "@prisma/adapter-neon"
import { PrismaClient } from "@/generated/prisma"
import { calculateEntryExpectedScore } from "../src/lib/silver-bulletin-2026"

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as never)

async function main() {
  console.log("Recalculating expected scores for all entries...\n")

  // 1. Fetch all teams — build espnId-keyed state map (SB uses espnIds)
  const teams = await prisma.team.findMany({
    select: { id: true, espnId: true, wins: true, eliminated: true, isPlayIn: true },
  })
  // DB id → espnId lookup
  const dbIdToEspnId = new Map<string, string>()
  // espnId-keyed team states for SB calculation
  const teamStates = new Map<string, { wins: number; eliminated: boolean }>()
  for (const t of teams) {
    dbIdToEspnId.set(t.id, t.espnId)
    teamStates.set(t.espnId, { wins: t.wins, eliminated: t.eliminated })
  }
  console.log(`Loaded ${teams.length} teams`)

  // 2. Fetch all entries with picks
  const entries = await prisma.entry.findMany({
    where: { draftInProgress: false },
    select: {
      id: true,
      expectedScore: true,
      entryPicks: {
        select: {
          teamId: true,
          team: { select: { id: true, espnId: true, isPlayIn: true } },
          playInSlot: {
            select: {
              winner: { select: { id: true, espnId: true } },
              team1: { select: { id: true, espnId: true } },
              team2: { select: { id: true, espnId: true } },
            },
          },
        },
      },
    },
  })
  console.log(`Found ${entries.length} entries to recalculate\n`)

  // 3. Calculate and update
  let updated = 0
  let unchanged = 0
  let errors = 0

  for (const entry of entries) {
    try {
      // Resolve picks to espnIds (matching how the picks API does it)
      const sbTeamIds: string[] = []
      for (const pick of entry.entryPicks) {
        if (!pick.teamId && pick.playInSlot?.winner) {
          // Pick via playInSlotId (teamId is null) — use winner's espnId
          sbTeamIds.push(pick.playInSlot.winner.espnId)
        } else if (pick.team?.isPlayIn && pick.playInSlot?.winner) {
          // Play-in team pick with resolved winner
          sbTeamIds.push(pick.playInSlot.winner.espnId)
        } else if (pick.team && !pick.team.isPlayIn) {
          // Regular team pick
          sbTeamIds.push(pick.team.espnId)
        }
      }

      // Calculate using latest SB version (no sbData param = uses default latest)
      const newExpected = calculateEntryExpectedScore(sbTeamIds, teamStates, false)

      if (newExpected !== null && Math.abs(newExpected - entry.expectedScore) > 0.01) {
        await prisma.entry.update({
          where: { id: entry.id },
          data: { expectedScore: newExpected },
        })
        updated++
        if (updated <= 10) {
          console.log(`  Entry ${entry.id}: ${entry.expectedScore.toFixed(1)} → ${newExpected.toFixed(1)}`)
        }
      } else {
        unchanged++
      }
    } catch (err) {
      errors++
      console.error(`  Error on entry ${entry.id}:`, err)
    }
  }

  console.log(`\nDone!`)
  console.log(`  Updated: ${updated}`)
  console.log(`  Unchanged: ${unchanged}`)
  console.log(`  Errors: ${errors}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
