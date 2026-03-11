import { auth } from "@/lib/auth"
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table"
import { prisma } from "@/lib/prisma"
import { computeLeaderboardFromEntries, type EntryWithRelations } from "@/lib/scoring"
import { getCachedLeaderboard, setCachedLeaderboard } from "@/lib/cache"
import { ScoreHistorySection } from "@/components/leaderboard/score-history-section"
import { LeaderboardShareButton } from "@/components/leaderboard/share-button"
import { BarChart3, Info } from "lucide-react"
import Link from "next/link"

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
          favoriteTeam: { select: { conference: true } },
        },
      },
      entryPicks: {
        include: {
          team: true,
          playInSlot: { include: { team1: true, team2: true, winner: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  }) as EntryWithRelations[]

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
        { leagueEntries: { some: { entry: { userId } } } },
      ],
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
  return leagues
}

async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      country: true,
      state: true,
      gender: true,
      favoriteTeam: { select: { name: true, conference: true } },
    },
  })
  // Flatten conference and favoriteTeam name for the dimension tabs
  return user ? {
    country: user.country,
    state: user.state,
    gender: user.gender,
    favoriteTeam: user.favoriteTeam?.name ?? null,
    conference: user.favoriteTeam?.conference ?? null,
  } : null
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

export default async function LeaderboardPage() {
  const session = await auth()
  const [leaderboard, userLeagues, userProfile, seasonStatus] = await Promise.all([
    getLeaderboard(),
    session?.user?.id ? getUserLeagues(session.user.id) : Promise.resolve([]),
    session?.user?.id ? getUserProfile(session.user.id) : Promise.resolve(null),
    getSeasonStatus(),
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

      <LeaderboardTable
        initialData={leaderboard}
        currentUserId={session?.user?.id}
        userLeagues={userLeagues}
        userProfile={userProfile}
      />

      {/* Score history chart — collapsible */}
      <ScoreHistorySection />
    </div>
  )
}
