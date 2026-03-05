import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getEntryScoreHistory, getSeasonCheckpoints } from "@/lib/snapshots"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

/**
 * GET /api/scores/history — Score history for the chart/timeline feature
 *
 * Returns:
 * - checkpoints: all session checkpoints for the season
 * - entries: score snapshots for requested entries
 * - optimal8: rolling optimal 8 score at each checkpoint (from dimension snapshots)
 *
 * Query params:
 *   ?entryIds=id1,id2,id3  — specific entries to include
 *   ?includeLeaderMedian=true — include leader and median lines (default true)
 *   ?seasonId=xxx — override season (default: current)
 *
 * CLAUDE.md spec default lines:
 * 1. Optimal 8 (Rolling) — dashed line
 * 2. Leader — current best player
 * 3. Your entry — logged-in player
 * 4. Median — middle player
 * 5. Optimal 8 (Hindsight) — only after tournament completes
 */
export async function GET(req: NextRequest) {
  const rateLimitResponse = rateLimit(getClientIp(req))
  if (rateLimitResponse) return rateLimitResponse

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const params = req.nextUrl.searchParams
  const entryIds = params.get("entryIds")?.split(",").filter(Boolean) ?? []
  const includeLeaderMedian = params.get("includeLeaderMedian") !== "false"

  // Resolve season
  let seasonId = params.get("seasonId")
  if (!seasonId) {
    const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
    seasonId = settings?.currentSeasonId ?? null
  }
  if (!seasonId) {
    return NextResponse.json({ checkpoints: [], entries: {}, error: "No active season" })
  }

  // Get all checkpoints
  const checkpoints = await getSeasonCheckpoints(seasonId)

  // If no specific entries requested, get the user's entries
  if (entryIds.length === 0) {
    const userEntries = await prisma.entry.findMany({
      where: { userId: session.user.id, seasonId },
      select: { id: true },
    })
    entryIds.push(...userEntries.map((e) => e.id))
  }

  // Add leader and median entry IDs from the latest checkpoint
  if (includeLeaderMedian && checkpoints.length > 0) {
    const latestCheckpoint = checkpoints[checkpoints.length - 1]
    const globalDim = latestCheckpoint.dimensions.find(
      (d) => d.dimensionType === "global"
    )
    if (globalDim?.leaderEntryId && !entryIds.includes(globalDim.leaderEntryId)) {
      entryIds.push(globalDim.leaderEntryId)
    }
    if (globalDim?.medianEntryId && !entryIds.includes(globalDim.medianEntryId)) {
      entryIds.push(globalDim.medianEntryId)
    }
  }

  // Fetch score history for all requested entries
  const entryHistories: Record<string, {
    entryId: string
    name: string
    isCurrentUser: boolean
    isLeader: boolean
    isMedian: boolean
    snapshots: Array<{
      score: number
      rank: number
      percentile: number
      gameId: string | null
      round: number | null
      savedAt: string
    }>
  }> = {}

  // Get entry metadata
  const entries = await prisma.entry.findMany({
    where: { id: { in: entryIds } },
    select: {
      id: true,
      userId: true,
      entryNumber: true,
      nickname: true,
      user: { select: { name: true, email: true } },
    },
  })

  // Determine leader/median from latest checkpoint
  const latestCheckpoint = checkpoints.length > 0 ? checkpoints[checkpoints.length - 1] : null
  const globalDim = latestCheckpoint?.dimensions.find((d) => d.dimensionType === "global")

  for (const entry of entries) {
    const history = await getEntryScoreHistory(entry.id)
    const displayName = entry.user.name ?? entry.user.email

    entryHistories[entry.id] = {
      entryId: entry.id,
      name: entry.entryNumber > 1
        ? (entry.nickname ? `${entry.nickname} (${displayName} ${entry.entryNumber})` : `${displayName} ${entry.entryNumber}`)
        : displayName,
      isCurrentUser: entry.userId === session.user.id,
      isLeader: entry.id === globalDim?.leaderEntryId,
      isMedian: entry.id === globalDim?.medianEntryId,
      snapshots: history.map((s) => ({
        score: s.score,
        rank: s.rank,
        percentile: s.percentile,
        gameId: s.gameId,
        round: s.game?.round ?? null,
        savedAt: s.savedAt.toISOString(),
      })),
    }
  }

  // Build optimal 8 line from checkpoint dimension snapshots
  const optimal8Line = checkpoints.map((cp) => {
    const globalD = cp.dimensions.find((d) => d.dimensionType === "global")
    return {
      checkpointId: cp.id,
      gameIndex: cp.gameIndex,
      roundLabel: cp.roundLabel,
      rollingOptimal8Score: globalD?.rollingOptimal8Score ?? null,
      hindsightOptimal8Score: globalD?.hindsightOptimal8Score ?? null,
    }
  })

  return NextResponse.json({
    checkpoints: checkpoints.map((cp) => ({
      id: cp.id,
      gameIndex: cp.gameIndex,
      roundLabel: cp.roundLabel,
      isSession: cp.isSession,
      createdAt: cp.createdAt.toISOString(),
    })),
    entries: entryHistories,
    optimal8: optimal8Line,
    seasonId,
  })
}
