import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PicksLive } from "@/components/picks/picks-live"

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

  return (
    <div className="max-w-5xl">
      <PicksLive
        teams={teams}
        playInSlots={playInSlots}
        entries={entries}
        activeEntry={activeEntry}
        userId={session!.user.id}
        seasonId={season.id}
        deadlinePassed={deadlinePassed}
        picksDeadline={settings?.picksDeadline ? new Date(settings.picksDeadline).toISOString() : null}
        defaultCharities={defaultCharities}
      />
    </div>
  )
}
