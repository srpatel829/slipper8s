/**
 * Slipper8s Color Constants
 *
 * Three color systems — NO overlap between them:
 *
 * STATUS (team logo borders only):  Green / Yellow / Red
 * REGION (badge colors):            Magenta / Blue / Teal / Purple
 * SEED (seed number badges):        Navy / Orange / Cyan / Brown
 */

// ── Status border colors (reserved exclusively for team status) ──────────────
// Green  = won most recent round, still alive
// Yellow = still alive, has not played in most recent round yet
// Red    = eliminated

export const STATUS_COLORS = {
  green: "#27AE60",
  yellow: "#D4AC0D",
  red: "#C0392B",
} as const

// ── Region badge colors ──────────────────────────────────────────────────────

export const REGION_COLORS: Record<string, string> = {
  South: "#D63384",    // Magenta
  West: "#2E86C1",     // Blue
  East: "#1ABC9C",     // Teal
  Midwest: "#8E44AD",  // Purple
}

export const REGION_ABBREV: Record<string, string> = {
  South: "S",
  West: "W",
  East: "E",
  Midwest: "MW",
}

// ── Seed colors ──────────────────────────────────────────────────────────────

export function getSeedColor(seed: number): string {
  if (seed <= 4) return "#1B4F72"   // Navy — Chalk
  if (seed <= 8) return "#E67E22"   // Orange — Dark Horses
  if (seed <= 12) return "#00ACC1"  // Cyan — Sleepers
  return "#A0522D"                  // Brown/Sienna — Bracket Busters
}

export const SEED_TIER_COLORS: Record<string, string> = {
  "1-4": "#1B4F72",   // Navy — Chalk
  "5-8": "#E67E22",   // Orange — Dark Horses
  "9-12": "#00ACC1",  // Cyan — Sleepers
  "13-16": "#A0522D", // Brown/Sienna — Bracket Busters
}

export function getSeedTier(seed: number): "chalk" | "darkHorse" | "sleeper" | "buster" {
  if (seed <= 4) return "chalk"
  if (seed <= 8) return "darkHorse"
  if (seed <= 12) return "sleeper"
  return "buster"
}

export function getSeedTierLabel(seed: number): string {
  if (seed <= 4) return "Chalk"
  if (seed <= 8) return "Dark Horses"
  if (seed <= 12) return "Sleepers"
  return "Bracket Busters"
}
