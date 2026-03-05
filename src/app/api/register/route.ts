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
  const { firstName, lastName, username, country, state, gender, favoriteTeamId } = body

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
      favoriteTeamId: favoriteTeamId || null,
      registrationComplete: true,
    },
  })

  // Send welcome email (mandatory — fire and forget, don't block registration)
  if (updatedUser.email && updatedUser.firstName) {
    sendWelcomeEmail(updatedUser.email, updatedUser.firstName).catch((err) =>
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
