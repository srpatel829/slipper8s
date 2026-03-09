"use client"

/**
 * Standalone chart test page — hardcoded dummy data for iterating on
 * the score history chart design before applying to real data.
 *
 * Visit: /demo/chart-test
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

// ═══════════════════════════════════════════════════════════════════════════════
// TOURNAMENT STRUCTURE — 63 games across 10 sessions
// ═══════════════════════════════════════════════════════════════════════════════
//
// R64 Day 1:  16 games  (games 0-15)   → major tick at game 15
// R64 Day 2:  16 games  (games 16-31)  → major tick at game 31
// R32 Day 1:   8 games  (games 32-39)  → major tick at game 39
// R32 Day 2:   8 games  (games 40-47)  → major tick at game 47
// S16 Day 1:   4 games  (games 48-51)  → major tick at game 51
// S16 Day 2:   4 games  (games 52-55)  → major tick at game 55
// E8 Day 1:    2 games  (games 56-57)  → major tick at game 57
// E8 Day 2:    2 games  (games 58-59)  → major tick at game 59
// Final Four:  2 games  (games 60-61)  → major tick at game 61
// Championship:1 game   (game 62)      → major tick at game 62
//
// Total: 16+16+8+8+4+4+2+2+2+1 = 63 games, 0-indexed as games 0-62

const CHECKPOINTS = [
  { label: "R64 D1",  shortLabel: "R64",   gameIndex: 15 },
  { label: "R64 D2",  shortLabel: "R64",   gameIndex: 31 },
  { label: "R32 D1",  shortLabel: "R32",   gameIndex: 39 },
  { label: "R32 D2",  shortLabel: "R32",   gameIndex: 47 },
  { label: "S16 D1",  shortLabel: "S16",   gameIndex: 51 },
  { label: "S16 D2",  shortLabel: "S16",   gameIndex: 55 },
  { label: "E8 D1",   shortLabel: "E8",    gameIndex: 57 },
  { label: "E8 D2",   shortLabel: "E8",    gameIndex: 59 },
  { label: "F4",      shortLabel: "F4",    gameIndex: 61 },
  { label: "Champ",   shortLabel: "CH",    gameIndex: 62 },
]

const TOTAL_GAMES = 63

// Simulate mid-tournament: we're at game 40 (just into R32 Day 2)
const CURRENT_GAME = 40

// ═══════════════════════════════════════════════════════════════════════════════
// DUMMY DATA
// ═══════════════════════════════════════════════════════════════════════════════

interface PlayerDef {
  id: string
  name: string
  role?: "you" | "leader" | "median"
}

const PLAYERS: PlayerDef[] = [
  { id: "jig",     name: "Jig Samani",     role: "leader" },
  { id: "ankur",   name: "Ankur Patel",    role: "you" },
  { id: "chase",   name: "Chase Knight",   role: "median" },
  { id: "yatin",   name: "Yatin Patel" },
  { id: "jeff",    name: "Jeff Diamond" },
  { id: "arjun",   name: "Arjun Shah" },
  { id: "mira",    name: "Mira Desai" },
  { id: "rahul",   name: "Rahul Kumar" },
  { id: "priya",   name: "Priya Sharma" },
  { id: "david",   name: "David Chen" },
]

/** Generate a realistic score curve — scores only increase (monotonic) */
function generateScoreCurve(finalScore: number, seed: number): number[] {
  const scores: number[] = []
  let current = 0
  for (let g = 0; g < TOTAL_GAMES; g++) {
    const progress = g / (TOTAL_GAMES - 1)
    const target = finalScore * (1 / (1 + Math.exp(-8 * (progress - 0.4))))
    const noise = Math.sin(g * seed * 0.7) * finalScore * 0.015
    current = Math.max(current, Math.round(target + noise))
    scores.push(current)
  }
  scores[TOTAL_GAMES - 1] = finalScore
  return scores
}

const PLAYER_SCORES: Record<string, number[]> = {
  jig:    generateScoreCurve(79, 1),
  ankur:  generateScoreCurve(58, 2),
  chase:  generateScoreCurve(42, 3),
  yatin:  generateScoreCurve(65, 4),
  jeff:   generateScoreCurve(48, 5),
  arjun:  generateScoreCurve(71, 6),
  mira:   generateScoreCurve(36, 7),
  rahul:  generateScoreCurve(55, 8),
  priya:  generateScoreCurve(30, 9),
  david:  generateScoreCurve(52, 10),
}

const OPTIMAL_ROLLING = generateScoreCurve(99, 13)
const OPTIMAL_FINAL = generateScoreCurve(99, 17)

// Build two datasets: actual (up to CURRENT_GAME) and projected (CURRENT_GAME onwards)
// Actual data: solid lines. Projected data: dashed lines.
// We overlap one point at CURRENT_GAME so the lines connect.

