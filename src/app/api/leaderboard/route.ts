import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { computeLeaderboard } from "@/lib/scoring"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

  // Pull charityPreference from first pick (all picks share same value)
  const usersWithCharity = users.map((u) => ({
    ...u,
    charityPreference: u.picks[0]?.charityPreference ?? null,
  }))

  const leaderboard = computeLeaderboard(usersWithCharity)

  return NextResponse.json(leaderboard, {
    headers: { "Cache-Control": "no-store" },
  })
}
