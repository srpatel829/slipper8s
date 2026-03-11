import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST /api/leagues/[id]/leave — leave a league
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const league = await prisma.league.findUnique({ where: { id } })
  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 })
  }

  // Admin cannot leave their own league — they must delete it
  if (league.adminId === session.user.id) {
    return NextResponse.json(
      { error: "League admins cannot leave. Delete the league instead." },
      { status: 400 }
    )
  }

  // Find user's entries in this league
  const userLeagueEntries = await prisma.leagueEntry.findMany({
    where: {
      leagueId: id,
      entry: { userId: session.user.id },
    },
  })

  if (userLeagueEntries.length === 0) {
    return NextResponse.json({ error: "You are not in this league" }, { status: 400 })
  }

  // Delete all of user's LeagueEntry rows for this league (entries preserved)
  await prisma.leagueEntry.deleteMany({
    where: {
      leagueId: id,
      entry: { userId: session.user.id },
    },
  })

  return NextResponse.json({
    success: true,
    entriesRemoved: userLeagueEntries.length,
  })
}
