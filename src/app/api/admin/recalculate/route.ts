import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { recalculateAllEntryScores } from "@/lib/espn"

/**
 * POST /api/admin/recalculate — Recalculate all team wins from game results
 * and recalculate all entry scores.
 *
 * This is a data recovery tool. Use when:
 * - Wins got double-counted due to the pre-fix bug
 * - Game data was manually corrected
 * - Any data inconsistency is suspected
 *
 * Process:
 * 1. Reset all team wins to 0
 * 2. Count wins from completed TournamentGame records (round > 0)
 * 3. Set eliminated = true for teams that lost
 * 4. Recalculate all entry scores
 */
export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = session.user.role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const startTime = Date.now()

  try {
    // Step 1: Reset all team wins and eliminated status
    await prisma.team.updateMany({
      data: { wins: 0, eliminated: false },
    })

    // Step 2: Get all completed games
    const completedGames = await prisma.tournamentGame.findMany({
      where: { isComplete: true },
      select: {
        round: true,
        winnerId: true,
        team1Id: true,
        team2Id: true,
      },
    })

    // Step 3: Calculate correct wins and eliminated status
    const winCounts: Record<string, number> = {}
    const eliminatedTeams = new Set<string>()

    for (const game of completedGames) {
      if (!game.winnerId || !game.team1Id || !game.team2Id) continue

      // Play-in wins (round 0) don't count for scoring
      if (game.round > 0) {
        winCounts[game.winnerId] = (winCounts[game.winnerId] ?? 0) + 1
      }

      // Loser is eliminated
      const loserId = game.team1Id === game.winnerId ? game.team2Id : game.team1Id
      eliminatedTeams.add(loserId)
    }

    // Step 4: Apply wins in batch
    const winUpdates = Object.entries(winCounts).map(([teamId, wins]) =>
      prisma.team.update({
        where: { id: teamId },
        data: { wins },
      })
    )

    // Step 5: Apply eliminated status
    const elimUpdates = eliminatedTeams.size > 0
      ? [prisma.team.updateMany({
          where: { id: { in: Array.from(eliminatedTeams) } },
          data: { eliminated: true },
        })]
      : []

    await prisma.$transaction([...winUpdates, ...elimUpdates])

    // Step 6: Recalculate all entry scores
    const entryResult = await recalculateAllEntryScores()

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      gamesProcessed: completedGames.length,
      teamsWithWins: Object.keys(winCounts).length,
      teamsEliminated: eliminatedTeams.size,
      entriesRecalculated: entryResult.updated,
      duration,
    })
  } catch (err) {
    return NextResponse.json(
      { error: "Recalculation failed", message: String(err) },
      { status: 500 }
    )
  }
}
