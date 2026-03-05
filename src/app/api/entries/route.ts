import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST — Create a new empty entry for a season (user picks teams later via the form)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Check deadline
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  if (settings?.picksDeadline && new Date() > new Date(settings.picksDeadline)) {
    return NextResponse.json({ error: "Picks deadline has passed" }, { status: 400 })
  }

  const body = await req.json()
  const { seasonId, leagueId, nickname } = body

  if (!seasonId) {
    return NextResponse.json({ error: "seasonId required" }, { status: 400 })
  }

  // Check season status — only allow new entries during REGISTRATION
  const season = await prisma.season.findUnique({ where: { id: seasonId }, select: { status: true } })
  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 })
  }
  if (season.status !== "REGISTRATION" && season.status !== "SETUP") {
    return NextResponse.json({ error: "Entries are not open for this season" }, { status: 400 })
  }

  // Determine next entry number
  const existingCount = await prisma.entry.count({
    where: { userId: session.user.id, seasonId },
  })
  const entryNumber = existingCount + 1

  const entry = await prisma.entry.create({
    data: {
      userId: session.user.id,
      seasonId,
      leagueId: leagueId ?? null,
      nickname: nickname ?? null,
      entryNumber,
      draftInProgress: true,
    },
  })

  return NextResponse.json({
    success: true,
    entryId: entry.id,
    entryNumber: entry.entryNumber,
  })
}
