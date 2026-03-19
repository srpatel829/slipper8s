import { auth } from "@/lib/auth"
import { LeaderboardLive } from "@/components/leaderboard/leaderboard-live"
import { prisma } from "@/lib/prisma"
import { computeLeaderboardFromEntries, computeOptimal8, type EntryWithRelations } from "@/lib/scoring"
import type { TeamBracketInfo } from "@/lib/bracket-ppr"
import { getCachedLeaderboard, setCachedLeaderboard } from "@/lib/cache"
import { ScoreHistorySection } from "@/components/leaderboard/score-history-section"
import { LeaderboardShareButton } from "@/components/leaderboard/share-button"
import { BarChart3, Info } from "lucide-react"
import Link from "next/link"
import { D1_TEAMS_BY_CONFERENCE } from "@/lib/d1-teams"
import type { Optimal8Data } from "@/components/leaderboard/leaderboard-sample"

export const dynamic = "force-dynamic"

async function getLeaderboard() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  const seasonId = settings?.currentSeasonId

  if (!seasonId) return []

  // ── Cache-first: check cache before querying DB ────────────────────────
  const cached = await getCachedLeaderboard(seasonId)
  if (cached) return cached

  // ── Cache miss: query DB, compute, cache result ────────────────────────
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

  // Store in cache for subsequent requests
  await setCachedLeaderboard(seasonId, leaderboard)

  return leaderboard
}

async function getUserLeagues(userId: string) {
  const leagues = await prisma.league.findMany({
    where: {
      OR: [
        { adminId: userId },
        { members: { some: { userId } } },
        { leagueEntries: { some: { entry: { userId } } } },
      ],
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
  return leagues
}

function lookupConference(teamName: string): string | null {
  for (const group of D1_TEAMS_BY_CONFERENCE) {
    if (group.teams.includes(teamName)) return group.conference
  }
  return null
}

async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      country: true,
      state: true,
      gender: true,
      favoriteTeamName: true,
      favoriteTeam: { select: { name: true, conference: true } },
    },
  })
  if (!user) return null

  // Use DB relation if available, otherwise fall back to name + D1 data lookup
  const teamName = user.favoriteTeam?.name ?? user.favoriteTeamName ?? null
  const conference = user.favoriteTeam?.conference ?? (teamName ? lookupConference(teamName) : null)

  return {
    country: user.country,
    state: user.state,
    gender: user.gender,
    favoriteTeam: teamName,
    conference,
  }
}

async function getSeasonStatus(): Promise<string | null> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  if (!settings?.currentSeasonId) return null
  const season = await prisma.season.findUnique({
    where: { id: settings.currentSeasonId },
    select: { status: true },
  })
  return season?.status ?? null
}

async function computeOptimal8Data(): Promise<Optimal8Data | undefined> {
  // Get play-in winner IDs so we include resolved play-in winners
  const playInSlots = await prisma.playInSlot.findMany({
    where: { winnerId: { not: null } },
    select: { winnerId: true },
  })
  const playInWinnerIds = playInSlots.map(s => s.winnerId!).filter(Boolean)

  const allTeams = await prisma.team.findMany({
    where: {
      OR: [
        { isPlayIn: false },
        { id: { in: playInWinnerIds } },
      ],
    },
    select: {
      id: true,
      name: true,
      shortName: true,
      seed: true,
      region: true,
      wins: true,
      eliminated: true,
      logoUrl: true,
      isPlayIn: true,
      sCurveRank: true,
    },
  })

  if (allTeams.length === 0) return undefined

  const teamInfoMap = new Map<string, TeamBracketInfo>()
  for (const t of allTeams) {
    teamInfoMap.set(t.id, {
      seed: t.seed,
      region: t.region,
      wins: t.wins,
      eliminated: t.eliminated,
    })
  }

  const result = computeOptimal8(allTeams, teamInfoMap)
  if (result.teamIds.length === 0) return undefined

  const picks = result.teamIds
    .map(id => allTeams.find(t => t.id === id))
    .filter(Boolean)
    .map(t => ({
      teamId: t!.id,
      name: t!.name,
      shortName: t!.shortName,
      seed: t!.seed,
      region: t!.region,
      wins: t!.wins,
      eliminated: t!.eliminated,
      logoUrl: t!.logoUrl,
      isPlayIn: false as const,
    }))

  return { score: result.score, ppr: result.ppr, tps: result.tps, picks }
}

async function shouldHideLeaderboard(): Promise<{ hidden: boolean; deadline: Date | null; status: string | null }> {
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
  // Only show leaderboard when season is LOCKED, ACTIVE, or COMPLETED
  const showStatuses = ["LOCKED", "ACTIVE", "COMPLETED"]
  const hidden = !showStatuses.includes(status ?? "")
  return { hidden, deadline: settings.picksDeadline, status }
}

export default async function LeaderboardPage() {
  const session = await auth()
  const gateStatus = await shouldHideLeaderboard()

  // Don't reveal other players' picks until season is LOCKED and deadline has passed
  if (gateStatus.hidden) {
    const isRegistration = gateStatus.status === "REGISTRATION"
    return (
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
          </div>
          <div className="mt-8 flex flex-col items-center justify-center text-center py-16 border border-border rounded-xl bg-card">
            <BarChart3 className="h-10 w-10 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Leaderboard available after picks close</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              To keep things fair, the leaderboard is hidden until the picks deadline passes.
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

  const [leaderboard, userLeagues, userProfile, seasonStatus, teams, optimal8] = await Promise.all([
    getLeaderboard(),
    session?.user?.id ? getUserLeagues(session.user.id) : Promise.resolve([]),
    session?.user?.id ? getUserProfile(session.user.id) : Promise.resolve(null),
    getSeasonStatus(),
    prisma.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    computeOptimal8Data(),
  ])

  // Find the current user's best entry for share card
  const userEntry = session?.user?.id
    ? leaderboard.find((e) => e.userId === session.user!.id)
    : null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Score = seed × wins · Max Score = collision-aware maximum possible
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {userEntry && (
            <LeaderboardShareButton
              name={userEntry.name}
              rank={userEntry.rank}
              score={userEntry.currentScore}
              percentile={userEntry.percentile}
              teamsAlive={userEntry.teamsRemaining}
              totalEntries={leaderboard.length}
              seasonCompleted={seasonStatus === "COMPLETED"}
            />
          )}
          <Link
            href="/demo"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <Info className="h-3.5 w-3.5" />
            View demo replay
          </Link>
        </div>
      </div>

      <LeaderboardLive
        initialData={leaderboard}
        currentUserId={session?.user?.id}
        teams={teams}
        userLeagues={userLeagues}
        optimal8={optimal8}
      />

      {/* Score history chart — collapsible */}
      <ScoreHistorySection />
    </div>
  )
}
