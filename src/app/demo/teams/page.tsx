"use client"

import { useMemo } from "react"
import { useDemoContext } from "@/lib/demo-context"
import { TeamsTable, type TeamRow } from "@/components/teams/teams-table"
import { LeaderboardDimensionTabs } from "@/components/leaderboard/leaderboard-dimension-tabs"

export default function DemoTeamsPage() {
  const { teamsData, demoUserPicks, leaderboardData, currentPersona, gameIndex } = useDemoContext()

  // Base team rows (without picker counts — those depend on dimension filter)
  const baseRows = useMemo(() => {
    return teamsData
      .filter(t => !t.isPlayIn)
      .map(t => ({
        id: t.id,
        name: t.name,
        shortName: t.shortName,
        seed: t.seed,
        region: t.region,
        eliminated: t.eliminated,
        wins: t.wins,
        logoUrl: t.logoUrl,
        conference: (t as Record<string, unknown>).conference as string ?? null,
        pickerCount: 0, // will be overridden per dimension
      }))
  }, [teamsData])

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tournament Teams</h1>
        <p className="text-muted-foreground text-sm mt-1">
          All {baseRows.length} teams · Default sort: % Selected
        </p>
      </div>

      {/* Dimension tabs filter which entries count toward "% Selected" */}
      <LeaderboardDimensionTabs
        entries={leaderboardData}
        currentUserId={currentPersona.userId}
        teams={teamsData}
        renderLeaderboard={(filteredEntries) => {
          // Compute picker counts from only the filtered users
          const filteredIds = new Set(filteredEntries.map(e => e.userId))
          const pickerCounts = new Map<string, number>()
          for (const [userId, picks] of demoUserPicks) {
            if (filteredIds.has(userId)) {
              for (const teamId of picks) {
                pickerCounts.set(teamId, (pickerCounts.get(teamId) ?? 0) + 1)
              }
            }
          }

          const rows: TeamRow[] = baseRows.map(r => ({
            ...r,
            pickerCount: pickerCounts.get(r.id) ?? 0,
          }))

          return <TeamsTable teams={rows} totalEntries={filteredIds.size} isPreTournament={gameIndex < 0} />
        }}
      />
    </div>
  )
}
