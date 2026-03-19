import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { computeLeaderboardFromEntries, type EntryWithRelations } from "@/lib/scoring"
import { getCachedLeaderboard, setCachedLeaderboard } from "@/lib/cache"
import { TeamsWithDimensions } from "@/components/teams/teams-with-dimensions"
import type { TeamRow } from "@/components/teams/teams-table"
import { Users } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

async function getLeaderboard() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  const seasonId = settings?.currentSeasonId
  if (!seasonId) return []

  const cached = await getCachedLeaderboard(seasonId)
  if (cached) return cached

  const entries = await prisma.entry.findMany({
    where: {
      seasonId,
      draftInProgress: false,
      entryPicks: { some: {} },
    },
    select: {
      id: true,
      userId: true,
      entryNumber: true,
      nickname: true,
      charityPreference: true,
      score: true,
      maxPossibleScore: true,
      expectedScore: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          isPaid: true,
          username: true,
          country: true,
          state: true,
          gender: true,
          favoriteTeam: { select: { id: true, name: true, conference: true } },
        },
      },
      entryPicks: {
        include: {
          team: true,
          playInSlot: { include: { team1: true, team2: true, winner: true } },
        },
      },
      leagueEntries: { select: { leagueId: true } },
    },
    orderBy: { createdAt: "asc" },
  }) as unknown as EntryWithRelations[]

  const leaderboard = computeLeaderboardFromEntries(entries)
  await setCachedLeaderboard(seasonId, leaderboard)
  return leaderboard
}

async function shouldHideTeams(): Promise<{ hidden: boolean; deadline: Date | null; status: string | null }> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "main" },
    select: { picksDeadline: true, currentSeasonId: true },
  })
  if (!settings?.currentSeasonId) return { hidden: true, deadline: null, status: null }
  const season = await prisma.season.findUnique({
    where: { id: settings.currentSeasonId },
    select: { status: true },
  })
  const status = season?.status ?? null
  // Only show teams page when season is LOCKED, ACTIVE, or COMPLETED
  const showStatuses = ["LOCKED", "ACTIVE", "COMPLETED"]
  const hidden = !showStatuses.includes(status ?? "")
  return { hidden, deadline: settings.picksDeadline, status }
}

export default async function TeamsPage() {
  const session = await auth()
  const gateStatus = await shouldHideTeams()

  // Don't reveal picker counts/percentages until season is LOCKED and deadline has passed
  if (gateStatus.hidden) {
    const isRegistration = gateStatus.status === "REGISTRATION"
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Tournament Teams</h1>
          <div className="mt-8 flex flex-col items-center justify-center text-center py-16 border border-border rounded-xl bg-card">
            <Users className="h-10 w-10 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Team stats available after picks close</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              To keep things fair, team popularity and picker data is hidden until the picks deadline passes.
              {isRegistration && gateStatus.deadline && (
                <> Picks close at{" "}
                  <span className="font-medium text-foreground">
                    {gateStatus.deadline.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" })}
                  </span>.
                </>
              )}
            </p>
            {isRegistration && (
              <Link
                href="/picks"
                className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Make your picks
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Include play-in winners so team count shows 64 (not 62)
  const playInWinnerIds = (await prisma.playInSlot.findMany({
    where: { winnerId: { not: null } },
    select: { winnerId: true },
  })).map(s => s.winnerId!).filter(Boolean)

  // Get user profile for dimension defaults
  const userProfile = session?.user?.id
    ? await (async () => {
        const u = await prisma.user.findUnique({
          where: { id: session.user!.id },
          select: { country: true, state: true, gender: true, favoriteTeamName: true, favoriteTeam: { select: { name: true, conference: true } } },
        })
        if (!u) return null
        return {
          country: u.country, state: u.state, gender: u.gender,
          favoriteTeam: u.favoriteTeam?.name ?? u.favoriteTeamName ?? null,
          conference: u.favoriteTeam?.conference ?? null,
        }
      })()
    : null

  const [teams, leaderboard, userLeagues] = await Promise.all([
    prisma.team.findMany({
      where: {
        seed: { lt: 17 }, // Exclude placeholder teams (seed 99, etc.)
        OR: [
          { isPlayIn: false },
          { id: { in: playInWinnerIds } },
        ],
      },
      orderBy: [{ region: "asc" }, { seed: "asc" }],
    }),
    getLeaderboard(),
    session?.user?.id
      ? prisma.league.findMany({
          where: {
            OR: [
              { adminId: session.user.id },
              { members: { some: { userId: session.user.id } } },
              { leagueEntries: { some: { entry: { userId: session.user.id } } } },
            ],
          },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ])

  const rows: TeamRow[] = teams.map(t => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    seed: t.seed,
    region: t.region,
    eliminated: t.eliminated,
    wins: t.wins,
    logoUrl: t.logoUrl,
    espnId: t.espnId,
    conference: t.conference,
    pickerCount: 0, // computed per-dimension on client
  }))

  const teamOptions = teams.map(t => ({ id: t.id, name: t.name }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tournament Teams</h1>
        <p className="text-muted-foreground text-sm mt-1">
          All {teams.length} teams · {leaderboard.length} entries · Default sort: % Selected
        </p>
      </div>
      <TeamsWithDimensions
        baseTeams={rows}
        leaderboard={leaderboard}
        currentUserId={session?.user?.id ?? ""}
        teams={teamOptions}
        userLeagues={userLeagues}
        userProfile={userProfile}
      />
    </div>
  )
}
