import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/stats/entries — Public endpoint for live entry count
 *
 * Returns the total number of submitted entries for the current season.
 * Used by the landing page live counter.
 * No auth required — this is a public stat.
 */
export async function GET() {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
    const seasonId = settings?.currentSeasonId

    if (!seasonId) {
      return NextResponse.json({ count: 0, seasonId: null })
    }

    const count = await prisma.entry.count({
      where: {
        seasonId,
        draftInProgress: false,
        entryPicks: { some: {} },
      },
    })

    return NextResponse.json(
      { count, seasonId },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    )
  } catch {
    return NextResponse.json({ count: 0, seasonId: null })
  }
}
