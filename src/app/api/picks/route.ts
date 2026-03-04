import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEntryConfirmationEmail } from "@/lib/email"

// ─── GET — Fetch user's entries + picks for current season ────────────────────
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const seasonId = req.nextUrl.searchParams.get("seasonId")
  const entryId = req.nextUrl.searchParams.get("entryId")

  // If specific entry requested
  if (entryId) {
    const entry = await prisma.entry.findUnique({
      where: { id: entryId },
      include: {
        entryPicks: {
          include: {
            team: true,
            playInSlot: { include: { team1: true, team2: true, winner: true } },
          },
        },
      },
    })
    if (!entry || entry.userId !== session.user.id) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }
    return NextResponse.json(entry)
  }

  // Get current season
  const currentSeasonId = seasonId ?? (await getCurrentSeasonId())
  if (!currentSeasonId) {
    return NextResponse.json({ entries: [], seasonId: null })
  }

  // Fetch all entries for user in this season
  const entries = await prisma.entry.findMany({
    where: { userId: session.user.id, seasonId: currentSeasonId },
    include: {
      entryPicks: {
        include: {
          team: true,
          playInSlot: { include: { team1: true, team2: true, winner: true } },
        },
      },
      league: { select: { id: true, name: true } },
    },
    orderBy: { entryNumber: "asc" },
  })

  return NextResponse.json({ entries, seasonId: currentSeasonId })
}

// ─── POST — Create a new entry with 8 picks ──────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Check deadline
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  if (settings?.picksDeadline && new Date() > new Date(settings.picksDeadline)) {
    return NextResponse.json({ error: "Picks deadline has passed" }, { status: 400 })
  }

  const body = await req.json()
  const { picks, seasonId: requestSeasonId, leagueId, nickname, charityPreference } = body

  const validation = validatePicks(picks)
  if (validation) return NextResponse.json({ error: validation }, { status: 400 })

  // Resolve season
  const seasonId = requestSeasonId ?? (await getCurrentSeasonId())
  if (!seasonId) {
    return NextResponse.json({ error: "No active season found" }, { status: 400 })
  }

  // Determine entry number (next available for this user/season)
  const existingEntries = await prisma.entry.count({
    where: { userId: session.user.id, seasonId },
  })
  const entryNumber = existingEntries + 1

  // Validate league exists if provided
  if (leagueId) {
    const league = await prisma.league.findUnique({ where: { id: leagueId } })
    if (!league || league.seasonId !== seasonId) {
      return NextResponse.json({ error: "Invalid league" }, { status: 400 })
    }
  }

  // Create entry + picks in a transaction
  const entry = await prisma.$transaction(async (tx) => {
    const newEntry = await tx.entry.create({
      data: {
        userId: session.user.id,
        seasonId,
        leagueId: leagueId ?? null,
        nickname: nickname ?? null,
        entryNumber,
        charityPreference: charityPreference ?? null,
        draftInProgress: false,
      },
    })

    await tx.entryPick.createMany({
      data: picks.map((p: { teamId?: string; playInSlotId?: string }) => ({
        entryId: newEntry.id,
        teamId: p.teamId ?? null,
        playInSlotId: p.playInSlotId ?? null,
      })),
    })

    return newEntry
  })

  // Also save to legacy Pick table for backward compat (if first entry)
  if (entryNumber === 1) {
    try {
      await prisma.pick.deleteMany({ where: { userId: session.user.id } })
      await prisma.pick.createMany({
        data: picks.map((p: { teamId?: string; playInSlotId?: string }) => ({
          userId: session.user.id,
          teamId: p.teamId ?? null,
          playInSlotId: p.playInSlotId ?? null,
        })),
      })
    } catch {
      // Legacy compat — don't fail if this errors
    }
  }

  // Send confirmation email (fire and forget)
  sendPickConfirmationEmail(session.user.id, entry.id).catch((err) =>
    console.error("[picks] Confirmation email failed:", err)
  )

  return NextResponse.json({ success: true, entryId: entry.id, entryNumber })
}

