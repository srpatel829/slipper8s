"use client"

/**
 * TeamsWithDimensions — Wraps TeamsTable with LeaderboardDimensionTabs
 * so picker counts update based on the selected dimension filter.
 */

import { useMemo } from "react"
import { TeamsTable, type TeamRow } from "@/components/teams/teams-table"
import { LeaderboardDimensionTabs } from "@/components/leaderboard/leaderboard-dimension-tabs"
import type { LeaderboardEntry } from "@/types"

interface TeamsWithDimensionsProps {
  baseTeams: TeamRow[]
  leaderboard: LeaderboardEntry[]
  currentUserId: string
  teams: Array<{ id: string; name: string }>
}

export function TeamsWithDimensions({
  baseTeams,
  leaderboard,
  currentUserId,
  teams,
}: TeamsWithDimensionsProps) {
  // Pre-tournament if no entries have scores yet
  const isPreTournament = useMemo(
    () => leaderboard.length === 0 || leaderboard.every(e => e.currentScore === 0 && e.tps === 0),
    [leaderboard]
  )

  return (
    <LeaderboardDimensionTabs
      entries={leaderboard}
      currentUserId={currentUserId}
      teams={teams}
      renderLeaderboard={(filteredEntries) => {
        // Compute picker counts from filtered entries' picks
        const pickerCounts = new Map<string, number>()
        for (const entry of filteredEntries) {
          for (const pick of entry.picks) {
            pickerCounts.set(pick.teamId, (pickerCounts.get(pick.teamId) ?? 0) + 1)
          }
        }

        const rows: TeamRow[] = baseTeams.map(t => ({
          ...t,
          pickerCount: pickerCounts.get(t.id) ?? 0,
        }))

        return (
          <TeamsTable
            teams={rows}
            totalEntries={filteredEntries.length}
            isPreTournament={isPreTournament}
          />
        )
      }}
    />
  )
}
