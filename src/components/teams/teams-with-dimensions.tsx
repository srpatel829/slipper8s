"use client"

/**
 * TeamsWithDimensions — Wraps TeamsTable with LeaderboardDimensionTabs
 * so picker counts update based on the selected dimension filter.
 * Also responds to the timeline: when scrubbed back, overrides team
 * wins/eliminated based on the historical game results at that point.
 */

import { useMemo } from "react"
import { TeamsTable, type TeamRow } from "@/components/teams/teams-table"
import { LeaderboardDimensionTabs } from "@/components/leaderboard/leaderboard-dimension-tabs"
import { useTimeline } from "@/components/layout/timeline-provider"
import type { LeaderboardEntry } from "@/types"

interface UserProfile {
  country: string | null
  state: string | null
  gender: string | null
  favoriteTeam: string | null
  conference: string | null
}

interface TeamsWithDimensionsProps {
  baseTeams: TeamRow[]
  leaderboard: LeaderboardEntry[]
  currentUserId: string
  teams: Array<{ id: string; name: string }>
  userLeagues?: Array<{ id: string; name: string }>
  userProfile?: UserProfile | null
}

export function TeamsWithDimensions({
  baseTeams,
  leaderboard,
  currentUserId,
  teams,
  userLeagues,
  userProfile,
}: TeamsWithDimensionsProps) {
  const timeline = useTimeline()

  // Compute historical team wins/eliminated from timeline position
  const historicalTeamState = useMemo<Record<string, { wins: number; eliminated: boolean }> | null>(() => {
    if (!timeline || timeline.isLive) return null
    const { completedGames, currentGameIndex } = timeline

    // Build state from games up to the current timeline position
    const teamState: Record<string, { wins: number; eliminated: boolean }> = {}
    for (const game of completedGames) {
      if (game.gameIndex > currentGameIndex) break // games are in order
      if (game.winnerId) {
        if (!teamState[game.winnerId]) teamState[game.winnerId] = { wins: 0, eliminated: false }
        teamState[game.winnerId].wins++
      }
      if (game.loserId) {
        if (!teamState[game.loserId]) teamState[game.loserId] = { wins: 0, eliminated: false }
        teamState[game.loserId].eliminated = true
      }
    }
    return teamState
  }, [timeline])

  // Apply historical overrides to base teams when scrubbed back
  const effectiveTeams = useMemo(() => {
    if (!historicalTeamState) return baseTeams
    return baseTeams.map(t => {
      const hist = historicalTeamState[t.id]
      return {
        ...t,
        wins: hist?.wins ?? 0,
        eliminated: hist?.eliminated ?? false,
      }
    })
  }, [baseTeams, historicalTeamState])

  // Pre-tournament if no entries have scores yet (or scrubbed to pre-tournament)
  const isPreTournament = useMemo(() => {
    if (timeline && !timeline.isLive && timeline.currentGameIndex < 0) return true
    return leaderboard.length === 0 || leaderboard.every(e => e.currentScore === 0 && e.tps === 0)
  }, [leaderboard, timeline])

  return (
    <LeaderboardDimensionTabs
      entries={leaderboard}
      currentUserId={currentUserId}
      teams={teams}
      userLeagues={userLeagues}
      userProfile={userProfile}
      renderLeaderboard={(filteredEntries) => {
        // Compute picker counts from filtered entries' picks
        const pickerCounts = new Map<string, number>()
        for (const entry of filteredEntries) {
          for (const pick of entry.picks) {
            pickerCounts.set(pick.teamId, (pickerCounts.get(pick.teamId) ?? 0) + 1)
          }
        }

        const rows: TeamRow[] = effectiveTeams.map(t => ({
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
