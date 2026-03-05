import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function getSettings() {
  return prisma.appSettings.upsert({
    where: { id: "main" },
    create: { id: "main", picksDeadline: null, payoutStructure: [], defaultCharities: [] },
    update: {},
  })
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session.user.role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const settings = await getSettings()
  return NextResponse.json(settings)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session.user.role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
  const { picksDeadline, payoutStructure, defaultCharities, maintenanceMode } = body

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    picksDeadline: picksDeadline ? new Date(picksDeadline) : null,
    payoutStructure: payoutStructure ?? [],
    defaultCharities: defaultCharities ?? [],
  }

  // Only update maintenanceMode if explicitly passed (separate toggle from other settings)
  if (maintenanceMode !== undefined) {
    updateData.maintenanceMode = Boolean(maintenanceMode)
  }

  const updated = await prisma.appSettings.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      ...updateData,
    },
    update: updateData,
  })

  // Audit log for maintenance mode changes
  if (maintenanceMode !== undefined) {
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id!,
        action: maintenanceMode
          ? "Enabled maintenance mode — users redirected to /maintenance"
          : "Disabled maintenance mode — site is live",
      },
    })
  }

  return NextResponse.json(updated)
}
