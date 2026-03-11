import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET — List all leagues with stats
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { inviteCode: { contains: search, mode: "insensitive" } },
      { admin: { firstName: { contains: search, mode: "insensitive" } } },
      { admin: { lastName: { contains: search, mode: "insensitive" } } },
    ]
  }

  const leagues = await prisma.league.findMany({
    where,
    include: {
      admin: {
        select: {
          firstName: true,
          lastName: true,
          username: true,
          email: true,
        },
      },
      season: { select: { year: true } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    leagues: leagues.map((l) => ({
      id: l.id,
      name: l.name,
      inviteCode: l.inviteCode,
      admin: l.admin,
      seasonYear: l.season.year,
      memberCount: l._count.members,
      createdAt: l.createdAt,
    })),
  })
}

// DELETE — Delete a league (admin override)
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { leagueId, reason } = body

  if (!leagueId) {
    return NextResponse.json({ error: "leagueId required" }, { status: 400 })
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { _count: { select: { members: true } } },
  })

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 })
  }

  // Delete the league (LeagueEntry rows cascade-delete; entries are preserved)
  await prisma.league.delete({ where: { id: leagueId } })

  await prisma.auditLog.create({
    data: {
      adminId: session.user.id!,
      action: `Deleted league "${league.name}" (${league._count.members} members)`,
      details: { leagueId, leagueName: league.name, reason: reason ?? "Admin deleted league" },
    },
  })

  return NextResponse.json({ success: true })
}
