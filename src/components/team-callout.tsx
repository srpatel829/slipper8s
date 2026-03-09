"use client"

/**
 * TeamCallout — Popover callout for team logos.
 *
 * Shows team details on hover (desktop) or tap (mobile):
 *   #12 McNeese St.  |  South Region
 *   Wins: 4  |  Pts: 48
 *   Exp. remaining: 8.3 pts
 *
 * Wraps children (usually an img/logo) and adds the popover behavior.
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
  /** Expected remaining score */
  expectedRemaining?: number | null
  /** Next opponent */
  nextOpponent?: string | null
  /** Win probability % */
  winProbability?: number | null
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
    // Toggle on mobile tap
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
          style={{ minWidth: 180 }}
        >
          <div className="bg-popover border border-border/60 rounded-lg px-3 py-2 shadow-lg text-xs whitespace-nowrap">
            {/* Header: Seed + Name + Region */}
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="text-[9px] font-bold px-1 py-0.5 rounded-full text-white"
                style={{ backgroundColor: seedColor }}
              >
                #{team.seed}
              </span>
              <span className="font-semibold text-foreground">{team.name}</span>
              <span className="text-muted-foreground/60">|</span>
              <span
                className="text-[9px] font-bold px-1 py-0.5 rounded-full text-white"
                style={{ backgroundColor: regionColor }}
              >
                {regionAbbrev}
              </span>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Wins: <span className="font-semibold text-foreground">{team.wins}</span></span>
              <span className="text-muted-foreground/30">|</span>
              <span>Pts: <span className="font-semibold text-foreground">{score}</span></span>
              {team.eliminated && (
                <>
                  <span className="text-muted-foreground/30">|</span>
                  <span className="text-red-400 font-semibold">Eliminated</span>
                </>
              )}
            </div>

            {/* Optional: expected remaining */}
            {team.expectedRemaining != null && team.expectedRemaining > 0 && (
              <div className="text-muted-foreground mt-0.5">
                Exp. remaining: <span className="font-semibold text-foreground">{team.expectedRemaining.toFixed(1)} pts</span>
              </div>
            )}

            {/* Optional: next game */}
            {team.nextOpponent && (
              <div className="text-muted-foreground mt-0.5">
                Next: <span className="font-semibold text-foreground">vs {team.nextOpponent}</span>
                {team.winProbability != null && (
                  <span className="ml-1">({team.winProbability}%)</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
