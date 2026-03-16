import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET — List entries with search/filter
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
  const skip = parseInt(searchParams.get("skip") ?? "0", 10)
  const take = Math.min(parseInt(searchParams.get("take") ?? "25", 10), 100)
  const search = searchParams.get("search") ?? ""
  const seasonId = searchParams.get("seasonId") ?? undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (seasonId) where.seasonId = seasonId
  if (search) {
    where.OR = [
      { user: { firstName: { contains: search, mode: "insensitive" } } },
      { user: { lastName: { contains: search, mode: "insensitive" } } },
      { user: { username: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { nickname: { contains: search, mode: "insensitive" } },
    ]
  }

  const [entries, total] = await Promise.all([
    prisma.entry.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
            email: true,
          },
        },
        leagueEntries: { select: { league: { select: { name: true } } } },
        entryPicks: {
          include: {
            team: { select: { name: true, shortName: true, seed: true, eliminated: true, wins: true, logoUrl: true } },
            playInSlot: {
              select: {
                seed: true,
                region: true,
                team1: { select: { shortName: true, logoUrl: true } },
                team2: { select: { shortName: true, logoUrl: true } },
                winner: { select: { shortName: true, seed: true, eliminated: true, wins: true, logoUrl: true } },
              },
            },
          },
        },
      },
      orderBy: [{ score: "desc" }, { createdAt: "asc" }],
      skip,
      take,
    }),
    prisma.entry.count({ where }),
  ])

  return NextResponse.json({ entries, total })
}

// PUT — Adjust an entry (score override, void)
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
  const { entryId, action, scoreAdjustment, reason } = body

  if (!entryId) {
    return NextResponse.json({ error: "entryId required" }, { status: 400 })
  }

  // Validate action
  if (!action || !["void", "adjustScore"].includes(action)) {
    return NextResponse.json({ error: "Invalid action. Must be 'void' or 'adjustScore'" }, { status: 400 })
  }

  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  })

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 })
  }

  if (action === "void") {
    // Delete the entry and its picks
    await prisma.$transaction([
      prisma.entryPick.deleteMany({ where: { entryId } }),
      prisma.scoreSnapshot.deleteMany({ where: { entryId } }),
      prisma.entry.delete({ where: { id: entryId } }),
    ])

    await prisma.auditLog.create({
      data: {
        adminId: session.user.id!,
        action: `Voided entry for ${entry.user.firstName} ${entry.user.lastName} (${entry.user.email})`,
        details: { entryId, reason: reason ?? "Admin voided entry", originalScore: entry.score },
      },
    })

    return NextResponse.json({ success: true, action: "voided" })
  }

  if (action === "adjustScore" && typeof scoreAdjustment === "number") {
    const newScore = entry.score + scoreAdjustment

    await prisma.entry.update({
      where: { id: entryId },
      data: { score: newScore },
    })

    await prisma.auditLog.create({
      data: {
        adminId: session.user.id!,
        action: `Adjusted score for ${entry.user.firstName} ${entry.user.lastName}: ${entry.score} → ${newScore}`,
        details: {
          entryId,
          previousScore: entry.score,
          adjustment: scoreAdjustment,
          newScore,
          reason: reason ?? "Manual score adjustment",
        },
      },
    })

    return NextResponse.json({ success: true, action: "scoreAdjusted", newScore })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
