"use client"

/**
 * TeamCallout — Comprehensive popover callout for team logos.
 *
 * Two card layouts:
 *   - Pre-tournament: Rankings, record, conference, expected score, win probabilities
 *   - During/post-tournament: Status badge, wins/score/expected/TPS, rankings, record,
 *     track record, next game, win probabilities with checkmarks
 *
 * Shows on hover (desktop) or tap/long-press (mobile).
 * Uses Radix Popover for smart viewport-aware positioning.
 * Used across all views: leaderboard, picks, bracket, scores, simulator.
 */

import { useState, useRef, useCallback, useEffect, type ReactNode } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
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

  // ── During/post-tournament fields ──
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

  // ── Pre-tournament fields ──
  /** Controls which card layout to render */
  isPreTournament?: boolean
  /** Conference name (e.g. "ACC", "SEC") */
  conference?: string | null
  /** Cumulative Silver Bulletin probabilities [P(in tourney), P(≥1w), P(≥2w), …, P(champ)] */
  cumulativeProbabilities?: number[] | null
  /** Expected total score from Silver Bulletin */
  expectedScore?: number | null
  /** NCAA committee S-Curve ranking (1–68) */
  sCurveRank?: number | null
  /** Pre-tournament KenPom ranking */
  kenpomRank?: number | null
  /** Pre-tournament ESPN BPI ranking */
  bpiRank?: number | null
  /** Overall record entering tournament */
  record?: string | null
  /** Won conference regular season */
  confRegSeasonChamp?: boolean
  /** Won conference tournament */
  confTourneyChamp?: boolean
  /** Games won as KenPom underdog (season) */
  cinderellaWins?: number | null
  /** Games lost as KenPom favorite (season) */
  upsetLosses?: number | null
  /** % of entries that picked this team (0–100) */
  selectedPct?: number | null
}

interface TeamCalloutProps {
  team: TeamCalloutData
  children: ReactNode
  className?: string
  /** When true, disables click-toggle (child is interactive — e.g. bracket slot, team card).
   *  Hover + long-press still work. */
  interactiveChild?: boolean
}

// ── Long-press threshold (ms) ──
const LONG_PRESS_MS = 500

