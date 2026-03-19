import type { Team, PlayInSlot } from "@/generated/prisma"
import type { LeaderboardEntry, ResolvedPickSummary } from "@/types"
import { computeBracketAwarePPR, type TeamBracketInfo } from "@/lib/bracket-ppr"
import { classifyArchetypes } from "@/lib/archetypes"

// ─── Entry-based types (current system) ───────────────────────────────────────

type EntryPickWithRelations = {
  teamId: string | null
  playInSlotId: string | null
  team: Team | null
  playInSlot: (PlayInSlot & { winner: Team | null; team1: Team; team2: Team }) | null
}

export type EntryWithRelations = {
  id: string
  userId: string
  entryNumber: number
  nickname: string | null
  charityPreference: string | null
  leagueEntries?: { leagueId: string }[]
  score?: number | null
  maxPossibleScore?: number | null
  expectedScore?: number | null
  user: {
    id: string
    name: string | null
    email: string
    isPaid: boolean
    username: string | null
    country: string | null
    state: string | null
    gender: string | null
    favoriteTeam?: { id: string; name: string; conference: string | null } | null
  }
  entryPicks: EntryPickWithRelations[]
}

// ─── Legacy types (kept for demo mode backward compat) ────────────────────────

type LegacyPickWithRelations = {
  teamId: string | null
  playInSlotId: string | null
  team: Team | null
  playInSlot: (PlayInSlot & { winner: Team | null; team1: Team; team2: Team }) | null
  charityPreference?: string | null
}

