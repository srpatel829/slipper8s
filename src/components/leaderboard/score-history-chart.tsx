"use client"

/**
 * ScoreHistoryChart — Live score history for the authenticated leaderboard.
 *
 * Fetches data from /api/scores/history and renders a line chart.
 *
 * Lines:
 * 1. Optimal 8 (Rolling) — solid blue
 * 2. Optimal 8 (Final/Hindsight) — solid orange (only after tournament)
 * 3. Leader — solid green (dynamic per-game)
 * 4. Median — solid purple (dynamic per-game)
 * 5. Your entries — solid yellow/warm colors
 *
 * Solid lines = actual scores at completed games.
 * Dashed lines = projected optimal trajectory.
 *
 * X-axis = game-level for completed games, checkpoint-level for projections.
 * Full tournament: 63 games (indices 0-62).
 */

import { useEffect, useState, useMemo, useCallback } from "react"
import { useTimeline } from "@/components/layout/timeline-provider"
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

// ─── Checkpoint → game position mapping ──────────────────────────────────────
// Default positions: last game index (0-based) at the end of each checkpoint.
// Used for placing projection points and x-axis major ticks for future checkpoints.

const DEFAULT_CP_GAME_POS: Record<number, number> = {
  0: -1,  // Pre-tournament (virtual position)
  1: 15,  // End of R64 D1 (games 0-15)
  2: 31,  // End of R64 D2 (games 16-31)
  3: 39,  // End of R32 D1 (games 32-39)
  4: 47,  // End of R32 D2 (games 40-47)
  5: 51,  // End of S16 D1 (games 48-51)
  6: 55,  // End of S16 D2 (games 52-55)
  7: 57,  // End of E8 D1 (games 56-57)
  8: 59,  // End of E8 D2 (games 58-59)
  9: 61,  // End of F4 (games 60-61)
  10: 62, // Championship (game 62)
}

const CHECKPOINT_LABELS = [
  "Pre", "R64 D1", "R64 D2", "R32 D1", "R32 D2",
  "S16 D1", "S16 D2", "E8 D1", "E8 D2", "F4", "Champ",
]

// ─── Types ───────────────────────────────────────────────────────────────────

interface EntryHistory {
  entryId: string
  name: string
  isCurrentUser: boolean
  isLeader: boolean
  isMedian: boolean
  scores: (number | null)[]       // length 11, indexed by checkpoint (0-10)
  projections: (number | null)[]  // length 11, indexed by checkpoint (0-10)
}

interface Optimal8Point {
  checkpointIndex: number
  rollingOptimal8Score: number | null
  hindsightOptimal8Score: number | null
  rollingProjection: number | null
}

interface AvailablePlayer {
  id: string
  name: string
}

interface GameMeta {
  gameIndex: number
  gameId: string
  round: number
  checkpoint: number
}

interface CheckpointBoundary {
  checkpoint: number
  label: string
  afterGameIndex: number
}

interface ScoreHistoryData {
  entries: Record<string, EntryHistory>
  optimal8: Optimal8Point[]
  latestCheckpointIndex: number
  seasonId: string
  availablePlayers: AvailablePlayer[]
  // Per-game fields
  games: GameMeta[]
  checkpointBoundaries: CheckpointBoundary[]
  entryGameScores: Record<string, Array<{ gameIndex: number; score: number }>>
  leaderLine: Array<{ gameIndex: number; score: number; entryId: string }>
  medianLine: Array<{ gameIndex: number; score: number }>
  optimal8Line: Array<{ gameIndex: number; score: number }>
  totalGames: number
  latestGameIndex: number
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

// ─── Colors ──────────────────────────────────────────────────────────────────

const COLOR_OPTIMAL_ROLLING = "#00A9E0"  // brand blue
const COLOR_OPTIMAL_FINAL = "#f97316"    // orange
const COLOR_LEADER = "#22c55e"           // green
const COLOR_MEDIAN = "#a78bfa"           // purple

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
                  <span className="w-3 h-0.5 rounded-full shrink-0" style={{ backgroundColor: line.color }} />
                  <span className="text-xs">{line.label}</span>
                </button>
              ))}
              {filteredPlayers.length > 0 && <div className="border-t border-border/50 my-1" />}
            </>
          )}

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
                  <span className="w-3 h-0.5 rounded-full shrink-0" style={{ backgroundColor: line.color }} />
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

