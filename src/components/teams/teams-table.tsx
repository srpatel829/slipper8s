"use client"

/**
 * TeamsTable — Sortable data table of all tournament teams.
 *
 * Per spec:
 *   Default sort: % Selected (high to low)
 *   Columns: Logo/Seed/Region | Team | Picked (count) | Picked (%) | Status | Wins | Games Left | Score | Max Score | Expected
 *   Spec seed colors: 1-4 Red, 5-8 Orange, 9-12 Gold, 13-16 Green
 *   Region colors: South=Red, West=Blue, East=Green, Midwest=Purple
 */

import { useState } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeamRow {
  id: string
  name: string
  shortName: string
  seed: number
  region: string
  eliminated: boolean
  wins: number
  logoUrl: string | null
  conference: string | null
  pickerCount: number
}

interface TeamsTableProps {
  teams: TeamRow[]
  totalEntries: number
}

type SortKey = "seed" | "name" | "region" | "pickerCount" | "pickerPct" | "wins" | "gamesLeft" | "score" | "maxScore"
type SortDir = "asc" | "desc"

// ─── Spec-locked seed colors ──────────────────────────────────────────────────

const SEED_COLOR: Record<string, string> = {
  "1-4": "#C0392B",   // Red
  "5-8": "#E67E22",   // Orange
  "9-12": "#D4AC0D",  // Gold
  "13-16": "#27AE60", // Green
}

function getSeedColor(seed: number): string {
  if (seed <= 4) return SEED_COLOR["1-4"]
  if (seed <= 8) return SEED_COLOR["5-8"]
  if (seed <= 12) return SEED_COLOR["9-12"]
  return SEED_COLOR["13-16"]
}

function getSeedTierLabel(seed: number): string {
  if (seed <= 4) return "Chalk"
  if (seed <= 8) return "Dark Horses"
  if (seed <= 12) return "Sleepers"
  return "Bracket Busters"
}

// ─── Region colors ────────────────────────────────────────────────────────────

const REGION_ABBREV: Record<string, string> = {
  East: "E", West: "W", South: "S", Midwest: "MW",
}

const REGION_COLORS: Record<string, string> = {
  South: "#C0392B",
  West: "#2E86C1",
  East: "#27AE60",
  Midwest: "#8E44AD",
}

// ─── Stats helpers ────────────────────────────────────────────────────────────

