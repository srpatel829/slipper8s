"use client"

/**
 * PicksLive — Client wrapper that adds QuickPickGenerator and bracket picking
 * to the live picks page. Matches the demo picks experience.
 */

import { useState, useMemo, useCallback } from "react"
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
}: PicksLiveProps) {
  const [formKey, setFormKey] = useState(0)
  const [generatedPicks, setGeneratedPicks] = useState<SelectedPick[] | null>(null)
  const [charity, setCharity] = useState<string>(
    activeEntry?.entryPicks?.[0]?.charityPreference ?? activeEntry?.charityPreference ?? ""
  )

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

  // Build bracket teams: include synthetic entries for play-in slots ("Team1/Team2")
  const bracketTeams = useMemo(() => {
    const result = [...teams]
    for (const slot of playInSlots) {
      // Only add if no non-play-in team exists for this seed+region
      const hasTeam = teams.some((t: any) => t.seed === slot.seed && t.region === slot.region)
      if (!hasTeam) {
        result.push({
          id: `playin-${slot.id}`,
          name: `${slot.team1.name} / ${slot.team2.name}`,
          shortName: `${slot.team1.shortName}/${slot.team2.shortName}`,
          seed: slot.seed,
          region: slot.region,
          logoUrl: null,
          eliminated: false,
          wins: 0,
          isPlayIn: false, // treat as regular team for bracket rendering
          espnId: null,
          conference: null,
        })
      }
    }
    return result
  }, [teams, playInSlots])

  // Selected team IDs for bracket view sync
  const selectedTeamIds = useMemo((): Set<string> => {
    const picks = generatedPicks
      ?? existingPicks.map((p: any) => ({ teamId: p.teamId }))
    const ids: string[] = picks.map((p: any) => p.teamId).filter((id: any): id is string => !!id)
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

  const handleBracketToggle = useCallback((teamId: string) => {
    if (deadlinePassed) return
    setGeneratedPicks(prev => {
      const current: SelectedPick[] = prev
        ?? existingPicks.map((p: any) => ({ teamId: p.teamId ?? undefined, playInSlotId: p.playInSlotId ?? undefined }))
      const existing = current.find(p => p.teamId === teamId)
      if (existing) {
        return current.filter(p => p.teamId !== teamId)
      } else if (current.filter(p => p.teamId).length < 8) {
        return [...current, { teamId }]
      }
      return current
    })
    setFormKey(k => k + 1)
  }, [deadlinePassed, existingPicks])

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
