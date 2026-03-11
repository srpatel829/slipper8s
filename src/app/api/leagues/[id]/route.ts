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
      leagueEntries: {
        include: {
          entry: {
            include: {
              user: { select: { id: true, name: true, username: true } },
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  })

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 })
  }

  // Check if user is a member of this league (has LeagueEntry) or is admin
  const isMember =
    league.adminId === session.user.id ||
    league.leagueEntries.some((le) => le.entry.userId === session.user.id)

  if (!isMember) {
    return NextResponse.json({ error: "Not a member of this league" }, { status: 403 })
  }

  return NextResponse.json({
    id: league.id,
    name: league.name,
    inviteCode: league.inviteCode,
    description: league.description,
    maxEntries: league.maxEntries,
    trackPayments: league.trackPayments,
    isAdmin: league.adminId === session.user.id,
    adminName: league.admin.username ?? league.admin.name ?? "Unknown",
    members: league.leagueEntries.map((le) => ({
      leagueEntryId: le.id,
      entryId: le.entry.id,
      userId: le.entry.userId,
      name: le.entry.user.username ?? le.entry.user.name ?? "Unknown",
      entryNumber: le.entry.entryNumber,
      score: le.entry.score,
      paid: le.paid,
      joinedAt: le.joinedAt,
    })),
    createdAt: league.createdAt,
  })
}

// PATCH /api/leagues/[id] — update league settings (admin only)
export async function PATCH(
  request: Request,
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
    return NextResponse.json({ error: "Only the league admin can update settings" }, { status: 403 })
  }

  const body = await request.json()
  const data: Record<string, unknown> = {}

  if (body.name !== undefined) {
    const name = (body.name as string)?.trim()
    if (!name || name.length < 3 || name.length > 50) {
      return NextResponse.json({ error: "League name must be 3-50 characters" }, { status: 400 })
    }
    data.name = name
  }
  if (body.description !== undefined) data.description = body.description
  if (body.maxEntries !== undefined) data.maxEntries = body.maxEntries === null ? null : Number(body.maxEntries)
  if (body.trackPayments !== undefined) data.trackPayments = Boolean(body.trackPayments)

  const updated = await prisma.league.update({ where: { id }, data })

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    description: updated.description,
    maxEntries: updated.maxEntries,
    trackPayments: updated.trackPayments,
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

  // LeagueEntry rows cascade-delete automatically. Entries themselves are preserved.
  await prisma.league.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
