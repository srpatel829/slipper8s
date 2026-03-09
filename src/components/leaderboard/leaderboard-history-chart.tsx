"use client"

/**
 * LeaderboardHistoryChart
 *
 * Interactive recharts line chart showing leaderboard score history game-by-game.
 *
 * Features:
 * - Solid lines from 0 → gameIndex showing actual scores (auto-tracks timeline)
 * - Dashed optimal trajectory lines from gameIndex → end:
 *     Starts at naive TPS (all alive picks win everything, ignoring bracket conflicts).
 *     Steps DOWN each time two of a user's picks are scheduled to conflict.
 *     Ends at bracket-aware TPS at the rightmost point.
 * - Y-axis mode toggle: Max TPS (shows full upside) vs Max Score (zooms in on race)
 * - Play button: animates score history from 0 → current gameIndex
 * - Highlighted line for the current user/persona
 * - Round boundary reference lines
 * - Draggable cursor for tooltip exploration (does NOT mask data)
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Play, Pause, Search, Filter, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { computeBracketAwarePPR, type TeamBracketInfo } from "@/lib/bracket-ppr"
import type { HistorySnapshot } from "@/types"
import type { RoundBoundary, DemoGameEvent } from "@/lib/demo-game-sequence"

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaderboardHistoryChartProps {
  /** Full precomputed history from DemoContext */
  history: HistorySnapshot[]
  /** Current demo position — data auto-displays up to this */
  gameIndex: number
  /** Total games count */
  totalGames: number
  /** Round boundary markers */
  roundBoundaries: RoundBoundary[]
  /** Highlighted user's userId */
  highlightUserId?: string
  /** User names (userId → name) */
  userNames: Record<string, string>
  /** Full game sequence for trajectory computation */
  gameSequence?: DemoGameEvent[]
}

// ─── Color palette ────────────────────────────────────────────────────────────

const PALETTE = [
  "#f97316", // orange (primary — reserved for highlighted user)
  "#60a5fa", // blue
  "#34d399", // green
  "#f472b6", // pink
  "#a78bfa", // purple
  "#fbbf24", // yellow
  "#2dd4bf", // teal
  "#fb923c", // orange-light
  "#818cf8", // indigo
  "#4ade80", // lime
  "#e879f9", // fuchsia
  "#94a3b8", // slate
]

// ─── Trajectory computation ───────────────────────────────────────────────────

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

    // 1. Compute optimal future wins using bracket-aware PPR engine
    const teamInfoMap = new Map<string, TeamBracketInfo>()
    for (const pick of entry.picks) {
      if (!pick.isPlayIn) {
        teamInfoMap.set(pick.teamId, {
          seed: pick.seed,
          region: pick.region || "",
          wins: pick.wins,
          eliminated: pick.eliminated
        })
      }
    }

    const { perTeam } = computeBracketAwarePPR(entry.picks.map(p => p.teamId), teamInfoMap)

    // Map of Round -> Array of points to add
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

// ─── Component ────────────────────────────────────────────────────────────────

