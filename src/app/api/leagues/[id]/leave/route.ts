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

  // Check if user is a member of this league
  const membership = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: id, userId: session.user.id } },
  })

  if (!membership) {
    return NextResponse.json({ error: "You are not in this league" }, { status: 400 })
  }

  // Delete LeagueMember row
  await prisma.leagueMember.delete({
    where: { id: membership.id },
  })

  // Delete any LeagueEntry rows for this user's entries in this league
  const userEntries = await prisma.entry.findMany({
    where: { userId: session.user.id, seasonId: league.seasonId },
    select: { id: true },
  })
  if (userEntries.length > 0) {
    await prisma.leagueEntry.deleteMany({
      where: {
        leagueId: id,
        entryId: { in: userEntries.map((e) => e.id) },
      },
    })
  }

  return NextResponse.json({ success: true })
}
