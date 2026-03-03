import type { Pick, Team, PlayInSlot } from "@/generated/prisma"
import type { LeaderboardEntry, ResolvedPickSummary } from "@/types"
import { computeBracketAwarePPR, seedToSlot, type TeamBracketInfo } from "@/lib/bracket-ppr"

type PickWithRelations = Pick & {
  team: Team | null
  playInSlot: (PlayInSlot & { winner: Team | null; team1: Team; team2: Team }) | null
}

type UserWithPicks = {
  id: string
  name: string | null
  email: string
  isPaid: boolean
  charityPreference?: string | null
  picks: PickWithRelations[]
}

// Resolve a pick to its effective team (handles play-in slot resolution)
export function resolvePickTeam(pick: PickWithRelations): Team | null {
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
function buildPickSummary(pick: PickWithRelations): ResolvedPickSummary | null {
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
    isPlayIn: team.isPlayIn,
    playInSlotId: pick.playInSlotId,
  }
}

export function computeUserScore(user: UserWithPicks): Omit<LeaderboardEntry, "rank" | "percentile" | "tierName"> {
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
    userId: user.id,
    name: user.name ?? user.email,
    email: user.email,
    isPaid: user.isPaid,
    currentScore,
    ppr,
    tps: currentScore + ppr,
    teamsRemaining,
    picks,
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
function computePercentile(rank: number, total: number): number {
  if (total <= 1) return 0
  return Math.round((rank / total) * 1000) / 10 // e.g. Top 6.3%
}

export function computeLeaderboard(users: UserWithPicks[]): LeaderboardEntry[] {
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
  isPlayIn: boolean
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
 *
 * Algorithm:
 * 1. For every non-play-in team, compute current score (seed × wins).
 * 2. Sort ALL teams globally by score desc, seed asc as tiebreaker.
 * 3. Pick top 8.
 * 4. Run bracket-aware PPR on the selected 8 to get the display TPS.
 */
export function computeOptimal8(
  aliveTeams: Optimal8Team[],
  teamInfoMap: Map<string, TeamBracketInfo>
): Optimal8Result {
  // Score every non-play-in team by current points earned
  const scored = aliveTeams
    .filter(t => !t.isPlayIn)
    .map(t => {
      const info = teamInfoMap.get(t.id)
      const eliminated = info ? info.eliminated : false
      const wins = info ? info.wins : t.wins
      const seed = info ? info.seed : t.seed
      const score = seed * wins
      const ppr = eliminated ? 0 : seed * Math.max(0, 6 - wins)
      return { ...t, seed, wins, eliminated, score, ppr }
    })

  // Sort globally: highest current score first, lower seed as tiebreaker
  scored.sort((a, b) => b.score - a.score || a.seed - b.seed)

  const selectedIds = scored.slice(0, 8).map(t => t.id)

  // Compute bracket-aware PPR for the selection
  const { totalPPR } = computeBracketAwarePPR(selectedIds, teamInfoMap)

  // Compute score
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
