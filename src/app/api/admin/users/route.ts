import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Role } from "@/generated/prisma"

function requireAdmin(role: string) {
  return role !== "ADMIN" && role !== "SUPERADMIN"
}

export async function GET() {
  const session = await auth()
  if (!session?.user || requireAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isPaid: true,
      createdAt: true,
      _count: { select: { picks: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(users)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user || requireAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { userId, isPaid, role, username } = await req.json()
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  // Fetch target user
  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // SUPERADMIN cannot be demoted by anyone
  if (target.role === "SUPERADMIN" && role !== undefined) {
    return NextResponse.json({ error: "Cannot change SUPERADMIN role" }, { status: 403 })
  }

  // Only SUPERADMIN can promote/demote ADMINs
  if (role !== undefined && session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Only SUPERADMIN can change roles" }, { status: 403 })
  }

  // Username validation (admin rename)
  if (username !== undefined) {
    const trimmed = (username as string).trim()
    if (trimmed.length < 4 || trimmed.length > 20) {
      return NextResponse.json({ error: "Username must be 4-20 characters" }, { status: 400 })
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return NextResponse.json({ error: "Username: letters, numbers, underscores only" }, { status: 400 })
    }
    // Check uniqueness
    const existing = await prisma.user.findUnique({ where: { username: trimmed } })
    if (existing && existing.id !== userId) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {}
  if (isPaid !== undefined) updateData.isPaid = isPaid
  if (role !== undefined) updateData.role = role as Role
  if (username !== undefined) updateData.username = (username as string).trim()

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, email: true, username: true, role: true, isPaid: true },
  })

  // Audit log for username change
  if (username !== undefined) {
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id!,
        action: `Renamed username: "${target.username}" → "${updated.username}" for ${target.email}`,
        details: { userId, oldUsername: target.username, newUsername: updated.username },
      },
    })
  }

  return NextResponse.json(updated)
}
