/**
 * Recalculate all Entry.expectedScore values using the latest SilverBulletin data
 * and current team states from the database.
 *
 * Usage: npx tsx scripts/recalc-expected-scores.ts
 *
 * This script:
 * 1. Fetches all teams (current wins/eliminated state)
 * 2. Fetches all entries with their picks
 * 3. Resolves play-in picks to their winner
 * 4. Calculates expectedScore using the latest SB version
 * 5. Batch-updates all Entry records
 */

import { PrismaClient } from "@/generated/prisma"
import { calculateEntryExpectedScore } from "../src/lib/silver-bulletin-2026"

const prisma = new PrismaClient()

async function main() {
  console.log("Recalculating expected scores for all entries...\n")

  // 1. Fetch all teams for current state
  const teams = await prisma.team.findMany({
    select: { id: true, seed: true, wins: true, eliminated: true, isPlayIn: true },
  })
  const teamStates = new Map<string, { wins: number; eliminated: boolean }>()
  for (const t of teams) {
    teamStates.set(t.id, { wins: t.wins, eliminated: t.eliminated })
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
          team: { select: { id: true, isPlayIn: true } },
          playInSlot: {
            select: { winner: { select: { id: true } } },
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
      // Resolve picks (handle play-in slots)
      const teamIds: string[] = []
      for (const pick of entry.entryPicks) {
        if (pick.team?.isPlayIn && pick.playInSlot?.winner) {
          teamIds.push(pick.playInSlot.winner.id)
        } else if (pick.teamId && !pick.team?.isPlayIn) {
          teamIds.push(pick.teamId)
        }
      }

      // Calculate using latest SB version (no sbData param = uses default latest)
      const newExpected = calculateEntryExpectedScore(teamIds, teamStates, false)

      if (newExpected !== null && Math.abs(newExpected - entry.expectedScore) > 0.01) {
        await prisma.entry.update({
          where: { id: entry.id },
          data: { expectedScore: newExpected },
        })
        updated++
        if (updated <= 5) {
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
