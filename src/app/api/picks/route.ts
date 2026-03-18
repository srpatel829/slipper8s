import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEntryConfirmationEmail } from "@/lib/email"
import { invalidateLeaderboardCache } from "@/lib/cache"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { computeBracketAwarePPR, type TeamBracketInfo } from "@/lib/bracket-ppr"
import { calculateEntryExpectedScore } from "@/lib/silver-bulletin-2026"
import { classifyArchetypes } from "@/lib/archetypes"

// ─── GET — Fetch user's entries + picks for current season ────────────────────
export async function GET(req: NextRequest) {
  const rateLimitResponse = rateLimit(getClientIp(req))
  if (rateLimitResponse) return rateLimitResponse

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
      leagueEntries: { select: { league: { select: { id: true, name: true } } } },
    },
    orderBy: { entryNumber: "asc" },
  })

  return NextResponse.json({ entries, seasonId: currentSeasonId })
}

// ─── POST — Create a new entry with 8 picks ──────────────────────────────────
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
  const { picks, seasonId: requestSeasonId, nickname, charityPreference, leagueIds } = body

  const validation = validatePicks(picks)
  if (validation) return NextResponse.json({ error: validation }, { status: 400 })

  // Resolve season
  const seasonId = requestSeasonId ?? (await getCurrentSeasonId())

  // Check season status — only allow picks during REGISTRATION
  if (seasonId) {
    const season = await prisma.season.findUnique({ where: { id: seasonId }, select: { status: true } })
    if (season && season.status !== "REGISTRATION") {
      return NextResponse.json({ error: "Entry slips are locked for this season" }, { status: 400 })
    }
  }
  if (!seasonId) {
    return NextResponse.json({ error: "No active season found" }, { status: 400 })
  }

  // Determine entry number (next available for this user/season)
  const existingEntries = await prisma.entry.count({
    where: { userId: session.user.id, seasonId },
  })
  const entryNumber = existingEntries + 1

  // Create entry + picks in a transaction
  const entry = await prisma.$transaction(async (tx) => {
    const newEntry = await tx.entry.create({
      data: {
        userId: session.user.id,
        seasonId,
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

  // Link entry to selected leagues (if any provided)
  if (Array.isArray(leagueIds) && leagueIds.length > 0) {
    try {
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
      console.error("[picks] Link to leagues failed:", err)
    }
  }

  // Invalidate leaderboard cache (new entry changes rankings)
  if (seasonId) {
    invalidateLeaderboardCache(seasonId).catch((err) =>
      console.error("[picks] Cache invalidation failed:", err)
    )
  }

  // Send confirmation email (fire and forget)
  sendPickConfirmationEmail(session.user.id, entry.id).catch((err) =>
    console.error("[picks] Confirmation email failed:", err)
  )

  return NextResponse.json({ success: true, entryId: entry.id, entryNumber, nickname: entry.nickname ?? null })
}

// ─── PUT — Update picks for an existing entry ────────────────────────────────
export async function PUT(req: NextRequest) {
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

  // Check season status — only allow edits during REGISTRATION
  const season = await prisma.season.findUnique({ where: { id: entry.seasonId }, select: { status: true } })
  if (season && season.status !== "REGISTRATION") {
    return NextResponse.json({ error: "Entry slips are locked for this season" }, { status: 400 })
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

  // Invalidate leaderboard cache (updated picks change rankings)
  if (entry.seasonId) {
    invalidateLeaderboardCache(entry.seasonId).catch((err) =>
      console.error("[picks] Cache invalidation failed:", err)
    )
  }

  // Send confirmation email
  sendPickConfirmationEmail(session.user.id, entryId).catch((err) =>
    console.error("[picks] Confirmation email failed:", err)
  )

  return NextResponse.json({ success: true, entryId, nickname: entry.nickname ?? null })
}

// ─── DELETE — Remove an entry entirely ────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const rateLimitResponse = rateLimit(getClientIp(req))
  if (rateLimitResponse) return rateLimitResponse

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

  // Check season status — only allow deletes during REGISTRATION
  const season = await prisma.season.findUnique({ where: { id: entry.seasonId }, select: { status: true } })
  if (season && season.status !== "REGISTRATION") {
    return NextResponse.json({ error: "Entry slips are locked for this season" }, { status: 400 })
  }

  // Delete entry (cascades to EntryPicks)
  await prisma.entry.delete({ where: { id: entryId } })

  // Invalidate leaderboard cache
  if (entry.seasonId) {
    invalidateLeaderboardCache(entry.seasonId).catch((err) =>
      console.error("[picks] Cache invalidation failed:", err)
    )
  }

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

  const teamSelect = { id: true, name: true, shortName: true, seed: true, region: true, logoUrl: true, espnId: true, wins: true, eliminated: true } as const
  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    include: {
      entryPicks: {
        include: {
          team: { select: teamSelect },
          playInSlot: { include: { team1: { select: teamSelect }, team2: { select: teamSelect }, winner: { select: teamSelect } } },
        },
      },
    },
  })
  if (!entry) return

  // Build effective teams list: direct picks + play-in representative teams
  type TeamData = { id: string; name: string; shortName: string; seed: number; region: string | null; logoUrl: string | null; espnId: string | null; wins: number; eliminated: boolean }
  const effectiveTeams: TeamData[] = []
  const playInSlotPicks: Array<{ team1: TeamData; team2: TeamData; winner: TeamData | null }> = []

  for (const p of entry.entryPicks) {
    if (p.team) {
      effectiveTeams.push(p.team)
    } else if (p.playInSlot) {
      const slot = p.playInSlot
      const rep = slot.winner ?? slot.team1 // representative for TPS/archetypes
      effectiveTeams.push(rep)
      playInSlotPicks.push({ team1: slot.team1, team2: slot.team2, winner: slot.winner })
    }
  }

  if (effectiveTeams.length === 0) return

  // Build pick details — for unresolved play-in slots, show both team names and logos
  const pickDetails: { name: string; seed: number; region: string; logoUrl?: string | null; logoUrl2?: string | null }[] = []
  for (const p of entry.entryPicks) {
    if (p.team) {
      pickDetails.push({
        name: p.team.name,
        seed: p.team.seed,
        region: p.team.region ?? "",
        logoUrl: p.team.logoUrl ?? null,
      })
    } else if (p.playInSlot) {
      const slot = p.playInSlot
      if (slot.winner) {
        // Resolved — show winner only
        pickDetails.push({
          name: slot.winner.name,
          seed: slot.winner.seed,
          region: slot.winner.region ?? "",
          logoUrl: slot.winner.logoUrl ?? null,
        })
      } else {
        // Unresolved — show "Team1 / Team2" with both logos
        pickDetails.push({
          name: `${slot.team1.name} / ${slot.team2.name}`,
          seed: slot.team1.seed,
          region: slot.team1.region ?? "",
          logoUrl: slot.team1.logoUrl ?? null,
          logoUrl2: slot.team2.logoUrl ?? null,
        })
      }
    }
  }

  // Compute TPS (bracket-aware)
  const infoMap = new Map<string, TeamBracketInfo>()
  for (const t of effectiveTeams) {
    infoMap.set(t.id, {
      seed: t.seed,
      region: t.region ?? "",
      wins: t.wins ?? 0,
      eliminated: t.eliminated ?? false,
    })
  }
  const { totalPPR } = computeBracketAwarePPR(
    effectiveTeams.map(t => t.id),
    infoMap,
  )
  const currentScore = effectiveTeams.reduce(
    (s, t) => s + t.seed * (t.wins ?? 0), 0,
  )
  const tps = currentScore + totalPPR

  // Compute expected score — for unresolved play-in slots, include BOTH teams
  const sbTeamIds: string[] = []
  const teamStates = new Map<string, { wins: number; eliminated: boolean }>()

  // Direct team picks
  for (const p of entry.entryPicks) {
    if (p.team) {
      const espnId = p.team.espnId ?? p.team.id
      sbTeamIds.push(espnId)
      teamStates.set(espnId, { wins: p.team.wins ?? 0, eliminated: p.team.eliminated ?? false })
    }
  }
  // Play-in slot picks
  for (const slot of playInSlotPicks) {
    if (slot.winner) {
      const espnId = slot.winner.espnId ?? slot.winner.id
      sbTeamIds.push(espnId)
      teamStates.set(espnId, { wins: slot.winner.wins ?? 0, eliminated: slot.winner.eliminated ?? false })
    } else {
      // Unresolved: add both teams so SB cumulative[0] < 1 is properly used
      for (const t of [slot.team1, slot.team2]) {
        const espnId = t.espnId ?? t.id
        sbTeamIds.push(espnId)
        teamStates.set(espnId, { wins: 0, eliminated: false })
      }
    }
  }

  const allZeroWins = effectiveTeams.every(t => (t.wins ?? 0) === 0)
  const preTournament = allZeroWins && !effectiveTeams.some(t => t.eliminated)
  const expectedScore = calculateEntryExpectedScore(sbTeamIds, teamStates, preTournament)

  // Classify archetypes
  const archetypes = classifyArchetypes(
    effectiveTeams.map(t => t.seed),
    effectiveTeams.map(t => t.region ?? ""),
  )

  await sendEntryConfirmationEmail(
    user.email,
    user.firstName,
    pickDetails,
    entry.nickname,
    entry.entryNumber,
    tps,
    expectedScore,
    archetypes,
  )
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
