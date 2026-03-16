"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TeamCard } from "@/components/picks/team-card"
import { PlayInSlotCard } from "@/components/picks/play-in-slot"
import { SEED_TIERS } from "@/components/picks/picks-tracker"
import { Target, Heart, Lock, CheckCircle2, Layers, Grid2x2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { computeBracketAwarePPR, type TeamBracketInfo } from "@/lib/bracket-ppr"
import { getSeedColor } from "@/lib/colors"
import { TeamLogoBox } from "@/components/team-logo-box"
import { TeamCallout } from "@/components/team-callout"
import { buildTeamCalloutData } from "@/lib/team-callout-helpers"
import { calculateEntryExpectedScore, SB_2026_MAP } from "@/lib/silver-bulletin-2026"
import type { Team, PlayInSlot, Pick } from "@/generated/prisma"

type PlayInSlotWithTeams = PlayInSlot & {
  team1: Team
  team2: Team
  winner: Team | null
}

type PickWithRelations = Pick & {
  team: Team | null
  playInSlot: PlayInSlotWithTeams | null
}

interface PicksFormProps {
  teams: Team[]
  playInSlots: PlayInSlotWithTeams[]
  existingPicks: PickWithRelations[]
  deadlinePassed: boolean
  defaultCharities: Array<{ name: string; url?: string }>
  demoMode?: boolean
  onDemoSubmit?: (picks: SelectedPick[], charity: string | null) => void
  matchupInfoMap?: Map<string, string>  // teamId → "vs #X Opp · Max Xpts" — for demo pre-tournament
  enableViewModes?: boolean             // shows region/seed view toggles + enhanced tracker
  hideCharity?: boolean                 // hides inline charity section (render CharityInput externally)
  charityValue?: string                 // controlled charity value (when managed externally)
  onCharityChange?: (value: string) => void  // callback when charity changes (when managed externally)
  entryId?: string                      // current entry ID for updates
  seasonId?: string                     // current season ID for new entries
  isPreTournament?: boolean             // timeline state: true when pre-tournament
}

export type SelectedPick = { teamId?: string; playInSlotId?: string }

type ViewMode = "region" | "seed"

const MAX_PICKS = 8

export function PicksForm({
  teams,
  playInSlots,
  existingPicks,
  deadlinePassed,
  defaultCharities,
  demoMode,
  onDemoSubmit,
  matchupInfoMap,
  enableViewModes,
  hideCharity,
  charityValue,
  onCharityChange,
  entryId,
  seasonId,
  isPreTournament = false,
}: PicksFormProps) {
  const router = useRouter()
  const isEditing = existingPicks.length > 0

  const [selected, setSelected] = useState<SelectedPick[]>(() =>
    existingPicks.map((p) =>
      p.teamId ? { teamId: p.teamId } : { playInSlotId: p.playInSlotId! }
    )
  )
  const [internalCharity, setInternalCharity] = useState<string>(
    existingPicks[0]?.charityPreference ?? ""
  )
  // Use external charity state if provided, otherwise use internal
  const charity = charityValue ?? internalCharity
  const setCharity = onCharityChange ?? setInternalCharity
  const [submitting, setSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("region")

  const selectedTeamIds = new Set(selected.map((s) => s.teamId).filter(Boolean))
  const selectedSlotIds = new Set(selected.map((s) => s.playInSlotId).filter(Boolean))
  const remaining = MAX_PICKS - selected.length

  function toggleTeam(teamId: string) {
    if (deadlinePassed) return
    if (selectedTeamIds.has(teamId)) {
      setSelected((prev) => prev.filter((s) => s.teamId !== teamId))
    } else if (selected.length < MAX_PICKS) {
      setSelected((prev) => [...prev, { teamId }])
    }
  }

  function toggleSlot(playInSlotId: string) {
    if (deadlinePassed) return
    if (selectedSlotIds.has(playInSlotId)) {
      setSelected((prev) => prev.filter((s) => s.playInSlotId !== playInSlotId))
    } else if (selected.length < MAX_PICKS) {
      setSelected((prev) => [...prev, { playInSlotId }])
    }
  }

  async function handleSubmit() {
    if (selected.length !== MAX_PICKS) {
      toast.error(`Select exactly ${MAX_PICKS} teams (${selected.length} selected)`)
      return
    }
    if (demoMode && onDemoSubmit) {
      onDemoSubmit(selected, charity || null)
      toast.success(isEditing ? "Demo picks updated!" : "Demo picks submitted!")
      return
    }
    setSubmitting(true)
    try {
      const method = isEditing ? "PUT" : "POST"
      const payload: Record<string, unknown> = {
        picks: selected,
        charityPreference: charity || null,
      }
      if (method === "PUT" && entryId) {
        payload.entryId = entryId
      }
      if (method === "POST" && seasonId) {
        payload.seasonId = seasonId
      }
      const res = await fetch("/api/picks", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to save picks")
        return
      }
      toast.success(isEditing ? "Picks updated!" : "Picks submitted!")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  // Allow external quick-pick generators to set selections
  function setSelectedPicks(picks: SelectedPick[]) {
    if (!deadlinePassed) setSelected(picks)
  }

  const allRegions = [...new Set(teams.map((t) => t.region))].sort()

  // ── TPS calculation ──
  const selectedTeamObjects = useMemo(() => {
    return teams.filter(t => selectedTeamIds.has(t.id))
  }, [teams, selectedTeamIds])

  const bracketTPS = useMemo(() => {
    if (selectedTeamObjects.length === 0) return 0
    const infoMap = new Map<string, TeamBracketInfo>()
    for (const t of selectedTeamObjects) {
      infoMap.set(t.id, {
        seed: t.seed,
        region: t.region ?? "",
        wins: (t as { wins?: number }).wins ?? 0,
        eliminated: (t as { eliminated?: boolean }).eliminated ?? false,
      })
    }
    const { totalPPR } = computeBracketAwarePPR(
      selectedTeamObjects.map(t => t.id),
      infoMap
    )
    const currentScore = selectedTeamObjects.reduce(
      (s, t) => s + t.seed * ((t as { wins?: number }).wins ?? 0), 0
    )
    return currentScore + totalPPR
  }, [selectedTeamObjects])

  // ── Expected score calculation ──
  const expectedScore = useMemo(() => {
    if (selectedTeamObjects.length === 0) return null
    const teamIds = selectedTeamObjects.map(t => t.id)
    const teamStates = new Map(
      selectedTeamObjects.map(t => [t.id, {
        wins: (t as { wins?: number }).wins ?? 0,
        eliminated: (t as { eliminated?: boolean }).eliminated ?? false,
      }])
    )
    // Pre-tournament when no team has wins yet
    const allZeroWins = selectedTeamObjects.every(t => ((t as { wins?: number }).wins ?? 0) === 0)
    const preTournament = allZeroWins && !selectedTeamObjects.some(t => (t as { eliminated?: boolean }).eliminated)
    return calculateEntryExpectedScore(teamIds, teamStates, preTournament)
  }, [selectedTeamObjects])

  // ── Play-in slot renderer (inline within region/seed views) ──
  function renderPlayInSlot(slot: PlayInSlotWithTeams) {
    return (
      <PlayInSlotCard
        key={slot.id}
        slot={slot}
        selected={selectedSlotIds.has(slot.id)}
        onToggle={() => toggleSlot(slot.id)}
        disabled={deadlinePassed || (selected.length >= MAX_PICKS && !selectedSlotIds.has(slot.id))}
        isPreTournament={isPreTournament}
      />
    )
  }

  // ── Team card renderer (shared between view modes) ──
  function renderTeamCard(team: Team) {
    return (
      <TeamCard
        key={team.id}
        team={team}
        selected={selectedTeamIds.has(team.id)}
        onToggle={() => toggleTeam(team.id)}
        disabled={
          deadlinePassed ||
          (selected.length >= MAX_PICKS && !selectedTeamIds.has(team.id))
        }
        matchupInfo={matchupInfoMap?.get(team.id)}
        isPreTournament={isPreTournament}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Sticky progress bar */}
      <div className="sticky top-14 z-30 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between gap-4">
          {/* Simple progress dots */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {Array.from({ length: MAX_PICKS }, (_, i) => {
                const pick = i < selected.length ? selected[i] : null
                const pickTeam = pick?.teamId ? teams.find(t => t.id === pick.teamId) : null
                const dotColor = pickTeam ? getSeedColor(pickTeam.seed) : undefined
                return (
                  <div
                    key={i}
                    className={cn(
                      "h-2.5 w-2.5 rounded-full transition-all",
                      !pick && "bg-muted-foreground/20"
                    )}
                    style={dotColor ? { backgroundColor: dotColor } : undefined}
                  />
                )
              })}
            </div>
            <span className="text-sm font-semibold">
              <span className="text-primary">{selected.length}</span>
              <span className="text-muted-foreground">/{MAX_PICKS}</span>
            </span>
            {remaining > 0 && (
              <span className="text-xs text-muted-foreground hidden sm:block">Pick {remaining} more</span>
            )}
            {selected.length === MAX_PICKS && (
              <span className="text-xs text-primary flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Ready
              </span>
            )}
          </div>

          {deadlinePassed ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Locked
            </div>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting || selected.length !== MAX_PICKS}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-8"
            >
              {submitting ? "Saving…" : isEditing ? "Update picks" : "Submit picks"}
            </Button>
          )}
        </div>
      </div>

      {/* 8-pick summary with TPS + Expected Score */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Your Picks
          </h2>
          {selected.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {bracketTPS > 0 && (
                <div>
                  TPS: <span className="font-mono font-bold text-primary">{bracketTPS}</span>
                </div>
              )}
              {expectedScore != null && (
                <div>
                  Expected: <span className="font-mono font-bold text-foreground">{expectedScore.toFixed(1)}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {selected.map((pick) => {
            const team = teams.find(t => t.id === pick.teamId)
            if (!team) return null
            const wins = (team as { wins?: number }).wins ?? 0
            const eliminated = (team as { eliminated?: boolean }).eliminated ?? false
            const calloutData = buildTeamCalloutData(
              { id: team.id, name: team.name, shortName: team.shortName ?? team.name, seed: team.seed, region: team.region ?? "", wins, eliminated, logoUrl: (team as { logoUrl?: string | null }).logoUrl ?? null, espnId: (team as { espnId?: string | null }).espnId ?? null, conference: (team as { conference?: string | null }).conference ?? null },
              isPreTournament,
            )
            return (
              <TeamCallout key={team.id} team={calloutData}>
                <TeamLogoBox
                  seed={team.seed}
                  region={team.region ?? ""}
                  logoUrl={(team as { logoUrl?: string | null }).logoUrl ?? null}
                  shortName={team.shortName ?? team.name}
                  wins={(team as { wins?: number }).wins ?? 0}
                  eliminated={(team as { eliminated?: boolean }).eliminated ?? false}
                  size="md"
                  className="cursor-pointer"
                />
              </TeamCallout>
            )
          })}
          {Array.from({ length: MAX_PICKS - selected.length }).map((_, i) => (
            <div key={`empty-${i}`} className="w-10 h-10 rounded-md border-2 border-dashed border-border/30 bg-muted/10 shrink-0" />
          ))}
        </div>
      </div>

      {/* View mode selector — By Region and By Seed (no All Teams per spec) */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground mr-1.5 uppercase tracking-wider font-semibold">View</span>
        {([
          { mode: "region" as const, label: "By Region", icon: Grid2x2 },
          { mode: "seed" as const, label: "By Seed", icon: Layers },
        ]).map(({ mode, label, icon: Icon }) => (
          <Button
            key={mode}
            size="sm"
            variant={viewMode === mode ? "default" : "outline"}
            className={cn("h-7 text-xs gap-1", viewMode !== mode && "text-muted-foreground")}
            onClick={() => setViewMode(mode)}
          >
            <Icon className="h-3 w-3" />
            {label}
          </Button>
        ))}
      </div>

      {/* ── Region tabs view (default) ── */}
      {viewMode === "region" && (
        <Tabs defaultValue={allRegions[0] ?? "East"}>
          <TabsList className="w-full grid grid-cols-4">
            {allRegions.map((region) => {
              const regionTeamCount = teams
                .filter((t) => t.region === region && selectedTeamIds.has(t.id)).length
              const regionSlotCount = playInSlots
                .filter((s) => s.region === region && selectedSlotIds.has(s.id)).length
              const regionCount = regionTeamCount + regionSlotCount
              return (
                <TabsTrigger key={region} value={region} className="gap-1.5 text-xs">
                  {region}
                  {regionCount > 0 && (
                    <span className="bg-primary/20 text-primary text-[10px] font-bold px-1 rounded-full">
                      {regionCount}
                    </span>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>
          {allRegions.map((region) => {
            const regionPlayIns = playInSlots.filter(s => s.region === region)
            return (
              <TabsContent key={region} value={region} className="mt-0 pt-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {teams.filter((t) => t.region === region).map(renderTeamCard)}
                  {regionPlayIns.map(renderPlayInSlot)}
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      )}

      {/* ── By seed tier view ── */}
      {viewMode === "seed" && (
        <div className="space-y-5">
          {SEED_TIERS.map(tier => {
            const tierTeams = teams.filter(t => t.seed >= tier.range[0] && t.seed <= tier.range[1])
            const tierPlayIns = playInSlots.filter(s => s.seed >= tier.range[0] && s.seed <= tier.range[1])
            const tierSelected = tierTeams.filter(t => selectedTeamIds.has(t.id)).length
            return (
              <div key={tier.label}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("h-2.5 w-2.5 rounded-full", tier.dotClass)} />
                  <h3 className={cn("text-xs font-semibold uppercase tracking-wider", tier.textClass)}>
                    {tier.label} <span className="text-muted-foreground font-normal">(Seeds {tier.range[0]}-{tier.range[1]})</span>
                  </h3>
                  {tierSelected > 0 && (
                    <span className="text-[10px] font-bold text-primary bg-primary/15 px-1.5 rounded-full">{tierSelected}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {tierTeams.sort((a, b) => a.seed - b.seed || a.region.localeCompare(b.region)).map(renderTeamCard)}
                  {tierPlayIns.map(renderPlayInSlot)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Charity — hidden when parent renders it externally (e.g. below bracket) */}
      {!hideCharity && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3 max-w-md">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-400" />
            <Label htmlFor="charity" className="text-sm font-semibold">
              Charity preference
              <span className="text-muted-foreground font-normal ml-1">(optional)</span>
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Charities should be 501(c)(3) organizations.
          </p>
          <Input
            id="charity"
            placeholder="e.g. a 501(c)(3) organization"
            value={charity}
            onChange={(e) => setCharity(e.target.value)}
            disabled={deadlinePassed}
            className="bg-muted/50"
          />
          <p className="text-[10px] text-muted-foreground">
            Top 4 finishers&apos; charities are shown on the leaderboard.
          </p>
        </div>
      )}

      {/* Mobile submit */}
      {!deadlinePassed && (
        <div className="sm:hidden pb-4">
          <Button
            onClick={handleSubmit}
            disabled={submitting || selected.length !== MAX_PICKS}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            size="lg"
          >
            <Target className="h-4 w-4 mr-2" />
            {submitting ? "Saving…" : isEditing ? "Update picks" : "Submit picks"}
          </Button>
        </div>
      )}
    </div>
  )
}
