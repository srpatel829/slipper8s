import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  // Block in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Dev login is not available in production" },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")

  if (!email) {
    return NextResponse.json(
      { error: "Email query parameter is required" },
      { status: 400 }
    )
  }

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        emailVerified: new Date(),
      },
    })

    // First user becomes SUPERADMIN (matches auth.ts createUser event)
    const count = await prisma.user.count()
    if (count === 1) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: "SUPERADMIN" },
      })
    }
  }

  // Create a session token
  const sessionToken = crypto.randomUUID()
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
    },
  })

  // Set the NextAuth session cookie
  const cookieStore = await cookies()
  cookieStore.set("authjs.session-token", sessionToken, {
    expires,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: false, // dev only — no HTTPS locally
  })

  // Redirect based on registration status
  const redirectUrl = user.registrationComplete ? "/picks" : "/register"
  return NextResponse.redirect(new URL(redirectUrl, request.url))
}