function ChartTooltip({ active, payload, label, visibleLines, latestGameIdx, cpBoundaryMap, gameCount }: {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?: number
  visibleLines: LineDef[]
  latestGameIdx: number
  cpBoundaryMap: Map<number, string>
  gameCount: number
}) {
  if (!active || !payload || payload.length === 0) return null

  const gameIdx = label ?? 0
  const isPast = gameIdx <= latestGameIdx
  const cpLabel = cpBoundaryMap.get(gameIdx)

  // Build position label
  let posLabel: string
  if (gameIdx < 0) {
    posLabel = "Pre-Tournament"
  } else if (cpLabel) {
    posLabel = `${cpLabel} (Game ${gameIdx + 1} of ${gameCount})`
  } else if (isPast) {
    posLabel = `Game ${gameIdx + 1} of ${gameCount}`
  } else {
    // Future projection point
    posLabel = cpLabel ?? `Game ${gameIdx + 1}`
  }

  return (
    <div className="bg-popover border border-border/60 rounded-lg shadow-lg text-xs p-3 min-w-[200px]">
      <div className="font-semibold mb-1.5 text-foreground flex items-center gap-2">
        <span>{posLabel}</span>
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
                style={{ backgroundColor: line.color, opacity: isProjected ? 0.5 : 1 }}
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get the game position for a checkpoint, using actual boundaries when available. */
function getCpGamePos(cp: number, boundaries: CheckpointBoundary[]): number {
  const b = boundaries.find(b => b.checkpoint === cp)
  if (b) return b.afterGameIndex
  return DEFAULT_CP_GAME_POS[cp] ?? cp * 6
}

/** Build a full score series for an entry at every game index, filling gaps with previous score. */
function buildFullScoreSeries(
  gameScores: Array<{ gameIndex: number; score: number }>,
  totalGames: number,
  maxGameIdx: number,
): Map<number, number> {
  const scoreMap = new Map<number, number>()
  // Index gameScores by gameIndex
  const snapshotMap = new Map(gameScores.map(s => [s.gameIndex, s.score]))

  let lastScore = 0
  for (let i = 0; i <= maxGameIdx; i++) {
    if (snapshotMap.has(i)) {
      lastScore = snapshotMap.get(i)!
    }
    scoreMap.set(i, lastScore)
  }
  return scoreMap
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface ScoreHistoryChartProps {
  filteredEntryIds?: Set<string>
}

export function ScoreHistoryChart({ filteredEntryIds }: ScoreHistoryChartProps) {
  const [data, setData] = useState<ScoreHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timeline = useTimeline()

  // Build a stable key from filteredEntryIds for the effect dependency
  const filterKey = useMemo(() => {
    if (!filteredEntryIds || filteredEntryIds.size === 0) return ""
    return [...filteredEntryIds].sort().join(",")
  }, [filteredEntryIds])

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true)
        let url = "/api/scores/history"
        if (filterKey) {
          url += `?filterEntryIds=${encodeURIComponent(filterKey)}`
        }
        const res = await fetch(url)
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
  }, [filterKey])

  // Effective game index from timeline — follows timeline when scrubbed
  const effectiveGameIdx = useMemo(() => {
    if (!data) return -1
    if (timeline && !timeline.isLive) {
      // Timeline provides currentGameIndex directly
      return timeline.currentGameIndex ?? data.latestGameIndex
    }
    return data.latestGameIndex
  }, [data, timeline])

  // Build checkpoint boundary map: gameIndex → label for tooltip
  const cpBoundaryMap = useMemo(() => {
    if (!data) return new Map<number, string>()
    const map = new Map<number, string>()
    for (const b of data.checkpointBoundaries) {
      map.set(b.afterGameIndex, b.label)
    }
    return map
  }, [data])

  // Build line definitions
  const allLines = useMemo(() => {
    if (!data) return [] as LineDef[]

    const lines: LineDef[] = []

    // Optimal 8 benchmark
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

    // Identify current leader and median names
    const latestLeaderEntry = data.leaderLine.length > 0
      ? data.leaderLine[data.leaderLine.length - 1] : null
    const leaderName = latestLeaderEntry
      ? (data.entries[latestLeaderEntry.entryId]?.name
        ?? data.availablePlayers.find(p => p.id === latestLeaderEntry.entryId)?.name
        ?? "")
      : ""

    // Find median entry: entry whose score is closest to the median score at latest game
    const allEntriesList = Object.values(data.entries)
    let medianName = ""
    if (data.medianLine.length > 0 && allEntriesList.length > 0) {
      const latestMedianScore = data.medianLine[data.medianLine.length - 1]?.score ?? 0
      let bestDist = Infinity
      for (const entry of allEntriesList) {
        const lastScore = entry.scores[data.latestCheckpointIndex] ?? 0
        const dist = Math.abs(lastScore - latestMedianScore)
        if (dist < bestDist) {
          bestDist = dist
          medianName = entry.name
        }
      }
    }

    // Leader line — dynamic per-game
    lines.push({
      id: "leader",
      label: leaderName ? `Leader (${leaderName})` : "Leader",
      color: COLOR_LEADER,
      isDefault: true,
      isBenchmark: true,
      dataKey: "leader",
      projDataKey: "leader_proj",
    })

    // Median line — dynamic per-game
    lines.push({
      id: "median",
      label: medianName ? `Median (${medianName})` : "Median",
      color: COLOR_MEDIAN,
      isDefault: true,
      isBenchmark: true,
      dataKey: "median",
      projDataKey: "median_proj",
    })

    // User entries
    const entries = Object.values(data.entries)
    const userEntries = entries.filter(e => e.isCurrentUser)
    userEntries.forEach((entry, i) => {
      const color = USER_ENTRY_COLORS[i % USER_ENTRY_COLORS.length]
      const label = userEntries.length > 1 ? `You: ${entry.name}` : `You (${entry.name})`
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

    // Other available players
    const specialIds = new Set(userEntries.map(e => e.entryId))
    let colorIdx = 0
    for (const player of data.availablePlayers ?? []) {
      if (specialIds.has(player.id)) continue
      lines.push({
        id: player.id,
        label: player.name,
        color: OTHER_PLAYER_PALETTE[colorIdx % OTHER_PLAYER_PALETTE.length],
        isDefault: false,
        isBenchmark: false,
        dataKey: player.id,
        projDataKey: `${player.id}_proj`,
      })
      colorIdx++
    }

    return lines
  }, [data])

  // Build chart data — game-level for actual, checkpoint-level for projections
  const { chartData, isComplete } = useMemo(() => {
    if (!data) return { chartData: [], isComplete: true }

    const latestGame = data.latestGameIndex
    const viewGameIdx = effectiveGameIdx
    const complete = latestGame >= 62 // All 63 games done

    // Build per-entry full score series (filling gaps)
    const entryScoreSeries = new Map<string, Map<number, number>>()
    for (const [entryId, gameScores] of Object.entries(data.entryGameScores)) {
      entryScoreSeries.set(entryId, buildFullScoreSeries(gameScores, 63, latestGame))
    }

    // Identify the current leader and median entries so we can use THEIR score history
    // (not the composite per-game max/median from different entries at each game)
    const latestLeader = data.leaderLine.length > 0
      ? data.leaderLine[data.leaderLine.length - 1] : null
    const leaderEntryId = latestLeader?.entryId ?? null

    let medianEntryId: string | null = null
    if (data.medianLine.length > 0) {
      const latestMedianScore = data.medianLine[data.medianLine.length - 1]?.score ?? 0
      let bestDist = Infinity
      for (const [eid, entry] of Object.entries(data.entries)) {
        const lastScore = entry.scores[data.latestCheckpointIndex] ?? 0
        const dist = Math.abs(lastScore - latestMedianScore)
        if (dist < bestDist) {
          bestDist = dist
          medianEntryId = eid
        }
      }
    }

    // Build leader/median score series from their individual game history
    const leaderSeries = leaderEntryId ? entryScoreSeries.get(leaderEntryId) ?? null : null
    const medianSeries = medianEntryId ? entryScoreSeries.get(medianEntryId) ?? null : null
    const opt8ByGame = new Map(data.optimal8Line.map(o => [o.gameIndex, o.score]))

    // Data points: one per completed game (up to view position) + pre-tournament
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const points: any[] = []

    // Pre-tournament point at x = -1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prePoint: any = { x: -1 }
    for (const [entryId] of entryScoreSeries) {
      prePoint[entryId] = 0
    }
    prePoint.leader = 0
    prePoint.median = 0
    prePoint.optimal8 = 0
    prePoint.hindsight = null
    points.push(prePoint)

    // Completed game points
    for (let gi = 0; gi <= Math.min(viewGameIdx, latestGame); gi++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const point: any = { x: gi }

      // Entry scores
      for (const [entryId, series] of entryScoreSeries) {
        point[entryId] = series.get(gi) ?? null
      }

      // Leader and median — use the SPECIFIC entry's score history (not composite)
      point.leader = leaderSeries?.get(gi) ?? 0
      point.median = medianSeries?.get(gi) ?? 0

      // Optimal 8
      point.optimal8 = opt8ByGame.get(gi) ?? (gi > 0 ? points[points.length - 1]?.optimal8 : 0) ?? null

      // Hindsight (checkpoint-level only)
      const gameCp = data.games.find(g => g.gameIndex === gi)?.checkpoint
      if (gameCp !== undefined) {
        const cpData = data.optimal8[gameCp]
        if (cpData?.hindsightOptimal8Score != null) {
          // Only set at checkpoint boundary game positions
          const boundary = data.checkpointBoundaries.find(b => b.checkpoint === gameCp)
          if (boundary && boundary.afterGameIndex === gi) {
            point.hindsight = cpData.hindsightOptimal8Score
          }
        }
      }

      points.push(point)
    }

    // Projection bridge point at the last completed game (connects solid to dashed)
    if (!complete && viewGameIdx >= 0 && points.length > 1) {
      const lastPoint = points[points.length - 1]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bridgePoint: any = { x: Math.min(viewGameIdx, latestGame) }
      // Copy actual values as projection start
      for (const [entryId] of entryScoreSeries) {
        bridgePoint[`${entryId}_proj`] = lastPoint[entryId] ?? null
      }
      // Optimal 8 projection start
      bridgePoint.optimal8_proj = lastPoint.optimal8 ?? null
      // Leader and median projection start
      bridgePoint.leader_proj = lastPoint.leader ?? null
      bridgePoint.median_proj = lastPoint.median ?? null

      // Don't duplicate if already at this x position
      if (lastPoint.x === bridgePoint.x) {
        // Merge projection keys into last point
        for (const key of Object.keys(bridgePoint)) {
          if (key.endsWith("_proj")) lastPoint[key] = bridgePoint[key]
        }
      } else {
        points.push(bridgePoint)
      }
    }

    // Future checkpoint projection points
    if (!complete) {
      const latestCp = data.latestCheckpointIndex
      for (let cp = latestCp + 1; cp <= 10; cp++) {
        const gamePos = getCpGamePos(cp, data.checkpointBoundaries)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const projPoint: any = { x: gamePos }

        // Entry projections from checkpoint data
        for (const [entryId, entry] of Object.entries(data.entries)) {
          projPoint[`${entryId}_proj`] = entry.projections[cp] ?? null
        }

        // Optimal 8 projection
        const opt = data.optimal8[cp]
        if (opt) {
          projPoint.optimal8_proj = opt.rollingProjection ?? null
        }

        // Leader projection — use the current leader entry's projections
        if (leaderEntryId && data.entries[leaderEntryId]) {
          projPoint.leader_proj = data.entries[leaderEntryId].projections[cp] ?? null
        }

        // Median projection — use the current median entry's projections
        if (medianEntryId && data.entries[medianEntryId]) {
          projPoint.median_proj = data.entries[medianEntryId].projections[cp] ?? null
        }

        points.push(projPoint)
      }
    }

    // Sort by x position
    points.sort((a, b) => a.x - b.x)

    return { chartData: points, isComplete: complete }
  }, [data, effectiveGameIdx])

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

  // Fetch a specific player's data on demand
  const fetchPlayerData = useCallback(async (entryId: string) => {
    if (!data || data.entries[entryId]) return
    try {
      const res = await fetch(`/api/scores/history?entryIds=${entryId}&includeLeaderMedian=false`)
      if (!res.ok) return
      const json: ScoreHistoryData = await res.json()
      const newEntry = json.entries[entryId]
      const newGameScores = json.entryGameScores?.[entryId]
      if (newEntry) {
        setData(prev => prev ? {
          ...prev,
          entries: { ...prev.entries, [entryId]: newEntry },
          entryGameScores: {
            ...prev.entryGameScores,
            ...(newGameScores ? { [entryId]: newGameScores } : {}),
          },
        } : prev)
      }
    } catch {
      // silent fail
    }
  }, [data])

  const handleToggle = (id: string) => {
    const line = allLines.find(l => l.id === id)
    const entryId = line?.dataKey

    setVisibleIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        if (entryId && data && !data.entries[entryId]) {
          fetchPlayerData(entryId)
        }
      }
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
        Could not load score history
      </div>
    )
  }

  const latestGameIdx = data.latestGameIndex
  const viewGameIdx = effectiveGameIdx
  const hasAnyData = latestGameIdx >= 0 && Object.keys(data.entries).length > 0

  if (!hasAnyData) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No game results yet — check back when the tournament starts
      </div>
    )
  }

  // Build major tick positions for x-axis from checkpoint boundaries
  const majorTicks: number[] = [-1] // Pre-tournament
  for (let cp = 1; cp <= 10; cp++) {
    majorTicks.push(getCpGamePos(cp, data.checkpointBoundaries))
  }

  // X-axis tick formatter
  const formatTick = (gameIdx: number): string => {
    if (gameIdx === -1) return "Pre"
    // Find if this is a checkpoint boundary
    const boundary = data.checkpointBoundaries.find(b => b.afterGameIndex === gameIdx)
    if (boundary) return boundary.label
    // Use default label
    for (let cp = 1; cp <= 10; cp++) {
      if (DEFAULT_CP_GAME_POS[cp] === gameIdx) {
        return CHECKPOINT_LABELS[cp] ?? ""
      }
    }
    return ""
  }

  // Compute y-axis max
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

  // Current position label
  const gameCount = data.games.length
  const positionLabel = viewGameIdx >= 0
    ? `Game ${viewGameIdx + 1} of ${gameCount} completed`
    : "Pre-tournament"

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

            {/* Vertical gridlines at checkpoint boundaries */}
            {data.checkpointBoundaries.map(b => (
              <ReferenceLine
                key={`grid-cp-${b.checkpoint}`}
                x={b.afterGameIndex}
                stroke="currentColor"
                strokeOpacity={0.15}
                strokeDasharray="3 3"
              />
            ))}

            {/* "NOW" marker at the current view position */}
            {!isComplete && viewGameIdx >= 0 && (
              <ReferenceLine
                x={viewGameIdx}
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
              dataKey="x"
              type="number"
              domain={[-1, 62]}
              ticks={majorTicks}
              tick={{ fontSize: 9, fill: "currentColor", fillOpacity: 0.5 }}
              tickFormatter={formatTick}
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
                  latestGameIdx={viewGameIdx}
                  cpBoundaryMap={cpBoundaryMap}
                  gameCount={gameCount}
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
                strokeWidth={line.isBenchmark ? 2 : 2}
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
                strokeWidth={1.5}
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
        {positionLabel} | {visibleLines.length} lines visible
      </div>
    </div>
  )
}
