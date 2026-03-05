import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Gender } from "@/generated/prisma"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

const VALID_GENDERS: Gender[] = ["MALE", "FEMALE", "OTHER", "NO_RESPONSE"]

export async function PUT(request: Request) {
  const rateLimitResponse = rateLimit(getClientIp(request))
  if (rateLimitResponse) return rateLimitResponse

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = await request.json()
  const { country, state, gender, favoriteTeamId, notificationsEnabled } = body

  // Validate gender if provided
  if (gender && !VALID_GENDERS.includes(gender)) {
    return NextResponse.json({ error: "Invalid gender value" }, { status: 400 })
  }

  // Validate favoriteTeamId if provided
  if (favoriteTeamId && favoriteTeamId !== "none") {
    const team = await prisma.team.findUnique({ where: { id: favoriteTeamId } })
    if (!team) {
      return NextResponse.json({ error: "Invalid team" }, { status: 400 })
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      country: country === "none" ? null : (country ?? null),
      state: country !== "United States" ? null : (state === "none" ? null : (state ?? null)),
      gender: gender === "NO_RESPONSE" ? "NO_RESPONSE" as Gender : (gender ? gender as Gender : null),
      favoriteTeamId: favoriteTeamId === "none" ? null : (favoriteTeamId ?? null),
      notificationsEnabled: typeof notificationsEnabled === "boolean" ? notificationsEnabled : undefined,
    },
  })

  return NextResponse.json({ success: true })
}
