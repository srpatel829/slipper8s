import { Redis } from "@upstash/redis"
import type { LeaderboardEntry } from "@/types"

/**
 * Leaderboard Cache Module
 *
 * CLAUDE.md spec requirement:
 * "Never query the database on a user page load for leaderboard data.
 *  Serve from cache only. Cache invalidates ONLY when a game result changes scores.
 *  50,000 users refreshing = zero database queries between game results."
 *
 * Architecture:
 * - Uses Upstash Redis when UPSTASH_REDIS_REST_URL is configured
 * - Falls back to in-memory Map for dev/testing (lost on restart, single-instance only)
 * - Cache keys are namespaced by season and dimension
 * - TTL: 24 hours (safety net — cache is primarily invalidated by game events)
 */

// ─── Redis Client ────────────────────────────────────────────────────────────

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) {
    redis = new Redis({ url, token })
    return redis
  }
  return null
}

// ─── In-Memory Fallback ──────────────────────────────────────────────────────

const memoryCache = new Map<string, { data: string; expiresAt: number }>()

function memGet(key: string): string | null {
  const entry = memoryCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key)
    return null
  }
  return entry.data
}

function memSet(key: string, value: string, ttlSeconds: number): void {
  memoryCache.set(key, {
    data: value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}

function memDel(pattern: string): void {
  // Simple prefix-based pattern matching for invalidation
  const prefix = pattern.replace("*", "")
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key)
    }
  }
}

// ─── Cache Key Helpers ───────────────────────────────────────────────────────

const CACHE_PREFIX = "slipper8s:lb"
const DEFAULT_TTL = 86400 // 24 hours (safety net)

function leaderboardKey(seasonId: string, dimension: string = "global", dimensionValue: string = "all"): string {
  return `${CACHE_PREFIX}:${seasonId}:${dimension}:${dimensionValue}`
}

function seasonPattern(seasonId: string): string {
  return `${CACHE_PREFIX}:${seasonId}:*`
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get cached leaderboard data for a specific season and dimension.
 * Returns null if cache miss (caller should query DB and populate cache).
 */
export async function getCachedLeaderboard(
  seasonId: string,
  dimension: string = "global",
  dimensionValue: string = "all"
): Promise<LeaderboardEntry[] | null> {
  const key = leaderboardKey(seasonId, dimension, dimensionValue)

  const client = getRedis()
  if (client) {
    try {
      const data = await client.get<string>(key)
      if (data) return JSON.parse(data)
      return null
    } catch (err) {
      console.error("[cache] Redis get error:", err)
      // Fall through to memory cache
    }
  }

  const memData = memGet(key)
  if (memData) return JSON.parse(memData)
  return null
}

/**
 * Store leaderboard data in cache.
 * Called after computing leaderboard from DB.
 */
export async function setCachedLeaderboard(
  seasonId: string,
  entries: LeaderboardEntry[],
  dimension: string = "global",
  dimensionValue: string = "all"
): Promise<void> {
  const key = leaderboardKey(seasonId, dimension, dimensionValue)
  const serialized = JSON.stringify(entries)

  const client = getRedis()
  if (client) {
    try {
      await client.set(key, serialized, { ex: DEFAULT_TTL })
      return
    } catch (err) {
      console.error("[cache] Redis set error:", err)
      // Fall through to memory cache
    }
  }

  memSet(key, serialized, DEFAULT_TTL)
}

/**
 * Invalidate all leaderboard caches for a season.
 * Called after game results change scores (spec: step 9 of recalculation pipeline).
 *
 * IMPORTANT: This must be called AFTER score snapshots are saved (step 8)
 * and BEFORE any user-facing responses.
 */
export async function invalidateLeaderboardCache(seasonId: string): Promise<void> {
  const pattern = seasonPattern(seasonId)

  const client = getRedis()
  if (client) {
    try {
      // Upstash Redis: delete all keys matching the season pattern
      // Use keys() to find matching keys, then DEL in batches
      const allKeys = await client.keys(pattern)
      if (allKeys.length > 0) {
        // Delete in batches of 100
        for (let i = 0; i < allKeys.length; i += 100) {
          const batch = allKeys.slice(i, i + 100)
          await client.del(...batch)
        }
      }
      return
    } catch (err) {
      console.error("[cache] Redis invalidate error:", err)
      // Fall through to memory cache
    }
  }

  memDel(pattern)
}

/**
 * Check if cache is available and healthy.
 * Used by the admin health board.
 */
export async function checkCacheHealth(): Promise<{
  type: "redis" | "memory" | "none"
  status: "ok" | "error"
  message: string
}> {
  const client = getRedis()
  if (client) {
    try {
      await client.ping()
      return { type: "redis", status: "ok", message: "Upstash Redis connected" }
    } catch (err) {
      return { type: "redis", status: "error", message: `Redis error: ${String(err)}` }
    }
  }

  // Memory cache is always "ok" but warn it's not production-ready
  return {
    type: "memory",
    status: "ok",
    message: "Using in-memory cache (not shared across instances — set UPSTASH_REDIS_REST_URL for production)",
  }
}

/**
 * Get cache stats for admin dashboard.
 */
export async function getCacheStats(): Promise<{
  type: string
  keyCount: number
}> {
  const client = getRedis()
  if (client) {
    try {
      const dbSize = await client.dbsize()
      return { type: "redis", keyCount: dbSize }
    } catch {
      return { type: "redis", keyCount: -1 }
    }
  }

  return { type: "memory", keyCount: memoryCache.size }
}
