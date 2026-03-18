import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendJoinRequestApprovedEmail, sendJoinRequestDeniedEmail } from "@/lib/email"

// GET /api/leagues/[id]/join-requests — list pending join requests (admin only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: leagueId } = await params

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { adminId: true },
  })

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 })
  }

  if (league.adminId !== session.user.id) {
    return NextResponse.json({ error: "Only the league admin can view join requests" }, { status: 403 })
  }

  const requests = await prisma.leagueJoinRequest.findMany({
    where: { leagueId, status: "PENDING" },
    include: {
      user: { select: { id: true, name: true, image: true, email: true } },
    },
    orderBy: { requestedAt: "asc" },
  })

  return NextResponse.json(requests)
}

// PATCH /api/leagues/[id]/join-requests — approve or deny a request (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: leagueId } = await params
  const body = await req.json()
  const { requestId, action } = body as { requestId: string; action: "approve" | "deny" }

  if (!requestId || !["approve", "deny"].includes(action)) {
    return NextResponse.json({ error: "requestId and action (approve|deny) required" }, { status: 400 })
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, name: true, adminId: true, seasonId: true },
  })

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 })
  }

  if (league.adminId !== session.user.id) {
    return NextResponse.json({ error: "Only the league admin can manage join requests" }, { status: 403 })
  }

  const joinRequest = await prisma.leagueJoinRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  if (!joinRequest || joinRequest.leagueId !== leagueId) {
    return NextResponse.json({ error: "Join request not found" }, { status: 404 })
  }

  if (joinRequest.status !== "PENDING") {
    return NextResponse.json({ error: "This request has already been resolved" }, { status: 400 })
  }

  if (action === "approve") {
    // Update request status
    await prisma.leagueJoinRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", resolvedAt: new Date() },
    })

    // Create membership
    await prisma.leagueMember.create({
      data: {
        leagueId: league.id,
        userId: joinRequest.userId,
      },
    })

    // Auto-link sole entry
    try {
      const userEntries = await prisma.entry.findMany({
        where: {
          userId: joinRequest.userId,
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
          // Skip if already linked
        })
      }
    } catch (err) {
      console.error("[join-requests] Auto-link entry failed:", err)
    }

    // Notify user
    try {
      await sendJoinRequestApprovedEmail(
        joinRequest.user.email,
        joinRequest.user.name ?? "Player",
        league.name,
        league.id,
      )
    } catch (err) {
      console.error("[join-requests] Failed to send approval email:", err)
    }

    return NextResponse.json({ success: true, action: "approved" })
  } else {
    // Deny
    await prisma.leagueJoinRequest.update({
      where: { id: requestId },
      data: { status: "DENIED", resolvedAt: new Date() },
    })

    // Notify user
    try {
      await sendJoinRequestDeniedEmail(
        joinRequest.user.email,
        joinRequest.user.name ?? "Player",
        league.name,
      )
    } catch (err) {
      console.error("[join-requests] Failed to send denial email:", err)
    }

    return NextResponse.json({ success: true, action: "denied" })
  }
}
