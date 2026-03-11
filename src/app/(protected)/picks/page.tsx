import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PicksForm } from "@/components/picks/picks-form"
import { EntrySelector } from "@/components/picks/entry-selector"
import { CountdownTimer } from "@/components/landing/countdown-timer"

export const dynamic = "force-dynamic"

async function getCurrentSeason() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  if (settings?.currentSeasonId) {
    return prisma.season.findUnique({ where: { id: settings.currentSeasonId } })
  }
  return prisma.season.findFirst({
    where: { status: { in: ["REGISTRATION", "LOCKED", "ACTIVE"] } },
    orderBy: { year: "desc" },
  })
}

async function getPicksData(userId: string, seasonId: string, entryId?: string) {
  const [teams, playInSlots, entries, settings] = await Promise.all([
    prisma.team.findMany({
      where: { isPlayIn: false },
      orderBy: [{ region: "asc" }, { seed: "asc" }],
    }),
    prisma.playInSlot.findMany({
      include: { team1: true, team2: true, winner: true },
      orderBy: [{ region: "asc" }, { seed: "asc" }],
    }),
    prisma.entry.findMany({
      where: { userId, seasonId },
      include: {
        entryPicks: {
          include: {
            team: true,
            playInSlot: { include: { team1: true, team2: true, winner: true } },
          },
        },
        leagueEntries: { select: { league: { select: { id: true, name: true } } } },
      },
      orderBy: { entryNumber: "asc" },
    }),
    prisma.appSettings.findUnique({ where: { id: "main" } }),
  ])

  // If entryId specified, find that entry; otherwise use first entry or null
  const activeEntry = entryId
    ? entries.find((e) => e.id === entryId) ?? null
    : entries[0] ?? null

  return { teams, playInSlots, entries, activeEntry, settings }
}

export default async function PicksPage({
  searchParams,
}: {
  searchParams: Promise<{ entry?: string }>
}) {
  const session = await auth()
  const params = await searchParams
  const season = await getCurrentSeason()

  if (!season) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold">My Picks</h1>
          <p className="text-muted-foreground text-sm mt-1">
            No active season. Check back when the tournament bracket is announced.
          </p>
        </div>
      </div>
    )
  }

  const { teams, playInSlots, entries, activeEntry, settings } = await getPicksData(
    session!.user.id,
    season.id,
    params.entry
  )

  const deadlinePassed =
    settings?.picksDeadline ? new Date() > new Date(settings.picksDeadline) : false

  const defaultCharities = (settings?.defaultCharities as Array<{ name: string; url?: string }>) ?? []

  // Convert active entry's picks to the legacy format the form expects
  const existingPicks = activeEntry
    ? activeEntry.entryPicks.map((ep) => ({
        id: ep.id,
        userId: session!.user.id,
        teamId: ep.teamId,
        playInSlotId: ep.playInSlotId,
        charityPreference: activeEntry.charityPreference ?? null,
        createdAt: ep.createdAt,
        updatedAt: ep.updatedAt,
        team: ep.team,
        playInSlot: ep.playInSlot,
      }))
    : []

  return (
    <div className="space-y-6 max-w-5xl">
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
        {!deadlinePassed && settings?.picksDeadline && (
          <div className="shrink-0">
            <CountdownTimer
              deadline={new Date(settings.picksDeadline).toISOString()}
              compact
            />
          </div>
        )}
      </div>

      {/* Entry selector — shows when user has multiple entries */}
      <EntrySelector
        entries={entries}
        activeEntryId={activeEntry?.id ?? null}
        seasonId={season.id}
        deadlinePassed={deadlinePassed}
      />

      {deadlinePassed && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          The picks deadline has passed. Your picks are locked.
        </div>
      )}

      <PicksForm
        teams={teams}
        playInSlots={playInSlots}
        existingPicks={existingPicks}
        deadlinePassed={deadlinePassed}
        defaultCharities={defaultCharities}
        enableViewModes={true}
        entryId={activeEntry?.id ?? undefined}
        seasonId={season.id}
      />
    </div>
  )
}