const CHART_DATA_ACTUAL = Array.from({ length: CURRENT_GAME + 1 }, (_, g) => {
  const point: Record<string, number | null> = { game: g }
  point["optimal_rolling"] = OPTIMAL_ROLLING[g]
  point["optimal_final"] = OPTIMAL_FINAL[g]
  for (const p of PLAYERS) {
    point[p.id] = PLAYER_SCORES[p.id][g]
  }
  return point
})

const CHART_DATA_PROJECTED = Array.from({ length: TOTAL_GAMES - CURRENT_GAME }, (_, i) => {
  const g = CURRENT_GAME + i
  const point: Record<string, number | null> = { game: g }
  point["optimal_rolling_proj"] = OPTIMAL_ROLLING[g]
  point["optimal_final_proj"] = OPTIMAL_FINAL[g]
  for (const p of PLAYERS) {
    point[`${p.id}_proj`] = PLAYER_SCORES[p.id][g]
  }
  return point
})

// Merge into single dataset — actual keys null after CURRENT_GAME, projected keys null before
const CHART_DATA = Array.from({ length: TOTAL_GAMES }, (_, g) => {
  const point: Record<string, number | null> = { game: g }

  // Actual (solid) — up to CURRENT_GAME
  if (g <= CURRENT_GAME) {
    point["optimal_rolling"] = OPTIMAL_ROLLING[g]
    point["optimal_final"] = OPTIMAL_FINAL[g]
    for (const p of PLAYERS) point[p.id] = PLAYER_SCORES[p.id][g]
  } else {
    point["optimal_rolling"] = null
    point["optimal_final"] = null
    for (const p of PLAYERS) point[p.id] = null
  }

  // Projected (dashed) — from CURRENT_GAME onwards (overlap at CURRENT_GAME for connection)
  if (g >= CURRENT_GAME) {
    point["optimal_rolling_proj"] = OPTIMAL_ROLLING[g]
    point["optimal_final_proj"] = OPTIMAL_FINAL[g]
    for (const p of PLAYERS) point[`${p.id}_proj`] = PLAYER_SCORES[p.id][g]
  } else {
    point["optimal_rolling_proj"] = null
    point["optimal_final_proj"] = null
    for (const p of PLAYERS) point[`${p.id}_proj`] = null
  }

  return point
})

// ═══════════════════════════════════════════════════════════════════════════════
// COLORS
// ═══════════════════════════════════════════════════════════════════════════════

const COLOR_OPTIMAL_ROLLING = "#00A9E0"  // brand blue (matches leaderboard)
const COLOR_OPTIMAL_FINAL = "#f97316"    // orange (matches leaderboard)

const PLAYER_COLORS: Record<string, string> = {
  leader: "#22c55e",  // green
  median: "#a78bfa",  // purple
  you:    "#facc15",  // yellow
}

const OTHER_PLAYER_PALETTE = [
  "#f472b6", "#2dd4bf", "#fb923c", "#818cf8", "#4ade80", "#e879f9", "#94a3b8",
]

// ═══════════════════════════════════════════════════════════════════════════════
// LINE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface LineDef {
  id: string
  label: string
  color: string
  isDefault: boolean
  /** Data key for actual (solid) portion */
  dataKey: string
  /** Data key for projected (dashed) portion */
  projDataKey: string
}

