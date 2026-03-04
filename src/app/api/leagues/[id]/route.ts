import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/leagues/[id] — get league details + members
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const league = await prisma.league.findUnique({
    where: { id },
    include: {
      admin: { select: { id: true, name: true, username: true } },
      entries: {
        include: {
          user: { select: { id: true, name: true, username: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 })
  }

  // Check if user is a member of this league
  const isMember =
    league.adminId === session.user.id ||
    league.entries.some((e) => e.userId === session.user.id)

  if (!isMember) {
    return NextResponse.json({ error: "Not a member of this league" }, { status: 403 })
  }

  return NextResponse.json({
    id: league.id,
    name: league.name,
    inviteCode: league.inviteCode,
    isAdmin: league.adminId === session.user.id,
    adminName: league.admin.username ?? league.admin.name ?? "Unknown",
    members: league.entries.map((e) => ({
      userId: e.userId,
      name: e.user.username ?? e.user.name ?? "Unknown",
      entryNumber: e.entryNumber,
      score: e.score,
      joinedAt: e.createdAt,
    })),
    createdAt: league.createdAt,
  })
}

// DELETE /api/leagues/[id] — delete a league (admin only)
export async function DELETE(
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
  if (league.adminId !== session.user.id) {
    return NextResponse.json({ error: "Only the league admin can delete it" }, { status: 403 })
  }

  // Remove all entries from this league first
  await prisma.entry.deleteMany({ where: { leagueId: id } })
  await prisma.league.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
