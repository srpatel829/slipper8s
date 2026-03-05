import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { invalidateLeaderboardCache, getCacheStats } from "@/lib/cache"

// GET — Get cache stats
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const stats = await getCacheStats()
  return NextResponse.json(stats)
}

// POST — Force invalidate cache for current season
export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  if (!settings?.currentSeasonId) {
    return NextResponse.json({ error: "No active season" }, { status: 400 })
  }

  await invalidateLeaderboardCache(settings.currentSeasonId)

  await prisma.auditLog.create({
    data: {
      adminId: session.user.id!,
      action: "Force invalidated leaderboard cache",
      details: { seasonId: settings.currentSeasonId },
    },
  })

  return NextResponse.json({ success: true, message: "Cache invalidated" })
}
