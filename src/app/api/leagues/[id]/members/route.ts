import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/leagues/[id]/members — toggle payment status on a LeagueEntry or LeagueMember
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
    return NextResponse.json({ error: "Only the league admin can update payment status" }, { status: 403 })
  }
  if (!league.trackPayments) {
    return NextResponse.json({ error: "Payment tracking is not enabled for this league" }, { status: 400 })
  }

  const body = await request.json()
  const { leagueEntryId, leagueMemberId, paid } = body

  if (typeof paid !== "boolean") {
    return NextResponse.json({ error: "paid is required" }, { status: 400 })
  }

  // Toggle on LeagueEntry (entry-level paid) or fall back to LeagueMember (member with no entries)
  if (leagueEntryId) {
    const entry = await prisma.leagueEntry.findFirst({
      where: { id: leagueEntryId, leagueId: id },
    })
    if (!entry) {
      return NextResponse.json({ error: "Entry not found in this league" }, { status: 404 })
    }
    await prisma.leagueEntry.update({
      where: { id: leagueEntryId },
      data: { paid },
    })
    return NextResponse.json({ leagueEntryId, paid })
  } else if (leagueMemberId) {
    const member = await prisma.leagueMember.findFirst({
      where: { id: leagueMemberId, leagueId: id },
    })
    if (!member) {
      return NextResponse.json({ error: "Member not found in this league" }, { status: 404 })
    }
    await prisma.leagueMember.update({
      where: { id: leagueMemberId },
      data: { paid },
    })
    return NextResponse.json({ leagueMemberId, paid })
  }

  return NextResponse.json({ error: "leagueEntryId or leagueMemberId is required" }, { status: 400 })
}

// DELETE /api/leagues/[id]/members — remove a member from the league (admin only)
export async function DELETE(
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
    return NextResponse.json({ error: "Only the league admin can remove members" }, { status: 403 })
  }

  const body = await request.json()
  const { userId } = body

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  if (userId === league.adminId) {
    return NextResponse.json({ error: "Cannot remove the league admin" }, { status: 400 })
  }

  // Delete LeagueMember
  await prisma.leagueMember.deleteMany({
    where: { leagueId: id, userId },
  })

  // Delete any LeagueEntry rows for this user's entries
  const userEntries = await prisma.entry.findMany({
    where: { userId, seasonId: league.seasonId },
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
