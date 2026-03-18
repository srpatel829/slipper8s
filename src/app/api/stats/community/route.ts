import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { D1_TEAMS_BY_CONFERENCE } from "@/lib/d1-teams"

// Build a team→conference lookup from the full D1 teams list
const TEAM_TO_CONFERENCE = new Map<string, string>()
for (const group of D1_TEAMS_BY_CONFERENCE) {
  for (const team of group.teams) {
    TEAM_TO_CONFERENCE.set(team, group.conference)
  }
}

/**
 * GET /api/stats/community — Aggregated community stats
 *
 * Returns demographics and participation data for the stats page.
 * Auth required (logged-in users only). No season status gate.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
    const seasonId = settings?.currentSeasonId

    // Run all queries in parallel
    const [
      uniquePlayers,
      totalEntries,
      privateLeagues,
      genderGroups,
      countryGroups,
      stateGroups,
      fanBaseGroups,
    ] = await Promise.all([
      // Unique registered players
      prisma.user.count({ where: { registrationComplete: true } }),

      // Total submitted entries (current season)
      seasonId
        ? prisma.entry.count({
            where: { seasonId, draftInProgress: false, entryPicks: { some: {} } },
          })
        : Promise.resolve(0),

      // Private leagues (current season)
      seasonId
        ? prisma.league.count({ where: { seasonId } })
        : Promise.resolve(0),

      // Gender breakdown
      prisma.user.groupBy({
        by: ["gender"],
        where: { registrationComplete: true },
        _count: { id: true },
      }),

      // Countries
      prisma.user.groupBy({
        by: ["country"],
        where: { registrationComplete: true, country: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),

      // US states
      prisma.user.groupBy({
        by: ["state"],
        where: { registrationComplete: true, country: "United States", state: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),

      // Fan bases (favorite team)
      prisma.user.groupBy({
        by: ["favoriteTeamName"],
        where: { registrationComplete: true, favoriteTeamName: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),

    ])

    // Aggregate conferences from favoriteTeamName using D1 teams lookup
    const confCounts = new Map<string, number>()
    for (const g of fanBaseGroups) {
      const teamName = g.favoriteTeamName
      if (!teamName) continue
      const conf = TEAM_TO_CONFERENCE.get(teamName)
      if (conf) confCounts.set(conf, (confCounts.get(conf) ?? 0) + g._count.id)
    }
    const conferences = [...confCounts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json(
      {
        uniquePlayers,
        totalEntries,
        privateLeagues,
        gender: genderGroups.map((g) => ({
          value: g.gender ?? "NO_RESPONSE",
          count: g._count.id,
        })),
        countries: countryGroups.map((g) => ({
          value: g.country!,
          count: g._count.id,
        })),
        states: stateGroups.map((g) => ({
          value: g.state!,
          count: g._count.id,
        })),
        conferences,
        fanBases: fanBaseGroups.map((g) => ({
          value: g.favoriteTeamName!,
          count: g._count.id,
          conference: TEAM_TO_CONFERENCE.get(g.favoriteTeamName!) ?? null,
        })),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    )
  } catch (err) {
    console.error("[stats/community] Error:", err)
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 })
  }
}
