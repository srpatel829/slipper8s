import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { computeLeaderboardFromEntries, type EntryWithRelations } from "@/lib/scoring"
import { getCachedLeaderboard, setCachedLeaderboard } from "@/lib/cache"
import { TeamsWithDimensions } from "@/components/teams/teams-with-dimensions"
import type { TeamRow } from "@/components/teams/teams-table"

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
          favoriteTeam: { select: { conference: true } },
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
  }) as EntryWithRelations[]

  const leaderboard = computeLeaderboardFromEntries(entries)
  await setCachedLeaderboard(seasonId, leaderboard)
  return leaderboard
}

export default async function TeamsPage() {
  const session = await auth()

  const [teams, leaderboard] = await Promise.all([
    prisma.team.findMany({
      where: { isPlayIn: false },
      orderBy: [{ region: "asc" }, { seed: "asc" }],
    }),
    getLeaderboard(),
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
      />
    </div>
  )
}
