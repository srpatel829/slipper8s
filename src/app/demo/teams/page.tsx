"use client"

import { useMemo } from "react"
import { useDemoContext } from "@/lib/demo-context"
import { TeamsTable, type TeamRow } from "@/components/teams/teams-table"

export default function DemoTeamsPage() {
  const { teamsData, demoUserPicks } = useDemoContext()

  // Count how many demo users picked each team
  const pickerCountMap = useMemo(() => {
    const counts = new Map<string, number>()
    for (const picks of demoUserPicks.values()) {
      for (const teamId of picks) {
        counts.set(teamId, (counts.get(teamId) ?? 0) + 1)
      }
    }
    return counts
  }, [demoUserPicks])

  const totalDemoEntries = demoUserPicks.size

  const rows: TeamRow[] = useMemo(() => {
    return teamsData
      .filter(t => !t.isPlayIn)
      .map(t => ({
        id: t.id,
        name: t.name,
        shortName: t.shortName,
        seed: t.seed,
        region: t.region,
        eliminated: t.eliminated,
        wins: t.wins,
        logoUrl: t.logoUrl,
        conference: (t as Record<string, unknown>).conference as string ?? null,
        pickerCount: pickerCountMap.get(t.id) ?? 0,
      }))
  }, [teamsData, pickerCountMap])

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tournament Teams</h1>
        <p className="text-muted-foreground text-sm mt-1">
          All {rows.length} teams · {totalDemoEntries} entries · Default sort: % Selected
        </p>
      </div>
      <TeamsTable teams={rows} totalEntries={totalDemoEntries} />
    </div>
  )
}
