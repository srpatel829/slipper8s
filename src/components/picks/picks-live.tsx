"use client"

/**
 * PicksLive — Client wrapper that adds QuickPickGenerator and bracket picking
 * to the live picks page. Matches the demo picks experience.
 */

import { useState, useMemo, useCallback, useEffect } from "react"
import { PicksForm } from "@/components/picks/picks-form"
import { QuickPickGenerator } from "@/components/picks/quick-pick-generator"
import { BracketView } from "@/components/picks/bracket-view"
import { AdvancingBracket } from "@/components/bracket/advancing-bracket"
import { CharityInput } from "@/components/picks/charity-input"
import { EntrySelector } from "@/components/picks/entry-selector"
import { CountdownTimer } from "@/components/landing/countdown-timer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Lock, LayoutTemplate, Grid2X2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SelectedPick } from "@/components/picks/picks-form"

/* eslint-disable @typescript-eslint/no-explicit-any */
interface PicksLiveProps {
  teams: any[]
  playInSlots: any[]
  entries: any[]
  activeEntry: any | null
  userId: string
  userName: string | null
  seasonId: string
  deadlinePassed: boolean
  picksDeadline: string | null
  defaultCharities: Array<{ name: string; url?: string }>
  userLeagues?: Array<{ id: string; name: string }>
}

