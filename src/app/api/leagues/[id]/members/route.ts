import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/leagues/[id]/members — toggle payment status on a LeagueEntry (admin only)
export async function PATCH(
  request: NextRequest,
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
    return NextResponse.json({ error: "Only the league admin can manage members" }, { status: 403 })
  }
  if (!league.trackPayments) {
    return NextResponse.json({ error: "Payment tracking is not enabled for this league" }, { status: 400 })
  }

  const body = await request.json()
  const { leagueEntryId, paid } = body

  if (!leagueEntryId || typeof paid !== "boolean") {
    return NextResponse.json({ error: "leagueEntryId and paid (boolean) required" }, { status: 400 })
  }

  // Verify the LeagueEntry belongs to this league
  const leagueEntry = await prisma.leagueEntry.findUnique({
    where: { id: leagueEntryId },
  })

  if (!leagueEntry || leagueEntry.leagueId !== id) {
    return NextResponse.json({ error: "Member not found in this league" }, { status: 404 })
  }

  const updated = await prisma.leagueEntry.update({
    where: { id: leagueEntryId },
    data: { paid },
  })

  return NextResponse.json({
    leagueEntryId: updated.id,
    paid: updated.paid,
  })
}
