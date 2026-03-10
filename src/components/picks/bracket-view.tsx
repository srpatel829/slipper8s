"use client"

/**
 * BracketView — interactive NCAA tournament bracket visualization.
 *
 * Renders a standard 16-team single-elimination bracket per region with:
 * - 4 columns: R64 (8 matchups) → R32 (4) → S16 (2) → E8 (1)
 * - Connector lines between rounds via CSS borders
 * - Picked teams highlighted with primary color
 * - Clickable team cells for pick selection
 * - Zoom in/out controls
 * - Region tabs for switching between East/West/South/Midwest
 * - Bracket conflict warnings when two picked teams share a path
 *
 * Used in the demo picks page as a visual alternative to the text R64 matchup list.
 */

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import { seedToSlot } from "@/lib/bracket-ppr"

// ─── Constants ───────────────────────────────────────────────────────────────

/** Standard R64 bracket matchup order (display order for bracket layout) */
const R64_BRACKET_ORDER = [
  [1, 16], [8, 9], [5, 12], [4, 13], [6, 11], [3, 14], [7, 10], [2, 15],
] as const

const REGIONS = ["East", "West", "South", "Midwest"] as const

// ─── Types ──────────────────────────────────────────────────────────────────

interface TeamLike {
  id: string
  name: string
  shortName: string
  seed: number
  region: string
  logoUrl: string | null
  eliminated: boolean
  wins: number
  isPlayIn: boolean
}

interface BracketViewProps {
  teams: TeamLike[]
  selectedTeamIds: Set<string>
  onToggleTeam: (teamId: string) => void
  disabled: boolean
  activeRegion?: string
}

interface MatchupData {
  topTeam: TeamLike | null
  bottomTeam: TeamLike | null
  round: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Checks if two teams share a bracket path (same region, same subtree at some merge level) */
function sharesBracketPath(teamA: TeamLike, teamB: TeamLike): boolean {
  if (teamA.region !== teamB.region) return false
  const slotA = seedToSlot(teamA.seed)
  const slotB = seedToSlot(teamB.seed)
  if (slotA === -1 || slotB === -1) return false
  // They share a path if they're in the same merge group at any level
  // R32: pairs (0,1), (2,3), (4,5), (6,7)
  if (Math.floor(slotA / 2) === Math.floor(slotB / 2)) return true
  // S16: groups (0-3), (4-7)
  if (Math.floor(slotA / 4) === Math.floor(slotB / 4)) return true
  // E8: all same region
  return true // all teams in same region eventually meet
}

/** Get earliest meeting round for two teams in same region */
function getMeetingRound(seedA: number, seedB: number): number {
  const slotA = seedToSlot(seedA)
  const slotB = seedToSlot(seedB)
  if (slotA === -1 || slotB === -1) return 0
  if (Math.floor(slotA / 2) === Math.floor(slotB / 2)) return 2 // R32
  if (Math.floor(slotA / 4) === Math.floor(slotB / 4)) return 3 // S16
  return 4 // E8 (same region)
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function BracketTeamCell({
  team,
  isSelected,
  isConflict,
  disabled,
  onToggle,
  position, // 'top' or 'bottom' within a matchup
}: {
  team: TeamLike | null
  isSelected: boolean
  isConflict: boolean
  disabled: boolean
  onToggle: () => void
  position: "top" | "bottom"
}) {
  if (!team) {
    return (
      <div className={cn(
        "h-7 px-2 flex items-center gap-1.5 text-[10px] text-muted-foreground/40",
        "border-border/30",
        position === "top" ? "border-b border-b-border/20" : ""
      )}>
        <span className="text-[9px]">—</span>
        <span>TBD</span>
      </div>
    )
  }

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "h-7 px-2 flex items-center gap-1.5 text-[10px] w-full text-left transition-all",
        position === "top" ? "border-b border-b-border/20" : "",
        isSelected
          ? "bg-primary/15 text-foreground font-semibold"
          : "hover:bg-muted/40",
        isConflict && isSelected && "ring-1 ring-inset ring-amber-400/40",
        disabled && !isSelected && "opacity-40 cursor-not-allowed",
        team.eliminated && "opacity-30 line-through"
      )}
    >
      {/* Seed badge */}
      <span className={cn(
        "text-[9px] font-bold w-4 text-center shrink-0",
        isSelected ? "text-primary" : "text-muted-foreground"
      )}>
        {team.seed}
      </span>
      {/* Logo */}
      {team.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logoUrl} alt="" className="h-3.5 w-3.5 object-contain shrink-0" />
      )}
      {/* Name */}
      <span className="truncate">{team.shortName}</span>
      {/* Selected indicator */}
      {isSelected && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
      )}
    </button>
  )
}

