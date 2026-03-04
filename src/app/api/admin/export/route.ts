import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * Escape a value for CSV output.
 * Wraps in double quotes if it contains commas, quotes, or newlines.
 * Doubles any embedded double quotes per RFC 4180.
 */
function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * GET /api/admin/export?seasonId=xxx
 *
 * Exports all entries with their picks for the given season as CSV.
 * If seasonId is omitted, uses the current season from AppSettings.
 * Admin/SuperAdmin only.
 */
export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // ── Determine season ──────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url)
  let seasonId = searchParams.get("seasonId")

  if (!seasonId) {
    const settings = await prisma.appSettings.findUnique({
      where: { id: "main" },
      select: { currentSeasonId: true },
    })
    seasonId = settings?.currentSeasonId ?? null
  }

  if (!seasonId) {
    return NextResponse.json(
      { error: "No seasonId provided and no current season configured" },
      { status: 400 }
    )
  }

  // Verify season exists and get year for filename
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { year: true },
  })
  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 })
  }

  // ── Query entries with picks ──────────────────────────────────────────────
  const entries = await prisma.entry.findMany({
    where: { seasonId },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          username: true,
          email: true,
        },
      },
      entryPicks: {
        include: {
          team: {
            select: {
              name: true,
              seed: true,
              region: true,
            },
          },
          playInSlot: {
            include: {
              team1: { select: { name: true } },
              team2: { select: { name: true } },
              winner: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: [
      { user: { lastName: "asc" } },
      { user: { firstName: "asc" } },
      { entryNumber: "asc" },
    ],
  })

  // ── Sort entries by score descending for ranking ─────────────────────────
  const sortedEntries = [...entries].sort((a, b) => {
    const scoreA = a.score ?? 0
    const scoreB = b.score ?? 0
    if (scoreB !== scoreA) return scoreB - scoreA
    // Tiebreaker: alphabetical by name
    const nameA = [a.user.firstName, a.user.lastName].filter(Boolean).join(" ")
    const nameB = [b.user.firstName, b.user.lastName].filter(Boolean).join(" ")
    return nameA.localeCompare(nameB)
  })

  const totalEntries = sortedEntries.length

  // ── Build CSV ─────────────────────────────────────────────────────────────
  // Header: fixed columns + 8 pick triplets (name, seed, region)
  const headerParts = [
    "Rank",
    "Percentile",
    "Entry ID",
    "Entry Number",
    "Player Name",
    "Username",
    "Email",
    "Nickname",
  ]
  for (let i = 1; i <= 8; i++) {
    headerParts.push(`Pick ${i}`, `Pick ${i} Seed`, `Pick ${i} Region`)
  }
  headerParts.push("Score", "Max Possible Score", "Expected Score", "Teams Alive", "Submitted At")

  const rows: string[] = [headerParts.map(csvEscape).join(",")]

  for (let rank = 0; rank < sortedEntries.length; rank++) {
    const entry = sortedEntries[rank]
    const playerName = [entry.user.firstName, entry.user.lastName]
      .filter(Boolean)
      .join(" ") || ""

    const percentile = totalEntries > 1
      ? Math.round(((rank + 1) / totalEntries) * 1000) / 10
      : 0

    const rowParts: (string | number | null)[] = [
      rank + 1,
      `Top ${percentile}%`,
      entry.id,
      entry.entryNumber,
      playerName,
      entry.user.username,
      entry.user.email,
      entry.nickname,
    ]

    // Add up to 8 picks. Each pick is a triplet: name, seed, region
    const picks = entry.entryPicks.slice(0, 8)
    for (let i = 0; i < 8; i++) {
      const pick = picks[i]
      if (!pick) {
        // Empty pick slot
        rowParts.push("", "", "")
      } else if (pick.team) {
        // Direct team pick
        rowParts.push(pick.team.name, pick.team.seed, pick.team.region)
      } else if (pick.playInSlot) {
        // Play-in slot pick
        const slot = pick.playInSlot
        const teamName = slot.winner
          ? slot.winner.name
          : `Play-in: ${slot.team1.name}/${slot.team2.name}`
        rowParts.push(teamName, slot.seed, slot.region)
      } else {
        rowParts.push("", "", "")
      }
    }

    rowParts.push(
      entry.score,
      entry.maxPossibleScore,
      entry.expectedScore != null ? Math.round(entry.expectedScore * 100) / 100 : null,
      entry.teamsAlive,
      entry.createdAt.toISOString()
    )

    rows.push(rowParts.map(csvEscape).join(","))
  }

  const csv = rows.join("\n")
  const filename = `slipper8s-entries-${season.year}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
