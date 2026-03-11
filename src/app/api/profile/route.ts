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
  const { country, state, gender, favoriteTeamId, favoriteTeamName, notificationsEnabled, dateOfBirth, phone } = body

  // Validate gender if provided
  if (gender && !VALID_GENDERS.includes(gender)) {
    return NextResponse.json({ error: "Invalid gender value" }, { status: 400 })
  }

  // Validate string lengths to prevent abuse
  if (country && typeof country === "string" && country.length > 100) {
    return NextResponse.json({ error: "Country value too long" }, { status: 400 })
  }
  if (state && typeof state === "string" && state.length > 100) {
    return NextResponse.json({ error: "State value too long" }, { status: 400 })
  }

  // Validate dateOfBirth if provided
  if (dateOfBirth !== undefined && dateOfBirth !== null) {
    const parsedDob = new Date(dateOfBirth)
    if (isNaN(parsedDob.getTime())) {
      return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 })
    }
    // Must be at least 13 years old
    const thirteenYearsAgo = new Date()
    thirteenYearsAgo.setFullYear(thirteenYearsAgo.getFullYear() - 13)
    if (parsedDob > thirteenYearsAgo) {
      return NextResponse.json({ error: "Must be at least 13 years old" }, { status: 400 })
    }
  }

  // Validate phone if provided
  if (phone !== undefined && phone !== null && phone !== "") {
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, "")
    if (cleanPhone.length > 20 || !/^\+?\d{7,20}$/.test(cleanPhone)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 })
    }
  }

  // Resolve favorite team: accept name (from TeamCombobox) or ID (from DB-driven select)
  let resolvedTeamId: string | null = null
  let resolvedTeamName: string | null = null

  if (favoriteTeamName && favoriteTeamName !== "none") {
    resolvedTeamName = favoriteTeamName
    // Try to find matching team in DB (will exist once tournament is synced)
    const team = await prisma.team.findFirst({ where: { name: favoriteTeamName } })
    if (team) {
      resolvedTeamId = team.id
    }
  } else if (favoriteTeamId && favoriteTeamId !== "none") {
    const team = await prisma.team.findUnique({ where: { id: favoriteTeamId } })
    if (team) {
      resolvedTeamId = team.id
      resolvedTeamName = team.name
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      country: country === "none" ? null : (country ?? null),
      state: country !== "United States" ? null : (state === "none" ? null : (state ?? null)),
      gender: gender === "NO_RESPONSE" ? "NO_RESPONSE" as Gender : (gender ? gender as Gender : null),
      favoriteTeamId: resolvedTeamId,
      favoriteTeamName: resolvedTeamName,
      notificationsEnabled: typeof notificationsEnabled === "boolean" ? notificationsEnabled : undefined,
      ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
      ...(phone !== undefined && { phone: phone || null }),
    },
  })

  return NextResponse.json({ success: true })
}
