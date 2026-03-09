"use client"

/**
 * LeaderboardHistoryChart — Score history chart for the leaderboard.
 *
 * Follows the approved chart-test design:
 * - 5 default lines: Optimal 8 Rolling, Optimal 8 Final, Leader, Median, You
 * - Solid lines = actual scores, dashed lines = optimal trajectory (max possible)
 * - 63 minor X-axis ticks, 10 major checkpoint labels
 * - No horizontal gridlines, vertical gridlines at checkpoints only
 * - "NOW" marker at current game
 * - Player filter dropdown with Benchmarks/Players sections
 *
 * Leader and Median use "Current" mode: trace how today's leader/median
 * scored throughout the tournament (single player line, not composite).
 */

import { useState, useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { Check, ChevronDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import type { HistorySnapshot } from "@/types"
import type { RoundBoundary, DemoGameEvent } from "@/lib/demo-game-sequence"
import { computeBracketAwarePPR, type TeamBracketInfo } from "@/lib/bracket-ppr"

// ═══════════════════════════════════════════════════════════════════════════════
// TOURNAMENT STRUCTURE — 63 games across 10 sessions
// ═══════════════════════════════════════════════════════════════════════════════

const SESSION_CHECKPOINTS = [
  { label: "R64 D1", shortLabel: "R64", gameIndex: 15 },
  { label: "R64 D2", shortLabel: "R64", gameIndex: 31 },
  { label: "R32 D1", shortLabel: "R32", gameIndex: 39 },
  { label: "R32 D2", shortLabel: "R32", gameIndex: 47 },
  { label: "S16 D1", shortLabel: "S16", gameIndex: 51 },
  { label: "S16 D2", shortLabel: "S16", gameIndex: 55 },
  { label: "E8 D1",  shortLabel: "E8",  gameIndex: 57 },
  { label: "E8 D2",  shortLabel: "E8",  gameIndex: 59 },
  { label: "F4",     shortLabel: "F4",  gameIndex: 61 },
  { label: "Champ",  shortLabel: "CH",  gameIndex: 62 },
]

const TOTAL_GAMES = 63
const checkpointGameSet = new Set(SESSION_CHECKPOINTS.map(c => c.gameIndex))
const checkpointLabelMap = new Map(SESSION_CHECKPOINTS.map(c => [c.gameIndex, c.shortLabel]))

// ═══════════════════════════════════════════════════════════════════════════════
// COLORS
// ═══════════════════════════════════════════════════════════════════════════════

const COLOR_OPTIMAL_ROLLING = "#00A9E0"  // brand blue
const COLOR_OPTIMAL_FINAL = "#f97316"    // orange
const COLOR_LEADER = "#22c55e"           // green
const COLOR_MEDIAN = "#a78bfa"           // purple
const COLOR_YOU = "#facc15"              // yellow

const OTHER_PLAYER_PALETTE = [
  "#f472b6", "#2dd4bf", "#fb923c", "#818cf8", "#4ade80", "#e879f9", "#94a3b8",
]

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIMAL TRAJECTORY — bracket-aware collision analysis per player
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * For each user at `gameIndex`, compute the maximum possible score trajectory
 * through the remaining games using bracket-aware PPR (collision analysis).
 *
 * Returns { userId → trajectory[0..totalGames] } where trajectory[i] is the
 * max possible score at game i. Games before gameIndex are null.
 */
function computeOptimalTrajectories(
  history: HistorySnapshot[],
  gameIndex: number,
  gameSequence: DemoGameEvent[],
  totalGames: number
): Record<string, (number | null)[]> {
  if (!history.length || gameIndex < 0) return {}

  const anchorIndex = Math.min(gameIndex, history.length - 1)
  const anchorSnapshot = history[anchorIndex]
  if (!anchorSnapshot) return {}

  const result: Record<string, (number | null)[]> = {}

  for (const entry of anchorSnapshot.entries) {
    const uid = entry.userId
    const trajectory: (number | null)[] = new Array(totalGames).fill(null)

    // 1. Build team bracket info for collision-aware PPR
    const teamInfoMap = new Map<string, TeamBracketInfo>()
    for (const pick of entry.picks) {
      if (!pick.isPlayIn) {
        teamInfoMap.set(pick.teamId, {
          seed: pick.seed,
          region: pick.region || "",
          wins: pick.wins,
          eliminated: pick.eliminated,
        })
      }
    }

    // 2. Compute bracket-aware PPR per team
    const { perTeam } = computeBracketAwarePPR(
      entry.picks.map(p => p.teamId),
      teamInfoMap
    )

    // 3. Map future wins to rounds (pointsByRound)
    const pointsByRound = new Map<number, number[]>()
    for (const pick of entry.picks) {
      if (pick.eliminated || pick.isPlayIn || pick.seed === 0) continue
      const ppr = perTeam.get(pick.teamId) || 0
      const additionalWins = ppr / pick.seed
      for (let r = pick.wins + 1; r <= pick.wins + additionalWins; r++) {
        const pts = pointsByRound.get(r) || []
        pts.push(pick.seed)
        pointsByRound.set(r, pts)
      }
    }

    // 4. Step through future games, assigning points progressively
    let currentScore = entry.currentScore
    if (gameIndex < totalGames) {
      trajectory[gameIndex] = currentScore
    }

    const assignedByRound = new Map<number, number>()

    for (let i = gameIndex + 1; i < totalGames; i++) {
      const game = gameSequence[i]
      if (game) {
        const round = game.round
        const pts = pointsByRound.get(round) || []
        const assignedIdx = assignedByRound.get(round) || 0

        if (assignedIdx < pts.length) {
          currentScore += pts[assignedIdx]
          assignedByRound.set(round, assignedIdx + 1)
        }
      }
      trajectory[i] = currentScore
    }

    result[uid] = trajectory
  }

  return result
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface LeaderboardHistoryChartProps {
  history: HistorySnapshot[]
  gameIndex: number
  totalGames: number
  roundBoundaries: RoundBoundary[]
  highlightUserId?: string
  userNames: Record<string, string>
  gameSequence?: DemoGameEvent[]
  optimal8RollingScores: number[]
  optimal8FinalScores: number[]
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

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM X-AXIS TICK
// ═══════════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomXTick(props: any) {
  const { x, y, payload } = props as {
    x?: number
    y?: number
    payload?: { value: number }
  }
  if (x == null || y == null || !payload) return null
  const game = payload.value
  const isMajor = checkpointGameSet.has(game)

  if (!isMajor) {
    return (
      <g transform={`translate(${x},${y})`}>
        <line x1={0} y1={0} x2={0} y2={3} stroke="currentColor" strokeOpacity={0.15} />
      </g>
    )
  }

  const label = checkpointLabelMap.get(game) ?? ""

  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={0} y1={0} x2={0} y2={8} stroke="currentColor" strokeOpacity={0.5} />
      <text
        x={0}
        y={20}
        textAnchor="middle"
        fill="currentColor"
        fillOpacity={0.6}
        fontSize={9}
        fontWeight={500}
      >
        {label}
      </text>
    </g>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM TOOLTIP
// ═══════════════════════════════════════════════════════════════════════════════

function ChartTooltip({ active, payload, label, visibleLines, currentGame, history }: {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?: number
  visibleLines: LineDef[]
  currentGame: number
  history: HistorySnapshot[]
}) {
  if (!active || !payload || payload.length === 0) return null

  const gameIdx = label ?? 0
  const isPast = gameIdx <= currentGame

  // Find round label from history
  const snap = history[gameIdx]
  const roundLabel = snap?.roundLabel ?? ""

  return (
    <div className="bg-popover border border-border/60 rounded-lg shadow-lg text-xs p-3 min-w-[200px]">
      <div className="font-semibold mb-1.5 text-foreground flex items-center gap-2">
        <span>Game {gameIdx + 1}</span>
        {roundLabel && <span className="text-muted-foreground font-normal">{roundLabel}</span>}
        {!isPast && <span className="text-[10px] text-muted-foreground italic font-normal">(optimal trajectory)</span>}
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

// ═══════════════════════════════════════════════════════════════════════════════
// PLAYER FILTER
// ═══════════════════════════════════════════════════════════════════════════════

function PlayerFilter({ allLines, visibleIds, onToggle }: {
  allLines: LineDef[]
  visibleIds: Set<string>
  onToggle: (id: string) => void
}) {
  const [open, setOpen] = useState(false)

  const benchmarkLines = allLines.filter(l => l.isBenchmark)
  const playerLines = allLines.filter(l => !l.isBenchmark)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
          Players ({visibleIds.size})
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="max-h-72 overflow-y-auto">
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
          <div className="border-t border-border/50 my-1" />
          <div className="px-3 pt-1 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Players</span>
          </div>
          {playerLines.map(line => (
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
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LeaderboardHistoryChart({
  history,
  gameIndex,
  totalGames,
  highlightUserId,
  userNames,
  gameSequence = [],
  optimal8RollingScores,
  optimal8FinalScores,
}: LeaderboardHistoryChartProps) {

  // ── Compute optimal trajectories (bracket-aware collision analysis) ──
  const trajectories = useMemo(() => {
    if (!gameSequence.length || gameIndex < 0) return {}
    return computeOptimalTrajectories(history, gameIndex, gameSequence, totalGames)
  }, [history, gameIndex, gameSequence, totalGames])

  // ── Build line definitions and chart data ──
  const { allLines, chartData } = useMemo(() => {
    if (history.length === 0) {
      return { allLines: [] as LineDef[], chartData: [] as Record<string, number | null>[] }
    }

    const effectiveIdx = Math.max(0, Math.min(gameIndex, history.length - 1))
    const currentSnap = history[effectiveIdx]

    // Identify leader and median at current gameIndex ("Current" mode)
    const sortedEntries = [...currentSnap.entries].sort((a, b) => b.currentScore - a.currentScore)
    const leaderUserId = sortedEntries[0]?.userId
    const medianIdx = Math.floor(sortedEntries.length / 2)
    const medianUserId = sortedEntries[medianIdx]?.userId

    // Helper: get a player's score at each game
    const playerScoresArray = (userId: string): number[] => {
      return history.map(snap => {
        const entry = snap.entries.find(e => e.userId === userId)
        return entry?.currentScore ?? 0
      })
    }

    // Build score arrays for default lines
    const leaderScores = leaderUserId ? playerScoresArray(leaderUserId) : []
    const medianScores = medianUserId ? playerScoresArray(medianUserId) : []
    const youScores = highlightUserId ? playerScoresArray(highlightUserId) : []

    // Build LineDef array with dedup
    const lines: LineDef[] = []

    // Benchmarks (always available)
    lines.push({
      id: "optimal_rolling", label: "Optimal 8 (Rolling)",
      color: COLOR_OPTIMAL_ROLLING, isDefault: true, isBenchmark: true,
      dataKey: "optimal_rolling", projDataKey: "optimal_rolling_proj",
    })
    lines.push({
      id: "optimal_final", label: "Optimal 8 (Final)",
      color: COLOR_OPTIMAL_FINAL, isDefault: true, isBenchmark: true,
      dataKey: "optimal_final", projDataKey: "optimal_final_proj",
    })

    // Track which userIds are already assigned a named role
    const assignedRoles = new Set<string>()

    // Leader
    if (leaderUserId && leaderUserId !== highlightUserId) {
      const leaderName = userNames[leaderUserId] ?? leaderUserId
      lines.push({
        id: `leader_${leaderUserId}`, label: `Leader (${leaderName})`,
        color: COLOR_LEADER, isDefault: true, isBenchmark: false,
        dataKey: "leader", projDataKey: "leader_proj",
      })
      assignedRoles.add(leaderUserId)
    }

    // Median (skip if same as leader or "you")
    if (medianUserId && medianUserId !== highlightUserId && medianUserId !== leaderUserId) {
      const medianName = userNames[medianUserId] ?? medianUserId
      lines.push({
        id: `median_${medianUserId}`, label: `Median (${medianName})`,
        color: COLOR_MEDIAN, isDefault: true, isBenchmark: false,
        dataKey: "median", projDataKey: "median_proj",
      })
      assignedRoles.add(medianUserId)
    }

    // You
    if (highlightUserId) {
      const youName = userNames[highlightUserId] ?? highlightUserId
      // If you ARE the leader or median, reflect that in the label
      let youLabel = `You (${youName})`
      if (highlightUserId === leaderUserId) youLabel = `You / Leader (${youName})`
      else if (highlightUserId === medianUserId) youLabel = `You / Median (${youName})`
      lines.push({
        id: `you_${highlightUserId}`, label: youLabel,
        color: COLOR_YOU, isDefault: true, isBenchmark: false,
        dataKey: "you", projDataKey: "you_proj",
      })
      assignedRoles.add(highlightUserId)
    }

    // Other players (non-default, hidden by default, sorted alphabetically)
    const allUserIds = [...new Set(history[0]?.entries.map(e => e.userId) ?? [])]
    const specialIds = new Set([leaderUserId, medianUserId, highlightUserId].filter(Boolean) as string[])
    const otherPlayers = allUserIds
      .filter(uid => !specialIds.has(uid))
      .sort((a, b) => (userNames[a] ?? a).localeCompare(userNames[b] ?? b))

    let colorIdx = 0
    for (const uid of otherPlayers) {
      const name = userNames[uid] ?? uid
      lines.push({
        id: uid, label: name,
        color: OTHER_PLAYER_PALETTE[colorIdx % OTHER_PLAYER_PALETTE.length],
        isDefault: false, isBenchmark: false,
        dataKey: uid, projDataKey: `${uid}_proj`,
      })
      colorIdx++
    }

    // Helper: map userId to its data key for trajectories
    const userIdToDataKey = new Map<string, string>()
    if (leaderUserId && leaderUserId !== highlightUserId) userIdToDataKey.set(leaderUserId, "leader")
    if (medianUserId && medianUserId !== highlightUserId && medianUserId !== leaderUserId) userIdToDataKey.set(medianUserId, "median")
    if (highlightUserId) userIdToDataKey.set(highlightUserId, "you")
    for (const uid of otherPlayers) userIdToDataKey.set(uid, uid)

    // Build merged chart data:
    //   Actual scores (solid): games 0 to gameIndex
    //   Optimal trajectory (dashed): games gameIndex onward — uses bracket-aware PPR
    const data: Record<string, number | null>[] = history.map((_snap, g) => {
      const point: Record<string, number | null> = { game: g }
      const isActual = g <= gameIndex
      const isTrajectory = g >= gameIndex

      // Optimal 8 Rolling — benchmark uses actual future values
      point["optimal_rolling"] = isActual ? (optimal8RollingScores[g] ?? 0) : null
      point["optimal_rolling_proj"] = isTrajectory ? (optimal8RollingScores[g] ?? 0) : null

      // Optimal 8 Final — benchmark uses actual future values
      point["optimal_final"] = isActual ? (optimal8FinalScores[g] ?? 0) : null
      point["optimal_final_proj"] = isTrajectory ? (optimal8FinalScores[g] ?? 0) : null

      // Leader — actual scores for solid, optimal trajectory for dashed
      if (leaderScores.length && leaderUserId) {
        point["leader"] = isActual ? leaderScores[g] : null
        const traj = trajectories[leaderUserId]
        point["leader_proj"] = (isTrajectory && traj) ? (traj[g] ?? null) : null
      }

      // Median
      if (medianScores.length && medianUserId && medianUserId !== leaderUserId && medianUserId !== highlightUserId) {
        point["median"] = isActual ? medianScores[g] : null
        const traj = trajectories[medianUserId]
        point["median_proj"] = (isTrajectory && traj) ? (traj[g] ?? null) : null
      }

      // You
      if (youScores.length && highlightUserId) {
        point["you"] = isActual ? youScores[g] : null
        const traj = trajectories[highlightUserId]
        point["you_proj"] = (isTrajectory && traj) ? (traj[g] ?? null) : null
      }

      // Other players
      for (const uid of otherPlayers) {
        const entry = _snap.entries.find(e => e.userId === uid)
        const score = entry?.currentScore ?? 0
        point[uid] = isActual ? score : null
        const traj = trajectories[uid]
        point[`${uid}_proj`] = (isTrajectory && traj) ? (traj[g] ?? null) : null
      }

      return point
    })

    return { allLines: lines, chartData: data }
  }, [history, gameIndex, highlightUserId, userNames, optimal8RollingScores, optimal8FinalScores, trajectories])

  // ── Visible line state ──
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() =>
    new Set(allLines.filter(l => l.isDefault).map(l => l.id))
  )

  // Re-sync defaults when allLines changes (e.g. leader/median identity changes on timeline scrub)
  const prevDefaultIdsRef = useMemo(() => {
    return new Set(allLines.filter(l => l.isDefault).map(l => l.id))
  }, [allLines])

  // Keep visible set in sync: show all defaults, preserve user toggles for non-defaults
  const effectiveVisibleIds = useMemo(() => {
    const result = new Set<string>()
    for (const line of allLines) {
      if (line.isDefault) {
        // Always show defaults
        result.add(line.id)
      } else if (visibleIds.has(line.id)) {
        // Preserve user-toggled players
        result.add(line.id)
      }
    }
    return result
  }, [allLines, visibleIds, prevDefaultIdsRef])

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

  // ── Y-axis max ──
  const yMax = useMemo(() => {
    let max = 0
    for (const point of chartData) {
      for (const line of visibleLines) {
        const v1 = point[line.dataKey]
        const v2 = point[line.projDataKey]
        if (typeof v1 === "number" && v1 > max) max = v1
        if (typeof v2 === "number" && v2 > max) max = v2
      }
    }
    return Math.ceil(max / 10) * 10 + 5
  }, [chartData, visibleLines])

  // ── Empty state ──
  if (history.length === 0 || gameIndex < 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Advance the timeline to see score history
      </div>
    )
  }

  const actualTotalGames = Math.min(totalGames, TOTAL_GAMES)
  const isComplete = gameIndex >= actualTotalGames - 1

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div /> {/* Spacer — title is in the Card header above */}
        <PlayerFilter allLines={allLines} visibleIds={effectiveVisibleIds} onToggle={handleToggle} />
      </div>

      {/* Legend */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          {visibleLines.map(line => (
            <div key={line.id} className="flex items-center gap-1.5">
              <span
                className="w-4 h-0.5 rounded-full inline-block"
                style={{ backgroundColor: line.color }}
              />
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

            {/* Vertical gridlines at major checkpoints ONLY */}
            {SESSION_CHECKPOINTS.map(cp => (
              <ReferenceLine
                key={cp.gameIndex}
                x={cp.gameIndex}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="3 3"
              />
            ))}

            {/* "NOW" marker at current game (only if mid-tournament) */}
            {!isComplete && (
              <ReferenceLine
                x={gameIndex}
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
              dataKey="game"
              type="number"
              domain={[0, actualTotalGames - 1]}
              ticks={Array.from({ length: actualTotalGames }, (_, i) => i)}
              tick={<CustomXTick />}
              tickLine={false}
              axisLine={{ strokeOpacity: 0.2 }}
              interval={0}
            />

            <YAxis
              domain={[0, yMax]}
              tick={{ fontSize: 10, fill: "currentColor", fillOpacity: 0.4 }}
              tickLine={false}
              axisLine={false}
              width={30}
            />

            <Tooltip
              content={
                <ChartTooltip
                  visibleLines={visibleLines}
                  currentGame={gameIndex}
                  history={history}
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
                activeDot={{ r: 3, strokeWidth: 0 }}
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

      {/* Debug info */}
      <div className="text-xs text-muted-foreground">
        {actualTotalGames} games | {SESSION_CHECKPOINTS.length} checkpoints | Game {gameIndex + 1} of {actualTotalGames} | {visibleLines.length} lines visible
      </div>
    </div>
  )
}
