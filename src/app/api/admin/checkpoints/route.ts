import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createDimensionSnapshots } from "@/lib/snapshots"

// GET /api/admin/checkpoints — list all checkpoints for current season
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session.user.role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  if (!settings?.currentSeasonId) {
    return NextResponse.json({ checkpoints: [], seasonId: null })
  }

  const checkpoints = await prisma.checkpoint.findMany({
    where: { seasonId: settings.currentSeasonId },
    orderBy: { gameIndex: "asc" },
    include: {
      dimensions: {
        select: {
          id: true,
          dimensionType: true,
          dimensionValue: true,
          leaderEntryId: true,
          medianEntryId: true,
          totalEntries: true,
          rollingOptimal8Score: true,
          hindsightOptimal8Score: true,
        },
      },
    },
  })

  return NextResponse.json({
    checkpoints: checkpoints.map((cp) => ({
      id: cp.id,
      gameIndex: cp.gameIndex,
      roundLabel: cp.roundLabel,
      isSession: cp.isSession,
      dailyRecapSentAt: cp.dailyRecapSentAt,
      createdAt: cp.createdAt,
      dimensionCount: cp.dimensions.length,
      dimensions: cp.dimensions,
    })),
    seasonId: settings.currentSeasonId,
  })
}

// POST /api/admin/checkpoints — manually create a checkpoint
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session.user.role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { gameIndex, roundLabel, isSession } = body

  if (gameIndex == null || !roundLabel) {
    return NextResponse.json({ error: "gameIndex and roundLabel are required" }, { status: 400 })
  }

  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  if (!settings?.currentSeasonId) {
    return NextResponse.json({ error: "No active season" }, { status: 400 })
  }

  // Check for duplicate
  const existing = await prisma.checkpoint.findUnique({
    where: { seasonId_gameIndex: { seasonId: settings.currentSeasonId, gameIndex } },
  })
  if (existing) {
    return NextResponse.json({ error: `Checkpoint at game index ${gameIndex} already exists` }, { status: 409 })
  }

  const checkpoint = await prisma.checkpoint.create({
    data: {
      seasonId: settings.currentSeasonId,
      gameIndex,
      roundLabel,
      isSession: isSession ?? true,
    },
  })

  // Create dimension snapshots
  await createDimensionSnapshots(checkpoint.id, settings.currentSeasonId)

  await prisma.auditLog.create({
    data: {
      adminId: session.user.id ?? "unknown",
      action: `Manually created checkpoint: ${roundLabel} (game ${gameIndex})`,
    },
  })

  return NextResponse.json({ id: checkpoint.id }, { status: 201 })
}

// PUT /api/admin/checkpoints — recalculate dimension snapshots
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session.user.role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { checkpointId, action } = body

  if (!checkpointId) {
    return NextResponse.json({ error: "checkpointId required" }, { status: 400 })
  }

  const checkpoint = await prisma.checkpoint.findUnique({ where: { id: checkpointId } })
  if (!checkpoint) {
    return NextResponse.json({ error: "Checkpoint not found" }, { status: 404 })
  }

  if (action === "recalculate") {
    // Delete existing snapshots and recreate
    await prisma.checkpointDimensionSnapshot.deleteMany({ where: { checkpointId } })
    await createDimensionSnapshots(checkpointId, checkpoint.seasonId)

    await prisma.auditLog.create({
      data: {
        adminId: session.user.id ?? "unknown",
        action: `Recalculated dimension snapshots for checkpoint: ${checkpoint.roundLabel} (game ${checkpoint.gameIndex})`,
      },
    })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}

// DELETE /api/admin/checkpoints — remove a checkpoint
export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session.user.role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(request.url)
  const checkpointId = url.searchParams.get("id")

  if (!checkpointId) {
    return NextResponse.json({ error: "Checkpoint id required" }, { status: 400 })
  }

  const checkpoint = await prisma.checkpoint.findUnique({ where: { id: checkpointId } })
  if (!checkpoint) {
    return NextResponse.json({ error: "Checkpoint not found" }, { status: 404 })
  }

  // Cascade delete handles dimension snapshots
  await prisma.checkpoint.delete({ where: { id: checkpointId } })

  await prisma.auditLog.create({
    data: {
      adminId: session.user.id ?? "unknown",
      action: `Deleted checkpoint: ${checkpoint.roundLabel} (game ${checkpoint.gameIndex})`,
    },
  })

  return NextResponse.json({ success: true })
}