function BracketMatchupCell({
  matchup,
  selectedTeamIds,
  conflictTeamIds,
  onToggleTeam,
  disabled,
  roundIndex,
}: {
  matchup: MatchupData
  selectedTeamIds: Set<string>
  conflictTeamIds: Set<string>
  onToggleTeam: (id: string) => void
  disabled: boolean
  roundIndex: number
}) {
  return (
    <div className={cn(
      "border border-border/40 rounded-md overflow-hidden bg-card/30",
      "min-w-[100px] sm:min-w-[120px]",
    )}>
      <BracketTeamCell
        team={matchup.topTeam}
        isSelected={matchup.topTeam ? selectedTeamIds.has(matchup.topTeam.id) : false}
        isConflict={matchup.topTeam ? conflictTeamIds.has(matchup.topTeam.id) : false}
        disabled={disabled || (matchup.topTeam ? false : true)}
        onToggle={() => matchup.topTeam && onToggleTeam(matchup.topTeam.id)}
        position="top"
      />
      <BracketTeamCell
        team={matchup.bottomTeam}
        isSelected={matchup.bottomTeam ? selectedTeamIds.has(matchup.bottomTeam.id) : false}
        isConflict={matchup.bottomTeam ? conflictTeamIds.has(matchup.bottomTeam.id) : false}
        disabled={disabled || (matchup.bottomTeam ? false : true)}
        onToggle={() => matchup.bottomTeam && onToggleTeam(matchup.bottomTeam.id)}
        position="bottom"
      />
    </div>
  )
}

// ─── Region Bracket ─────────────────────────────────────────────────────────

