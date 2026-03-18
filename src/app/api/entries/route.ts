import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { isProfane } from "@/lib/profanity"

// POST — Create a new empty entry for a season (user picks teams later via the form)
export async function POST(req: NextRequest) {
  const rateLimitResponse = rateLimit(getClientIp(req))
  if (rateLimitResponse) return rateLimitResponse

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Check deadline
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  if (settings?.picksDeadline && new Date() > new Date(settings.picksDeadline)) {
    return NextResponse.json({ error: "Picks deadline has passed" }, { status: 400 })
  }

  const body = await req.json()
  const { seasonId, nickname, leagueIds } = body

  if (!seasonId) {
    return NextResponse.json({ error: "seasonId required" }, { status: 400 })
  }

  // Profanity check on nickname
  if (nickname && isProfane(nickname)) {
    return NextResponse.json({ error: "Entry name contains inappropriate language" }, { status: 400 })
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
      nickname: nickname ?? null,
      entryNumber,
      draftInProgress: true,
    },
  })

  // Link entry to selected leagues (if any provided)
  if (Array.isArray(leagueIds) && leagueIds.length > 0) {
    try {
      // Validate user is a member of each league and league matches season
      const memberships = await prisma.leagueMember.findMany({
        where: { userId: session.user.id, leagueId: { in: leagueIds } },
        include: { league: { select: { seasonId: true } } },
      })
      const validLeagueIds = memberships
        .filter((m) => m.league.seasonId === seasonId)
        .map((m) => m.leagueId)
      if (validLeagueIds.length > 0) {
        await prisma.leagueEntry.createMany({
          data: validLeagueIds.map((leagueId) => ({
            leagueId,
            entryId: entry.id,
          })),
          skipDuplicates: true,
        })
      }
    } catch (err) {
      console.error("[entries] Link to leagues failed:", err)
    }
  }

  return NextResponse.json({
    success: true,
    entryId: entry.id,
    entryNumber: entry.entryNumber,
  })
}

// PATCH — Rename an entry (update nickname)
export async function PATCH(req: NextRequest) {
  const rateLimitResponse = rateLimit(getClientIp(req))
  if (rateLimitResponse) return rateLimitResponse

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { entryId, nickname } = body

  if (!entryId || !nickname) {
    return NextResponse.json({ error: "entryId and nickname required" }, { status: 400 })
  }

  const trimmed = String(nickname).trim().slice(0, 30)
  if (!trimmed) {
    return NextResponse.json({ error: "Nickname cannot be empty" }, { status: 400 })
  }

  if (isProfane(trimmed)) {
    return NextResponse.json({ error: "Entry name contains inappropriate language" }, { status: 400 })
  }

  // Verify entry belongs to user
  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    select: { userId: true },
  })
  if (!entry || entry.userId !== session.user.id) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 })
  }

  await prisma.entry.update({
    where: { id: entryId },
    data: { nickname: trimmed },
  })

  return NextResponse.json({ success: true, nickname: trimmed })
}