export function LeaderboardHistoryChart({
  history,
  gameIndex,
  totalGames,
  roundBoundaries,
  highlightUserId,
  userNames,
  gameSequence = [],
}: LeaderboardHistoryChartProps) {
  const [chartCursor, setChartCursor] = useState(gameIndex)
  const [isDragging, setIsDragging] = useState(false)
  const [animateIndex, setAnimateIndex] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const chartRef = useRef<HTMLDivElement>(null)
  const animIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Keep chartCursor ≤ gameIndex (for tooltip exploration)
  const clampedCursor = Math.min(Math.max(chartCursor, 0), gameIndex)

  // Extract all unique userIds from the first snapshot (or last if first is empty)
  const userIds = history.length > 0
    ? history[0].entries.map(e => e.userId)
    : []

  // Default: show only Leader, Median, and You (highlighted user)
  // Per spec: default lines are Optimal 8 (Rolling), Leader, You, Median
  const getDefaultHidden = useCallback(() => {
    const anchorSnapIndex = Math.min(Math.max(0, gameIndex), history.length - 1)
    const anchorSnap = history[anchorSnapIndex]
    if (!anchorSnap) return new Set<string>()

    const sorted = [...anchorSnap.entries].sort((a, b) => b.currentScore - a.currentScore)
    const leaderId = sorted[0]?.userId
    const medianIdx = Math.floor(sorted.length / 2)
    const medianId = sorted[medianIdx]?.userId

    const showIds = new Set<string>()
    if (leaderId) showIds.add(leaderId)
    if (medianId) showIds.add(medianId)
    if (highlightUserId) showIds.add(highlightUserId)

    const hidden = new Set<string>()
    for (const uid of userIds) {
      if (!showIds.has(uid)) hidden.add(uid)
    }
    return hidden
  }, [history, gameIndex, highlightUserId, userIds])

  const [hiddenUserIds, setHiddenUserIds] = useState<Set<string>>(getDefaultHidden)

  // Re-run default selection if history changes
  useEffect(() => {
    setHiddenUserIds(getDefaultHidden())
  }, [history]) // eslint-disable-line react-hooks/exhaustive-deps

  // Filter userIds for chart lines based on explicit toggles
  const chartVisibleUserIds = useMemo(() => {
    return userIds.filter(uid => !hiddenUserIds.has(uid))
  }, [userIds, hiddenUserIds])

  // Filter userIds inside the dropdown menu based on search query
  const dropdownFilteredUserIds = useMemo(() => {
    if (!searchQuery.trim()) return userIds
    const lowerQ = searchQuery.toLowerCase()
    return userIds.filter(uid => {
      const name = userNames[uid] ?? uid
      return name.toLowerCase().includes(lowerQ)
    })
  }, [searchQuery, userIds, userNames])

  // Build flat chart data — one point per game, including Optimal 8 (Rolling)
  const chartData = history.map((snap, i) => {
    const point: Record<string, number | string> = {
      gameIndex: i,
      label: snap.roundLabel,
    }
    for (const entry of snap.entries) {
      point[`${entry.userId}_score`] = entry.currentScore
    }
    // Optimal 8 Rolling = best possible score from top 8 (seed × wins) at this snapshot
    // Compute from all picks across all entries — find unique teams and their current scores
    const teamScores = new Map<string, number>()
    for (const entry of snap.entries) {
      for (const pick of entry.picks) {
        if (pick.seed > 0 && !pick.isPlayIn) {
          const teamScore = pick.seed * pick.wins
          teamScores.set(pick.teamId, teamScore)
        }
      }
    }
    const sorted = [...teamScores.values()].sort((a, b) => b - a)
    point.optimal8Rolling = sorted.slice(0, 8).reduce((sum, v) => sum + v, 0)
    return point
  })

  // Identify leader and median at current snapshot
  const { leaderId, medianId } = useMemo(() => {
    const anchorSnapIndex = Math.min(Math.max(0, gameIndex), history.length - 1)
    const anchorSnap = history[anchorSnapIndex]
    if (!anchorSnap) return { leaderId: null, medianId: null }
    const sorted = [...anchorSnap.entries].sort((a, b) => b.currentScore - a.currentScore)
    return {
      leaderId: sorted[0]?.userId ?? null,
      medianId: sorted[Math.floor(sorted.length / 2)]?.userId ?? null,
    }
  }, [history, gameIndex])

  // Assign colors (highlighted user = orange, leader = blue, median = slate, others cycle)
  const colorMap: Record<string, string> = {}
  let paletteIdx = 3 // skip orange, blue, slate
  for (const uid of userIds) {
    if (uid === highlightUserId) {
      colorMap[uid] = PALETTE[0] // orange
    } else if (uid === leaderId) {
      colorMap[uid] = PALETTE[1] // blue
    } else if (uid === medianId) {
      colorMap[uid] = "#94a3b8" // slate for median
    } else {
      colorMap[uid] = PALETTE[paletteIdx % PALETTE.length]
      paletteIdx++
    }
  }

  // ── Optimal trajectory computation ────────────────────────────────────────
  const trajectories = useMemo(() => {
    if (!gameSequence.length || gameIndex < 0) return {}
    return computeOptimalTrajectories(history, gameIndex, gameSequence, totalGames)
  }, [history, gameIndex, gameSequence, totalGames])

  // ── Y-axis domain ─────────────────────────────────────────────────────────
  const anchorIndex = gameIndex >= 0 ? Math.min(gameIndex, history.length - 1) : 0
  const anchorSnapshot = history[anchorIndex]

  const yAxisMax = useMemo(() => {
    if (!anchorSnapshot) return 100
    // Max hypothetical score across ALL users at the end of trajectory to keep limits stable
    let maxVal = 1
    for (const entry of anchorSnapshot.entries) {
      const traj = trajectories[entry.userId]
      if (traj && gameIndex >= 0 && traj[totalGames - 1] !== null) {
        maxVal = Math.max(maxVal, traj[totalGames - 1] as number)
      } else {
        maxVal = Math.max(maxVal, entry.tps)
      }
    }
    return Math.ceil(maxVal * 1.1)
  }, [anchorSnapshot, trajectories, gameIndex, totalGames])

  // ── Play/pause animation ───────────────────────────────────────────────────
  const stopAnimation = useCallback(() => {
    if (animIntervalRef.current) {
      clearInterval(animIntervalRef.current)
      animIntervalRef.current = null
    }
    setAnimateIndex(null)
  }, [])

  const handlePlayPause = useCallback(() => {
    if (animateIndex !== null) {
      // Currently playing — pause
      stopAnimation()
    } else {
      // Start playing from 0
      setAnimateIndex(0)
      animIntervalRef.current = setInterval(() => {
        setAnimateIndex(prev => {
          if (prev === null || prev >= gameIndex) {
            if (animIntervalRef.current) clearInterval(animIntervalRef.current)
            animIntervalRef.current = null
            return null // done
          }
          return prev + 1
        })
      }, 150)
    }
  }, [animateIndex, gameIndex, stopAnimation])

  // Stop animation when gameIndex changes (timeline scrubbed)
  useEffect(() => {
    stopAnimation()
  }, [gameIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => () => {
    if (animIntervalRef.current) clearInterval(animIntervalRef.current)
  }, [])

  // Effective index for solid lines (animated or real)
  const effectiveIndex = animateIndex !== null ? animateIndex : gameIndex

  // ── Drag handling (tooltip exploration only — doesn't mask data) ───────────

  function getGameIndexFromMouseX(e: React.MouseEvent<HTMLDivElement>): number {
    if (!chartRef.current) return clampedCursor
    const rect = chartRef.current.getBoundingClientRect()
    const leftMargin = 60
    const rightMargin = 20
    const usableWidth = rect.width - leftMargin - rightMargin
    const x = e.clientX - rect.left - leftMargin
    const fraction = Math.max(0, Math.min(1, x / usableWidth))
    return Math.round(fraction * (totalGames - 1))
  }

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true)
    const idx = getGameIndexFromMouseX(e)
    setChartCursor(Math.min(idx, gameIndex))
  }, [gameIndex, totalGames]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const idx = getGameIndexFromMouseX(e)
    setChartCursor(Math.min(idx, gameIndex))
  }, [isDragging, gameIndex, totalGames]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  // Custom tooltip — shows both Score and TPS
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ name: string; value: number; color: string; dataKey: string }>
    label?: number
  }) => {
    if (!active || !payload?.length) return null
    const snap = history[label ?? 0]
    const isProjZone = (label ?? 0) > effectiveIndex

    // Optimal 8 Rolling entry
    const optEntry = payload.find(p => p.dataKey === "optimal8Rolling")
    // Score entries for the actual zone
    const scoreEntries = payload.filter(p => p.dataKey?.endsWith("_score"))
    // Trajectory entries for the projection zone
    const trajEntries = payload.filter(p => p.dataKey?.endsWith("_traj"))

    return (
      <div className="bg-popover border border-border/60 rounded-lg px-3 py-2 shadow-lg text-xs max-w-[220px]">
        <p className="font-semibold mb-1.5 text-muted-foreground">
          {isProjZone ? "Optimal Trajectory" : (snap?.gameLabel ?? `Game ${label}`)}
        </p>
        {optEntry && optEntry.value != null && (
          <div className="flex justify-between gap-3">
            <span style={{ color: "#22d3ee" }}>Optimal 8 (Rolling)</span>
            <span className="font-mono font-bold">{optEntry.value}</span>
          </div>
        )}
        {!isProjZone && scoreEntries.length > 0
          ? [...scoreEntries]
            .sort((a, b) => b.value - a.value)
            .map(p => {
              const uid = p.dataKey.replace("_score", "")
              const label = uid === leaderId ? " (leader)" : uid === medianId ? " (median)" : ""
              return (
                <div key={uid} className="flex justify-between gap-3">
                  <span style={{ color: p.color }}>{userNames[uid] ?? uid}{label}</span>
                  <span className="font-mono font-bold">{p.value}</span>
                </div>
              )
            })
          : [...trajEntries]
            .filter(p => p.value !== null && p.value !== undefined)
            .sort((a, b) => b.value - a.value)
            .map(p => {
              const uid = p.dataKey.replace("_traj", "")
              return (
                <div key={uid} className="flex justify-between gap-3">
                  <span style={{ color: p.color }}>{userNames[uid] ?? uid}</span>
                  <span className="font-mono font-bold text-muted-foreground">{Math.round(p.value)}</span>
                </div>
              )
            })
        }
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Advance the timeline to see score history
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header with controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Solid = actual scores · Dashed = optimal trajectory
          {gameIndex >= 0 && (
            <span className="text-muted-foreground/60"> · Drag to explore</span>
          )}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs px-2.5 bg-background shadow-sm border-border/50">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                Players
                {hiddenUserIds.size > 0 && (
                  <Badge variant="secondary" className="px-1 text-[9px] rounded h-4 ml-1 flex items-center bg-muted/80">
                    {userIds.length - hiddenUserIds.size}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <div className="p-2 border-b border-border/30 bg-muted/10">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Find player..."
                    className="h-8 pl-8 text-xs bg-background/50 border-border/40 focus-visible:ring-1 focus-visible:ring-primary/20 shadow-none"
                  />
                </div>
              </div>
              <div className="max-h-[240px] overflow-y-auto p-1 py-1.5 flex flex-col gap-0.5">
                <div className="px-2 py-1 flex justify-between items-center text-[10px] font-medium text-muted-foreground border-b border-border/20 mb-1">
                  <span className="uppercase tracking-wider">Show:</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setHiddenUserIds(new Set())} className="hover:text-foreground hover:underline transition-all">All</button>
                    <button onClick={() => setHiddenUserIds(new Set(userIds))} className="hover:text-foreground hover:underline transition-all">None</button>
                  </div>
                </div>
                {dropdownFilteredUserIds.length === 0 && (
                  <p className="p-4 text-center text-xs text-muted-foreground">No players found.</p>
                )}
                {dropdownFilteredUserIds.map((uid) => {
                  const isVisible = !hiddenUserIds.has(uid)
                  const toggle = () => {
                    const next = new Set(hiddenUserIds)
                    if (isVisible) next.add(uid)
                    else next.delete(uid)
                    setHiddenUserIds(next)
                  }
                  return (
                    <button
                      key={uid}
                      onClick={toggle}
                      className="flex items-center gap-2.5 w-full px-2 py-1.5 text-xs hover:bg-muted/50 rounded-md text-left transition-colors group"
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors duration-150",
                        isVisible
                          ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20"
                          : "border-border/60 bg-muted/10 group-hover:bg-muted/30 group-hover:border-border"
                      )}>
                        {isVisible && <Check className="h-3 w-3" strokeWidth={3} />}
                      </div>
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm border border-black/10 dark:border-white/10"
                        style={{ backgroundColor: colorMap[uid] }}
                      />
                      <span className="truncate">{userNames[uid] ?? uid}</span>
                    </button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
          {/* Play/pause button */}
          {gameIndex > 0 && (
            <button
              className="h-6 w-6 rounded border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              onClick={handlePlayPause}
              title={animateIndex !== null ? "Pause animation" : "Play score history"}
            >
              {animateIndex !== null
                ? <Pause className="h-3 w-3" />
                : <Play className="h-3 w-3" />
              }
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      <div
        ref={chartRef}
        className="select-none"
        style={{ cursor: isDragging ? "ew-resize" : "col-resize" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />

            <XAxis
              dataKey="gameIndex"
              type="number"
              domain={[0, totalGames - 1]}
              tickCount={7}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickFormatter={(v: number) => {
                const boundary = roundBoundaries.find(b => b.gameIndex === v)
                return boundary ? boundary.roundLabel.split(" ")[0] : ""
              }}
            />

            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              width={36}
              domain={[0, yAxisMax]}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Round boundary reference lines */}
            {roundBoundaries.map(b => (
              <ReferenceLine
                key={b.gameIndex}
                x={b.gameIndex}
                stroke="rgba(255,255,255,0.12)"
                strokeDasharray="4 2"
                label={{
                  value: b.roundLabel.split(" ")[0],
                  position: "insideTopRight",
                  fill: "#64748b",
                  fontSize: 9,
                }}
              />
            ))}

            {/* Future zone shading (beyond current effectiveIndex) */}
            {effectiveIndex >= 0 && effectiveIndex < totalGames - 1 && (
              <ReferenceArea
                x1={effectiveIndex}
                x2={totalGames - 1}
                fill="rgba(255,255,255,0.02)"
                stroke="none"
              />
            )}

            {/* Timeline position marker (primary visual anchor) */}
            {gameIndex >= 0 && (
              <ReferenceLine
                x={gameIndex}
                stroke="#f97316"
                strokeWidth={2}
                strokeDasharray="none"
                label={{
                  value: "▼",
                  position: "top",
                  fill: "#f97316",
                  fontSize: 10,
                }}
              />
            )}

            {/* Animation playhead (when animating, show where we are) */}
            {animateIndex !== null && animateIndex !== gameIndex && (
              <ReferenceLine
                x={animateIndex ?? undefined}
                stroke="#a78bfa"
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
            )}

            {/* Exploration cursor (subtle secondary indicator) */}
            {gameIndex >= 0 && clampedCursor !== gameIndex && animateIndex === null && (
              <ReferenceLine
                x={clampedCursor}
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )}

            {/* Optimal 8 (Rolling) — dashed cyan line */}
            <Line
              type="monotone"
              dataKey="optimal8Rolling"
              stroke="#22d3ee"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              connectNulls
              name="optimal8Rolling"
              data={chartData.map((d, i) => ({
                gameIndex: d.gameIndex,
                optimal8Rolling: i <= effectiveIndex ? (d.optimal8Rolling as number) : null,
              }))}
            />

            {/* Solid score lines — visible from 0 → effectiveIndex */}
            {chartVisibleUserIds.map(uid => {
              const isHighlighted = uid === highlightUserId
              const color = colorMap[uid]
              const scoreKey = `${uid}_score`
              return (
                <Line
                  key={`score-${uid}`}
                  type="monotone"
                  dataKey={scoreKey}
                  stroke={color}
                  strokeWidth={isHighlighted ? 2.5 : 1}
                  dot={false}
                  strokeOpacity={isHighlighted ? 1 : 0.55}
                  strokeDasharray={undefined}
                  connectNulls
                  activeDot={{ r: isHighlighted ? 5 : 3, fill: color }}
                  name={uid}
                  data={chartData.map((d, i) => ({
                    gameIndex: d.gameIndex,
                    [scoreKey]: i <= effectiveIndex ? (d[scoreKey] as number) : null,
                  }))}
                />
              )
            })}

            {/* Dashed optimal trajectory lines — from gameIndex onward */}
            {/* Only shown when we have trajectory data (gameSequence provided) */}
            {gameIndex >= 0 && chartVisibleUserIds.map(uid => {
              const isHighlighted = uid === highlightUserId
              const color = colorMap[uid]
              const trajKey = `${uid}_traj`
              const traj = trajectories[uid]
              if (!traj) return null

              return (
                <Line
                  key={`traj-${uid}`}
                  type="stepAfter"
                  dataKey={trajKey}
                  stroke={color}
                  strokeWidth={isHighlighted ? 2.5 : 1.5}
                  strokeDasharray="4 4"
                  opacity={isHighlighted ? 0.8 : animateIndex !== null ? 0.15 : 0.3}
                  dot={false}
                  activeDot={false}
                  name={`traj-${uid}`}
                  legendType="none"
                  data={chartData.map((d, i) => {
                    const base = { gameIndex: d.gameIndex }
                    if (i < gameIndex) return { ...base, [trajKey]: null }
                    const val = traj[i]
                    return { ...base, [trajKey]: val !== null && val !== undefined ? val : null }
                  })}
                />
              )
            })}

            {/* Fallback flat lines when no gameSequence provided */}
            {gameIndex >= 0 && !gameSequence.length && chartVisibleUserIds.map(uid => {
              const isHighlighted = uid === highlightUserId
              const color = colorMap[uid]
              const trajKey = `${uid}_traj`
              const flatTps = anchorSnapshot?.entries.find(e => e.userId === uid)?.tps ?? 0

              return (
                <Line
                  key={`traj-${uid}`}
                  type="monotone"
                  dataKey={trajKey}
                  stroke={color}
                  strokeWidth={isHighlighted ? 2 : 0.8}
                  strokeOpacity={isHighlighted ? 0.7 : 0.25}
                  strokeDasharray="6 3"
                  dot={false}
                  connectNulls
                  name={`traj-flat-${uid}`}
                  legendType="none"
                  data={chartData.map((d, i) => {
                    const base = { gameIndex: d.gameIndex }
                    if (i < gameIndex) return { ...base, [trajKey]: null }
                    if (i === gameIndex) return { ...base, [trajKey]: flatTps }
                    return { ...base, [trajKey]: flatTps }
                  })}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1">
        {chartVisibleUserIds.map(uid => (
          <div key={uid} className="flex items-center gap-1.5">
            <div
              className="h-2 w-5 rounded-full"
              style={{
                backgroundColor: colorMap[uid],
                opacity: uid === highlightUserId ? 1 : 0.6,
              }}
            />
            <span
              className="text-xs"
              style={{ color: colorMap[uid], opacity: uid === highlightUserId ? 1 : 0.7 }}
            >
              {userNames[uid] ?? uid}
              {uid === highlightUserId && (
                <Badge className="ml-1 h-3.5 px-1 text-[9px] bg-primary/20 text-primary border-0">
                  you
                </Badge>
              )}
              {uid === leaderId && uid !== highlightUserId && (
                <span className="ml-1 text-[9px] text-muted-foreground">(leader)</span>
              )}
              {uid === medianId && uid !== highlightUserId && uid !== leaderId && (
                <span className="ml-1 text-[9px] text-muted-foreground">(median)</span>
              )}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border/40">
          <div className="h-0 w-5 border-t-2 border-dashed" style={{ borderColor: "#22d3ee" }} />
          <span className="text-xs text-muted-foreground">Optimal 8 (Rolling)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0 w-5 border-t border-dashed border-muted-foreground/40" />
          <span className="text-xs text-muted-foreground">Max trajectory</span>
        </div>
      </div>
    </div >
  )
}
