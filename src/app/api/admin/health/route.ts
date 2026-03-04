import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

interface HealthCheck {
  name: string
  status: "ok" | "warning" | "error"
  message: string
  lastChecked?: string
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session.user.role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const checks: HealthCheck[] = []

  // 1. Database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.push({ name: "Database", status: "ok", message: "Connected to Neon PostgreSQL" })
  } catch {
    checks.push({ name: "Database", status: "error", message: "Cannot connect to database" })
  }

  // 2. Current season
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
    if (settings?.currentSeasonId) {
      const season = await prisma.season.findUnique({ where: { id: settings.currentSeasonId } })
      if (season) {
        checks.push({
          name: "Active Season",
          status: "ok",
          message: `${season.year} — ${season.status}`,
        })
      } else {
        checks.push({
          name: "Active Season",
          status: "error",
          message: "Season ID set but season not found",
        })
      }
    } else {
      checks.push({
        name: "Active Season",
        status: "warning",
        message: "No active season configured",
      })
    }
  } catch {
    checks.push({ name: "Active Season", status: "error", message: "Failed to check season" })
  }

  // 3. ESPN Poller — check last sync timestamp
  try {
    const lastGame = await prisma.tournamentGame.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    })
    if (lastGame) {
      const hoursSinceUpdate =
        (Date.now() - new Date(lastGame.updatedAt).getTime()) / (1000 * 60 * 60)
      checks.push({
        name: "ESPN Data",
        status: hoursSinceUpdate > 24 ? "warning" : "ok",
        message:
          hoursSinceUpdate > 24
            ? `Last update ${Math.round(hoursSinceUpdate)}h ago`
            : `Last update ${Math.round(hoursSinceUpdate)}h ago`,
        lastChecked: lastGame.updatedAt.toISOString(),
      })
    } else {
      checks.push({
        name: "ESPN Data",
        status: "warning",
        message: "No game data synced yet",
      })
    }
  } catch {
    checks.push({ name: "ESPN Data", status: "error", message: "Failed to check ESPN data" })
  }

  // 4. Teams in bracket
  try {
    const teamCount = await prisma.team.count()
    checks.push({
      name: "Bracket Teams",
      status: teamCount >= 64 ? "ok" : teamCount > 0 ? "warning" : "error",
      message:
        teamCount >= 64
          ? `${teamCount} teams loaded`
          : teamCount > 0
            ? `Only ${teamCount} teams — expected 64+`
            : "No teams in database",
    })
  } catch {
    checks.push({ name: "Bracket Teams", status: "error", message: "Failed to count teams" })
  }

  // 5. Entry deadline
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
    // Also check season-level deadline
    let deadline: Date | null = null
    if (settings?.currentSeasonId) {
      const season = await prisma.season.findUnique({
        where: { id: settings.currentSeasonId },
        select: { entryDeadlineUtc: true },
      })
      deadline = season?.entryDeadlineUtc ?? null
    }
    if (!deadline && settings?.picksDeadline) {
      deadline = new Date(settings.picksDeadline)
    }

    if (deadline) {
      const now = new Date()
      if (deadline > now) {
        const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
        checks.push({
          name: "Entry Deadline",
          status: hoursLeft < 24 ? "warning" : "ok",
          message:
            hoursLeft < 24
              ? `${Math.round(hoursLeft)}h remaining — deadline soon!`
              : `${Math.round(hoursLeft / 24)}d ${Math.round(hoursLeft % 24)}h remaining`,
        })
      } else {
        checks.push({
          name: "Entry Deadline",
          status: "ok",
          message: `Deadline passed — entries locked`,
        })
      }
    } else {
      checks.push({
        name: "Entry Deadline",
        status: "warning",
        message: "No deadline configured",
      })
    }
  } catch {
    checks.push({ name: "Entry Deadline", status: "error", message: "Failed to check deadline" })
  }

  // 6. Resend email — check env var
  checks.push({
    name: "Email (Resend)",
    status: process.env.AUTH_RESEND_KEY ? "ok" : "error",
    message: process.env.AUTH_RESEND_KEY
      ? "API key configured"
      : "AUTH_RESEND_KEY not set — emails will fail",
  })

  // 7. Auth secret
  const authSecret = process.env.AUTH_SECRET
  const isPlaceholder = authSecret?.includes("replace-this")
  checks.push({
    name: "Auth Secret",
    status: authSecret && !isPlaceholder ? "ok" : "error",
    message:
      !authSecret
        ? "AUTH_SECRET not set"
        : isPlaceholder
          ? "Still using placeholder — replace before launch!"
          : "Configured",
  })

  // 8. Cron secret
  checks.push({
    name: "Cron Secret",
    status: process.env.CRON_SECRET ? "ok" : "warning",
    message: process.env.CRON_SECRET
      ? "Configured"
      : "CRON_SECRET not set — cron jobs unprotected",
  })

  // 9. User stats
  try {
    const totalUsers = await prisma.user.count()
    const registeredUsers = await prisma.user.count({
      where: { registrationComplete: true },
    })
    const usersWithPicks = await prisma.user.count({
      where: { picks: { some: {} } },
    })
    checks.push({
      name: "Users",
      status: "ok",
      message: `${totalUsers} total, ${registeredUsers} registered, ${usersWithPicks} with picks`,
    })
  } catch {
    checks.push({ name: "Users", status: "error", message: "Failed to count users" })
  }

  const overallStatus = checks.some((c) => c.status === "error")
    ? "error"
    : checks.some((c) => c.status === "warning")
      ? "warning"
      : "ok"

  return NextResponse.json({ checks, overallStatus, checkedAt: new Date().toISOString() })
}
