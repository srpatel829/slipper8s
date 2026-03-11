"use client"

/**
 * LeaderboardLive — Client wrapper that combines LeaderboardDimensionTabs
 * with LeaderboardSample for the live (non-demo) leaderboard page.
 *
 * Replaces the old LeaderboardTable with the same approved format used in the demo.
 */

import { useState, useCallback, useEffect, useRef } from "react"
import { LeaderboardSample } from "@/components/leaderboard/leaderboard-sample"
import { LeaderboardDimensionTabs } from "@/components/leaderboard/leaderboard-dimension-tabs"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LeaderboardEntry } from "@/types"

interface LeaderboardLiveProps {
  initialData: LeaderboardEntry[]
  currentUserId?: string
  teams: Array<{ id: string; name: string }>
  userLeagues?: Array<{ id: string; name: string }>
}

export function LeaderboardLive({
  initialData,
  currentUserId,
  teams,
  userLeagues,
}: LeaderboardLiveProps) {
  const [entries, setEntries] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/leaderboard")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setEntries(data)
          setLastUpdated(new Date())
        }
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(refresh, 30_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [refresh])

  return (
    <div className="space-y-4">
      {/* Auto-refresh status */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Auto-refreshes every 30s · Last updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Dimension tabs + leaderboard table */}
      <LeaderboardDimensionTabs
        entries={entries}
        currentUserId={currentUserId ?? ""}
        teams={teams}
        userLeagues={userLeagues}
        renderLeaderboard={(filteredEntries) => (
          <LeaderboardSample
            entries={filteredEntries}
            currentUserId={currentUserId}
            isPreTournament={entries.length === 0}
          />
        )}
      />
    </div>
  )
}