function teamStats(team: TeamRow) {
  const score = team.seed * team.wins
  const gamesLeft = team.eliminated ? 0 : Math.max(0, 6 - team.wins)
  const maxScore = score + (team.seed * gamesLeft)
  return { score, gamesLeft, maxScore }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TeamsTable({ teams, totalEntries }: TeamsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("pickerPct")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      // Default directions
      setSortDir(key === "seed" || key === "name" || key === "region" ? "asc" : "desc")
    }
  }

  const sorted = [...teams].sort((a, b) => {
    const statsA = teamStats(a), statsB = teamStats(b)
    let diff = 0
    switch (sortKey) {
      case "seed":        diff = a.seed - b.seed; break
      case "name":        diff = a.name.localeCompare(b.name); break
      case "region":      diff = a.region.localeCompare(b.region); break
      case "pickerCount": diff = a.pickerCount - b.pickerCount; break
      case "pickerPct":   diff = a.pickerCount - b.pickerCount; break // same since totalEntries is constant
      case "wins":        diff = a.wins - b.wins; break
      case "gamesLeft":   diff = statsA.gamesLeft - statsB.gamesLeft; break
      case "score":       diff = statsA.score - statsB.score; break
      case "maxScore":    diff = statsA.maxScore - statsB.maxScore; break
    }
    return sortDir === "asc" ? diff : -diff
  })

  const SortBtn = ({ col, label, className }: { col: SortKey; label: string; className?: string }) => (
    <button
      className={cn(
        "flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group whitespace-nowrap",
        sortKey === col && "text-primary",
        className
      )}
      onClick={() => handleSort(col)}
    >
      {label}
      <span className={sortKey === col ? "text-primary" : "opacity-0 group-hover:opacity-60"}>
        {sortDir === "asc" && sortKey === col
          ? <ChevronUp className="h-3 w-3" />
          : <ChevronDown className="h-3 w-3" />
        }
      </span>
    </button>
  )

  const aliveCount = teams.filter(t => !t.eliminated).length
  const eliminatedCount = teams.filter(t => t.eliminated).length

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border/50 bg-muted/20 flex-wrap">
        {([
          { label: "Chalk (1-4)", color: SEED_COLOR["1-4"] },
          { label: "Dark Horses (5-8)", color: SEED_COLOR["5-8"] },
          { label: "Sleepers (9-12)", color: SEED_COLOR["9-12"] },
          { label: "Bracket Busters (13-16)", color: SEED_COLOR["13-16"] },
        ]).map(tier => (
          <div key={tier.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tier.color }} />
            <span className="text-[10px] text-muted-foreground">{tier.label}</span>
          </div>
        ))}
        <span className="text-[10px] text-muted-foreground ml-auto">
          {aliveCount} alive · {eliminatedCount} eliminated
        </span>
      </div>

      {/* ─── Desktop table ─── */}
      <div className="hidden md:block">
        {/* Header */}
        <div className="grid grid-cols-[3rem_1fr_4rem_4.5rem_4rem_3rem_3.5rem_3.5rem_4.5rem] gap-1 px-4 py-2 bg-muted/30 border-b border-border/50">
          <div className="text-right"><SortBtn col="seed" label="#" /></div>
          <SortBtn col="name" label="Team" />
          <SortBtn col="region" label="Region" />
          <SortBtn col="pickerPct" label="Picked" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</span>
          <div className="text-right"><SortBtn col="wins" label="W" /></div>
          <div className="text-right"><SortBtn col="gamesLeft" label="Left" /></div>
          <div className="text-right"><SortBtn col="score" label="Pts" /></div>
          <div className="text-right"><SortBtn col="maxScore" label="Max" /></div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/30">
          {sorted.map(team => {
            const seedColor = getSeedColor(team.seed)
            const regionColor = REGION_COLORS[team.region] ?? "#888"
            const regionAbbrev = REGION_ABBREV[team.region] ?? team.region
            const { score, gamesLeft, maxScore } = teamStats(team)
            const pct = totalEntries > 0 ? ((team.pickerCount / totalEntries) * 100).toFixed(1) : "0.0"

            return (
              <div
                key={team.id}
                className={cn(
                  "grid grid-cols-[3rem_1fr_4rem_4.5rem_4rem_3rem_3.5rem_3.5rem_4.5rem] gap-1 items-center px-4 py-2.5 transition-colors hover:bg-muted/20",
                  team.eliminated && "opacity-50"
                )}
                style={{ borderLeft: `3px solid ${seedColor}` }}
              >
                {/* Seed */}
                <div className="text-right">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: seedColor }}
                  >
                    {team.seed}
                  </span>
                </div>

                {/* Team name + logo */}
                <div className="flex items-center gap-2 min-w-0">
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt="" className={cn("h-5 w-5 object-contain shrink-0", team.eliminated && "grayscale")} />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold shrink-0">
                      {team.shortName[0]}
                    </div>
                  )}
                  <span className={cn(
                    "text-sm font-medium truncate",
                    team.eliminated && "text-muted-foreground"
                  )}>
                    {team.name}
                  </span>
                </div>

                {/* Region */}
                <div>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: regionColor }}
                  >
                    {regionAbbrev}
                  </span>
                </div>

                {/* Picked (count + %) */}
                <div className="text-right">
                  <span className="text-sm tabular-nums font-medium">{pct}%</span>
                  <span className="text-[10px] text-muted-foreground ml-1">({team.pickerCount})</span>
                </div>

                {/* Status */}
                <div>
                  {team.eliminated ? (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">
                      Out
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400">
                      Alive
                    </span>
                  )}
                </div>

                {/* Wins */}
                <div className="text-right font-mono text-sm tabular-nums">{team.wins}</div>

                {/* Games Left */}
                <div className="text-right">
                  <span className={cn("font-mono text-sm tabular-nums", gamesLeft === 0 ? "text-muted-foreground" : "text-amber-400")}>
                    {gamesLeft}
                  </span>
                </div>

                {/* Score */}
                <div className="text-right font-mono text-sm tabular-nums font-medium">{score}</div>

                {/* Max Score */}
                <div className="text-right">
                  <span className="font-mono text-sm tabular-nums text-primary font-bold">{maxScore}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Mobile card view ─── */}
      <div className="md:hidden divide-y divide-border/30">
        {/* Mobile sort controls */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/20 border-b border-border/50 overflow-x-auto">
          <span className="text-[10px] text-muted-foreground shrink-0">Sort:</span>
          {([
            { key: "pickerPct" as SortKey, label: "% Picked" },
            { key: "seed" as SortKey, label: "Seed" },
            { key: "score" as SortKey, label: "Score" },
            { key: "maxScore" as SortKey, label: "Max" },
            { key: "wins" as SortKey, label: "Wins" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleSort(key)}
              className={cn(
                "text-[10px] font-medium px-2 py-1 rounded-full border whitespace-nowrap transition-colors",
                sortKey === key
                  ? "bg-primary/15 border-primary/30 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
              {sortKey === key && (sortDir === "asc" ? " ↑" : " ↓")}
            </button>
          ))}
        </div>

        {sorted.map(team => {
          const seedColor = getSeedColor(team.seed)
          const regionColor = REGION_COLORS[team.region] ?? "#888"
          const regionAbbrev = REGION_ABBREV[team.region] ?? team.region
          const { score, gamesLeft, maxScore } = teamStats(team)
          const pct = totalEntries > 0 ? ((team.pickerCount / totalEntries) * 100).toFixed(1) : "0.0"

          return (
            <div
              key={team.id}
              className={cn(
                "px-3 py-3 transition-colors hover:bg-muted/20",
                team.eliminated && "opacity-50"
              )}
              style={{ borderLeft: `3px solid ${seedColor}` }}
            >
              {/* Top row: logo, name, seed, region */}
              <div className="flex items-center gap-2 mb-2">
                {team.logoUrl ? (
                  <img src={team.logoUrl} alt="" className={cn("h-7 w-7 object-contain shrink-0", team.eliminated && "grayscale")} />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                    {team.shortName[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className={cn("text-sm font-semibold", team.eliminated && "text-muted-foreground")}>
                    {team.name}
                  </span>
                </div>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0"
                  style={{ backgroundColor: seedColor }}
                >
                  #{team.seed}
                </span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0"
                  style={{ backgroundColor: regionColor }}
                >
                  {regionAbbrev}
                </span>
                {team.eliminated ? (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 shrink-0">Out</span>
                ) : (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 shrink-0">Alive</span>
                )}
              </div>

              {/* Bottom row: stats */}
              <div className="flex items-center gap-3 text-[11px]">
                <div>
                  <span className="text-muted-foreground">Picked: </span>
                  <span className="font-semibold">{pct}%</span>
                  <span className="text-muted-foreground"> ({team.pickerCount})</span>
                </div>
                <div>
                  <span className="text-muted-foreground">W: </span>
                  <span className="font-semibold">{team.wins}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Left: </span>
                  <span className={cn("font-semibold", gamesLeft > 0 && "text-amber-400")}>{gamesLeft}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Pts: </span>
                  <span className="font-semibold">{score}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Max: </span>
                  <span className="font-bold text-primary">{maxScore}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
