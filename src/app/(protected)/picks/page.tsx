import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PicksLive } from "@/components/picks/picks-live"
import { ClipboardList } from "lucide-react"

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
  const [teams, playInSlots, entries, settings, leagueMemberships] = await Promise.all([
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
    prisma.leagueMember.findMany({
      where: { userId },
      include: { league: { select: { id: true, name: true, seasonId: true } } },
    }),
  ])

  // If entryId specified, find that entry; otherwise use first entry or null
  const activeEntry = entryId
    ? entries.find((e) => e.id === entryId) ?? null
    : entries[0] ?? null

  const userLeagues = leagueMemberships
    .filter((m) => m.league.seasonId === seasonId)
    .map((m) => ({ id: m.league.id, name: m.league.name }))

  return { teams, playInSlots, entries, activeEntry, settings, userLeagues }
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

  // Block picks page during SETUP — only allow during REGISTRATION and later
  if (season.status === "SETUP") {
    return (
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold">My Picks</h1>
          <div className="mt-8 flex flex-col items-center justify-center text-center py-16 border border-border rounded-xl bg-card">
            <ClipboardList className="h-10 w-10 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Registration opens soon</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              The tournament bracket has been seeded but registration hasn&apos;t opened yet. Check back soon to make your picks!
            </p>
          </div>
        </div>
      </div>
    )
  }

  const { teams, playInSlots, entries, activeEntry, settings, userLeagues } = await getPicksData(
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
        userName={session!.user.name ?? session!.user.firstName ?? null}
        seasonId={season.id}
        deadlinePassed={deadlinePassed}
        picksDeadline={settings?.picksDeadline ? new Date(settings.picksDeadline).toISOString() : null}
        defaultCharities={defaultCharities}
        userLeagues={userLeagues}
      />
    </div>
  )
}
