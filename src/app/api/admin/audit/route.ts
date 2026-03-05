import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const skip = parseInt(searchParams.get("skip") ?? "0", 10)
  const take = Math.min(parseInt(searchParams.get("take") ?? "25", 10), 100)
  const search = searchParams.get("search") ?? ""

  const where = search
    ? { action: { contains: search, mode: "insensitive" as const } }
    : {}

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({ logs, total })
}
