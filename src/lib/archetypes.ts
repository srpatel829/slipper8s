/**
 * Player archetype classification based on pick patterns.
 *
 * Archetypes (from spec):
 * - Cinderella Chaser: All 8 picks seeds 10+
 * - Sweet Spotter: All 8 picks seeds 5-12
 * - The Strategist: Balanced seed spread AND ~2 picks per region
 * - Chaos Agent: 2+ picks seeds 13-16
 * - Regional Purist: 5+ picks from same region
 * - Chalk Artist: 4+ picks seeds 1-4
 * - The Contrarian: Mix of 1-2 seeds AND 13-16 seeds, skipping middle
 * - The Loyalist: 3+ picks from favorite team's conference (skip for 2025)
 */

export interface ArchetypeResult {
  /** Archetype key */
  key: string
  /** Display label */
  label: string
  /** Emoji for leaderboard display */
  emoji: string
}

const ARCHETYPE_DEFS: Array<{
  key: string
  label: string
  emoji: string
  test: (seeds: number[], regions: string[]) => boolean
}> = [
  {
    key: "cinderella_chaser",
    label: "Cinderella Chaser",
    emoji: "\u{1F460}", // 👠
    test: (seeds) => seeds.every(s => s >= 10),
  },
  {
    key: "sweet_spotter",
    label: "Sweet Spotter",
    emoji: "\u{1F3AF}", // 🎯
    test: (seeds) => seeds.every(s => s >= 5 && s <= 12),
  },
  {
    key: "strategist",
    label: "The Strategist",
    emoji: "\u{1F9E0}", // 🧠
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
    emoji: "\u{1F525}", // 🔥
    test: (seeds) => seeds.filter(s => s >= 13).length >= 2,
  },
  {
    key: "regional_purist",
    label: "Regional Purist",
    emoji: "\u{1F5FA}\uFE0F", // 🗺️
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
    test: (seeds) => seeds.filter(s => s <= 4).length >= 4,
  },
  {
    key: "contrarian",
    label: "The Contrarian",
    emoji: "\u{1F504}", // 🔄
    test: (seeds) => {
      // Mix of 1-2 seeds AND 13-16 seeds, skipping middle (few/no 5-12)
      const hasTop = seeds.some(s => s <= 2)
      const hasBottom = seeds.some(s => s >= 13)
      const middleCount = seeds.filter(s => s >= 5 && s <= 12).length
      return hasTop && hasBottom && middleCount <= 2
    },
  },
]

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
      matches.push({ key: def.key, label: def.label, emoji: def.emoji })
    }
  }

  return matches
}

/**
 * Get the primary archetype emoji for leaderboard display.
 * Returns the first matched archetype's emoji, or empty string if none.
 */
export function getPrimaryArchetypeEmoji(archetypes: string[] | undefined): string {
  if (!archetypes || archetypes.length === 0) return ""
  const def = ARCHETYPE_DEFS.find(d => d.key === archetypes[0])
  return def?.emoji ?? ""
}
