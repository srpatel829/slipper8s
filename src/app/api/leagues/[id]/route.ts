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
      admin: { select: { id: true, name: true, username: true, firstName: true, lastName: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, username: true, firstName: true, lastName: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      leagueEntries: {
        include: {
          entry: { select: { id: true, userId: true, entryNumber: true, nickname: true, score: true } },
        },
      },
    },
  })

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 })
  }

  // Check if user is a member of this league (LeagueMember) or is admin
  const isMember =
    league.adminId === session.user.id ||
    league.members.some((m) => m.userId === session.user.id)

  if (!isMember) {
    return NextResponse.json({ error: "Not a member of this league" }, { status: 403 })
  }

  // Self-heal: if admin has no LeagueMember row, create one
  if (league.adminId === session.user.id && !league.members.some((m) => m.userId === session.user.id)) {
    const newMember = await prisma.leagueMember.create({
      data: { leagueId: league.id, userId: session.user.id },
    })
    // Add to the members array so the response includes it
    league.members.push({
      ...newMember,
      user: { id: session.user.id, name: league.admin.name, username: league.admin.username },
    } as typeof league.members[0])
  }

  // Helper: build display name preferring first+last, falling back to username/name
  function displayName(user: { firstName?: string | null; lastName?: string | null; username?: string | null; name?: string | null }) {
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
    if (user.firstName) return user.firstName
    return user.username ?? user.name ?? "Unknown"
  }

  // Build entry-level rows for the members table
  // Each league entry gets its own row with player info, entry name, score, paid
  const entryRows = league.leagueEntries.map((le) => {
    const member = league.members.find((m) => m.userId === le.entry.userId)
    return {
      leagueEntryId: le.id,
      leagueMemberId: member?.id ?? "",
      userId: le.entry.userId,
      playerName: member ? displayName(member.user) : "Unknown",
      entryName: le.entry.nickname || `Entry Slip #${le.entry.entryNumber}`,
      entryNumber: le.entry.entryNumber,
      score: le.entry.score,
      paid: le.paid,
      joinedAt: member?.joinedAt ?? le.joinedAt,
    }
  })

  // Members with zero entries still need to appear
  const membersWithEntries = new Set(league.leagueEntries.map((le) => le.entry.userId))
  const noEntryRows = league.members
    .filter((m) => !membersWithEntries.has(m.userId))
    .map((m) => ({
      leagueEntryId: null,
      leagueMemberId: m.id,
      userId: m.userId,
      playerName: displayName(m.user),
      entryName: null,
      entryNumber: null,
      score: 0,
      paid: m.paid,
      joinedAt: m.joinedAt,
    }))

  return NextResponse.json({
    id: league.id,
    name: league.name,
    inviteCode: league.inviteCode,
    description: league.description,
    maxEntries: league.maxEntries,
    trackPayments: league.trackPayments,
    isAdmin: league.adminId === session.user.id,
    adminId: league.adminId,
    adminName: league.admin.username ?? league.admin.name ?? "Unknown",
    memberCount: league.members.length,
    entryCount: league.leagueEntries.length,
    entries: [...entryRows, ...noEntryRows],
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
