import { auth } from "@/lib/auth"
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table"
import { prisma } from "@/lib/prisma"
import { computeLeaderboard } from "@/lib/scoring"
import { BarChart3, Info } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

async function getLeaderboard() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isPaid: true,
      username: true,
      country: true,
      state: true,
      gender: true,
      picks: {
        include: {
          team: true,
          playInSlot: { include: { team1: true, team2: true, winner: true } },
        },
      },
    },
    where: { picks: { some: {} } },
    orderBy: { createdAt: "asc" },
  })

  const usersWithCharity = users.map((u) => ({
    ...u,
    charityPreference: u.picks[0]?.charityPreference ?? null,
  }))

  return computeLeaderboard(usersWithCharity)
}

async function getUserLeagues(userId: string) {
  const leagues = await prisma.league.findMany({
    where: {
      OR: [
        { adminId: userId },
        { entries: { some: { userId } } },
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
    select: { country: true, state: true, gender: true },
  })
  return user
}

export default async function LeaderboardPage() {
  const session = await auth()
  const [leaderboard, userLeagues, userProfile] = await Promise.all([
    getLeaderboard(),
    session?.user?.id ? getUserLeagues(session.user.id) : Promise.resolve([]),
    session?.user?.id ? getUserProfile(session.user.id) : Promise.resolve(null),
  ])

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
            Score = seed × wins · PPR = possible points remaining · TPS = total potential score
          </p>
        </div>
        <Link
          href="/demo"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Info className="h-3.5 w-3.5" />
          View demo replay
        </Link>
      </div>

      <LeaderboardTable
        initialData={leaderboard}
        currentUserId={session?.user?.id}
        userLeagues={userLeagues}
        userProfile={userProfile}
      />
    </div>
  )
}