export function PicksLive({
  teams,
  playInSlots,
  entries,
  activeEntry,
  userId,
  userName,
  seasonId,
  deadlinePassed,
  picksDeadline,
  defaultCharities,
  userLeagues,
}: PicksLiveProps) {
  const [formKey, setFormKey] = useState(0)
  const [generatedPicks, setGeneratedPicks] = useState<SelectedPick[] | null>(null)
  const [charity, setCharity] = useState<string>(
    activeEntry?.entryPicks?.[0]?.charityPreference ?? activeEntry?.charityPreference ?? ""
  )

  // Reset generated picks when switching entries so each entry loads its own picks
  useEffect(() => {
    setGeneratedPicks(null)
    setCharity(activeEntry?.entryPicks?.[0]?.charityPreference ?? activeEntry?.charityPreference ?? "")
  }, [activeEntry?.id])

  // Build existing picks from active entry
  const existingPicks = useMemo(() => {
    if (generatedPicks) {
      // QuickPick or bracket-generated picks
      return generatedPicks.map((p, i) => ({
        id: `gen-pick-${i}`,
        userId,
        teamId: p.teamId ?? null,
        playInSlotId: p.playInSlotId ?? null,
        charityPreference: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        team: p.teamId ? (teams.find(t => t.id === p.teamId) ?? null) : null,
        playInSlot: null,
      }))
    }

    if (!activeEntry) return []

    return activeEntry.entryPicks.map((ep: any) => ({
      id: ep.id,
      userId,
      teamId: ep.teamId,
      playInSlotId: ep.playInSlotId,
      charityPreference: null,
      createdAt: ep.createdAt,
      updatedAt: ep.updatedAt,
      team: ep.team,
      playInSlot: ep.playInSlot,
    }))
  }, [activeEntry, generatedPicks, userId, teams])

  // Build bracket teams: always use synthetic "playin-{slotId}" entries for play-in seeds
  // so the ID matches selectedTeamIds and highlighting works correctly.
  // For resolved slots: show winner's name/logo. For unresolved: show "Team1/Team2".
  const bracketTeams = useMemo(() => {
    // Collect all resolved play-in winner IDs to filter them from the base team list
    const resolvedWinnerIds = new Set<string>()
    for (const slot of playInSlots) {
      if (slot.winnerId) resolvedWinnerIds.add(slot.winnerId)
    }
    // Start with teams minus any resolved play-in winners (they'll be replaced by synthetic entries)
    const result = teams.filter((t: any) => !resolvedWinnerIds.has(t.id))
    for (const slot of playInSlots) {
      const winner = slot.winnerId ? (slot.winner ?? slot.team1) : null
      // For resolved slots, find the full team record to get espnId/conference for hover cards
      const winnerFull = winner ? teams.find((t: any) => t.id === winner.id) : null
      result.push({
        id: `playin-${slot.id}`,
        name: winner ? winner.name : `${slot.team1.name} / ${slot.team2.name}`,
        shortName: winner ? winner.shortName : `${slot.team1.shortName}/${slot.team2.shortName}`,
        seed: slot.seed,
        region: slot.region,
        logoUrl: winner?.logoUrl ?? null,
        eliminated: (winnerFull as any)?.eliminated ?? false,
        wins: (winnerFull as any)?.wins ?? (winner as any)?.wins ?? 0,
        isPlayIn: false, // treat as regular team for bracket rendering
        espnId: (winnerFull as any)?.espnId ?? null,
        conference: (winnerFull as any)?.conference ?? null,
      })
    }
    return result
  }, [teams, playInSlots])

  // Selected team IDs for bracket view sync (includes synthetic "playin-xxx" IDs)
  const selectedTeamIds = useMemo((): Set<string> => {
    const src = generatedPicks
      ?? existingPicks.map((p: any) => ({ teamId: p.teamId ?? undefined, playInSlotId: p.playInSlotId ?? undefined }))
    const ids: string[] = []
    for (const p of src) {
      if (p.teamId) ids.push(p.teamId)
      else if (p.playInSlotId) ids.push(`playin-${p.playInSlotId}`)
    }
    return new Set(ids)
  }, [generatedPicks, existingPicks])

  function handleQuickPick(picks: SelectedPick[]) {
    setGeneratedPicks(picks)
    setFormKey(k => k + 1)
  }

  function handleClearPicks() {
    setGeneratedPicks([])
    setFormKey(k => k + 1)
  }

  // Sync form selections → bracket highlighting (without remounting form)
  const handleSelectionChange = useCallback((picks: SelectedPick[]) => {
    setGeneratedPicks(picks)
  }, [])

  // Build a lookup: resolved play-in winnerId → slotId (for duplicate prevention)
  const winnerToSlotId = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of playInSlots) {
      if (s.winnerId) map.set(s.winnerId, s.id)
    }
    return map
  }, [playInSlots])

  const handleBracketToggle = useCallback((teamId: string) => {
    if (deadlinePassed) return
    setGeneratedPicks(prev => {
      const current: SelectedPick[] = prev
        ?? existingPicks.map((p: any) => ({ teamId: p.teamId ?? undefined, playInSlotId: p.playInSlotId ?? undefined }))

      // Detect synthetic play-in IDs (from bracket's synthetic "playin-xxx" teams)
      if (teamId.startsWith("playin-")) {
        const slotId = teamId.slice("playin-".length)
        const existing = current.find(p => p.playInSlotId === slotId)
        if (existing) {
          return current.filter(p => p.playInSlotId !== slotId)
        } else if (current.length < 8) {
          return [...current, { playInSlotId: slotId }]
        }
        return current
      }

      // Check if this team is already covered by a play-in slot pick
      const coveredSlotId = winnerToSlotId.get(teamId)
      if (coveredSlotId && current.some(p => p.playInSlotId === coveredSlotId)) {
        return current // Already picked via play-in slot, don't allow duplicate
      }

      // Regular team toggle
      const existing = current.find(p => p.teamId === teamId)
      if (existing) {
        return current.filter(p => p.teamId !== teamId)
      } else if (current.length < 8) {
        return [...current, { teamId }]
      }
      return current
    })
    setFormKey(k => k + 1)
  }, [deadlinePassed, existingPicks, winnerToSlotId])

  const hasAnyPicks = selectedTeamIds.size > 0

  return (
    <div className="space-y-6">
      {/* Header with Quick Pick + Clear + Countdown */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Picks</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Select exactly 8 teams.{" "}
            {deadlinePassed
              ? "Picks are locked."
              : "Edit anytime before the deadline."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!deadlinePassed && (
            <>
              <QuickPickGenerator teams={teams} onGenerate={handleQuickPick} />
              {hasAnyPicks && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/40"
                  onClick={handleClearPicks}
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
            </>
          )}
          {!deadlinePassed && picksDeadline && (
            <CountdownTimer deadline={picksDeadline} compact />
          )}
        </div>
      </div>

      {/* Entry selector — shows when user has multiple entries */}
      <EntrySelector
        entries={entries}
        activeEntryId={activeEntry?.id ?? null}
        seasonId={seasonId}
        deadlinePassed={deadlinePassed}
        userName={userName}
        userLeagues={userLeagues}
      />

      {/* Deadline-passed banner */}
      {deadlinePassed && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
          <Lock className="h-4 w-4 shrink-0" />
          The picks deadline has passed. Your picks are locked.
        </div>
      )}

      {/* Picks form */}
      <PicksForm
        key={`picks-${activeEntry?.id ?? "new"}-${formKey}`}
        teams={teams}
        playInSlots={playInSlots}
        existingPicks={existingPicks as Parameters<typeof PicksForm>[0]["existingPicks"]}
        deadlinePassed={deadlinePassed}
        defaultCharities={defaultCharities}
        enableViewModes={true}
        hideCharity={true}
        charityValue={charity}
        onCharityChange={setCharity}
        entryId={activeEntry?.id ?? undefined}
        seasonId={seasonId}
        leagueIds={!activeEntry ? userLeagues?.map((l) => l.id) : undefined}
        firstName={userName?.split(" ")[0] ?? undefined}
        entryNickname={activeEntry?.nickname ?? null}
        onSelectionChange={handleSelectionChange}
      />

      {/* Bracket picking views — only shown when picks are open */}
      {!deadlinePassed && (
        <Tabs defaultValue="advancing">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tournament Bracket
            </p>
            <TabsList className="h-7 text-[10px]">
              <TabsTrigger value="advancing" className="gap-1 h-6 px-2 text-[10px]">
                <LayoutTemplate className="h-3 w-3" />
                Advancing
              </TabsTrigger>
              <TabsTrigger value="classic" className="gap-1 h-6 px-2 text-[10px]">
                <Grid2X2 className="h-3 w-3" />
                Classic
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="advancing" className="mt-0">
            <AdvancingBracket
              teams={bracketTeams}
              mode="picks"
              selectedTeamIds={selectedTeamIds}
              onToggleTeam={handleBracketToggle}
              gameSequence={[]}
              gameIndex={-1}
              disabled={deadlinePassed}
              isPreTournament={true}
              playInSlots={playInSlots.map((s: any) => ({
                id: s.id,
                seed: s.seed,
                region: s.region,
                team1ShortName: s.team1.shortName,
                team2ShortName: s.team2.shortName,
                team1LogoUrl: s.team1.logoUrl,
                team2LogoUrl: s.team2.logoUrl,
                winnerId: s.winnerId,
              }))}
            />
          </TabsContent>
          <TabsContent value="classic" className="mt-0">
            <BracketView
              teams={bracketTeams}
              selectedTeamIds={selectedTeamIds}
              onToggleTeam={handleBracketToggle}
              disabled={deadlinePassed}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Charity preference — below bracket */}
      <CharityInput charity={charity} setCharity={setCharity} disabled={deadlinePassed} />
    </div>
  )
}
