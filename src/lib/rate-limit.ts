/**
 * Simple in-memory rate limiter for API routes.
 *
 * Limits: 100 requests per minute per IP.
 *
 * Note: In-memory state resets on cold starts in serverless.
 * For production with high traffic, replace with Upstash Redis rate limiting.
 */

const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 100

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Periodic cleanup to prevent memory leaks
let lastCleanup = Date.now()
function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < WINDOW_MS) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}

/**
 * Check if a request should be rate limited.
 * @returns null if allowed, or a Response object if rate limited.
 */
export function rateLimit(ip: string): Response | null {
  cleanup()

  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return null
  }

  entry.count++

  if (entry.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
        },
      },
    )
  }

  return null
}

/**
 * Get the client IP from a Request object.
 * Handles Vercel's x-forwarded-for header.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  const realIp = req.headers.get("x-real-ip")
  if (realIp) return realIp
  return "unknown"
}
