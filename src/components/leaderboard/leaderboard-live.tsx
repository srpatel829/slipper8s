"use client"

/**
 * LeaderboardLive — Client wrapper that combines LeaderboardDimensionTabs
 * with LeaderboardSample for the live (non-demo) leaderboard page.
 *
 * Supports timeline integration: when the user scrubs back via the timeline,
 * fetches historical leaderboard data. When live, auto-refreshes every 30s.
 */

import { useState, useCallback, useEffect, useRef } from "react"
import { LeaderboardSample, type Optimal8Data } from "@/components/leaderboard/leaderboard-sample"
import { LeaderboardDimensionTabs } from "@/components/leaderboard/leaderboard-dimension-tabs"
import { RefreshCw, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTimeline } from "@/components/layout/timeline-provider"
import { CHECKPOINT_LABELS } from "@/components/layout/timeline-footer"
import type { LeaderboardEntry } from "@/types"

export interface UserProfile {
  country: string | null
  state: string | null
  gender: string | null
  favoriteTeam: string | null
  conference: string | null
}

interface LeaderboardLiveProps {
  initialData: LeaderboardEntry[]
  currentUserId?: string
  teams: Array<{ id: string; name: string }>
  userLeagues?: Array<{ id: string; name: string }>
  optimal8?: Optimal8Data
  userProfile?: UserProfile | null
  /** Callback when dimension filter changes (for chart sync) */
  onFilterChange?: (filteredUserIds: Set<string>) => void
}

export function LeaderboardLive({
  initialData,
  currentUserId,
  teams,
  userLeagues,
  optimal8,
  userProfile,
  onFilterChange,
}: LeaderboardLiveProps) {
  const [liveEntries, setLiveEntries] = useState(initialData)
  const [historicalEntries, setHistoricalEntries] = useState<LeaderboardEntry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const timeline = useTimeline()
  const isLive = timeline?.isLive ?? true
  const currentGameId = timeline?.currentGameId ?? null
  const currentGameIndex = timeline?.currentGameIndex ?? -1
  const currentCheckpoint = timeline?.currentCheckpoint ?? 0

  // Live refresh
  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/leaderboard")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setLiveEntries(data)
          setLastUpdated(new Date())
        }
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-refresh every 30s when live, disable when scrubbed back
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (isLive) {
      intervalRef.current = setInterval(refresh, 30_000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [refresh, isLive])

  // Fetch historical data when scrubbed back
  useEffect(() => {
    if (isLive) {
      setHistoricalEntries(null)
      return
    }

    let cancelled = false

    async function fetchHistorical() {
      setLoading(true)
      try {
        const params = currentGameId
          ? `gameId=${currentGameId}`
          : `gameIndex=${currentGameIndex}`
        const res = await fetch(`/api/leaderboard/historical?${params}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          if (Array.isArray(data)) {
            setHistoricalEntries(data)
          }
        }
      } catch {
        // silent fail
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchHistorical()
    return () => { cancelled = true }
  }, [isLive, currentGameId, currentGameIndex])

  const entries = isLive ? liveEntries : (historicalEntries ?? liveEntries)
  const checkpointLabel = CHECKPOINT_LABELS[currentCheckpoint]?.label ?? "Pre-Tournament"

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        {isLive ? (
          <p className="text-xs text-muted-foreground">
            Auto-refreshes every 30s · Last updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400 bg-amber-500/10 gap-1">
              <Clock className="h-3 w-3" />
              Viewing: {checkpointLabel}
            </Badge>
            {timeline && (
              <span className="text-xs text-muted-foreground">
                Game {currentGameIndex + 1} of 63
              </span>
            )}
          </div>
        )}
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={isLive ? refresh : timeline?.goLive} disabled={loading}>
          {isLive ? (
            <>
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </>
          ) : (
            "Back to Live"
          )}
        </Button>
      </div>

      {/* Dimension tabs + leaderboard table */}
      <LeaderboardDimensionTabs
        entries={entries}
        currentUserId={currentUserId ?? ""}
        teams={teams}
        userLeagues={userLeagues}
        userProfile={userProfile}
        onFilterChange={onFilterChange}
        renderLeaderboard={(filteredEntries) => (
          <LeaderboardSample
            entries={filteredEntries}
            currentUserId={currentUserId}
            optimal8={optimal8}
            isPreTournament={currentGameIndex < 0}
          />
        )}
      />
    </div>
  )
}
