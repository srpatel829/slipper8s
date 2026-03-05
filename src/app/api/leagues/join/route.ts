import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

// POST /api/leagues/join — join a league by invite code
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
      _count: { select: { entries: true } },
    },
  })

  if (!league) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 })
  }

  // Check if user already has an entry in this league
  const existingEntry = await prisma.entry.findFirst({
    where: {
      userId: session.user.id,
      leagueId: league.id,
    },
  })

  if (existingEntry) {
    return NextResponse.json({ error: "You're already in this league" }, { status: 409 })
  }

  // Create an entry for this user in the league
  // Find the user's next entry number for this season
  const entryCount = await prisma.entry.count({
    where: { userId: session.user.id, seasonId: league.seasonId },
  })

  await prisma.entry.create({
    data: {
      userId: session.user.id,
      seasonId: league.seasonId,
      leagueId: league.id,
      entryNumber: entryCount + 1,
    },
  })

  return NextResponse.json({
    id: league.id,
    name: league.name,
    memberCount: league._count.entries + 1,
  })
}