// ─── PUT — Update picks for an existing entry ────────────────────────────────
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Check deadline
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  if (settings?.picksDeadline && new Date() > new Date(settings.picksDeadline)) {
    return NextResponse.json({ error: "Picks deadline has passed" }, { status: 400 })
  }

  const body = await req.json()
  const { picks, entryId, charityPreference } = body

  const validation = validatePicks(picks)
  if (validation) return NextResponse.json({ error: validation }, { status: 400 })

  if (!entryId) {
    return NextResponse.json({ error: "entryId required for update" }, { status: 400 })
  }

  // Verify entry belongs to user
  const entry = await prisma.entry.findUnique({ where: { id: entryId } })
  if (!entry || entry.userId !== session.user.id) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 })
  }

  // Delete old picks and create new ones, update charity preference
  await prisma.$transaction([
    prisma.entry.update({
      where: { id: entryId },
      data: { charityPreference: charityPreference ?? null, draftInProgress: false },
    }),
    prisma.entryPick.deleteMany({ where: { entryId } }),
    prisma.entryPick.createMany({
      data: picks.map((p: { teamId?: string; playInSlotId?: string }) => ({
        entryId,
        teamId: p.teamId ?? null,
        playInSlotId: p.playInSlotId ?? null,
      })),
    }),
  ])

  // Sync to legacy Pick table if this is entry #1
  if (entry.entryNumber === 1) {
    try {
      await prisma.pick.deleteMany({ where: { userId: session.user.id } })
      await prisma.pick.createMany({
        data: picks.map((p: { teamId?: string; playInSlotId?: string }) => ({
          userId: session.user.id,
          teamId: p.teamId ?? null,
          playInSlotId: p.playInSlotId ?? null,
        })),
      })
    } catch {
      // Legacy compat
    }
  }

  // Send confirmation email
  sendPickConfirmationEmail(session.user.id, entryId).catch((err) =>
    console.error("[picks] Confirmation email failed:", err)
  )

  return NextResponse.json({ success: true, entryId })
}

// ─── DELETE — Remove an entry entirely ────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Check deadline
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  if (settings?.picksDeadline && new Date() > new Date(settings.picksDeadline)) {
    return NextResponse.json({ error: "Cannot delete entries after deadline" }, { status: 400 })
  }

  const { entryId } = await req.json()
  if (!entryId) {
    return NextResponse.json({ error: "entryId required" }, { status: 400 })
  }

  const entry = await prisma.entry.findUnique({ where: { id: entryId } })
  if (!entry || entry.userId !== session.user.id) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 })
  }

  // Delete entry (cascades to EntryPicks)
  await prisma.entry.delete({ where: { id: entryId } })

  return NextResponse.json({ success: true })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCurrentSeasonId(): Promise<string | null> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  if (settings?.currentSeasonId) return settings.currentSeasonId

  // Fallback: find the most recent season
  const season = await prisma.season.findFirst({
    where: { status: { in: ["REGISTRATION", "LOCKED", "ACTIVE"] } },
    orderBy: { year: "desc" },
  })
  return season?.id ?? null
}

async function sendPickConfirmationEmail(userId: string, entryId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, firstName: true },
  })
  if (!user?.email || !user?.firstName) return

  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    include: {
      entryPicks: {
        include: { team: { select: { name: true, seed: true, region: true } } },
      },
    },
  })
  if (!entry) return

  const pickDetails = entry.entryPicks
    .filter((p) => p.team)
    .map((p) => ({
      name: p.team!.name,
      seed: p.team!.seed,
      region: p.team!.region ?? "",
    }))

  if (pickDetails.length > 0) {
    await sendEntryConfirmationEmail(user.email, user.firstName, pickDetails)
  }
}

function validatePicks(picks: unknown): string | null {
  if (!Array.isArray(picks) || picks.length !== 8) {
    return "Exactly 8 picks required"
  }
  for (const p of picks) {
    if (!p.teamId && !p.playInSlotId) {
      return "Each pick requires teamId or playInSlotId"
    }
    if (p.teamId && p.playInSlotId) {
      return "Each pick can only have one of teamId or playInSlotId"
    }
  }
  // Check for duplicates
  const teamIds = picks.filter((p) => p.teamId).map((p) => p.teamId)
  const slotIds = picks.filter((p) => p.playInSlotId).map((p) => p.playInSlotId)
  if (new Set(teamIds).size !== teamIds.length) return "Duplicate team picks not allowed"
  if (new Set(slotIds).size !== slotIds.length) return "Duplicate play-in slot picks not allowed"
  return null
}
