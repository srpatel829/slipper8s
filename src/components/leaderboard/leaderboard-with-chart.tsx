"use client"

/**
 * LeaderboardWithChart — Client wrapper that lifts dimension-filter state
 * between LeaderboardLive and ScoreHistorySection so the chart's
 * leader/median respond to the active leaderboard filter (country,
 * state, gender, fanbase, conference, league, etc.).
 */

import { useState, useCallback } from "react"
import { LeaderboardLive, type UserProfile } from "@/components/leaderboard/leaderboard-live"
import { ScoreHistorySection } from "@/components/leaderboard/score-history-section"
import type { LeaderboardEntry } from "@/types"
import type { Optimal8Data } from "@/components/leaderboard/leaderboard-sample"

interface LeaderboardWithChartProps {
  initialData: LeaderboardEntry[]
  currentUserId?: string
  teams: Array<{ id: string; name: string }>
  userLeagues?: Array<{ id: string; name: string }>
  optimal8?: Optimal8Data
  userProfile?: UserProfile | null
}

export function LeaderboardWithChart({
  initialData,
  currentUserId,
  teams,
  userLeagues,
  optimal8,
  userProfile,
}: LeaderboardWithChartProps) {
  const [filteredEntryIds, setFilteredEntryIds] = useState<Set<string> | undefined>(undefined)

  const handleFilterChange = useCallback((ids: Set<string>) => {
    setFilteredEntryIds(ids)
  }, [])

  return (
    <>
      <LeaderboardLive
        initialData={initialData}
        currentUserId={currentUserId}
        teams={teams}
        userLeagues={userLeagues}
        optimal8={optimal8}
        userProfile={userProfile}
        onFilterChange={handleFilterChange}
      />

      {/* Score history chart — collapsible */}
      <ScoreHistorySection filteredEntryIds={filteredEntryIds} />
    </>
  )
}
