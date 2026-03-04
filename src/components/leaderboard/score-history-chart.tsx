"use client"

/**
 * ScoreHistoryChart — Live score history for the authenticated leaderboard.
 *
 * Fetches data from /api/scores/history and renders a line chart showing:
 * - User's entries (highlighted)
 * - Current leader
 * - Median player
 * - Optimal 8 (rolling) — dashed line
 *
 * CLAUDE.md spec default lines:
 * 1. Optimal 8 (Rolling) — dashed
 * 2. Leader — current best player
 * 3. Your entry — logged in player
 * 4. Median — middle player
 */

import { useEffect, useState, useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Checkpoint {
  id: string
  gameIndex: number
  roundLabel: string
  isSession: boolean
  createdAt: string
}

interface EntrySnapshot {
  score: number
  rank: number
  percentile: number
  gameId: string | null
  round: number | null
  savedAt: string
}

interface EntryHistory {
  entryId: string
  name: string
  isCurrentUser: boolean
  isLeader: boolean
  isMedian: boolean
  snapshots: EntrySnapshot[]
}

interface Optimal8Point {
  checkpointId: string
  gameIndex: number
  roundLabel: string
  rollingOptimal8Score: number | null
  hindsightOptimal8Score: number | null
}

interface ScoreHistoryData {
  checkpoints: Checkpoint[]
  entries: Record<string, EntryHistory>
  optimal8: Optimal8Point[]
  seasonId: string
}

// ─── Colors ────────────────────────────────────────────────────────────────────

const COLORS = {
  user: "#f97316",      // Orange — your entry
  leader: "#60a5fa",    // Blue — leader
  median: "#94a3b8",    // Slate — median
  optimal8: "#22d3ee",  // Cyan — optimal 8 rolling
  hindsight: "#a78bfa", // Purple — optimal 8 hindsight
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScoreHistoryChart() {
  const [data, setData] = useState<ScoreHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/scores/history")
        if (!res.ok) throw new Error("Failed to fetch score history")
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  // Build chart data from checkpoints and entry snapshots
  const chartData = useMemo(() => {
    if (!data) return []

    return data.checkpoints.map((cp, i) => {
      const point: Record<string, number | string | null> = {
        index: i,
        label: cp.roundLabel,
      }

      // Add entry scores at this checkpoint
      for (const [entryId, entry] of Object.entries(data.entries)) {
        const snapshot = entry.snapshots[i]
        point[entryId] = snapshot?.score ?? null
      }

      // Add optimal 8 line
      const opt = data.optimal8[i]
      point.optimal8 = opt?.rollingOptimal8Score ?? null
      point.hindsight = opt?.hindsightOptimal8Score ?? null

      return point
    })
  }, [data])

  // Categorize entries for coloring
  const lineConfig = useMemo(() => {
    if (!data) return []

    const configs: Array<{
      key: string
      name: string
      color: string
      width: number
      opacity: number
      dash?: string
    }> = []

    for (const [entryId, entry] of Object.entries(data.entries)) {
      let color = "#6b7280" // default gray
      let width = 1.5
      let opacity = 0.5

      if (entry.isCurrentUser) {
        color = COLORS.user
        width = 2.5
        opacity = 1
      } else if (entry.isLeader) {
        color = COLORS.leader
        width = 2
        opacity = 0.8
      } else if (entry.isMedian) {
        color = COLORS.median
        width = 1.5
        opacity = 0.5
      }

      configs.push({
        key: entryId,
        name: entry.name,
        color,
        width,
        opacity,
      })
    }

    return configs
  }, [data])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading score history...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        {data?.checkpoints?.length === 0
          ? "No game results yet — check back when the tournament starts"
          : "Could not load score history"}
      </div>
    )
  }

  if (data.checkpoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No game results yet — check back when the tournament starts
      </div>
    )
  }

  // Compute y-axis max
  const yMax = Math.max(
    ...chartData.flatMap((d) =>
      Object.entries(d)
        .filter(([k]) => k !== "index" && k !== "label")
        .map(([, v]) => (typeof v === "number" ? v : 0))
    ),
    10
  )

  // Custom tooltip
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; color: string; dataKey: string }>
    label?: number
  }) => {
    if (!active || !payload?.length) return null
    const cp = data.checkpoints[label ?? 0]

    return (
      <div className="bg-popover border border-border/60 rounded-lg px-3 py-2 shadow-lg text-xs max-w-[220px]">
        <p className="font-semibold mb-1.5 text-muted-foreground">{cp?.roundLabel ?? `Checkpoint ${label}`}</p>
        {[...payload]
          .filter((p) => p.value != null)
          .sort((a, b) => b.value - a.value)
          .map((p) => {
            const entry = Object.values(data.entries).find((e) => e.entryId === p.dataKey)
            const displayName =
              p.dataKey === "optimal8"
                ? "Optimal 8 (Rolling)"
                : p.dataKey === "hindsight"
                  ? "Optimal 8 (Hindsight)"
                  : entry?.name ?? p.dataKey
            return (
              <div key={p.dataKey} className="flex justify-between gap-3">
                <span style={{ color: p.color }}>{displayName}</span>
                <span className="font-mono font-bold">{p.value}</span>
              </div>
            )
          })}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Chart description */}
      <p className="text-xs text-muted-foreground">
        Score progression through each round checkpoint
      </p>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />

          <XAxis
            dataKey="index"
            type="number"
            domain={[0, Math.max(chartData.length - 1, 1)]}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickFormatter={(v: number) => {
              const cp = data.checkpoints[v]
              return cp?.roundLabel?.split(" ")[0] ?? ""
            }}
          />

          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            width={36}
            domain={[0, Math.ceil(yMax * 1.1)]}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Session checkpoint markers */}
          {data.checkpoints
            .filter((cp) => cp.isSession)
            .map((cp, i) => (
              <ReferenceLine
                key={cp.id}
                x={data.checkpoints.indexOf(cp)}
                stroke="rgba(255,255,255,0.1)"
                strokeDasharray="4 2"
                label={
                  i === 0
                    ? {
                        value: cp.roundLabel,
                        position: "insideTopRight",
                        fill: "#64748b",
                        fontSize: 9,
                      }
                    : undefined
                }
              />
            ))}

          {/* Optimal 8 (Rolling) — dashed cyan line */}
          <Line
            type="monotone"
            dataKey="optimal8"
            stroke={COLORS.optimal8}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            connectNulls
            name="optimal8"
          />

          {/* Optimal 8 (Hindsight) — dashed purple line, only after tournament */}
          <Line
            type="monotone"
            dataKey="hindsight"
            stroke={COLORS.hindsight}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            connectNulls
            name="hindsight"
            opacity={0.6}
          />

          {/* Entry lines */}
          {lineConfig.map((cfg) => (
            <Line
              key={cfg.key}
              type="monotone"
              dataKey={cfg.key}
              stroke={cfg.color}
              strokeWidth={cfg.width}
              strokeOpacity={cfg.opacity}
              strokeDasharray={cfg.dash}
              dot={false}
              connectNulls
              activeDot={{ r: cfg.width > 2 ? 5 : 3, fill: cfg.color }}
              name={cfg.key}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {lineConfig.map((cfg) => {
          const entry = Object.values(data.entries).find((e) => e.entryId === cfg.key)
          return (
            <div key={cfg.key} className="flex items-center gap-1.5">
              <div className="h-2 w-5 rounded-full" style={{ backgroundColor: cfg.color, opacity: cfg.opacity }} />
              <span style={{ color: cfg.color, opacity: Math.max(cfg.opacity, 0.7) }}>
                {entry?.name ?? cfg.key}
                {entry?.isCurrentUser && (
                  <Badge className="ml-1 h-3.5 px-1 text-[9px] bg-primary/20 text-primary border-0">you</Badge>
                )}
                {entry?.isLeader && (
                  <span className="ml-1 text-[9px] text-muted-foreground">(leader)</span>
                )}
                {entry?.isMedian && (
                  <span className="ml-1 text-[9px] text-muted-foreground">(median)</span>
                )}
              </span>
            </div>
          )
        })}
        <div className="flex items-center gap-1.5">
          <div className="h-0 w-5 border-t-2 border-dashed" style={{ borderColor: COLORS.optimal8 }} />
          <span className="text-muted-foreground">Optimal 8 (Rolling)</span>
        </div>
      </div>
    </div>
  )
}