export type LegacyUserWithPicks = {
  id: string
  name: string | null
  email: string
  isPaid: boolean
  charityPreference?: string | null
  username?: string | null
  country?: string | null
  state?: string | null
  gender?: string | null
  picks: LegacyPickWithRelations[]
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

// Resolve a pick to its effective team (handles play-in slot resolution)
export function resolvePickTeam(pick: { team: Team | null; playInSlot?: { winner: Team | null } | null }): Team | null {
  if (pick.team) return pick.team
  if (pick.playInSlot?.winner) return pick.playInSlot.winner
  return null
}

// seed × wins for a single team
export function teamScore(team: Team): number {
  return team.seed * team.wins
}

// PPR for a single alive team: seed × (6 - current_wins)
// Max 6 wins = path from R64 to championship
export function teamPPR(team: Team): number {
  if (team.eliminated) return 0
  return team.seed * Math.max(0, 6 - team.wins)
}

// Build pick summary for display
function buildPickSummary(pick: {
  teamId?: string | null
  playInSlotId?: string | null
  team: Team | null
  playInSlot: (PlayInSlot & { winner: Team | null; team1: Team; team2: Team }) | null
}): ResolvedPickSummary | null {
  const team = resolvePickTeam(pick)
  if (!team) {
    // Unresolved play-in slot — show slot info if available
    if (pick.playInSlot) {
      return {
        teamId: pick.playInSlotId ?? "",
        name: `${pick.playInSlot.team1.name} / ${pick.playInSlot.team2.name}`,
        shortName: `${pick.playInSlot.team1.shortName}/${pick.playInSlot.team2.shortName}`,
        seed: pick.playInSlot.seed,
        wins: 0,
        eliminated: false,
        logoUrl: null,
        isPlayIn: true,
        playInSlotId: pick.playInSlotId,
      }
    }
    return null
  }
  return {
    teamId: team.id,
    name: team.name,
    shortName: team.shortName,
    seed: team.seed,
    region: team.region,
    wins: team.wins,
    eliminated: team.eliminated,
    logoUrl: team.logoUrl,
    espnId: team.espnId ?? null,
    conference: team.conference ?? null,
    isPlayIn: team.isPlayIn,
    playInSlotId: pick.playInSlotId,
  }
}

// Tier names by rank range (spec: exact positions)
function getTierName(rank: number): string | null {
  if (rank === 1) return "Champion"
  if (rank === 2) return "Runner Up"
  if (rank >= 3 && rank <= 4) return "Final 4"
  if (rank >= 5 && rank <= 8) return "Elite 8"
  if (rank >= 9 && rank <= 16) return "Sweet 16"
  if (rank >= 17 && rank <= 32) return "Worthy 32"
  if (rank >= 33 && rank <= 64) return "Dancing 64"
  if (rank >= 65 && rank <= 68) return "Play In 68"
  return null
}

// Percentile: "Top X%" — lower is better
export function computePercentile(rank: number, total: number): number {
  if (total <= 1) return 0
  return Math.round((rank / total) * 1000) / 10 // e.g. Top 6.3%
}

// ─── Entry display name ──────────────────────────────────────────────────────
// Primary display on the leaderboard uses username.
// Single entry:  "SumeetP"
// Multi entry:   "SumeetP (Main Entry Slip)" or "SumeetP (Upset Special)"

function entryDisplayName(
  userName: string | null,
  email: string,
  username: string | null,
  entryNumber: number,
  nickname: string | null,
  isMultiEntry: boolean,
): string {
  const primary = username ?? userName ?? email.split("@")[0]
  if (!isMultiEntry) return primary
  const entryLabel = nickname ?? (entryNumber === 1 ? "Main Entry Slip" : `Entry Slip ${entryNumber}`)
  return `${primary} (${entryLabel})`
}

// ─── Entry-based scoring (primary) ────────────────────────────────────────────

export function computeEntryScore(entry: EntryWithRelations, isMultiEntry: boolean): Omit<LeaderboardEntry, "rank" | "percentile" | "tierName"> {
  let currentScore = 0
  let ppr = 0
  let teamsRemaining = 0
  const picks: ResolvedPickSummary[] = []

  for (const pick of entry.entryPicks) {
    const summary = buildPickSummary(pick)
    if (summary) picks.push(summary)

    const team = resolvePickTeam(pick)
    if (!team) continue

    currentScore += teamScore(team)
    if (!team.eliminated) {
      teamsRemaining++
      ppr += teamPPR(team)
    }
  }

  return {
    entryId: entry.id,
    userId: entry.user.id,
    name: entryDisplayName(entry.user.name, entry.user.email, entry.user.username ?? null, entry.entryNumber, entry.nickname, isMultiEntry),
    isMultiEntry,
    email: entry.user.email,
    isPaid: entry.user.isPaid,
    username: entry.user.username ?? null,
    entryNumber: entry.entryNumber,
    nickname: entry.nickname,
    country: entry.user.country ?? null,
    state: entry.user.state ?? null,
    gender: entry.user.gender ?? null,
    favoriteTeam: entry.user.favoriteTeam?.id ?? null,
    conference: entry.user.favoriteTeam?.conference ?? null,
    leagueIds: (entry.leagueEntries ?? []).map(le => le.leagueId),
    currentScore,
    ppr,
    tps: currentScore + ppr,
    teamsRemaining,
    maxPossibleScore: entry.maxPossibleScore ?? null,
    expectedScore: entry.expectedScore ?? null,
    archetypes: classifyArchetypes(
      picks.filter(p => !p.isPlayIn).map(p => p.seed),
      picks.filter(p => !p.isPlayIn && p.region).map(p => p.region!),
    ).map(a => a.key),
    picks,
  }
}

export function computeLeaderboardFromEntries(entries: EntryWithRelations[]): LeaderboardEntry[] {
  // Determine which users have multiple entries
  const entriesByUser = new Map<string, number>()
  for (const e of entries) {
    entriesByUser.set(e.userId, (entriesByUser.get(e.userId) ?? 0) + 1)
  }

  const scores = entries.map((e) =>
    computeEntryScore(e, (entriesByUser.get(e.userId) ?? 1) > 1)
  )

  // Sort: currentScore desc (actual points), then maxPossibleScore desc as display tiebreaker, then name asc
  // Rank is based on currentScore only — pre-tournament (all scores = 0) everyone is T1
  scores.sort(
    (a, b) => b.currentScore - a.currentScore || (b.maxPossibleScore ?? 0) - (a.maxPossibleScore ?? 0) || a.name.localeCompare(b.name)
  )

  const total = scores.length

  // Pre-compute arrays for max/floor rank calculation
  const allCurrentScores = scores.map(s => s.currentScore)
  const allMaxPossibleScores = scores.map(s => s.maxPossibleScore ?? 0)

  // Compute tied ranks: entries with the same currentScore share the same rank
  return scores.map((s, i) => {
    // Find the first entry with the same score to determine tied rank
    let rank = i + 1
    for (let j = 0; j < i; j++) {
      if (scores[j].currentScore === s.currentScore) {
        rank = j + 1
        break
      }
    }

    // maxRank: best possible finish = 1 + count of entries whose current score
    //   already exceeds this entry's max possible score (they can't be caught)
    const maxRank = s.maxPossibleScore != null
      ? 1 + allCurrentScores.filter(cs => cs > s.maxPossibleScore!).length
      : null

    // floorRank: worst possible finish = total - count of entries whose max possible
    //   score is below this entry's current score (they can't catch up)
    const floorRank = total - allMaxPossibleScores.filter(m => m < s.currentScore).length

    const entry = entries.find((e) => e.id === s.entryId)
    return {
      ...s,
      rank,
      maxRank,
      floorRank,
      percentile: computePercentile(rank, total),
      tierName: getTierName(rank),
      charity: i < 4 ? (entry?.charityPreference ?? null) : null,
    }
  })
}

// ─── Legacy scoring (for demo mode backward compat) ───────────────────────────

function computeUserScore(user: LegacyUserWithPicks): Omit<LeaderboardEntry, "rank" | "percentile" | "tierName"> {
  let currentScore = 0
  let ppr = 0
  let teamsRemaining = 0
  const picks: ResolvedPickSummary[] = []

  for (const pick of user.picks) {
    const summary = buildPickSummary(pick)
    if (summary) picks.push(summary)

    const team = resolvePickTeam(pick)
    if (!team) continue

    currentScore += teamScore(team)
    if (!team.eliminated) {
      teamsRemaining++
      ppr += teamPPR(team)
    }
  }

  return {
    entryId: user.id, // use userId as entryId for legacy compat
    userId: user.id,
    name: user.name ?? user.email,
    email: user.email,
    isPaid: user.isPaid,
    username: user.username ?? null,
    entryNumber: 1,
    nickname: null,
    country: user.country ?? null,
    state: user.state ?? null,
    gender: user.gender ?? null,
    conference: null, // Legacy mode doesn't have conference data
    currentScore,
    ppr,
    tps: currentScore + ppr,
    teamsRemaining,
    picks,
  }
}

export function computeLeaderboard(users: LegacyUserWithPicks[]): LeaderboardEntry[] {
  const scores = users.map((u) => computeUserScore(u))

  // Sort: TPS desc, then currentScore desc as tiebreaker, then name asc
  scores.sort(
    (a, b) => b.tps - a.tps || b.currentScore - a.currentScore || a.name.localeCompare(b.name)
  )

  const total = scores.length

  return scores.map((s, i) => {
    const rank = i + 1
    return {
      ...s,
      rank,
      percentile: computePercentile(rank, total),
      tierName: getTierName(rank),
      charity: i < 4 ? (users.find((u) => u.id === s.userId)?.charityPreference ?? null) : null,
    }
  })
}

// ─── Optimal 8 helper ────────────────────────────────────────────────────────

export interface Optimal8Team {
  id: string
  seed: number
  region: string
  wins: number
  eliminated: boolean
  isPlayIn: boolean
  sCurveRank?: number | null
}

export interface Optimal8Result {
  teamIds: string[]
  score: number
  ppr: number
  tps: number
}

/**
 * Computes the 8 teams with the highest current score (seed × wins) at this
 * moment in the tournament.
 */
export function computeOptimal8(
  aliveTeams: Optimal8Team[],
  teamInfoMap: Map<string, TeamBracketInfo>
): Optimal8Result {
  const scored = aliveTeams
    .filter(t => !t.eliminated)
    .map(t => {
      const info = teamInfoMap.get(t.id)
      const eliminated = info ? info.eliminated : false
      const wins = info ? info.wins : t.wins
      const seed = info ? info.seed : t.seed
      const score = seed * wins
      const ppr = eliminated ? 0 : seed * Math.max(0, 6 - wins)
      return { ...t, seed, wins, eliminated, score, ppr }
    })

  // Sort by score desc, then PPR desc (highest remaining potential first — favours
  // high seeds pre-tournament), then S-Curve rank asc as final tiebreaker
  scored.sort((a, b) => b.score - a.score || b.ppr - a.ppr || (a.sCurveRank ?? 999) - (b.sCurveRank ?? 999))

  const selectedIds = scored.slice(0, 8).map(t => t.id)

  const { totalPPR } = computeBracketAwarePPR(selectedIds, teamInfoMap)

  let score = 0
  for (const id of selectedIds) {
    const info = teamInfoMap.get(id)
    if (info) score += info.seed * info.wins
  }

  return {
    teamIds: selectedIds,
    score,
    ppr: totalPPR,
    tps: score + totalPPR,
  }
}

// ─── Simulator helper ──────────────────────────────────────────────────────────

export interface HypotheticalState {
  [teamId: string]: { wins: number; eliminated: boolean }
}

export function computeSimulatedLeaderboard(
  entries: LeaderboardEntry[],
  hypothetical: HypotheticalState
): LeaderboardEntry[] {
  const simulated = entries.map((entry) => {
    let currentScore = 0
    let ppr = 0
    let teamsRemaining = 0

    for (const pick of entry.picks) {
      const override = hypothetical[pick.teamId]
      const wins = override !== undefined ? override.wins : pick.wins
      const eliminated = override !== undefined ? override.eliminated : pick.eliminated

      currentScore += pick.seed * wins
      if (!eliminated) {
        teamsRemaining++
        ppr += pick.seed * Math.max(0, 6 - wins)
      }
    }

    return {
      ...entry,
      currentScore,
      ppr,
      tps: currentScore + ppr,
      teamsRemaining,
    }
  })

  simulated.sort(
    (a, b) => b.tps - a.tps || b.currentScore - a.currentScore || a.name.localeCompare(b.name)
  )

  const total = simulated.length
  return simulated.map((s, i) => {
    const rank = i + 1
    return {
      ...s,
      rank,
      percentile: computePercentile(rank, total),
      tierName: getTierName(rank),
    }
  })
}
