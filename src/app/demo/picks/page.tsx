"use client"

/**
 * Demo Picks — reuses real PicksForm with demo data + QuickPickGenerator.
 * Picks are saved in DemoContext (no API calls).
 *
 * Pre-tournament (gameIndex = -1): form is open, scoring explainer + bracket view shown.
 * Post-start (gameIndex >= 0): form is locked with a "deadline passed" banner.
 */

import { useState, useMemo, useCallback } from "react"
import { PicksForm } from "@/components/picks/picks-form"
import { QuickPickGenerator } from "@/components/picks/quick-pick-generator"
import { BracketView } from "@/components/picks/bracket-view"
import { AdvancingBracket } from "@/components/bracket/advancing-bracket"
import { useDemoContext } from "@/lib/demo-context"
import { getR64Matchups } from "@/lib/demo-game-sequence"
import type { SelectedPick } from "@/components/picks/picks-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Lock, Lightbulb, X, LayoutTemplate, Grid2X2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DemoPicksPage() {
  const {
    currentPersona,
    demoUserPicks,
    setDemoUserPicks,
    teamsData,
    demoSettings,
    gameIndex,
    gameSequence,
  } = useDemoContext()

  const deadlinePassed = gameIndex >= 0

  // Key for force-remounting PicksForm when QuickPickGenerator/bracket changes picks
  const [formKey, setFormKey] = useState(0)
  const [generatedPicks, setGeneratedPicks] = useState<SelectedPick[] | null>(null)

  const currentPicks = demoUserPicks.get(currentPersona.userId) ?? []

  // Build fake existingPicks from current demo state or generated picks
  const sourcePicks: SelectedPick[] = generatedPicks ?? currentPicks.map(id => ({ teamId: id }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fakeExistingPicks = sourcePicks.map((p, i) => ({
    id: `demo-pick-${i}`,
    userId: currentPersona.userId,
    teamId: p.teamId ?? null,
    playInSlotId: p.playInSlotId ?? null,
    charityPreference: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    team: p.teamId ? (teamsData.find(t => t.id === p.teamId) ?? null) : null,
    playInSlot: null,
  }))

  // Track selectedTeamIds for the bracket view (synced with generatedPicks or currentPicks)
  const selectedTeamIds = useMemo(() => {
    return new Set(sourcePicks.map(p => p.teamId).filter((id): id is string => !!id))
  }, [sourcePicks])

  function handleQuickPick(picks: SelectedPick[]) {
    setGeneratedPicks(picks)
    setFormKey(k => k + 1) // remount PicksForm with new picks
  }

  function handleDemoSubmit(picks: SelectedPick[], _charity: string | null) {
    const teamIds = picks
      .map(p => p.teamId)
      .filter((id): id is string => !!id)
    setDemoUserPicks(currentPersona.userId, teamIds)
    setGeneratedPicks(null)
  }

  function handleClearPicks() {
    setGeneratedPicks([]) // empty picks
    setFormKey(k => k + 1) // remount form with empty state
  }

  // Bracket view toggle — updates generatedPicks and remounts form
  const handleBracketToggle = useCallback((teamId: string) => {
    if (deadlinePassed) return
    setGeneratedPicks(prev => {
      const current = prev ?? currentPicks.map(id => ({ teamId: id }))
      const existing = current.find(p => p.teamId === teamId)
      if (existing) {
        // Deselect
        return current.filter(p => p.teamId !== teamId)
      } else if (current.length < 8) {
        // Select
        return [...current, { teamId }]
      }
      return current
    })
    setFormKey(k => k + 1)
  }, [deadlinePassed, currentPicks])

  // Build matchupInfo map: teamId → "vs #X Opp · Max Xpts"
  const matchupInfoMap = useMemo(() => {
    if (deadlinePassed) return undefined
    const r64 = getR64Matchups(teamsData)
    const map = new Map<string, string>()
    for (const [id, opp] of r64) {
      const team = teamsData.find(t => t.id === id)
      if (!team) continue
      map.set(id, `vs #${opp.opponentSeed} ${opp.opponentShortName} · Max ${team.seed * 6}pts`)
    }
    return map
  }, [teamsData, deadlinePassed])

  // TeamsData already matches Prisma Team shape (from computeTeamsForPicks)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teams = teamsData as any[]

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Picks</h1>
          {!deadlinePassed && (
            <p className="text-muted-foreground text-sm mt-1">
              Select exactly 8 teams. Picks are open until the tournament starts.
            </p>
          )}
        </div>
        {!deadlinePassed && (
          <div className="flex items-center gap-2">
            <QuickPickGenerator teams={teamsData} onGenerate={handleQuickPick} />
            {(currentPicks.length > 0 || (generatedPicks && generatedPicks.length > 0)) && (
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
          </div>
        )}
      </div>

      {/* Deadline-passed banner */}
      {deadlinePassed && (
        <div className="space-y-2">
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0" />
            The picks deadline has passed. Your picks are locked.
          </div>
          <div className="rounded-md border border-border/40 bg-muted/20 p-3 text-sm text-muted-foreground flex items-center gap-2">
            <Lightbulb className="h-4 w-4 shrink-0 text-primary/60" />
            Set the timeline to <span className="text-foreground font-medium mx-1">Pre-Tournament</span>
            in the demo control panel below to test the full picks experience.
          </div>
        </div>
      )}

      {/* Bracket View — only shown pre-tournament */}
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
              teams={teamsData}
              mode="picks"
              selectedTeamIds={selectedTeamIds}
              onToggleTeam={handleBracketToggle}
              gameSequence={gameSequence}
              gameIndex={gameIndex}
              disabled={deadlinePassed}
            />
          </TabsContent>
          <TabsContent value="classic" className="mt-0">
            <BracketView
              teams={teamsData}
              selectedTeamIds={selectedTeamIds}
              onToggleTeam={handleBracketToggle}
              disabled={deadlinePassed}
            />
          </TabsContent>
        </Tabs>
      )}

      <PicksForm
        key={`${currentPersona.userId}-${formKey}`}
        teams={teams}
        playInSlots={[]}
        existingPicks={fakeExistingPicks as Parameters<typeof PicksForm>[0]["existingPicks"]}
        deadlinePassed={deadlinePassed}
        defaultCharities={demoSettings.defaultCharities}
        demoMode
        onDemoSubmit={handleDemoSubmit}
        matchupInfoMap={matchupInfoMap}
        enableViewModes
      />
    </div>
  )
}
