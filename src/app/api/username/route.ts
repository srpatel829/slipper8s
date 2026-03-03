import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isProfane } from "@/lib/profanity"

// GET /api/username?q=SheelP — check if username is available
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("q")?.trim()

  if (!username) {
    return NextResponse.json({ available: false, error: "Username required" }, { status: 400 })
  }

  // Validate format: 4-20 chars, letters/numbers/underscores only
  if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) {
    return NextResponse.json({
      available: false,
      error: "Username must be 4-20 characters, letters/numbers/underscores only",
    })
  }

  // Check profanity
  if (isProfane(username)) {
    return NextResponse.json({ available: false, error: "Username contains inappropriate language" })
  }

  // Check uniqueness (case-insensitive)
  const existing = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true },
  })

  return NextResponse.json({ available: !existing })
}