function RegionBracket({
  region,
  teams,
  selectedTeamIds,
  onToggleTeam,
  disabled,
  zoomLevel,
}: {
  region: string
  teams: TeamLike[]
  selectedTeamIds: Set<string>
  onToggleTeam: (id: string) => void
  disabled: boolean
  zoomLevel: number
}) {
  const regionTeams = useMemo(
    () => teams.filter(t => t.region === region && !t.isPlayIn),
    [teams, region]
  )

  // Build R64 matchups
  const r64Matchups: MatchupData[] = useMemo(() => {
    return R64_BRACKET_ORDER.map(([seedA, seedB]) => ({
      topTeam: regionTeams.find(t => t.seed === seedA) ?? null,
      bottomTeam: regionTeams.find(t => t.seed === seedB) ?? null,
      round: 1,
    }))
  }, [regionTeams])

  // Build R32 matchups (pairs of R64 winners)
  const r32Matchups: MatchupData[] = useMemo(() => {
    const matchups: MatchupData[] = []
    for (let i = 0; i < r64Matchups.length; i += 2) {
      matchups.push({ topTeam: null, bottomTeam: null, round: 2 })
    }
    return matchups
  }, [r64Matchups])

  // Build S16 matchups
  const s16Matchups: MatchupData[] = [
    { topTeam: null, bottomTeam: null, round: 3 },
    { topTeam: null, bottomTeam: null, round: 3 },
  ]

  // Build E8 matchup
  const e8Matchups: MatchupData[] = [
    { topTeam: null, bottomTeam: null, round: 4 },
  ]

  // Detect bracket conflicts (selected teams sharing a path)
  const conflictTeamIds = useMemo(() => {
    const conflicts = new Set<string>()
    const selectedInRegion = regionTeams.filter(t => selectedTeamIds.has(t.id))
    for (let i = 0; i < selectedInRegion.length; i++) {
      for (let j = i + 1; j < selectedInRegion.length; j++) {
        if (sharesBracketPath(selectedInRegion[i], selectedInRegion[j])) {
          conflicts.add(selectedInRegion[i].id)
          conflicts.add(selectedInRegion[j].id)
        }
      }
    }
    return conflicts
  }, [regionTeams, selectedTeamIds])

  // Conflict summary
  const conflictPairs = useMemo(() => {
    const pairs: string[] = []
    const selectedInRegion = regionTeams.filter(t => selectedTeamIds.has(t.id))
    for (let i = 0; i < selectedInRegion.length; i++) {
      for (let j = i + 1; j < selectedInRegion.length; j++) {
        const round = getMeetingRound(selectedInRegion[i].seed, selectedInRegion[j].seed)
        const roundName = round === 2 ? "R32" : round === 3 ? "S16" : "E8"
        pairs.push(`#${selectedInRegion[i].seed} vs #${selectedInRegion[j].seed} meet in ${roundName}`)
      }
    }
    return pairs
  }, [regionTeams, selectedTeamIds])

  const roundLabels = ["R64", "R32", "Sweet 16", "Elite 8"]
  const rounds = [r64Matchups, r32Matchups, s16Matchups, e8Matchups]

  return (
    <div>
      {/* Bracket tree */}
      <div
        className="overflow-x-auto overflow-y-hidden pb-2"
      >
        <div
          className="flex gap-1.5 sm:gap-3 min-w-fit"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: "top left",
          }}
        >
          {rounds.map((matchups, roundIdx) => {
            // Vertical spacing between matchups increases each round
            const gapClass = roundIdx === 0
              ? "gap-1"
              : roundIdx === 1
              ? "gap-[calc(0.25rem+14px+0.25rem)]" // gap = cell height + prev gap
              : roundIdx === 2
              ? "gap-[calc(0.25rem+14px+0.25rem+14px+0.25rem+14px+0.25rem)]"
              : "gap-0"

            return (
              <div key={roundIdx} className="flex flex-col items-start">
                {/* Round label */}
                <p className="text-[8px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-1 px-0.5">
                  {roundLabels[roundIdx]}
                </p>
                <div className={cn("flex flex-col justify-around flex-1", gapClass)}>
                  {matchups.map((matchup, i) => (
                    <div key={i} className="relative flex items-center">
                      <BracketMatchupCell
                        matchup={matchup}
                        selectedTeamIds={selectedTeamIds}
                        conflictTeamIds={conflictTeamIds}
                        onToggleTeam={onToggleTeam}
                        disabled={disabled}
                        roundIndex={roundIdx}
                      />
                      {/* Connector line to next round */}
                      {roundIdx < rounds.length - 1 && (
                        <div className="w-3 h-px bg-border/30 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Region champion slot */}
          <div className="flex flex-col justify-center">
            <p className="text-[8px] font-semibold text-primary/50 uppercase tracking-wider mb-1 px-0.5">
              Champion
            </p>
            <div className="h-7 px-3 flex items-center rounded-md border border-primary/20 bg-primary/5 text-[10px] text-primary font-semibold min-w-[80px]">
              {region}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function BracketView({
  teams,
  selectedTeamIds,
  onToggleTeam,
  disabled,
  activeRegion,
}: BracketViewProps) {
  const [zoomLevel, setZoomLevel] = useState(1.0)

  return (
    <div className="space-y-2">
      {/* Zoom controls */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          Click teams to select/deselect picks
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <span className="text-[10px] text-muted-foreground w-8 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setZoomLevel(z => Math.min(1.5, z + 0.25))}
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setZoomLevel(1.0)}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Region tabs with brackets */}
      <Tabs defaultValue={activeRegion ?? "East"}>
        <TabsList className="w-full grid grid-cols-4">
          {REGIONS.map(region => {
            const regionSelected = teams
              .filter(t => t.region === region && selectedTeamIds.has(t.id))
              .length
            return (
              <TabsTrigger key={region} value={region} className="gap-1 text-xs">
                {region}
                {regionSelected > 0 && (
                  <span className="bg-primary/20 text-primary text-[10px] font-bold px-1 rounded-full">
                    {regionSelected}
                  </span>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>
        {REGIONS.map(region => (
          <TabsContent key={region} value={region} className="mt-2">
            <RegionBracket
              region={region}
              teams={teams}
              selectedTeamIds={selectedTeamIds}
              onToggleTeam={onToggleTeam}
              disabled={disabled}
              zoomLevel={zoomLevel}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
