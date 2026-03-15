/**
 * Helper to build TeamCalloutData from any team-like object + timeline state.
 *
 * Centralises lookups (extended data, Silver Bulletin, conference) so every
 * logo location can call one function instead of duplicating 15 lines of mapping.
 */

import type { TeamCalloutData } from "@/components/team-callout"
import { getTeamExtendedData } from "@/lib/team-data-2026"
import {
  SB_2026_MAP,
  pretournamentExpectedScore,
  expectedScoreAtState,
} from "@/lib/silver-bulletin-2026"
import { getConferenceForTeam } from "@/lib/conference-map"

/** Minimal team shape that every caller can satisfy. */
export interface TeamLikeForCallout {
  id: string
  name: string
  shortName: string
  seed: number
  region: string
  wins: number
  eliminated: boolean
  logoUrl: string | null
}

export interface BuildCalloutOptions {
  /** Percentage of entries that picked this team (0–100). */
  selectedPct?: number | null
}

/**
 * Build a complete TeamCalloutData from a team-like object.
 *
 * @param team       – any object that has the basic team fields
 * @param isPreTournament – true when timeline is before tournament starts (gameIndex < 0)
 * @param options    – optional extra data (% selected, etc.)
 */
export function buildTeamCalloutData(
  team: TeamLikeForCallout,
  isPreTournament: boolean,
  options?: BuildCalloutOptions,
): TeamCalloutData {
  const ext = getTeamExtendedData(team.id)
  const sb = SB_2026_MAP.get(team.id)

  // ── Shared fields ──
  const base: TeamCalloutData = {
    name: team.name,
    shortName: team.shortName,
    seed: team.seed,
    region: team.region,
    wins: team.wins,
    eliminated: team.eliminated,
    logoUrl: team.logoUrl,
    isPreTournament,
    conference: getConferenceForTeam(team.id),
    cumulativeProbabilities: sb?.cumulative ?? null,
  }

  if (isPreTournament) {
    // ── Pre-tournament card ──
    return {
      ...base,
      expectedScore: pretournamentExpectedScore(team.id),
      sCurveRank: ext?.sCurveRank ?? null,
      kenpomRank: ext?.kenpomRank ?? null,
      bpiRank: ext?.bpiRank ?? null,
      record: ext?.record ?? null,
      confRegSeasonChamp: ext?.confRegSeasonChamp ?? false,
      confTourneyChamp: ext?.confTourneyChamp ?? false,
      cinderellaWins: ext?.cinderellaWins ?? null,
      upsetLosses: ext?.upsetLosses ?? null,
    }
  }

  // ── Live/during-tournament card ──
  const score = team.seed * team.wins
  const ppr = team.eliminated ? 0 : team.seed * Math.max(0, 6 - team.wins)
  const gamesRemaining = team.eliminated ? 0 : 6 - team.wins

  return {
    ...base,
    score,
    ppr,
    maxScore: score + ppr,
    gamesRemaining,
    expectedScore: expectedScoreAtState(team.id, team.wins, team.eliminated),
    selectedPct: options?.selectedPct ?? null,
    // Pre-tournament data still shown in live card for context
    sCurveRank: ext?.sCurveRank ?? null,
    kenpomRank: ext?.kenpomRank ?? null,
    bpiRank: ext?.bpiRank ?? null,
    record: ext?.record ?? null,
    confRegSeasonChamp: ext?.confRegSeasonChamp ?? false,
    confTourneyChamp: ext?.confTourneyChamp ?? false,
    cinderellaWins: ext?.cinderellaWins ?? null,
    upsetLosses: ext?.upsetLosses ?? null,
  }
}

/**
 * Compute a Map of teamId → selectedPct from a picks map.
 *
 * @param demoUserPicks – Map<userId, teamId[]>
 * @returns Map<teamId, percentage 0–100 with 1 decimal>
 */
export function computePickerPctMap(
  demoUserPicks: Map<string, string[]>,
): Map<string, number> {
  const counts = new Map<string, number>()
  let totalEntries = 0

  for (const picks of demoUserPicks.values()) {
    totalEntries++
    for (const teamId of picks) {
      counts.set(teamId, (counts.get(teamId) ?? 0) + 1)
    }
  }

  const pctMap = new Map<string, number>()
  if (totalEntries === 0) return pctMap

  for (const [teamId, count] of counts) {
    pctMap.set(teamId, Math.round((count / totalEntries) * 1000) / 10)
  }
  return pctMap
}
