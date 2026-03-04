import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { computeLeaderboardFromEntries, type EntryWithRelations } from "@/lib/scoring"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  const seasonId = settings?.currentSeasonId

  if (!seasonId) {
    return NextResponse.json([], { headers: { "Cache-Control": "no-store" } })
  }

  const entries = await prisma.entry.findMany({
    where: {
      seasonId,
      draftInProgress: false,
      entryPicks: { some: {} },
    },
    include: {
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

  return NextResponse.json(leaderboard, {
    headers: { "Cache-Control": "no-store" },
  })
}
