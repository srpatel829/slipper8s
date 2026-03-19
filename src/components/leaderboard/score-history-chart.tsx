"use client"

/**
 * ScoreHistoryChart — Live score history for the authenticated leaderboard.
 *
 * Fetches data from /api/scores/history and renders a line chart matching
 * the demo's LeaderboardHistoryChart design:
 *
 * 5 default lines (all solid — actual scores):
 * 1. Optimal 8 (Rolling) — solid blue
 * 2. Optimal 8 (Final/Hindsight) — solid orange (only after tournament)
 * 3. Leader — solid green
 * 4. Median — solid purple
 * 5. Your entries — solid yellow/warm colors (each entry gets distinct color)
 *
 * Dashed lines are reserved for projected optimal trajectories (future max score).
 *
 * Features:
 * - Vertical dashed gridlines at checkpoints only, no horizontal gridlines
 * - Player filter dropdown with search and Benchmarks/Players sections
 * - Legend with color swatches
 * - Multiple user entries each get distinct warm colors
 */

import { useEffect, useState, useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { Check, ChevronDown, Loader2, Search } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

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

interface LineDef {
  id: string
  label: string
  color: string
  isDefault: boolean
  isBenchmark: boolean
  dataKey: string
}

// ─── Colors (matching demo) ──────────────────────────────────────────────────

const COLOR_OPTIMAL_ROLLING = "#00A9E0"  // brand blue
const COLOR_OPTIMAL_FINAL = "#f97316"    // orange
const COLOR_LEADER = "#22c55e"           // green
const COLOR_MEDIAN = "#a78bfa"           // purple

// Warm palette for user entries (multiple entries)
const USER_ENTRY_COLORS = [
  "#facc15",  // yellow
  "#fb923c",  // orange
  "#f472b6",  // pink
  "#2dd4bf",  // teal
]

const OTHER_PLAYER_PALETTE = [
  "#818cf8", "#4ade80", "#e879f9", "#94a3b8",
]

// ─── Player Filter Dropdown with Search ──────────────────────────────────────

function PlayerFilter({ allLines, visibleIds, onToggle }: {
  allLines: LineDef[]
  visibleIds: Set<string>
  onToggle: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const benchmarkLines = allLines.filter(l => l.isBenchmark)
  const playerLines = allLines.filter(l => !l.isBenchmark)

  const filteredPlayers = search.trim()
    ? playerLines.filter(l => l.label.toLowerCase().includes(search.toLowerCase()))
    : playerLines

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch("") }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
          Players ({visibleIds.size})
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        {/* Search input */}
        <div className="px-3 pt-2 pb-1.5 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-xs bg-muted/50 rounded border border-border/50 outline-none focus:border-primary/50 transition-colors"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {/* Benchmarks section (hidden when searching) */}
          {!search.trim() && (
            <>
              <div className="px-3 pt-2 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Benchmarks</span>
              </div>
              {benchmarkLines.map(line => (
                <button
                  key={line.id}
                  className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => onToggle(line.id)}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    visibleIds.has(line.id) ? "bg-primary border-primary" : "border-border"
                  }`}>
                    {visibleIds.has(line.id) && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                  </div>
                  <span
                    className="w-3 h-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: line.color }}
                  />
                  <span className="text-xs">{line.label}</span>
                </button>
              ))}
              {filteredPlayers.length > 0 && <div className="border-t border-border/50 my-1" />}
            </>
          )}

          {/* Players section */}
          {filteredPlayers.length > 0 && (
            <>
              <div className="px-3 pt-1 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Players{search.trim() ? ` (${filteredPlayers.length})` : ""}
                </span>
              </div>
              {filteredPlayers.map(line => (
                <button
                  key={line.id}
                  className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => onToggle(line.id)}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    visibleIds.has(line.id) ? "bg-primary border-primary" : "border-border"
                  }`}>
                    {visibleIds.has(line.id) && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                  </div>
                  <span
                    className="w-3 h-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: line.color }}
                  />
                  <span className="text-xs truncate">{line.label}</span>
                </button>
              ))}
            </>
          )}

          {search.trim() && filteredPlayers.length === 0 && (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              No players found
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, visibleLines, checkpoints }: {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?: number
  visibleLines: LineDef[]
  checkpoints: Checkpoint[]
}) {
  if (!active || !payload || payload.length === 0) return null

  const cpIdx = label ?? 0
  const cp = checkpoints[cpIdx]

  return (
    <div className="bg-popover border border-border/60 rounded-lg shadow-lg text-xs p-3 min-w-[200px]">
      <div className="font-semibold mb-1.5 text-foreground">
        {cp?.roundLabel ?? `Checkpoint ${cpIdx}`}
      </div>
      {visibleLines.map(line => {
        const entry = payload.find((p: { dataKey: string; value: unknown }) => p.dataKey === line.dataKey && p.value != null)
        if (!entry) return null
        return (
          <div key={line.id} className="flex items-center justify-between gap-4 py-0.5">
            <div className="flex items-center gap-1.5">
              <span
                className="w-3 h-0.5 inline-block rounded-full"
                style={{ backgroundColor: line.color }}
              />
              <span className="text-muted-foreground">{line.label}</span>
            </div>
            <span className="font-mono font-semibold text-foreground">
              {Math.round(entry.value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

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

  // Build line definitions
  const allLines = useMemo(() => {
    if (!data) return [] as LineDef[]

    const lines: LineDef[] = []

    // Benchmarks — solid lines (these ARE actual scores, not projections)
    lines.push({
      id: "optimal_rolling",
      label: "Optimal 8 (Rolling)",
      color: COLOR_OPTIMAL_ROLLING,
      isDefault: true,
      isBenchmark: true,
      dataKey: "optimal8",
    })

    // Check if any hindsight data exists
    const hasHindsight = data.optimal8.some(o => o.hindsightOptimal8Score != null)
    if (hasHindsight) {
      lines.push({
        id: "optimal_final",
        label: "Optimal 8 (Final)",
        color: COLOR_OPTIMAL_FINAL,
        isDefault: true,
        isBenchmark: true,
        dataKey: "hindsight",
      })
    }

    // Categorize entries: find leader, median, user entries
    const entries = Object.values(data.entries)
    const userEntries = entries.filter(e => e.isCurrentUser)
    const leaderEntry = entries.find(e => e.isLeader && !e.isCurrentUser)
    const medianEntry = entries.find(e => e.isMedian && !e.isCurrentUser && !e.isLeader)

    // Leader
    if (leaderEntry) {
      lines.push({
        id: `leader_${leaderEntry.entryId}`,
        label: `Leader (${leaderEntry.name})`,
        color: COLOR_LEADER,
        isDefault: true,
        isBenchmark: false,
        dataKey: leaderEntry.entryId,
      })
    }

    // Median
    if (medianEntry) {
      lines.push({
        id: `median_${medianEntry.entryId}`,
        label: `Median (${medianEntry.name})`,
        color: COLOR_MEDIAN,
        isDefault: true,
        isBenchmark: false,
        dataKey: medianEntry.entryId,
      })
    }

    // User entries — each gets a distinct color
    userEntries.forEach((entry, i) => {
      const color = USER_ENTRY_COLORS[i % USER_ENTRY_COLORS.length]
      let label = entry.name
      // If user is also leader or median, note it
      if (entry.isLeader) label = `You / Leader (${entry.name})`
      else if (entry.isMedian) label = `You / Median (${entry.name})`
      else label = userEntries.length > 1 ? `You: ${entry.name}` : `You (${entry.name})`

      lines.push({
        id: `you_${entry.entryId}`,
        label,
        color,
        isDefault: true,
        isBenchmark: false,
        dataKey: entry.entryId,
      })
    })

    // Other non-special entries
    const specialIds = new Set([
      leaderEntry?.entryId,
      medianEntry?.entryId,
      ...userEntries.map(e => e.entryId),
    ].filter(Boolean) as string[])

    let colorIdx = 0
    for (const entry of entries) {
      if (specialIds.has(entry.entryId)) continue
      lines.push({
        id: entry.entryId,
        label: entry.name,
        color: OTHER_PLAYER_PALETTE[colorIdx % OTHER_PLAYER_PALETTE.length],
        isDefault: false,
        isBenchmark: false,
        dataKey: entry.entryId,
      })
      colorIdx++
    }

    return lines
  }, [data])

  // Build chart data from checkpoints
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

      // Add optimal 8 lines
      const opt = data.optimal8[i]
      point.optimal8 = opt?.rollingOptimal8Score ?? null
      point.hindsight = opt?.hindsightOptimal8Score ?? null

      return point
    })
  }, [data])

  // Visible line state
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() =>
    new Set(allLines.filter(l => l.isDefault).map(l => l.id))
  )

  // Re-sync when allLines changes
  const effectiveVisibleIds = useMemo(() => {
    const result = new Set<string>()
    for (const line of allLines) {
      if (line.isDefault) {
        result.add(line.id)
      } else if (visibleIds.has(line.id)) {
        result.add(line.id)
      }
    }
    return result
  }, [allLines, visibleIds])

  const visibleLines = useMemo(
    () => allLines.filter(l => effectiveVisibleIds.has(l.id)),
    [allLines, effectiveVisibleIds]
  )

  const handleToggle = (id: string) => {
    setVisibleIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Loading state
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
          ? "No game results yet \u2014 check back when the tournament starts"
          : "Could not load score history"}
      </div>
    )
  }

  if (data.checkpoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No game results yet \u2014 check back when the tournament starts
      </div>
    )
  }

  // Compute y-axis max from visible lines only
  const yMax = Math.max(
    ...chartData.flatMap((d) =>
      visibleLines.map(line => {
        const v = d[line.dataKey]
        return typeof v === "number" ? v : 0
      })
    ),
    10
  )

  return (
    <div className="space-y-3">
      {/* Header with player filter */}
      <div className="flex items-center justify-between">
        <div /> {/* Spacer */}
        <PlayerFilter allLines={allLines} visibleIds={effectiveVisibleIds} onToggle={handleToggle} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        {visibleLines.map(line => (
          <div key={line.id} className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 rounded-full inline-block" style={{ backgroundColor: line.color }} />
            <span className="text-muted-foreground">{line.label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-2 sm:p-4">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 5 }}>

            {/* Vertical dashed gridlines at each checkpoint (no horizontal gridlines) */}
            {data.checkpoints.map((cp, i) => (
              <ReferenceLine
                key={cp.id}
                x={i}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="3 3"
              />
            ))}

            {/* "NOW" marker at the latest checkpoint */}
            {data.checkpoints.length > 0 && (
              <ReferenceLine
                x={data.checkpoints.length - 1}
                stroke="#00A9E0"
                strokeOpacity={0.4}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                label={{
                  value: "NOW",
                  position: "top",
                  fill: "#00A9E0",
                  fontSize: 9,
                  fontWeight: 600,
                }}
              />
            )}

            <XAxis
              dataKey="index"
              type="number"
              domain={[0, Math.max(chartData.length - 1, 1)]}
              tick={{ fontSize: 10, fill: "currentColor", fillOpacity: 0.5 }}
              tickFormatter={(v: number) => {
                const cp = data.checkpoints[v]
                if (!cp) return ""
                // Shorten labels for display
                const label = cp.roundLabel
                if (label.includes("Pre")) return "Pre"
                if (label.includes("64")) return label.includes("D1") ? "R64" : "R64"
                if (label.includes("32")) return label.includes("D1") ? "R32" : "R32"
                if (label.includes("16")) return label.includes("D1") ? "S16" : "S16"
                if (label.includes("8")) return label.includes("D1") ? "E8" : "E8"
                if (label.includes("Four")) return "F4"
                if (label.includes("Champ")) return "CH"
                return label.substring(0, 4)
              }}
              tickLine={false}
              axisLine={{ strokeOpacity: 0.2 }}
            />

            <YAxis
              domain={[0, Math.ceil(yMax * 1.1)]}
              tick={{ fontSize: 10, fill: "currentColor", fillOpacity: 0.4 }}
              tickLine={false}
              axisLine={false}
              width={30}
            />

            <Tooltip
              content={
                <ChartTooltip
                  visibleLines={visibleLines}
                  checkpoints={data.checkpoints}
                />
              }
              cursor={{ stroke: "currentColor", strokeOpacity: 0.1 }}
            />

            {/* All lines are solid — dashed is reserved for future projections */}
            {visibleLines.map(line => (
              <Line
                key={line.id}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.color}
                strokeWidth={line.isDefault ? 2 : 1.5}
                dot={false}
                connectNulls
                activeDot={{ r: 3, strokeWidth: 0, fill: line.color }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats footer */}
      <div className="text-xs text-muted-foreground">
        {data.checkpoints.length} checkpoints | {visibleLines.length} lines visible
      </div>
    </div>
  )
}
