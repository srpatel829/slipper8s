import { NextRequest, NextResponse } from "next/server"
import { syncTournamentData } from "@/lib/espn"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/cron/sync — Vercel cron job for ESPN tournament data sync
 *
 * Protected by CRON_SECRET env var.
 * Smart scheduling: only runs heavy sync when season is ACTIVE or LOCKED.
 * During non-tournament periods, returns early without querying ESPN.
 *
 * CLAUDE.md schedule spec:
 *   Tournament game days, games in progress:  every 2-3 minutes
 *   Tournament game days, between games:       every 15-30 minutes
 *   Non-game days during tournament:           don't poll
 *   Off-season:                                no polling
 *
 * Vercel cron runs on a fixed schedule (e.g. every 5 min on Pro plan).
 * This route decides at runtime whether to actually sync based on season status.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()

  // ── Auth: Verify cron secret ───────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get("authorization")
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  } else {
    // In production CRON_SECRET must be set; allow in dev for testing
    if (process.env.NODE_ENV === "production") {
      console.error("[cron/sync] CRON_SECRET not set in production!")
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
    }
  }

  // ── Smart scheduling: check if we should sync ──────────────────────────────
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
    const seasonId = settings?.currentSeasonId

    if (!seasonId) {
      return NextResponse.json({
        skipped: true,
        reason: "No current season configured",
        duration: Date.now() - startTime,
      })
    }

    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      select: { status: true, year: true },
    })

    if (!season) {
      return NextResponse.json({
        skipped: true,
        reason: "Season not found",
        duration: Date.now() - startTime,
      })
    }

    // Auto-transition: REGISTRATION → LOCKED when picks deadline passes
    if (season.status === "REGISTRATION" && settings?.picksDeadline) {
      const deadline = new Date(settings.picksDeadline)
      if (new Date() > deadline) {
        await prisma.season.update({
          where: { id: seasonId },
          data: { status: "LOCKED" },
        })
        console.log(`[cron/sync] Auto-transitioned season ${season.year} from REGISTRATION → LOCKED (deadline passed)`)
        season.status = "LOCKED"
      }
    }

    // Skip sync only during COMPLETED or truly inactive seasons
    // Allow REGISTRATION (play-in games happen before deadline), LOCKED, and ACTIVE
    if (season.status === "COMPLETED") {
      return NextResponse.json({
        skipped: true,
        reason: `Season is ${season.status} — no sync needed`,
        season: season.year,
        duration: Date.now() - startTime,
      })
    }

    // Check if any games are in progress or scheduled today
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    const [inProgressGames, todayGames] = await Promise.all([
      prisma.tournamentGame.count({
        where: { status: "IN_PROGRESS" },
      }),
      prisma.tournamentGame.count({
        where: {
          startTime: { gte: todayStart, lt: todayEnd },
          isComplete: false,
        },
      }),
    ])

    // If no games today and no games in progress, skip
    // (But still sync if we have zero games in DB — initial bracket load)
    // IMPORTANT: Also sync if the tournament isn't over yet (< 67 total games:
    // 4 play-in + 63 bracket = 67). Otherwise the cron will never discover
    // the next round's games from ESPN once the current round finishes.
    const totalGames = await prisma.tournamentGame.count()
    const completeGames = await prisma.tournamentGame.count({ where: { isComplete: true } })
    const tournamentNotOver = totalGames < 67
    const allCurrentGamesComplete = totalGames > 0 && completeGames === totalGames

    if (totalGames > 0 && inProgressGames === 0 && todayGames === 0) {
      // If all existing games are done but tournament isn't over,
      // we MUST sync to discover next-round games from ESPN
      if (allCurrentGamesComplete && tournamentNotOver) {
        // Fall through to sync — next round games need to be discovered
      } else {
        return NextResponse.json({
          skipped: true,
          reason: "No games today and none in progress",
          season: season.year,
          totalGames,
          duration: Date.now() - startTime,
        })
      }
    }
  } catch (err) {
    // If we can't determine schedule, sync anyway (fail-open for game days)
    console.error("[cron/sync] Schedule check failed, proceeding with sync:", err)
  }

  // ── Run the sync ───────────────────────────────────────────────────────────
  try {
    const result = await syncTournamentData()
    const duration = Date.now() - startTime

    // Log summary
    console.log(
      `[cron/sync] Completed in ${duration}ms:`,
      `${result.gamesUpdated} games, ${result.teamsUpdated} teams,`,
      `${result.playInResolved} play-ins, ${result.entriesRecalculated ?? 0} entries scored,`,
      `${result.errors.length} errors`
    )

    if (result.errors.length > 0) {
      console.error("[cron/sync] Errors:", result.errors)
    }

    return NextResponse.json({ ...result, duration })
  } catch (err) {
    const duration = Date.now() - startTime
    console.error("[cron/sync] Fatal error:", err)
    return NextResponse.json(
      { error: "Sync failed", message: String(err), duration },
      { status: 500 }
    )
  }
}