export function TeamCallout({ team, children, className, interactiveChild }: TeamCalloutProps) {
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const seedColor = getSeedColor(team.seed)
  const regionColor = REGION_COLORS[team.region] ?? "#888"
  const regionAbbrev = REGION_ABBREV[team.region] ?? team.region

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (longPressRef.current) clearTimeout(longPressRef.current)
    }
  }, [])

  // ── Desktop hover ──
  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setOpen(true), 200)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setOpen(false), 150)
  }, [])

  // ── Desktop click toggle ──
  const handleClick = useCallback(() => {
    setOpen(prev => !prev)
  }, [])

  // ── Mobile long-press ──
  const handleTouchStart = useCallback(() => {
    longPressRef.current = setTimeout(() => {
      setOpen(true)
    }, LONG_PRESS_MS)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current)
      longPressRef.current = null
    }
  }, [])

  const handleTouchMove = useCallback(() => {
    // Cancel long-press if finger moves (scrolling)
    if (longPressRef.current) {
      clearTimeout(longPressRef.current)
      longPressRef.current = null
    }
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn("inline-flex", className)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          {...(!interactiveChild && { onClick: handleClick })}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
        >
          {children}
        </div>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="center"
        sideOffset={6}
        collisionPadding={12}
        avoidCollisions
        sticky="always"
        className="w-auto min-w-[240px] max-h-[var(--radix-popper-available-height)] p-0 bg-popover border border-border/60 rounded-lg shadow-lg text-xs whitespace-nowrap overflow-y-auto overflow-x-hidden"
        onOpenAutoFocus={e => e.preventDefault()}
        onCloseAutoFocus={e => e.preventDefault()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* ── Shared Header ── */}
        <CardHeader
          team={team}
          seedColor={seedColor}
          regionColor={regionColor}
          regionAbbrev={regionAbbrev}
        />

        {/* ── Pre-tournament vs live body ── */}
        {team.isPreTournament ? (
          <PreTournamentBody team={team} />
        ) : (
          <LiveBody team={team} />
        )}
      </PopoverContent>
    </Popover>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Card Header (shared between pre-tournament and live)
// ═══════════════════════════════════════════════════════════════════════════════

function CardHeader({
  team,
  seedColor,
  regionColor,
  regionAbbrev,
}: {
  team: TeamCalloutData
  seedColor: string
  regionColor: string
  regionAbbrev: string
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-muted/20">
      {team.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logoUrl} alt="" className="w-7 h-7 object-contain shrink-0" />
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
          {/* Status badge — live only */}
          {!team.isPreTournament && (
            team.eliminated ? (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">
                Eliminated
              </span>
            ) : (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">
                Alive
              </span>
            )
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span
            className="text-[8px] font-bold px-1 rounded text-white"
            style={{ backgroundColor: regionColor }}
          >
            {regionAbbrev}
          </span>
          <span className="text-[10px] text-muted-foreground">{team.region} Region</span>
          {team.conference && (
            <>
              <span className="text-[10px] text-muted-foreground/40 mx-0.5">·</span>
              <span className="text-[10px] text-muted-foreground">{team.conference}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Shared sections (used by both pre-tournament and live)
// ═══════════════════════════════════════════════════════════════════════════════

function RankingsSection({ team }: { team: TeamCalloutData }) {
  if (team.sCurveRank == null && team.kenpomRank == null && team.bpiRank == null) return null
  return (
    <div className="px-3 py-1.5 border-b border-border/20">
      <div className="text-[8px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-0.5">
        Rankings
      </div>
      <div className="flex items-center gap-3 text-[11px]">
        {team.sCurveRank != null && (
          <div>
            <span className="text-muted-foreground">S-Curve </span>
            <span className="font-semibold text-foreground">#{team.sCurveRank}</span>
          </div>
        )}
        {team.kenpomRank != null && (
          <div>
            <span className="text-muted-foreground">KenPom </span>
            <span className="font-semibold text-foreground">#{team.kenpomRank}</span>
          </div>
        )}
        {team.bpiRank != null && (
          <div>
            <span className="text-muted-foreground">BPI </span>
            <span className="font-semibold text-foreground">#{team.bpiRank}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function RecordSection({ team }: { team: TeamCalloutData }) {
  if (!team.record) return null
  return (
    <div className="px-3 py-1.5 border-b border-border/20">
      <div className="text-[8px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-0.5">
        Record
      </div>
      <div className="text-[11px] font-semibold text-foreground">{team.record} overall</div>
      {team.confRegSeasonChamp && (
        <div className="text-[10px] text-muted-foreground mt-0.5">
          <span className="mr-1">🏆</span>Conference reg. season champ
        </div>
      )}
      {team.confTourneyChamp && (
        <div className="text-[10px] text-muted-foreground mt-0.5">
          <span className="mr-1">🏆</span>Conference tournament champ
        </div>
      )}
    </div>
  )
}

function TrackRecordSection({ team }: { team: TeamCalloutData }) {
  const hasCinderella = team.cinderellaWins != null && team.cinderellaWins > 0
  const hasUpset = team.upsetLosses != null && team.upsetLosses > 0
  if (!hasCinderella && !hasUpset) return null
  return (
    <div className="px-3 py-1.5 border-b border-border/20">
      <div className="text-[8px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-0.5">
        Track Record
      </div>
      {hasCinderella && (
        <div className="text-[10px] text-muted-foreground">
          <span className="mr-1">🔮</span>
          {team.cinderellaWins} cinderella win{team.cinderellaWins !== 1 ? "s" : ""}{" "}
          <span className="text-muted-foreground/60">(KenPom underdog)</span>
        </div>
      )}
      {hasUpset && (
        <div className="text-[10px] text-muted-foreground mt-0.5">
          <span className="mr-1">⚡</span>
          {team.upsetLosses} upset loss{team.upsetLosses !== 1 ? "es" : ""}{" "}
          <span className="text-muted-foreground/60">(KenPom favorite)</span>
        </div>
      )}
    </div>
  )
}

function WinProbabilitiesSection({ team }: { team: TeamCalloutData }) {
  const probs = team.cumulativeProbabilities
  const roundLabels = ["R64", "R32", "S16", "E8", "F4", "Champ"]
  if (!probs || probs.length < 7) return null

  const isLive = !team.isPreTournament
  return (
    <div className="px-3 py-1.5">
      <div className="text-[8px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">
        Win Probabilities
      </div>
      <div className="grid grid-cols-6 gap-x-1 text-center">
        {roundLabels.map((label, i) => {
          const pct = (probs[i + 1] ?? 0) * 100
          const isCompleted = isLive && i < team.wins
          return (
            <div key={label} className="flex flex-col items-center">
              <span className="text-[7px] text-muted-foreground/60 font-medium">{label}</span>
              <span className={cn(
                "text-[10px] font-semibold",
                isCompleted ? "text-green-400" :
                pct >= 50 ? "text-green-400" :
                pct >= 20 ? "text-foreground" :
                pct >= 5 ? "text-muted-foreground" :
                "text-muted-foreground/50"
              )}>
                {isCompleted ? "\u2713" :
                 pct >= 1 ? `${Math.round(pct)}%` :
                 pct >= 0.1 ? `${pct.toFixed(1)}%` : "<0.1%"}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pre-tournament card body
// ═══════════════════════════════════════════════════════════════════════════════

function PreTournamentBody({ team }: { team: TeamCalloutData }) {
  const maxPossible = team.seed * 6

  return (
    <div className="space-y-0">
      {/* ── Slipper8s Value ── */}
      <div className="px-3 py-1.5 border-b border-border/20">
        <div className="text-[8px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-0.5">
          Slipper8s Value
        </div>
        <div className="flex items-baseline gap-3">
          {team.expectedScore != null && (
            <div className="flex items-baseline gap-1">
              <span className="text-muted-foreground text-[10px]">Exp.</span>
              <span className="font-bold text-foreground text-sm">{team.expectedScore.toFixed(1)}</span>
              <span className="text-muted-foreground text-[10px]">pts</span>
            </div>
          )}
          <div className="flex items-baseline gap-1">
            <span className="text-muted-foreground text-[10px]">Max</span>
            <span className="font-mono font-semibold text-primary text-[11px]">{maxPossible}</span>
          </div>
        </div>
      </div>

      <RankingsSection team={team} />
      <RecordSection team={team} />
      <TrackRecordSection team={team} />
      <WinProbabilitiesSection team={team} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// During/post-tournament card body
// ═══════════════════════════════════════════════════════════════════════════════

function LiveBody({ team }: { team: TeamCalloutData }) {
  const score = team.score ?? team.seed * team.wins
  const ppr = team.ppr ?? (team.eliminated ? 0 : team.seed * Math.max(0, 6 - team.wins))
  const maxScore = team.maxScore ?? score + ppr

  return (
    <div className="space-y-0">
      {/* ── Slipper8s Value ── */}
      <div className="px-3 py-1.5 border-b border-border/20">
        <div className="text-[8px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-0.5">
          Slipper8s Value
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <div className="flex items-baseline gap-1">
            <span className="text-muted-foreground text-[10px]">Wins</span>
            <span className="font-bold text-foreground text-sm">{team.wins}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-muted-foreground text-[10px]">Score</span>
            <span className="font-bold text-foreground text-sm">{score}</span>
          </div>
          {team.expectedScore != null && (
            <div className="flex items-baseline gap-1">
              <span className="text-muted-foreground text-[10px]">Exp.</span>
              <span className="font-semibold text-foreground text-[11px]">{team.expectedScore.toFixed(1)}</span>
            </div>
          )}
          {!team.eliminated && (
            <div className="flex items-baseline gap-1">
              <span className="text-muted-foreground text-[10px]">TPS</span>
              <span className="font-mono font-bold text-primary text-[11px]">{maxScore}</span>
            </div>
          )}
        </div>
      </div>

      <RankingsSection team={team} />
      <RecordSection team={team} />
      <TrackRecordSection team={team} />

      {/* ── Next Game (live-only) ── */}
      {team.nextOpponent && (
        <div className="px-3 py-1.5 border-b border-border/20">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Next</span>
            <span className="font-semibold text-foreground">
              vs {team.nextOpponent}
              {team.winProbability != null && (
                <span className="ml-1 text-muted-foreground">({team.winProbability}%)</span>
              )}
            </span>
          </div>
        </div>
      )}

      <WinProbabilitiesSection team={team} />
    </div>
  )
}
