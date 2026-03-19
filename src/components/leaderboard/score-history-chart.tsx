"use client"

/**
 * ScoreHistoryChart — Live score history for the authenticated leaderboard.
 *
 * Fetches data from /api/scores/history and renders a line chart matching
 * the demo's LeaderboardHistoryChart design:
 *
 * 5 default lines:
 * 1. Optimal 8 (Rolling) — solid blue
 * 2. Optimal 8 (Final/Hindsight) — solid orange (only after tournament)
 * 3. Leader — solid green
 * 4. Median — solid purple
 * 5. Your entries — solid yellow/warm colors (each entry gets distinct color)
 *
 * Solid lines = actual scores at completed checkpoints.
 * Dashed lines = projected optimal trajectory (max possible future score via PPR).
 *
 * Features:
 * - All 11 checkpoint positions shown on X-axis (past + future)
 * - Vertical dashed gridlines at checkpoints only, no horizontal gridlines
 * - "NOW" marker at current checkpoint
 * - Dashed projection lines from current score to max possible score
 * - Player filter dropdown with search and Benchmarks/Players sections
 * - Legend with line style explanation
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

// ─── All 11 checkpoint labels ────────────────────────────────────────────────

const ALL_CHECKPOINT_LABELS = [
  { index: 0, short: "Pre", full: "Pre-Tournament" },
  { index: 1, short: "R64", full: "R64 D1" },
  { index: 2, short: "R64", full: "R64 D2" },
  { index: 3, short: "R32", full: "R32 D1" },
  { index: 4, short: "R32", full: "R32 D2" },
  { index: 5, short: "S16", full: "S16 D1" },
  { index: 6, short: "S16", full: "S16 D2" },
  { index: 7, short: "E8", full: "E8 D1" },
  { index: 8, short: "E8", full: "E8 D2" },
  { index: 9, short: "F4", full: "Final Four" },
  { index: 10, short: "CH", full: "Championship" },
]

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
  projections: (number | null)[]
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
  latestCheckpointIndex: number
  seasonId: string
}

interface LineDef {
  id: string
  label: string
  color: string
  isDefault: boolean
  isBenchmark: boolean
  dataKey: string
  projDataKey: string
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

function ChartTooltip({ active, payload, label, visibleLines, latestCpIndex }: {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?: number
  visibleLines: LineDef[]
  latestCpIndex: number
}) {
  if (!active || !payload || payload.length === 0) return null

  const cpIdx = label ?? 0
  const cpLabel = ALL_CHECKPOINT_LABELS[cpIdx]
  const isPast = cpIdx <= latestCpIndex

  return (
    <div className="bg-popover border border-border/60 rounded-lg shadow-lg text-xs p-3 min-w-[200px]">
      <div className="font-semibold mb-1.5 text-foreground flex items-center gap-2">
        <span>{cpLabel?.full ?? `Checkpoint ${cpIdx}`}</span>
        {!isPast && <span className="text-[10px] text-muted-foreground italic font-normal">(projected)</span>}
      </div>
      {visibleLines.map(line => {
        const actualEntry = payload.find((p: { dataKey: string; value: unknown }) => p.dataKey === line.dataKey && p.value != null)
        const projEntry = payload.find((p: { dataKey: string; value: unknown }) => p.dataKey === line.projDataKey && p.value != null)
        const entry = actualEntry ?? projEntry
        if (!entry) return null
        const isProjected = !actualEntry && !!projEntry
        return (
          <div key={line.id} className="flex items-center justify-between gap-4 py-0.5">
            <div className="flex items-center gap-1.5">
              <span
                className="w-3 h-0.5 inline-block rounded-full"
                style={{
                  backgroundColor: line.color,
                  opacity: isProjected ? 0.5 : 1,
                }}
              />
              <span className={`${isProjected ? "text-muted-foreground/60 italic" : "text-muted-foreground"}`}>
                {line.label}
              </span>
            </div>
            <span className={`font-mono font-semibold ${isProjected ? "text-muted-foreground" : "text-foreground"}`}>
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

    // Benchmarks
    lines.push({
      id: "optimal_rolling",
      label: "Optimal 8 (Rolling)",
      color: COLOR_OPTIMAL_ROLLING,
      isDefault: true,
      isBenchmark: true,
      dataKey: "optimal8",
      projDataKey: "optimal8_proj",
    })

    const hasHindsight = data.optimal8.some(o => o.hindsightOptimal8Score != null)
    if (hasHindsight) {
      lines.push({
        id: "optimal_final",
        label: "Optimal 8 (Final)",
        color: COLOR_OPTIMAL_FINAL,
        isDefault: true,
        isBenchmark: true,
        dataKey: "hindsight",
        projDataKey: "hindsight_proj",
      })
    }

    // Categorize entries
    const entries = Object.values(data.entries)
    const userEntries = entries.filter(e => e.isCurrentUser)
    const leaderEntry = entries.find(e => e.isLeader && !e.isCurrentUser)
    const medianEntry = entries.find(e => e.isMedian && !e.isCurrentUser && !e.isLeader)

    if (leaderEntry) {
      lines.push({
        id: `leader_${leaderEntry.entryId}`,
        label: `Leader (${leaderEntry.name})`,
        color: COLOR_LEADER,
        isDefault: true,
        isBenchmark: false,
        dataKey: leaderEntry.entryId,
        projDataKey: `${leaderEntry.entryId}_proj`,
      })
    }

    if (medianEntry) {
      lines.push({
        id: `median_${medianEntry.entryId}`,
        label: `Median (${medianEntry.name})`,
        color: COLOR_MEDIAN,
        isDefault: true,
        isBenchmark: false,
        dataKey: medianEntry.entryId,
        projDataKey: `${medianEntry.entryId}_proj`,
      })
    }

    userEntries.forEach((entry, i) => {
      const color = USER_ENTRY_COLORS[i % USER_ENTRY_COLORS.length]
      let label = entry.name
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
        projDataKey: `${entry.entryId}_proj`,
      })
    })

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
        projDataKey: `${entry.entryId}_proj`,
      })
      colorIdx++
    }

    return lines
  }, [data])

  // Build chart data across ALL 11 checkpoint positions
  const { chartData, isComplete } = useMemo(() => {
    if (!data) return { chartData: [], isComplete: true }

    const latestCpIdx = data.latestCheckpointIndex ?? -1
    const complete = latestCpIdx >= 10

    // Build a map of checkpoint gameIndex → index in the API's checkpoint array
    const cpDataMap = new Map<number, number>()
    for (let i = 0; i < data.checkpoints.length; i++) {
      cpDataMap.set(data.checkpoints[i].gameIndex, i)
    }

    // Create data points for all 11 checkpoint positions
    const points: Record<string, number | string | null>[] = ALL_CHECKPOINT_LABELS.map(cpDef => {
      const point: Record<string, number | string | null> = {
        index: cpDef.index,
        label: cpDef.full,
      }

      const dataIdx = cpDataMap.get(cpDef.index)
      const isActual = cpDef.index <= latestCpIdx
      const isProjection = cpDef.index >= latestCpIdx

      // Entry scores: actual (solid) and projected (dashed)
      for (const [entryId, entry] of Object.entries(data.entries)) {
        if (isActual && dataIdx !== undefined) {
          const snapshot = entry.snapshots[dataIdx]
          point[entryId] = snapshot?.score ?? null
        } else {
          point[entryId] = null
        }

        // Projection data from the API
        if (isProjection && entry.projections) {
          point[`${entryId}_proj`] = entry.projections[cpDef.index] ?? null
        } else {
          point[`${entryId}_proj`] = null
        }
      }

      // Optimal 8 lines
      if (dataIdx !== undefined) {
        const opt = data.optimal8[dataIdx]
        point.optimal8 = isActual ? (opt?.rollingOptimal8Score ?? null) : null
        point.hindsight = isActual ? (opt?.hindsightOptimal8Score ?? null) : null
      } else {
        point.optimal8 = null
        point.hindsight = null
      }
      // No projection for optimal 8 benchmarks (they're computed from actual game results)
      point.optimal8_proj = null
      point.hindsight_proj = null

      return point
    })

    return { chartData: points, isComplete: complete }
  }, [data])

  // Visible line state
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() =>
    new Set(allLines.filter(l => l.isDefault).map(l => l.id))
  )

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
        No game results yet — check back when the tournament starts
      </div>
    )
  }

  const latestCpIdx = data.latestCheckpointIndex ?? 0

  // Compute y-axis max from visible lines (both actual and projected)
  const yMax = Math.max(
    ...chartData.flatMap((d) =>
      visibleLines.flatMap(line => {
        const v1 = d[line.dataKey]
        const v2 = d[line.projDataKey]
        return [
          typeof v1 === "number" ? v1 : 0,
          typeof v2 === "number" ? v2 : 0,
        ]
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
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          {visibleLines.map(line => (
            <div key={line.id} className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 rounded-full inline-block" style={{ backgroundColor: line.color }} />
              <span className="text-muted-foreground">{line.label}</span>
            </div>
          ))}
        </div>
        {/* Line style legend */}
        {!isComplete && (
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 rounded-full inline-block bg-foreground/40" />
              <span>Solid = actual score</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0 inline-block border-t border-dashed border-foreground/40" />
              <span>Dashed = optimal trajectory</span>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-2 sm:p-4">
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 30, left: 5 }}>

            {/* Vertical dashed gridlines at each checkpoint position */}
            {ALL_CHECKPOINT_LABELS.map(cp => (
              <ReferenceLine
                key={`grid-${cp.index}`}
                x={cp.index}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="3 3"
              />
            ))}

            {/* "NOW" marker at the latest checkpoint */}
            {!isComplete && (
              <ReferenceLine
                x={latestCpIdx}
                stroke={COLOR_OPTIMAL_ROLLING}
                strokeOpacity={0.4}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                label={{
                  value: "NOW",
                  position: "top",
                  fill: COLOR_OPTIMAL_ROLLING,
                  fontSize: 9,
                  fontWeight: 600,
                }}
              />
            )}

            <XAxis
              dataKey="index"
              type="number"
              domain={[0, 10]}
              ticks={ALL_CHECKPOINT_LABELS.map(c => c.index)}
              tick={{ fontSize: 9, fill: "currentColor", fillOpacity: 0.5 }}
              tickFormatter={(v: number) => ALL_CHECKPOINT_LABELS[v]?.short ?? ""}
              tickLine={false}
              axisLine={{ strokeOpacity: 0.2 }}
              interval={0}
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
                  latestCpIndex={latestCpIdx}
                />
              }
              cursor={{ stroke: "currentColor", strokeOpacity: 0.1 }}
            />

            {/* === ACTUAL SCORES (solid lines) === */}
            {visibleLines.map(line => (
              <Line
                key={`actual-${line.id}`}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.color}
                strokeWidth={line.isDefault ? 2 : 1.5}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0, fill: line.color }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}

            {/* === PROJECTED TRAJECTORIES (dashed lines) === */}
            {!isComplete && visibleLines.map(line => (
              <Line
                key={`proj-${line.id}`}
                type="monotone"
                dataKey={line.projDataKey}
                stroke={line.color}
                strokeWidth={line.isDefault ? 1.5 : 1}
                strokeDasharray="6 3"
                strokeOpacity={0.5}
                dot={false}
                activeDot={{ r: 2, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats footer */}
      <div className="text-xs text-muted-foreground">
        {data.checkpoints.length} checkpoints completed | {visibleLines.length} lines visible
      </div>
    </div>
  )
}
