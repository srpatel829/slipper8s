"use client"

/**
 * Demo Leaderboard — reuses real LeaderboardTable + adds LeaderboardHistoryChart.
 * Data comes from DemoContext (no API calls).
 */

import { useState, useMemo } from "react"
import { ChevronDown, ChevronUp, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LeaderboardTable, type Optimal8Data } from "@/components/leaderboard/leaderboard-table"
import { LeaderboardHistoryChart } from "@/components/leaderboard/leaderboard-history-chart"
import { useDemoContext } from "@/lib/demo-context"
import { computeOptimal8 } from "@/lib/scoring"
import { computeTeamsForPicks } from "@/lib/demo-game-sequence"
import { getTournamentData } from "@/lib/tournament-data"
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
  } = useDemoContext()

  const [chartExpanded, setChartExpanded] = useState(true)

  // Build userNames map for the chart legend
  const userNames = Object.fromEntries(
    leaderboardData.map(e => [e.userId, e.name])
  )

  // Compute Optimal 8 from current alive teams
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

    // Pass ALL non-play-in teams — the algorithm handles alive vs eliminated internally
    const candidateTeams = teamsData
    if (candidateTeams.length === 0) return undefined

    const result = computeOptimal8(candidateTeams, teamInfoMap)
    if (result.teamIds.length === 0) return undefined

    // Build pick summaries for the 8 selected teams
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

    return { score: result.score, ppr: result.ppr, tps: result.tps, picks }
  }, [teamsData])

  // Compute Optimal 8 Hindsight: best possible 8 picks knowing ALL results
  const optimal8Hindsight: Optimal8Data | undefined = useMemo(() => {
    if (gameSequence.length === 0) return undefined
    const tournamentData = getTournamentData(selectedYear)
    // Compute teams state at the END of the tournament
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

    const picks = result.teamIds
      .map(id => finalTeams.find(t => t.id === id))
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

    return { score: result.score, ppr: result.ppr, tps: result.tps, picks }
  }, [gameSequence, selectedYear])

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
      {/* Leaderboard table */}
      <LeaderboardTable
        initialData={leaderboardData}
        currentUserId={currentPersona.userId}
        demoMode
        optimal8={optimal8}
        optimal8Hindsight={optimal8Hindsight}
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
            />
          </CardContent>
        )}
      </Card>
    </div>
  )
}
