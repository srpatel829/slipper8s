import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Global middleware for security headers.
 *
 * Adds standard security headers to all responses.
 * Auth checks are handled per-route (NextAuth), not in middleware,
 * because Prisma can't run on the Edge runtime.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-DNS-Prefetch-Control", "on")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  )

  // HSTS (only in production)
  if (request.nextUrl.hostname !== "localhost") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    )
  }

  return response
}

export const config = {
  matcher: [
    // Apply to all routes except static files and images
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
