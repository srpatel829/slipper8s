"use client"

/**
 * TeamCallout — Comprehensive popover callout for team logos.
 *
 * Shows rich team details on hover (desktop) or tap (mobile).
 * Used across all views: leaderboard, picks, bracket, scores, simulator.
 */

import { useState, useRef, useCallback, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { getSeedColor, REGION_COLORS, REGION_ABBREV } from "@/lib/colors"

export interface TeamCalloutData {
  name: string
  shortName: string
  seed: number
  region: string
  wins: number
  eliminated: boolean
  logoUrl?: string | null
  /** Score = seed × wins */
  score?: number
  /** PPR (points for potential remaining) */
  ppr?: number | null
  /** Max possible score = score + PPR */
  maxScore?: number | null
  /** Expected remaining score */
  expectedRemaining?: number | null
  /** Next opponent */
  nextOpponent?: string | null
  /** Win probability % */
  winProbability?: number | null
  /** Games remaining before elimination (max 6 - wins) */
  gamesRemaining?: number | null
}

interface TeamCalloutProps {
  team: TeamCalloutData
  children: ReactNode
  className?: string
}

export function TeamCallout({ team, children, className }: TeamCalloutProps) {
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const score = team.score ?? team.seed * team.wins
  const ppr = team.ppr ?? (team.eliminated ? 0 : team.seed * Math.max(0, 6 - team.wins))
  const maxScore = team.maxScore ?? score + ppr
  const gamesRemaining = team.gamesRemaining ?? (team.eliminated ? 0 : 6 - team.wins)
  const seedColor = getSeedColor(team.seed)
  const regionColor = REGION_COLORS[team.region] ?? "#888"
  const regionAbbrev = REGION_ABBREV[team.region] ?? team.region

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setOpen(true), 200)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setOpen(false), 150)
  }, [])

  const handleClick = useCallback(() => {
    setOpen(prev => !prev)
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-flex", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}

      {open && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 pointer-events-none"
          style={{ minWidth: 200 }}
        >
          <div className="bg-popover border border-border/60 rounded-lg shadow-lg text-xs whitespace-nowrap overflow-hidden">
            {/* Header with logo + name */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-muted/20">
              {team.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={team.logoUrl} alt="" className="w-6 h-6 object-contain shrink-0" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[9px] font-bold px-1 py-0.5 rounded text-white"
                    style={{ backgroundColor: seedColor }}
                  >
                    #{team.seed}
                  </span>
                  <span className="font-semibold text-foreground truncate">{team.name}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className="text-[8px] font-bold px-1 rounded text-white"
                    style={{ backgroundColor: regionColor }}
                  >
                    {regionAbbrev}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{team.region} Region</span>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="px-3 py-2 space-y-1">
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wins</span>
                  <span className="font-semibold text-foreground">{team.wins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Points</span>
                  <span className="font-mono font-semibold text-foreground">{score}</span>
                </div>
                {!team.eliminated && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PPR</span>
                      <span className="font-mono text-muted-foreground">+{ppr}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max</span>
                      <span className="font-mono font-bold text-primary">{maxScore}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center justify-between pt-1 border-t border-border/20">
                <span className="text-muted-foreground">Status</span>
                {team.eliminated ? (
                  <span className="font-semibold text-red-400">Eliminated</span>
                ) : (
                  <span className="font-semibold text-green-400">
                    Alive · {gamesRemaining} game{gamesRemaining !== 1 ? "s" : ""} left
                  </span>
                )}
              </div>

              {/* Optional: expected remaining */}
              {team.expectedRemaining != null && team.expectedRemaining > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Exp. remaining</span>
                  <span className="font-semibold text-foreground">{team.expectedRemaining.toFixed(1)} pts</span>
                </div>
              )}

              {/* Optional: next game */}
              {team.nextOpponent && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Next</span>
                  <span className="font-semibold text-foreground">
                    vs {team.nextOpponent}
                    {team.winProbability != null && (
                      <span className="ml-1 text-muted-foreground">({team.winProbability}%)</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
