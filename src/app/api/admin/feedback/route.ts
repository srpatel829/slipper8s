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
    ? {
        OR: [
          { message: { contains: search, mode: "insensitive" as const } },
          { userName: { contains: search, mode: "insensitive" as const } },
          { userEmail: { contains: search, mode: "insensitive" as const } },
          { page: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {}

  const [feedbacks, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.feedback.count({ where }),
  ])

  return NextResponse.json({ feedbacks, total })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Missing feedback id" }, { status: 400 })
  }

  await prisma.feedback.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
