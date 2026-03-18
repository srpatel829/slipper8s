"use client"

import { useState, useMemo, useEffect } from "react"
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
import { calculateEntryExpectedScore } from "@/lib/silver-bulletin-2026"
import { classifyArchetypes, type ArchetypeResult } from "@/lib/archetypes"
import { PicksConfirmationDialog } from "@/components/picks/picks-confirmation-dialog"
import { PlayInLogoBox } from "@/components/picks/play-in-logo-box"
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
  leagueIds?: string[]                  // league IDs to link when creating new entry
  isPreTournament?: boolean             // timeline state: true when pre-tournament
  firstName?: string                    // user's first name for confirmation dialog
  entryNickname?: string | null         // entry nickname for confirmation dialog
  onSelectionChange?: (picks: SelectedPick[]) => void  // notify parent when picks change (for bracket sync)
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
  leagueIds,
  isPreTournament = false,
  firstName,
  entryNickname,
  onSelectionChange,
}: PicksFormProps) {
  const router = useRouter()
  // Only treat as editing if we have an actual entry to update (not just generated picks)
  const isEditing = existingPicks.length > 0 && !!entryId

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
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [confirmationData, setConfirmationData] = useState<{
    nickname: string | null
    teams: { name: string; shortName: string; seed: number; region: string; logoUrl: string | null; logoUrl2?: string | null }[]
    tps: number
    expectedScore: number | null
    archetypes: ArchetypeResult[]
  } | null>(null)

  // Notify parent of selection changes (for bracket sync)
  useEffect(() => {
    onSelectionChange?.(selected)
  }, [selected, onSelectionChange])

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
        if (leagueIds && leagueIds.length > 0) {
          payload.leagueIds = leagueIds
        }
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
      const data = await res.json()
      // Build confirmation teams — show both names/logos for unresolved play-in slots
      const confirmTeams: { name: string; shortName: string; seed: number; region: string; logoUrl: string | null; logoUrl2?: string | null }[] = []
      for (const t of selectedTeamObjects) {
        confirmTeams.push({
          name: t.name,
          shortName: (t as any).shortName ?? t.name,
          seed: t.seed,
          region: t.region ?? "",
          logoUrl: (t as any).logoUrl ?? null,
        })
      }
      for (const slot of selectedPlayInSlots) {
        if (slot.winner) {
          confirmTeams.push({
            name: slot.winner.name,
            shortName: slot.winner.shortName ?? slot.winner.name,
            seed: slot.winner.seed,
            region: slot.winner.region ?? "",
            logoUrl: slot.winner.logoUrl ?? null,
          })
        } else {
          confirmTeams.push({
            name: `${slot.team1.name} / ${slot.team2.name}`,
            shortName: `${slot.team1.shortName} / ${slot.team2.shortName}`,
            seed: slot.team1.seed,
            region: slot.team1.region ?? "",
            logoUrl: slot.team1.logoUrl ?? null,
            logoUrl2: slot.team2.logoUrl ?? null,
          })
        }
      }
      setConfirmationData({
        nickname: data.nickname ?? entryNickname ?? null,
        teams: confirmTeams,
        tps: bracketTPS,
        expectedScore,
        archetypes,
      })
      setConfirmationOpen(true)
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

  // ── Play-in slot lookup map ──
  const playInSlotMap = useMemo(() => {
    const map = new Map<string, PlayInSlotWithTeams>()
    for (const slot of playInSlots) map.set(slot.id, slot)
    return map
  }, [playInSlots])

  // Selected play-in slot objects
  const selectedPlayInSlots = useMemo(() => {
    return Array.from(selectedSlotIds)
      .map(id => playInSlotMap.get(id!))
      .filter((s): s is PlayInSlotWithTeams => !!s)
  }, [selectedSlotIds, playInSlotMap])

  // ── Directly picked teams ──
  const selectedTeamObjects = useMemo(() => {
    return teams.filter(t => selectedTeamIds.has(t.id))
  }, [teams, selectedTeamIds])

  // ── Effective team data (direct picks + play-in representative teams) ──
  // For play-in: resolved → winner, unresolved → team1 as representative (same seed/region)
  const effectiveTeamData = useMemo(() => {
    const playInReps = selectedPlayInSlots.map(slot =>
      slot.winner ?? slot.team1
    )
    return [...selectedTeamObjects, ...playInReps]
  }, [selectedTeamObjects, selectedPlayInSlots])

  // ── TPS / Max score calculation (uses effectiveTeamData) ──
  const bracketTPS = useMemo(() => {
    if (effectiveTeamData.length === 0) return 0
    const infoMap = new Map<string, TeamBracketInfo>()
    for (const t of effectiveTeamData) {
      infoMap.set(t.id, {
        seed: t.seed,
        region: t.region ?? "",
        wins: (t as { wins?: number }).wins ?? 0,
        eliminated: (t as { eliminated?: boolean }).eliminated ?? false,
      })
    }
    const { totalPPR } = computeBracketAwarePPR(
      effectiveTeamData.map(t => t.id),
      infoMap
    )
    const currentScore = effectiveTeamData.reduce(
      (s, t) => s + t.seed * ((t as { wins?: number }).wins ?? 0), 0
    )
    return currentScore + totalPPR
  }, [effectiveTeamData])

  // ── Expected score calculation ──
  // For play-in slots: include BOTH teams' ESPN IDs so SB cumulative[0] < 1 is used
  const expectedScore = useMemo(() => {
    if (effectiveTeamData.length === 0) return null

    const teamIds: string[] = []
    const teamStates = new Map<string, { wins: number; eliminated: boolean }>()

    // Direct team picks
    for (const t of selectedTeamObjects) {
      const espnId = (t as { espnId?: string | null }).espnId ?? t.id
      teamIds.push(espnId)
      teamStates.set(espnId, {
        wins: (t as { wins?: number }).wins ?? 0,
        eliminated: (t as { eliminated?: boolean }).eliminated ?? false,
      })
    }

    // Play-in slot picks
    for (const slot of selectedPlayInSlots) {
      if (slot.winner) {
        // Resolved: just use winner
        const espnId = slot.winner.espnId ?? slot.winner.id
        teamIds.push(espnId)
        teamStates.set(espnId, {
          wins: (slot.winner as { wins?: number }).wins ?? 0,
          eliminated: (slot.winner as { eliminated?: boolean }).eliminated ?? false,
        })
      } else {
        // Unresolved: add BOTH teams — their cumulative[0] < 1 accounts for P(play-in win)
        for (const t of [slot.team1, slot.team2]) {
          const espnId = t.espnId ?? t.id
          teamIds.push(espnId)
          teamStates.set(espnId, { wins: 0, eliminated: false })
        }
      }
    }

    const allZeroWins = effectiveTeamData.every(t => ((t as { wins?: number }).wins ?? 0) === 0)
    const preTournament = allZeroWins && !effectiveTeamData.some(t => (t as { eliminated?: boolean }).eliminated)
    return calculateEntryExpectedScore(teamIds, teamStates, preTournament)
  }, [effectiveTeamData, selectedTeamObjects, selectedPlayInSlots])

  // ── Archetype classification (uses effectiveTeamData) ──
  const archetypes = useMemo(() => {
    if (effectiveTeamData.length !== MAX_PICKS) return []
    return classifyArchetypes(
      effectiveTeamData.map(t => t.seed),
      effectiveTeamData.map(t => t.region ?? ""),
    )
  }, [effectiveTeamData])

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
                const pickSlot = pick?.playInSlotId ? playInSlotMap.get(pick.playInSlotId) : null
                const seed = pickTeam?.seed ?? pickSlot?.seed
                const dotColor = seed != null ? getSeedColor(seed) : undefined
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
                  Max: <span className="font-mono font-bold text-primary">{bracketTPS}</span>
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
          {selected.map((pick, idx) => {
            // Direct team pick
            if (pick.teamId) {
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
                    wins={wins}
                    eliminated={eliminated}
                    size="md"
                    className="cursor-pointer"
                  />
                </TeamCallout>
              )
            }

            // Play-in slot pick
            if (pick.playInSlotId) {
              const slot = playInSlotMap.get(pick.playInSlotId)
              if (!slot) return null

              // Resolved play-in: show the winner as a normal TeamLogoBox
              if (slot.winner) {
                const w = slot.winner
                const calloutData = buildTeamCalloutData(
                  { id: w.id, name: w.name, shortName: w.shortName ?? w.name, seed: w.seed, region: w.region ?? "", wins: (w as { wins?: number }).wins ?? 0, eliminated: (w as { eliminated?: boolean }).eliminated ?? false, logoUrl: w.logoUrl ?? null, espnId: w.espnId ?? null, conference: (w as { conference?: string | null }).conference ?? null },
                  isPreTournament,
                )
                return (
                  <TeamCallout key={`slot-${slot.id}`} team={calloutData}>
                    <TeamLogoBox
                      seed={w.seed}
                      region={w.region ?? ""}
                      logoUrl={w.logoUrl ?? null}
                      shortName={w.shortName ?? w.name}
                      wins={(w as { wins?: number }).wins ?? 0}
                      eliminated={(w as { eliminated?: boolean }).eliminated ?? false}
                      size="md"
                      className="cursor-pointer"
                    />
                  </TeamCallout>
                )
              }

              // Unresolved play-in: alternating logo box
              return (
                <PlayInLogoBox
                  key={`slot-${slot.id}`}
                  seed={slot.seed}
                  region={slot.region ?? ""}
                  team1LogoUrl={slot.team1.logoUrl ?? null}
                  team2LogoUrl={slot.team2.logoUrl ?? null}
                  team1ShortName={slot.team1.shortName ?? slot.team1.name}
                  team2ShortName={slot.team2.shortName ?? slot.team2.name}
                  size="md"
                  className="cursor-pointer"
                />
              )
            }

            return null
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
            const regionTeams = teams.filter((t) => t.region === region)
            const regionPlayIns = playInSlots.filter(s => s.region === region)
            // Combine teams and play-in slots, sorted by seed
            const items: Array<{ type: "team"; data: Team } | { type: "slot"; data: PlayInSlotWithTeams }> = [
              ...regionTeams.map(t => ({ type: "team" as const, data: t })),
              ...regionPlayIns.map(s => ({ type: "slot" as const, data: s })),
            ].sort((a, b) => {
              const seedA = a.type === "team" ? a.data.seed : a.data.seed
              const seedB = b.type === "team" ? b.data.seed : b.data.seed
              return seedA - seedB
            })
            return (
              <TabsContent key={region} value={region} className="mt-0 pt-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {items.map(item =>
                    item.type === "team"
                      ? renderTeamCard(item.data)
                      : renderPlayInSlot(item.data)
                  )}
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
                  {(() => {
                    const items: Array<{ type: "team"; data: Team } | { type: "slot"; data: PlayInSlotWithTeams }> = [
                      ...tierTeams.map(t => ({ type: "team" as const, data: t })),
                      ...tierPlayIns.map(s => ({ type: "slot" as const, data: s })),
                    ].sort((a, b) => {
                      const seedA = a.type === "team" ? a.data.seed : a.data.seed
                      const seedB = b.type === "team" ? b.data.seed : b.data.seed
                      if (seedA !== seedB) return seedA - seedB
                      const regionA = a.type === "team" ? a.data.region : a.data.region ?? ""
                      const regionB = b.type === "team" ? b.data.region : b.data.region ?? ""
                      return regionA.localeCompare(regionB)
                    })
                    return items.map(item =>
                      item.type === "team"
                        ? renderTeamCard(item.data)
                        : renderPlayInSlot(item.data)
                    )
                  })()}
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

      {/* Picks confirmation dialog */}
      {firstName && confirmationData && (
        <PicksConfirmationDialog
          open={confirmationOpen}
          onOpenChange={setConfirmationOpen}
          firstName={firstName}
          nickname={confirmationData.nickname}
          teams={confirmationData.teams}
          tps={confirmationData.tps}
          expectedScore={confirmationData.expectedScore}
          archetypes={confirmationData.archetypes}
        />
      )}
    </div>
  )
}
