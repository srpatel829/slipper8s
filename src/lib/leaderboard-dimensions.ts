/**
 * Leaderboard dimension filtering and re-ranking.
 *
 * Dimensions: Global, By Country, By State, By Gender, By Fan Base, By Conference, Private Leagues
 *
 * Each dimension filters entries by a profile field and re-ranks within the group.
 * "No Response" is used for entries where the profile field was left blank.
 */

import type { LeaderboardEntry } from "@/types"
import { getTeamDisplayName } from "@/lib/conference-map"

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type DimensionType =
  | "global"
  | "country"
  | "state"
  | "gender"
  | "fanBase"
  | "conference"
  | "privateLeague"

export interface DimensionConfig {
  type: DimensionType
  label: string
  shortLabel: string  // for mobile tabs
  /** Extract the raw dimension value from an entry (null = No Response) */
  getValue: (entry: LeaderboardEntry) => string | null
  /** Whether the sub-selector should be searchable */
  searchable: boolean
}

export const NO_RESPONSE = "No Response"

// ═══════════════════════════════════════════════════════════════════════════════
// DIMENSION CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const DIMENSION_CONFIGS: DimensionConfig[] = [
  {
    type: "global",
    label: "Global",
    shortLabel: "Global",
    getValue: () => "global",
    searchable: false,
  },
  {
    type: "country",
    label: "By Country",
    shortLabel: "Country",
    getValue: (e) => e.country ?? null,
    searchable: false, // only 4 countries in 2025 data
  },
  {
    type: "state",
    label: "By State",
    shortLabel: "State",
    getValue: (e) => e.state ?? null,
    searchable: true,
  },
  {
    type: "gender",
    label: "By Gender",
    shortLabel: "Gender",
    getValue: (e) => e.gender ?? null,
    searchable: false,
  },
  {
    type: "fanBase",
    label: "By Fan Base",
    shortLabel: "Fan Base",
    getValue: (e) => e.favoriteTeam ?? null,
    searchable: true,
  },
  {
    type: "conference",
    label: "By Conference",
    shortLabel: "Conf.",
    getValue: (e) => e.conference ?? null,
    searchable: true,
  },
  {
    type: "privateLeague",
    label: "Private Leagues",
    shortLabel: "Leagues",
    getValue: (e) => e.leagueIds?.[0] ?? null,
    searchable: false,
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// DIMENSION VALUE EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all unique values for a dimension, sorted alphabetically.
 * "No Response" is always last (if any entries have null for that field).
 */
export function getDimensionValues(
  entries: LeaderboardEntry[],
  dimension: DimensionConfig
): string[] {
  if (dimension.type === "global") return ["global"]

  const values = new Set<string>()
  let hasNulls = false

  for (const entry of entries) {
    // Special case: privateLeague is multi-valued
    if (dimension.type === "privateLeague") {
      if (!entry.leagueIds || entry.leagueIds.length === 0) {
        hasNulls = true
      } else {
        for (const lid of entry.leagueIds) values.add(lid)
      }
      continue
    }
    const val = dimension.getValue(entry)
    if (val === null) {
      hasNulls = true
    } else {
      values.add(val)
    }
  }

  const sorted = [...values].sort((a, b) => a.localeCompare(b))
  if (hasNulls) sorted.push(NO_RESPONSE)
  return sorted
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTERING AND RE-RANKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tier name assignment based on rank position.
 */
function getTierName(rank: number): string | null {
  if (rank === 1) return "Champion"
  if (rank === 2) return "Runner Up"
  if (rank <= 4) return "Final 4"
  if (rank <= 8) return "Elite 8"
  if (rank <= 16) return "Sweet 16"
  if (rank <= 32) return "Worthy 32"
  if (rank <= 64) return "Dancing 64"
  if (rank <= 68) return "Play In 68"
  return null
}

/**
 * Filter entries by dimension value and re-rank within the group.
 *
 * - Entries are already sorted by score (from computeLeaderboardAtGame)
 * - Re-assigns rank, percentile, and tierName within the filtered group
 * - Recalculates maxRank and floorRank within the filtered group
 */
export function filterAndRerank(
  entries: LeaderboardEntry[],
  dimension: DimensionConfig,
  value: string
): LeaderboardEntry[] {
  if (dimension.type === "global") return entries

  // Filter — privateLeague is multi-valued
  const filtered = entries.filter(e => {
    if (dimension.type === "privateLeague") {
      if (value === NO_RESPONSE) return !e.leagueIds || e.leagueIds.length === 0
      return e.leagueIds?.includes(value) ?? false
    }
    const v = dimension.getValue(e)
    if (value === NO_RESPONSE) return v === null
    return v === value
  })

  if (filtered.length === 0) return []

  // Re-rank with tie-aware ranking
  const total = filtered.length
  const reranked: LeaderboardEntry[] = []

  for (let i = 0; i < filtered.length; i++) {
    // Find tie group start
    let tieStart = i
    while (tieStart > 0 && filtered[tieStart - 1].currentScore === filtered[i].currentScore) {
      tieStart--
    }
    const rank = tieStart + 1
    const percentile = total > 1 ? Math.round((rank / total) * 1000) / 10 : 0

    reranked.push({
      ...filtered[i],
      rank,
      percentile,
      tierName: getTierName(rank),
    })
  }

  // Recalculate maxRank and floorRank within the filtered group
  for (let i = 0; i < reranked.length; i++) {
    const entry = reranked[i]

    // maxRank: best case — this entry reaches its TPS, all others stay at currentScore
    let betterInBest = 0
    for (let j = 0; j < reranked.length; j++) {
      if (j === i) continue
      if (reranked[j].currentScore > entry.tps) betterInBest++
    }
    reranked[i] = { ...reranked[i], maxRank: betterInBest + 1 }

    // floorRank: worst case — this entry stays at currentScore, all others reach their TPS
    let betterInWorst = 0
    for (let j = 0; j < reranked.length; j++) {
      if (j === i) continue
      if (reranked[j].tps > entry.currentScore) betterInWorst++
    }
    reranked[i] = { ...reranked[i], floorRank: betterInWorst + 1 }
  }

  return reranked
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT VALUE SELECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the default dimension value for the current user.
 * Falls back to the first available value if user has no value for this dimension.
 */
export function getDefaultDimensionValue(
  currentUserId: string,
  entries: LeaderboardEntry[],
  dimension: DimensionConfig,
  availableValues: string[]
): string {
  if (dimension.type === "global") return "global"
  if (availableValues.length === 0) return NO_RESPONSE

  const userEntry = entries.find(e => e.userId === currentUserId)
  if (!userEntry) return availableValues[0]

  const val = dimension.getValue(userEntry)
  const resolved = val ?? NO_RESPONSE

  // Ensure the value exists in the available list
  if (availableValues.includes(resolved)) return resolved
  return availableValues[0]
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPLAY NAME FORMATTING
// ═══════════════════════════════════════════════════════════════════════════════

/** Gender enum → display label (matches profile form) */
const GENDER_LABELS: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  NO_RESPONSE: "Prefer not to say",
}

/**
 * Format a dimension value for display.
 * Fan Base: resolves team IDs to display names.
 * Gender: maps enum values to human-readable labels.
 * Everything else: uses the value as-is.
 */
export function formatDimensionValue(
  value: string,
  dimension: DimensionConfig,
  teams?: Array<{ id: string; name: string }>
): string {
  if (value === NO_RESPONSE) return NO_RESPONSE

  if (dimension.type === "fanBase") {
    return getTeamDisplayName(value, teams)
  }

  if (dimension.type === "gender") {
    return GENDER_LABELS[value] ?? value
  }

  return value
}

/**
 * Count of real responses (excluding No Response) for display stats.
 */
export function countResponses(
  entries: LeaderboardEntry[],
  dimension: DimensionConfig
): number {
  if (dimension.type === "global") return entries.length
  return entries.filter(e => dimension.getValue(e) !== null).length
}
