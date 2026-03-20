/**
 * Backfill all ScoreSnapshot records with expectedScore, expectedRank,
 * maxRank, and floorRank using correct SB version per game.
 *
 * Usage: npx tsx scripts/backfill-snapshots.ts
 *
 * For each completed game (in chronological order):
 * 1. Reconstruct team states (wins/eliminated) at that point
 * 2. Determine the checkpoint for correct SB version
 * 3. Compute expectedScore per entry using historical team states + correct SB version
 * 4. Compute expectedRank from expectedScores
 * 5. Recompute maxRank/floorRank using collision-aware algorithm
 * 6. Update all ScoreSnapshot records for that game
 */

import { PrismaClient } from "@/generated/prisma"
import { PrismaNeon } from "@prisma/adapter-neon"
import { calculateEntryExpectedScore, getSBDataForCheckpoint } from "../src/lib/silver-bulletin-2026"
import { computeCollisionAwareRanks, computeMaxPossibleScore } from "../src/lib/max-possible-score"
import type { TeamBracketInfo } from "../src/lib/bracket-ppr"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const ROUND_TO_CP: Record<number, [number, number] | [number]> = {
  1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8], 5: [9], 6: [10],
}

async function main() {
  console.log("Backfilling ScoreSnapshot records...\n")

  // Get all completed tournament games (non-play-in) in chronological order
  const games = await prisma.tournamentGame.findMany({
    where: { isComplete: true, round: { gte: 1 } },
    select: { id: true, round: true, startTime: true, winnerId: true, team1Id: true, team2Id: true },
    orderBy: { startTime: "asc" },
  })
  console.log(`Found ${games.length} completed games`)

  // Build game → checkpoint map
  const gameToCheckpoint = new Map<string, number>()
  const gamesByRound = new Map<number, typeof games>()
  for (const g of games) {
    if (!gamesByRound.has(g.round)) gamesByRound.set(g.round, [])
    gamesByRound.get(g.round)!.push(g)
  }
  const dateOfStart = (g: { startTime: Date | null }) => {
    if (!g.startTime) return "unknown"
    return g.startTime.toLocaleDateString("en-US", { timeZone: "America/New_York" })
  }
  for (const [round, roundGames] of gamesByRound) {
    const cpIndices = ROUND_TO_CP[round]
    if (!cpIndices) continue
    if (cpIndices.length === 2) {
      const uniqueDates = [...new Set(roundGames.map(dateOfStart))]
      uniqueDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      for (const g of roundGames) {
        gameToCheckpoint.set(g.id, dateOfStart(g) === uniqueDates[0] ? cpIndices[0] : cpIndices[1])
      }
    } else {
      for (const g of roundGames) gameToCheckpoint.set(g.id, cpIndices[0])
    }
  }

  // Get all entries with picks
  const entries = await prisma.entry.findMany({
    where: { draftInProgress: false, entryPicks: { some: {} } },
    select: {
      id: true,
      entryPicks: {
        select: {
          teamId: true,
          team: { select: { id: true, seed: true, region: true, isPlayIn: true } },
          playInSlot: { select: { winner: { select: { id: true, seed: true, region: true } } } },
        },
      },
    },
  })

  // Resolve pick team IDs for each entry
  const entryPickTeamIds = new Map<string, string[]>()
  const entryPickTeamInfo = new Map<string, { teamId: string; seed: number; region: string }[]>()
  for (const entry of entries) {
    const teamIds: string[] = []
    const teamInfos: { teamId: string; seed: number; region: string }[] = []
    for (const pick of entry.entryPicks) {
      if (pick.team?.isPlayIn && pick.playInSlot?.winner) {
        teamIds.push(pick.playInSlot.winner.id)
        teamInfos.push({ teamId: pick.playInSlot.winner.id, seed: pick.playInSlot.winner.seed, region: pick.playInSlot.winner.region })
      } else if (pick.team && !pick.team.isPlayIn) {
        teamIds.push(pick.team.id)
        teamInfos.push({ teamId: pick.team.id, seed: pick.team.seed, region: pick.team.region })
      }
    }
    entryPickTeamIds.set(entry.id, teamIds)
    entryPickTeamInfo.set(entry.id, teamInfos)
  }

  // Process each game chronologically, building up team states
  const teamWins = new Map<string, number>()
  const eliminatedTeams = new Set<string>()

  for (let gi = 0; gi < games.length; gi++) {
    const game = games[gi]
    const checkpoint = gameToCheckpoint.get(game.id) ?? 0

    // Update team states BEFORE computing (this game's result is included)
    if (game.winnerId) {
      teamWins.set(game.winnerId, (teamWins.get(game.winnerId) ?? 0) + 1)
      const loserId = game.team1Id === game.winnerId ? game.team2Id : game.team1Id
      if (loserId) eliminatedTeams.add(loserId)
    }

    // Get snapshots for this game
    const snapshots = await prisma.scoreSnapshot.findMany({
      where: { gameId: game.id },
      select: { id: true, entryId: true, score: true, rank: true },
    })
    if (snapshots.length === 0) continue

    // Build team states at this point
    const teamStates = new Map<string, { wins: number; eliminated: boolean }>()
    for (const [tid, w] of teamWins) {
      teamStates.set(tid, { wins: w, eliminated: eliminatedTeams.has(tid) })
    }
    for (const tid of eliminatedTeams) {
      if (!teamStates.has(tid)) teamStates.set(tid, { wins: 0, eliminated: true })
    }

    // Get SB data for this checkpoint
    const sbData = getSBDataForCheckpoint(checkpoint)

    // Build teamInfoMap for collision-aware ranks
    const teamInfoMap = new Map<string, TeamBracketInfo>()
    for (const entry of entries) {
      const infos = entryPickTeamInfo.get(entry.id) ?? []
      for (const info of infos) {
        if (!teamInfoMap.has(info.teamId)) {
          const state = teamStates.get(info.teamId)
          teamInfoMap.set(info.teamId, {
            seed: info.seed,
            region: info.region,
            wins: state?.wins ?? 0,
            eliminated: state?.eliminated ?? false,
          })
        }
      }
    }

    // Compute expected scores
    const expectedScores = new Map<string, number | null>()
    for (const snap of snapshots) {
      const pickIds = entryPickTeamIds.get(snap.entryId) ?? []
      const es = calculateEntryExpectedScore(pickIds, teamStates, false, sbData)
      expectedScores.set(snap.entryId, es)
    }

    // Compute expected ranks
    const sortedByExpected = [...snapshots].sort((a, b) =>
      (expectedScores.get(b.entryId) ?? 0) - (expectedScores.get(a.entryId) ?? 0)
    )
    const expectedRanks = new Map<string, number>()
    let expRank = 1
    for (let i = 0; i < sortedByExpected.length; i++) {
      if (i > 0 && (expectedScores.get(sortedByExpected[i].entryId) ?? 0) < (expectedScores.get(sortedByExpected[i - 1].entryId) ?? 0)) {
        expRank = i + 1
      }
      expectedRanks.set(sortedByExpected[i].entryId, expRank)
    }

    // Compute collision-aware maxRank/floorRank
    const collisionEntries = snapshots.map(snap => {
      const pickIds = entryPickTeamIds.get(snap.entryId) ?? []
      const maxResult = computeMaxPossibleScore(pickIds, teamInfoMap)
      return {
        entryId: snap.entryId,
        pickTeamIds: pickIds,
        currentScore: snap.score,
        maxPossibleScore: maxResult.maxPossibleScore,
        teamsRemaining: pickIds.filter(tid => !eliminatedTeams.has(tid)).length,
        currentRank: snap.rank,
      }
    })
    const rankResults = computeCollisionAwareRanks(collisionEntries, teamInfoMap)

    // Batch update all snapshots for this game
    let updates = 0
    for (const snap of snapshots) {
      const ranks = rankResults.get(snap.entryId)
      await prisma.scoreSnapshot.update({
        where: { id: snap.id },
        data: {
          expectedScore: expectedScores.get(snap.entryId) ?? null,
          expectedRank: expectedRanks.get(snap.entryId) ?? null,
          maxRank: ranks?.maxRank ?? null,
          floorRank: ranks?.floorRank ?? null,
        },
      })
      updates++
    }

    console.log(`Game ${gi + 1}/${games.length} (${game.id}, cp=${checkpoint}): updated ${updates} snapshots`)
  }

  console.log("\nBackfill complete!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
