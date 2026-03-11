import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isProfane } from "@/lib/profanity"
import { sendWelcomeEmail } from "@/lib/email"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(request: Request) {
  const rateLimitResponse = rateLimit(getClientIp(request))
  if (rateLimitResponse) return rateLimitResponse

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
  const { firstName, lastName, username, country, state, gender, favoriteTeam, dateOfBirth, phone } = body

  // Validate required fields
  if (!firstName?.trim() || !lastName?.trim() || !username?.trim()) {
    return NextResponse.json(
      { error: "First name, last name, and username are required" },
      { status: 400 }
    )
  }

  // Validate username format
  const trimmedUsername = username.trim()
  if (!/^[a-zA-Z0-9_]{4,20}$/.test(trimmedUsername)) {
    return NextResponse.json(
      { error: "Username must be 4-20 characters, letters/numbers/underscores only" },
      { status: 400 }
    )
  }

  // Check profanity
  if (isProfane(trimmedUsername)) {
    return NextResponse.json(
      { error: "Username contains inappropriate language" },
      { status: 400 }
    )
  }

  // Check username uniqueness (case-insensitive), excluding current user
  const existing = await prisma.user.findFirst({
    where: {
      username: { equals: trimmedUsername, mode: "insensitive" },
      NOT: { id: session.user.id },
    },
    select: { id: true },
  })

  if (existing) {
    return NextResponse.json({ error: "Username is already taken" }, { status: 409 })
  }

  // Validate dateOfBirth if provided
  let parsedDob: Date | null = null
  if (dateOfBirth) {
    parsedDob = new Date(dateOfBirth)
    if (isNaN(parsedDob.getTime())) {
      return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 })
    }
    const age = (Date.now() - parsedDob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    if (age < 13) {
      return NextResponse.json({ error: "Must be at least 13 years old" }, { status: 400 })
    }
  }

  // Validate phone if provided
  let cleanPhone: string | null = null
  if (phone) {
    const digits = phone.replace(/\D/g, "")
    if (digits.length < 7 || digits.length > 20) {
      return NextResponse.json({ error: "Phone number must be 7-20 digits" }, { status: 400 })
    }
    cleanPhone = digits
  }

  // Try to find matching team record for favoriteTeamId
  let favoriteTeamId: string | null = null
  if (favoriteTeam) {
    const team = await prisma.team.findFirst({
      where: { name: { equals: favoriteTeam, mode: "insensitive" } },
      select: { id: true },
    })
    if (team) favoriteTeamId = team.id
  }

  // Update user profile
  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: `${firstName.trim()} ${lastName.trim()}`,
      username: trimmedUsername,
      country: country?.trim() || null,
      state: state?.trim() || null,
      gender: gender || null,
      favoriteTeamName: favoriteTeam || null,
      favoriteTeamId,
      dateOfBirth: parsedDob,
      phone: cleanPhone,
      registrationComplete: true,
    },
  })

  // Determine welcome email variant based on season status
  const settings = await prisma.appSettings.findUnique({
    where: { id: "main" },
    select: { currentSeasonId: true },
  })
  let emailVariant: "pre-bracket" | "live" = "pre-bracket"
  if (settings?.currentSeasonId) {
    const season = await prisma.season.findUnique({
      where: { id: settings.currentSeasonId },
      select: { status: true },
    })
    // REGISTRATION means bracket is out and picks are open; LOCKED/ACTIVE/COMPLETED means games are live
    if (season?.status === "REGISTRATION" || season?.status === "LOCKED" || season?.status === "ACTIVE" || season?.status === "COMPLETED") {
      emailVariant = "live"
    }
  }

  // Send welcome email (mandatory — fire and forget, don't block registration)
  if (updatedUser.email && updatedUser.firstName) {
    sendWelcomeEmail(updatedUser.email, updatedUser.firstName, emailVariant).catch((err) =>
      console.error("[register] Welcome email failed:", err)
    )
  }

  return NextResponse.json({
    success: true,
    user: {
      id: updatedUser.id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      username: updatedUser.username,
    },
  })
}
