/**
 * Player archetype classification based on pick patterns.
 *
 * Archetypes (from spec):
 * - Cinderella Chaser: All 8 picks seeds 10+
 * - Sweet Spotter: All 8 picks seeds 5-12
 * - Strategist: Balanced seed spread AND ~2 picks per region
 * - Chaos Agent: 2+ picks seeds 13-16
 * - Regional Purist: 5+ picks from same region
 * - Chalk Artist: 4+ picks seeds 1-4
 * - Contrarian: Mix of 1-2 seeds AND 13-16 seeds, skipping middle
 * - Loyalist: 3+ picks from favorite team's conference (skip for 2025)
 * - Mixer: Fallback — no single strategy, just vibes
 */

export interface ArchetypeResult {
  /** Archetype key */
  key: string
  /** Display label */
  label: string
  /** Emoji for leaderboard display */
  emoji: string
  /** User-facing description */
  description: string
}

interface ArchetypeDef {
  key: string
  label: string
  emoji: string
  description: string
  test: (seeds: number[], regions: string[]) => boolean
}

const ARCHETYPE_DEFS: ArchetypeDef[] = [
  {
    key: "cinderella_chaser",
    label: "Cinderella Chaser",
    emoji: "\u{1F460}", // 👠
    description: "You love an underdog story \u2014 all your picks are double-digit seeds looking to dance",
    test: (seeds) => seeds.every(s => s >= 10),
  },
  {
    key: "sweet_spotter",
    label: "Sweet Spotter",
    emoji: "\u{1F3AF}", // 🎯
    description: "You avoid the extremes and target the mid-seeds where upsets meet value",
    test: (seeds) => seeds.every(s => s >= 5 && s <= 12),
  },
  {
    key: "strategist",
    label: "Strategist",
    emoji: "\u{1F9E0}", // 🧠
    description: "You spread your picks across seeds and regions for maximum coverage",
    test: (seeds, regions) => {
      // Balanced seed spread: at least one pick in each tier (1-4, 5-8, 9-12, 13-16)
      const hasTier1 = seeds.some(s => s >= 1 && s <= 4)
      const hasTier2 = seeds.some(s => s >= 5 && s <= 8)
      const hasTier3 = seeds.some(s => s >= 9 && s <= 12)
      const hasTier4 = seeds.some(s => s >= 13 && s <= 16)
      const balancedSeeds = hasTier1 && hasTier2 && hasTier3 && hasTier4

      // ~2 picks per region: no region has more than 3
      const regionCounts = new Map<string, number>()
      for (const r of regions) {
        regionCounts.set(r, (regionCounts.get(r) ?? 0) + 1)
      }
      const maxInRegion = Math.max(...regionCounts.values(), 0)
      const balancedRegions = regionCounts.size >= 3 && maxInRegion <= 3

      return balancedSeeds && balancedRegions
    },
  },
  {
    key: "chaos_agent",
    label: "Chaos Agent",
    emoji: "\u{1F32A}\uFE0F", // 🌪️
    description: "You're not afraid to bet on the long shots with multiple 13+ seeds",
    test: (seeds) => seeds.filter(s => s >= 13).length >= 2,
  },
  {
    key: "regional_purist",
    label: "Regional Purist",
    emoji: "\u{1F5FA}\uFE0F", // 🗺️
    description: "You went all-in on one region of the bracket",
    test: (_seeds, regions) => {
      const regionCounts = new Map<string, number>()
      for (const r of regions) {
        regionCounts.set(r, (regionCounts.get(r) ?? 0) + 1)
      }
      return Math.max(...regionCounts.values(), 0) >= 5
    },
  },
  {
    key: "chalk_artist",
    label: "Chalk Artist",
    emoji: "\u{270F}\uFE0F", // ✏️
    description: "You trust the top seeds \u2014 half or more of your picks are 1-4 seeds",
    test: (seeds) => seeds.filter(s => s <= 4).length >= 4,
  },
  {
    key: "contrarian",
    label: "Contrarian",
    emoji: "\u{1F504}", // 🔄
    description: "You picked from the top and bottom of the bracket but skipped the middle",
    test: (seeds) => {
      // Mix of 1-2 seeds AND 13-16 seeds, skipping middle (few/no 5-12)
      const hasTop = seeds.some(s => s <= 2)
      const hasBottom = seeds.some(s => s >= 13)
      const middleCount = seeds.filter(s => s >= 5 && s <= 12).length
      return hasTop && hasBottom && middleCount <= 2
    },
  },
]

const MIXER_FALLBACK: Omit<ArchetypeDef, "test"> = {
  key: "mixer",
  label: "Mixer",
  emoji: "\u{1F3B2}", // 🎲
  description: "You grabbed a little bit of everything \u2014 no single strategy, just vibes",
}

/**
 * Classify a player's picks into archetypes.
 * A player can match multiple archetypes.
 *
 * @param pickSeeds Array of seed numbers for the player's 8 picks
 * @param pickRegions Array of region strings for the player's 8 picks
 * @param options.skipLoyalist If true, skip Loyalist archetype (for 2025)
 */
export function classifyArchetypes(
  pickSeeds: number[],
  pickRegions: string[],
): ArchetypeResult[] {
  if (pickSeeds.length === 0) return []

  const matches: ArchetypeResult[] = []
  for (const def of ARCHETYPE_DEFS) {
    if (def.test(pickSeeds, pickRegions)) {
      matches.push({ key: def.key, label: def.label, emoji: def.emoji, description: def.description })
    }
  }

  // Fallback: every player gets at least one archetype
  if (matches.length === 0) {
    matches.push({ key: MIXER_FALLBACK.key, label: MIXER_FALLBACK.label, emoji: MIXER_FALLBACK.emoji, description: MIXER_FALLBACK.description })
  }

  return matches
}

/**
 * All archetype metadata for legend display.
 */
export const ARCHETYPE_LEGEND = [
  ...ARCHETYPE_DEFS.map(d => ({
    key: d.key,
    emoji: d.emoji,
    label: d.label,
    description: d.description,
  })),
  { key: MIXER_FALLBACK.key, emoji: MIXER_FALLBACK.emoji, label: MIXER_FALLBACK.label, description: MIXER_FALLBACK.description },
]

/**
 * Get the primary archetype emoji for leaderboard display.
 * Returns the first matched archetype's emoji, or empty string if none.
 */
export function getPrimaryArchetypeEmoji(archetypes: string[] | undefined): string {
  if (!archetypes || archetypes.length === 0) return ""
  const key = archetypes[0]
  if (key === MIXER_FALLBACK.key) return MIXER_FALLBACK.emoji
  const def = ARCHETYPE_DEFS.find(d => d.key === key)
  return def?.emoji ?? ""
}

/**
 * Look up full archetype metadata by key.
 */
export function getArchetypeByKey(key: string): { key: string; emoji: string; label: string; description: string } | undefined {
  if (key === MIXER_FALLBACK.key) return MIXER_FALLBACK
  const def = ARCHETYPE_DEFS.find(d => d.key === key)
  if (!def) return undefined
  return { key: def.key, emoji: def.emoji, label: def.label, description: def.description }
}
