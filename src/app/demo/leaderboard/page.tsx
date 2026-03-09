"use client"

/**
 * Demo Leaderboard — reuses real LeaderboardSample + LeaderboardHistoryChart.
 * Data comes from DemoContext (no API calls).
 */

import { useState, useMemo } from "react"
import { ChevronDown, ChevronUp, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LeaderboardSample, type Optimal8Data } from "@/components/leaderboard/leaderboard-sample"
import { LeaderboardHistoryChart } from "@/components/leaderboard/leaderboard-history-chart"
import { LeaderboardDimensionTabs } from "@/components/leaderboard/leaderboard-dimension-tabs"
import { useDemoContext } from "@/lib/demo-context"
import { computeOptimal8 } from "@/lib/scoring"
import { computeBracketAwarePPR } from "@/lib/bracket-ppr"
import { computeTeamsForPicks, computeStateAtGame } from "@/lib/demo-game-sequence"
import { getTournamentData } from "@/lib/tournament-data"
import { calculateEntryExpectedScore } from "@/lib/silver-bulletin-2025"
import type { TeamBracketInfo } from "@/lib/bracket-ppr"

export default function DemoLeaderboardPage() {
  const {
    leaderboardData,
    leaderboardHistory,
    gameIndex,
    totalGames,
    roundBoundaries,
    currentPersona,
    gameSequence,
    teamsData,
    selectedYear,
    optimal8RollingScores,
    optimal8FinalScores,
  } = useDemoContext()

  const [chartExpanded, setChartExpanded] = useState(true)

  // Build userNames map for the chart legend
  const userNames = Object.fromEntries(
    leaderboardData.map(e => [e.userId, e.name])
  )

  // Current team state for expected score computation
  const teamState = useMemo(
    () => gameIndex >= 0 ? computeStateAtGame(gameSequence, gameIndex) : new Map<string, { wins: number; eliminated: boolean }>(),
    [gameSequence, gameIndex]
  )
  const preTournament = gameIndex < 0

  // ── Optimal 8 (Rolling): best 8 by current score ───────────────────────────
  const optimal8: Optimal8Data | undefined = useMemo(() => {
    const teamInfoMap = new Map<string, TeamBracketInfo>()
    for (const t of teamsData) {
      teamInfoMap.set(t.id, {
        seed: t.seed,
        region: t.region,
        wins: t.wins,
        eliminated: t.eliminated,
      })
    }

    const candidateTeams = teamsData
    if (candidateTeams.length === 0) return undefined

    const result = computeOptimal8(candidateTeams, teamInfoMap)
    if (result.teamIds.length === 0) return undefined

    const picks = result.teamIds
      .map(id => teamsData.find(t => t.id === id))
      .filter(Boolean)
      .map(t => ({
        teamId: t!.id,
        name: t!.name,
        shortName: t!.shortName,
        seed: t!.seed,
        region: t!.region,
        wins: t!.wins,
        eliminated: t!.eliminated,
        logoUrl: t!.logoUrl,
        isPlayIn: t!.isPlayIn,
      }))

    // Compute expected score for these 8 teams
    const expectedScore = calculateEntryExpectedScore(result.teamIds, teamState, preTournament)

    return { score: result.score, ppr: result.ppr, tps: result.tps, picks, expectedScore }
  }, [teamsData, teamState, preTournament])

  // ── Optimal 8 (Final): best 8 knowing ALL results, scored at CURRENT timeline ──
  // Step 1: Determine which team IDs are optimal knowing the full results (computed once)
  const optimal8FinalTeamIds = useMemo(() => {
    if (gameSequence.length === 0) return undefined
    const tournamentData = getTournamentData(selectedYear)
    const finalTeams = computeTeamsForPicks(tournamentData.teams, gameSequence, gameSequence.length - 1)
    if (finalTeams.length === 0) return undefined

    const hindsightInfoMap = new Map<string, TeamBracketInfo>()
    for (const t of finalTeams) {
      hindsightInfoMap.set(t.id, {
        seed: t.seed,
        region: t.region,
        wins: t.wins,
        eliminated: t.eliminated,
      })
    }

    const result = computeOptimal8(finalTeams, hindsightInfoMap)
    if (result.teamIds.length === 0) return undefined

    return result.teamIds
  }, [gameSequence, selectedYear])

  // Step 2: Build Optimal 8 Final data using CURRENT wins + collision-aware TPS
  const optimal8Final: Optimal8Data | undefined = useMemo(() => {
    if (!optimal8FinalTeamIds) return undefined

    // Build current bracket info for these teams
    const bracketInfoMap = new Map<string, TeamBracketInfo>()
    for (const id of optimal8FinalTeamIds) {
      const t = teamsData.find(td => td.id === id)
      if (t) {
        bracketInfoMap.set(id, {
          seed: t.seed,
          region: t.region,
          wins: t.wins,
          eliminated: t.eliminated,
        })
      }
    }

    const picks = optimal8FinalTeamIds
      .map(id => teamsData.find(t => t.id === id))
      .filter(Boolean)
      .map(t => ({
        teamId: t!.id,
        name: t!.name,
        shortName: t!.shortName,
        seed: t!.seed,
        region: t!.region,
        wins: t!.wins,
        eliminated: t!.eliminated,
        logoUrl: t!.logoUrl,
        isPlayIn: t!.isPlayIn,
      }))

    // Current score
    const currentScore = picks.reduce((sum, p) => sum + p.seed * p.wins, 0)

    // Collision-aware PPR at CURRENT timeline point (not fixed)
    const { totalPPR } = computeBracketAwarePPR(optimal8FinalTeamIds, bracketInfoMap)

    // Expected score
    const expectedScore = calculateEntryExpectedScore(optimal8FinalTeamIds, teamState, preTournament)

    return {
      score: currentScore,
      ppr: totalPPR,
      tps: currentScore + totalPPR,
      picks,
      expectedScore,
    }
  }, [optimal8FinalTeamIds, teamsData, teamState, preTournament])

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
      {/* Leaderboard with dimension tabs */}
      <LeaderboardDimensionTabs
        entries={leaderboardData}
        currentUserId={currentPersona.userId}
        teams={teamsData}
        renderLeaderboard={(filteredEntries) => (
          <LeaderboardSample
            entries={filteredEntries}
            currentUserId={currentPersona.userId}
            optimal8={optimal8}
            optimal8Final={optimal8Final}
          />
        )}
      />

      {/* History chart */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Score History
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setChartExpanded(e => !e)}
            >
              {chartExpanded
                ? <><ChevronUp className="h-3.5 w-3.5 mr-1" />Collapse</>
                : <><ChevronDown className="h-3.5 w-3.5 mr-1" />Expand</>
              }
            </Button>
          </div>
        </CardHeader>
        {chartExpanded && (
          <CardContent>
            <LeaderboardHistoryChart
              history={leaderboardHistory}
              gameIndex={gameIndex}
              totalGames={totalGames}
              roundBoundaries={roundBoundaries}
              highlightUserId={currentPersona.userId}
              userNames={userNames}
              gameSequence={gameSequence}
              optimal8RollingScores={optimal8RollingScores}
              optimal8FinalScores={optimal8FinalScores}
            />
          </CardContent>
        )}
      </Card>
    </div>
  )
}
