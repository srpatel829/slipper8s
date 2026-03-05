import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET — List all teams with conference info
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const teams = await prisma.team.findMany({
    where: { isPlayIn: false },
    select: {
      id: true,
      name: true,
      shortName: true,
      seed: true,
      region: true,
      conference: true,
      eliminated: true,
      wins: true,
    },
    orderBy: [{ conference: "asc" }, { name: "asc" }],
  })

  return NextResponse.json({ teams })
}

// PUT — Update team conference (or other fields)
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { teamId, conference } = body

  if (!teamId) {
    return NextResponse.json({ error: "teamId required" }, { status: 400 })
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { name: true, conference: true },
  })

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 })
  }

  const updated = await prisma.team.update({
    where: { id: teamId },
    data: { conference: conference ?? null },
  })

  await prisma.auditLog.create({
    data: {
      adminId: session.user.id!,
      action: `Updated conference for ${team.name}: "${team.conference ?? "none"}" → "${conference ?? "none"}"`,
      details: { teamId, teamName: team.name, oldConference: team.conference, newConference: conference },
    },
  })

  return NextResponse.json({ success: true, team: updated })
}

// POST — Bulk update conferences
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { updates } = body // Array of { teamId, conference }

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "updates array required" }, { status: 400 })
  }

  let updated = 0
  for (const { teamId, conference } of updates) {
    if (!teamId) continue
    await prisma.team.update({
      where: { id: teamId },
      data: { conference: conference ?? null },
    })
    updated++
  }

  await prisma.auditLog.create({
    data: {
      adminId: session.user.id!,
      action: `Bulk updated conference mappings for ${updated} teams`,
      details: { count: updated },
    },
  })

  return NextResponse.json({ success: true, updated })
}