function buildLineDefs(): LineDef[] {
  const leader = PLAYERS.find(p => p.role === "leader")!
  const median = PLAYERS.find(p => p.role === "median")!
  const you = PLAYERS.find(p => p.role === "you")!

  const lines: LineDef[] = [
    { id: "optimal_rolling", label: "Optimal 8 (Rolling)", color: COLOR_OPTIMAL_ROLLING, isDefault: true, dataKey: "optimal_rolling", projDataKey: "optimal_rolling_proj" },
    { id: "optimal_final", label: "Optimal 8 (Final)", color: COLOR_OPTIMAL_FINAL, isDefault: true, dataKey: "optimal_final", projDataKey: "optimal_final_proj" },
    { id: leader.id, label: `Leader (${leader.name})`, color: PLAYER_COLORS.leader, isDefault: true, dataKey: leader.id, projDataKey: `${leader.id}_proj` },
    { id: median.id, label: `Median (${median.name})`, color: PLAYER_COLORS.median, isDefault: true, dataKey: median.id, projDataKey: `${median.id}_proj` },
    { id: you.id, label: `You (${you.name})`, color: PLAYER_COLORS.you, isDefault: true, dataKey: you.id, projDataKey: `${you.id}_proj` },
  ]

  const remainingPlayers = PLAYERS
    .filter(p => !p.role)
    .sort((a, b) => a.name.localeCompare(b.name))

  let colorIdx = 0
  for (const p of remainingPlayers) {
    lines.push({
      id: p.id,
      label: p.name,
      color: OTHER_PLAYER_PALETTE[colorIdx % OTHER_PLAYER_PALETTE.length],
      isDefault: false,
      dataKey: p.id,
      projDataKey: `${p.id}_proj`,
    })
    colorIdx++
  }

  return lines
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM TOOLTIP
// ═══════════════════════════════════════════════════════════════════════════════

function ChartTooltip({ active, payload, label, visibleLines }: {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?: number
  visibleLines: LineDef[]
}) {
  if (!active || !payload || payload.length === 0) return null

  const gameIdx = label ?? 0
  const isPast = gameIdx <= CURRENT_GAME

  // Find which checkpoint this game is in
  let roundLabel = ""
  for (const cp of CHECKPOINTS) {
    if (gameIdx <= cp.gameIndex) {
      roundLabel = cp.label
      break
    }
  }

  return (
    <div className="bg-popover border border-border/60 rounded-lg shadow-lg text-xs p-3 min-w-[200px]">
      <div className="font-semibold mb-1.5 text-foreground flex items-center gap-2">
        <span>Game {gameIdx + 1}</span>
        {roundLabel && <span className="text-muted-foreground font-normal">{roundLabel}</span>}
        {!isPast && <span className="text-[10px] text-muted-foreground italic font-normal">(projected)</span>}
      </div>
      {visibleLines.map(line => {
        // Look for actual or projected value
        const actualKey = line.dataKey
        const projKey = line.projDataKey
        const actualEntry = payload.find(p => p.dataKey === actualKey && p.value != null)
        const projEntry = payload.find(p => p.dataKey === projKey && p.value != null)
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
              {entry.value}
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

  const pinnedLines = allLines.filter(l => l.id === "optimal_rolling" || l.id === "optimal_final")
  const playerLines = allLines.filter(l => l.id !== "optimal_rolling" && l.id !== "optimal_final")

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
          {pinnedLines.map(line => (
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
// CUSTOM X-AXIS TICK
// ═══════════════════════════════════════════════════════════════════════════════

const checkpointGameSet = new Set(CHECKPOINTS.map(c => c.gameIndex))
const checkpointLabelMap = new Map(CHECKPOINTS.map(c => [c.gameIndex, c.shortLabel]))

function CustomXTick({ x, y, payload, visibleTicksCount }: {
  x?: number
  y?: number
  payload?: { value: number }
  visibleTicksCount?: number
}) {
  if (x == null || y == null || !payload) return null
  const game = payload.value
  const isMajor = checkpointGameSet.has(game)

  // Only render major tick labels — minor ticks are just small marks
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
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function ChartTestPage() {
  const allLines = useMemo(() => buildLineDefs(), [])

  const [visibleIds, setVisibleIds] = useState<Set<string>>(() =>
    new Set(allLines.filter(l => l.isDefault).map(l => l.id))
  )

  const visibleLines = useMemo(
    () => allLines.filter(l => visibleIds.has(l.id)),
    [allLines, visibleIds]
  )

  const handleToggle = (id: string) => {
    setVisibleIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const yMax = useMemo(() => {
    let max = 0
    for (const point of CHART_DATA) {
      for (const line of visibleLines) {
        const v1 = point[line.dataKey]
        const v2 = point[line.projDataKey]
        if (typeof v1 === "number" && v1 > max) max = v1
        if (typeof v2 === "number" && v2 > max) max = v2
      }
    }
    return Math.ceil(max / 10) * 10 + 5
  }, [visibleLines])

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Score History</h1>
          <PlayerFilter allLines={allLines} visibleIds={visibleIds} onToggle={handleToggle} />
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
        </div>

        {/* Chart */}
        <div className="bg-card border border-border rounded-xl p-2 sm:p-4">
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={CHART_DATA} margin={{ top: 10, right: 10, bottom: 30, left: 5 }}>

              {/* Vertical gridlines at major checkpoints ONLY — no horizontal */}
              {CHECKPOINTS.map(cp => (
                <ReferenceLine
                  key={cp.gameIndex}
                  x={cp.gameIndex}
                  stroke="currentColor"
                  strokeOpacity={0.1}
                  strokeDasharray="3 3"
                />
              ))}

              {/* "Now" marker — vertical line at current game */}
              <ReferenceLine
                x={CURRENT_GAME}
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

              <XAxis
                dataKey="game"
                type="number"
                domain={[0, TOTAL_GAMES - 1]}
                ticks={Array.from({ length: TOTAL_GAMES }, (_, i) => i)}
                tick={CustomXTick as unknown as React.ComponentType}
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
                content={<ChartTooltip visibleLines={visibleLines} />}
                cursor={{ stroke: "currentColor", strokeOpacity: 0.1 }}
              />

              {/* === ACTUAL SCORES (solid lines) — up to CURRENT_GAME === */}
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

              {/* === PROJECTED TRAJECTORIES (dashed lines) — CURRENT_GAME onwards === */}
              {visibleLines.map(line => (
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
          {TOTAL_GAMES} games | {CHECKPOINTS.length} checkpoints | Current game: {CURRENT_GAME + 1} | {visibleLines.length} lines visible
        </div>
      </div>
    </div>
  )
}
