import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { sendJoinRequestEmail } from "@/lib/email"

// POST /api/leagues/join — join a league by invite code
// Before deadline: Creates LeagueMember immediately.
// After deadline: Creates LeagueJoinRequest for admin approval.
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
      admin: { select: { email: true, name: true } },
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

  // Check if picks deadline has passed
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  const deadlinePassed = settings?.picksDeadline && new Date() > new Date(settings.picksDeadline)

  if (deadlinePassed) {
    // After deadline: create a join request instead of immediately joining
    const existingRequest = await prisma.leagueJoinRequest.findUnique({
      where: { leagueId_userId: { leagueId: league.id, userId: session.user.id } },
    })

    if (existingRequest) {
      if (existingRequest.status === "PENDING") {
        return NextResponse.json({ error: "You already have a pending request for this league" }, { status: 409 })
      }
      if (existingRequest.status === "DENIED") {
        // Allow re-requesting if previously denied — update to PENDING
        await prisma.leagueJoinRequest.update({
          where: { id: existingRequest.id },
          data: { status: "PENDING", requestedAt: new Date(), resolvedAt: null },
        })
      }
    } else {
      await prisma.leagueJoinRequest.create({
        data: {
          leagueId: league.id,
          userId: session.user.id,
        },
      })
    }

    // Notify league admin via email
    try {
      const requesterName = session.user.name ?? session.user.email ?? "A user"
      await sendJoinRequestEmail(
        league.admin.email,
        league.admin.name ?? "League Admin",
        league.name,
        requesterName,
        league.id,
      )
    } catch (err) {
      console.error("[leagues/join] Failed to send join request email:", err)
    }

    return NextResponse.json({
      requestPending: true,
      leagueName: league.name,
    })
  }

  // Before deadline: immediate join
  await prisma.leagueMember.create({
    data: {
      leagueId: league.id,
      userId: session.user.id,
    },
  })

  // Auto-link user's sole entry to this league (if they have exactly one submitted entry)
  try {
    const userEntries = await prisma.entry.findMany({
      where: {
        userId: session.user.id,
        seasonId: league.seasonId,
        draftInProgress: false,
        entryPicks: { some: {} },
      },
      select: { id: true },
    })
    if (userEntries.length === 1) {
      await prisma.leagueEntry.create({
        data: {
          leagueId: league.id,
          entryId: userEntries[0].id,
        },
      }).catch(() => {
        // Skip if already linked (unique constraint)
      })
    }
  } catch (err) {
    console.error("[leagues/join] Auto-link entry failed:", err)
  }

  return NextResponse.json({
    id: league.id,
    name: league.name,
    memberCount: league._count.members + 1,
  })
}
