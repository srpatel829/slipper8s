import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/admin/leagues/backfill-entries
 *
 * For every league member who has exactly one submitted entry for the league's
 * season but hasn't linked it to the league, auto-create the LeagueEntry.
 *
 * This fixes the gap where users joined a league AFTER creating their entry,
 * so the auto-link at entry creation time didn't fire.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Get all leagues
  const leagues = await prisma.league.findMany({
    include: {
      members: { select: { userId: true } },
      leagueEntries: { select: { entryId: true, entry: { select: { userId: true } } } },
    },
  })

  let totalLinked = 0

  for (const league of leagues) {
    // Users who already have entries in this league
    const usersWithEntries = new Set(league.leagueEntries.map((le) => le.entry.userId))

    // Members who DON'T have entries linked yet
    const membersWithout = league.members.filter((m) => !usersWithEntries.has(m.userId))

    for (const member of membersWithout) {
      // Check if this user has exactly one submitted entry for the league's season
      const entries = await prisma.entry.findMany({
        where: {
          userId: member.userId,
          seasonId: league.seasonId,
          draftInProgress: false,
          entryPicks: { some: {} },
        },
        select: { id: true },
      })

      if (entries.length === 1) {
        try {
          await prisma.leagueEntry.create({
            data: {
              leagueId: league.id,
              entryId: entries[0].id,
            },
          })
          totalLinked++
        } catch {
          // Skip duplicates
        }
      }
    }
  }

  await prisma.auditLog.create({
    data: {
      adminId: session.user.id!,
      action: `Backfilled ${totalLinked} league entries for members with single entries`,
    },
  })

  return NextResponse.json({ success: true, linked: totalLinked })
}
