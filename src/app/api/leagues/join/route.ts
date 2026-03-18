import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

// POST /api/leagues/join — join a league by invite code
// Creates LeagueMember for user-level membership.
// Users manage which entries are in the league from the league detail page.
export async function POST(request: NextRequest) {
  const rateLimitResponse = rateLimit(getClientIp(request))
  if (rateLimitResponse) return rateLimitResponse

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const code = (body.code as string)?.trim().toUpperCase()

  if (!code) {
    return NextResponse.json({ error: "Invite code required" }, { status: 400 })
  }

  const league = await prisma.league.findUnique({
    where: { inviteCode: code },
    include: {
      _count: { select: { members: true } },
    },
  })

  if (!league) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 })
  }

  // Check if already a member
  const existingMember = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: league.id, userId: session.user.id } },
  })

  if (existingMember) {
    return NextResponse.json({ error: "You are already a member of this league" }, { status: 409 })
  }

  // Check max entries cap (counts members, not entries)
  if (league.maxEntries != null) {
    if (league._count.members >= league.maxEntries) {
      return NextResponse.json(
        { error: `This league is full (${league._count.members}/${league.maxEntries} members)` },
        { status: 400 }
      )
    }
  }

  // Create membership
  await prisma.leagueMember.create({
    data: {
      leagueId: league.id,
      userId: session.user.id,
    },
  })

  return NextResponse.json({
    id: league.id,
    name: league.name,
    memberCount: league._count.members + 1,
  })
}
