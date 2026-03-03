/**
 * Game-by-game data engine for the demo mode.
 *
 * Derives an ordered list of all ~63 tournament games from a DemoTeam[]
 * dataset (which stores round-level winsAtRound / elimAtRound arrays).
 * Provides functions to compute cumulative state at any game index, produce
 * LeaderboardEntry[] and LiveGameData[] in the exact shapes the real app
 * components expect, so the demo can reuse them unchanged.
 */

import type { DemoTeam, DemoUser } from "@/lib/demo-data"
import type { LeaderboardEntry, LiveGameData, ResolvedPickSummary } from "@/types"
import { computeBracketAwarePPR, type TeamBracketInfo } from "@/lib/bracket-ppr"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DemoGameEvent {
  gameIndex: number
  gameId: string
  round: number           // 1-6
  roundLabel: string
  region: string          // "East", "West", "South", "Midwest", "Final Four"
  winnerId: string
  loserId: string
  winnerName: string
  loserName: string
  winnerShortName: string
  loserShortName: string
  winnerSeed: number
  loserSeed: number
  winnerScore: number
  loserScore: number
  isUpset: boolean
}

export interface RoundBoundary {
  gameIndex: number
  roundLabel: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ROUND_LABELS: Record<number, string> = {
  1: "Round of 64",
  2: "Round of 32",
  3: "Sweet 16",
  4: "Elite 8",
  5: "Final Four",
  6: "Championship",
}

/** Standard bracket matchup seeds for R64 (1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15) */
const R64_SEED_MATCHUPS = [
  [1, 16], [8, 9], [5, 12], [4, 13], [6, 11], [3, 14], [7, 10], [2, 15],
]

const CHRONOLOGICAL_GAMES = [{ "w": "creighton", "l": "louisville", "r": 1 }, { "w": "purdue", "l": "high-point", "r": 1 }, { "w": "wisconsin", "l": "montana", "r": 1 }, { "w": "houston", "l": "siu-edwardsville", "r": 1 }, { "w": "auburn", "l": "alabama-st", "r": 1 }, { "w": "mcneese-st", "l": "clemson", "r": 1 }, { "w": "byu", "l": "vcu", "r": 1 }, { "w": "gonzaga", "l": "georgia", "r": 1 }, { "w": "tennessee", "l": "wofford", "r": 1 }, { "w": "arkansas", "l": "kansas", "r": 1 }, { "w": "texas-am", "l": "yale", "r": 1 }, { "w": "drake", "l": "missouri", "r": 1 }, { "w": "ucla", "l": "utah-st", "r": 1 }, { "w": "st-johns", "l": "omaha", "r": 1 }, { "w": "michigan", "l": "uc-san-diego", "r": 1 }, { "w": "texas-tech", "l": "unc-wilmington", "r": 1 }, { "w": "baylor", "l": "mississippi-st", "r": 1 }, { "w": "alabama", "l": "robert-morris", "r": 1 }, { "w": "iowa-st", "l": "lipscomb", "r": 1 }, { "w": "colorado-st", "l": "memphis", "r": 1 }, { "w": "duke", "l": "mount-st-marys", "r": 1 }, { "w": "saint-marys", "l": "vanderbilt", "r": 1 }, { "w": "ole-miss", "l": "north-carolina", "r": 1 }, { "w": "maryland", "l": "grand-canyon", "r": 1 }, { "w": "florida", "l": "norfolk-st", "r": 1 }, { "w": "kentucky", "l": "troy", "r": 1 }, { "w": "new-mexico", "l": "marquette", "r": 1 }, { "w": "arizona", "l": "akron", "r": 1 }, { "w": "uconn", "l": "oklahoma", "r": 1 }, { "w": "illinois", "l": "xavier", "r": 1 }, { "w": "michigan-st", "l": "bryant", "r": 1 }, { "w": "oregon", "l": "liberty", "r": 1 }, { "w": "purdue", "l": "mcneese-st", "r": 2 }, { "w": "arkansas", "l": "st-johns", "r": 2 }, { "w": "michigan", "l": "texas-am", "r": 2 }, { "w": "texas-tech", "l": "drake", "r": 2 }, { "w": "auburn", "l": "creighton", "r": 2 }, { "w": "byu", "l": "wisconsin", "r": 2 }, { "w": "houston", "l": "gonzaga", "r": 2 }, { "w": "tennessee", "l": "ucla", "r": 2 }, { "w": "florida", "l": "uconn", "r": 2 }, { "w": "duke", "l": "baylor", "r": 2 }, { "w": "kentucky", "l": "illinois", "r": 2 }, { "w": "alabama", "l": "saint-marys", "r": 2 }, { "w": "maryland", "l": "colorado-st", "r": 2 }, { "w": "ole-miss", "l": "iowa-st", "r": 2 }, { "w": "michigan-st", "l": "new-mexico", "r": 2 }, { "w": "arizona", "l": "oregon", "r": 2 }, { "w": "alabama", "l": "byu", "r": 3 }, { "w": "florida", "l": "maryland", "r": 3 }, { "w": "duke", "l": "arizona", "r": 3 }, { "w": "texas-tech", "l": "arkansas", "r": 3 }, { "w": "michigan-st", "l": "ole-miss", "r": 3 }, { "w": "tennessee", "l": "kentucky", "r": 3 }, { "w": "auburn", "l": "michigan", "r": 3 }, { "w": "houston", "l": "purdue", "r": 3 }, { "w": "florida", "l": "texas-tech", "r": 4 }, { "w": "duke", "l": "alabama", "r": 4 }, { "w": "houston", "l": "tennessee", "r": 4 }, { "w": "auburn", "l": "michigan-st", "r": 4 }, { "w": "florida", "l": "auburn", "r": 5 }, { "w": "houston", "l": "duke", "r": 5 }, { "w": "florida", "l": "houston", "r": 6 }];

// ─── Seeded RNG for stable fake scores ───────────────────────────────────────

function seededRandom(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b)
    h = (h ^ (h >>> 16)) >>> 0
    return (h & 0x7fffffff) / 0x7fffffff
  }
}

function fakeScore(rng: () => number, seed: number, winner: boolean): number {
  const base = winner
    ? 72 + Math.floor(rng() * 12)
    : 60 + Math.floor(rng() * 10)
  return Math.max(50, Math.round(base - seed * 0.3))
}

// ─── Game Sequence Generation ────────────────────────────────────────────────

/**
 * Generates all ~63 tournament games in exactly chronological order.
 */
export function generateDemoGameSequence(teams: DemoTeam[]): DemoGameEvent[] {
  const teamMap = new Map(teams.map(t => [t.id, t]))
  const games: DemoGameEvent[] = []

  for (let i = 0; i < CHRONOLOGICAL_GAMES.length; i++) {
    const rawGame = CHRONOLOGICAL_GAMES[i];
    const winner = teamMap.get(rawGame.w);
    const loser = teamMap.get(rawGame.l);

    if (!winner || !loser) continue;

    const region = rawGame.r >= 5 ? (rawGame.r === 5 ? "Final Four" : "Championship") : winner.region;

    const game = buildGame(winner, loser, rawGame.r, region, i);
    if (game) games.push(game);
  }

  return games;
}

function buildGame(
  winner: DemoTeam,
  loser: DemoTeam,
  round: number,
  region: string,
  gameIndex: number
): DemoGameEvent | null {
  const rng = seededRandom(`${winner.id}-${loser.id}-r${round}`)
  const wScore = fakeScore(rng, winner.seed, true)
  const lScore = fakeScore(rng, loser.seed, false)

  return {
    gameIndex,
    gameId: `r${round}-${region.toLowerCase()}-${winner.id}-vs-${loser.id}`,
    round,
    roundLabel: ROUND_LABELS[round] ?? `Round ${round}`,
    region,
    winnerId: winner.id,
    loserId: loser.id,
    winnerName: winner.name,
    loserName: loser.name,
    winnerShortName: winner.shortName,
    loserShortName: loser.shortName,
    winnerSeed: winner.seed,
    loserSeed: loser.seed,
    winnerScore: wScore,
    loserScore: Math.min(lScore, wScore - 1), // ensure winner has higher score
    isUpset: loser.seed < winner.seed,
  }
}

// ─── State Computation ───────────────────────────────────────────────────────

/**
 * Replays games 0..gameIndex and returns cumulative team state.
 * Returns a Map of teamId → { wins, eliminated }.
 */
export function computeStateAtGame(
  games: DemoGameEvent[],
  gameIndex: number
): Map<string, { wins: number; eliminated: boolean }> {
  const state = new Map<string, { wins: number; eliminated: boolean }>()

  for (let i = 0; i <= gameIndex && i < games.length; i++) {
    const g = games[i]
    const winnerState = state.get(g.winnerId) ?? { wins: 0, eliminated: false }
    winnerState.wins++
    state.set(g.winnerId, winnerState)

    state.set(g.loserId, { wins: state.get(g.loserId)?.wins ?? 0, eliminated: true })
  }

  return state
}

// ─── Leaderboard Computation ─────────────────────────────────────────────────

/**
 * Produces LeaderboardEntry[] at a given game index — exact same type the real
 * LeaderboardTable component expects.
 */
export function computeLeaderboardAtGame(
  teams: DemoTeam[],
  users: DemoUser[],
  games: DemoGameEvent[],
  gameIndex: number,
  customPicks?: Map<string, string[]>
): LeaderboardEntry[] {
  const teamMap = new Map(teams.map(t => [t.id, t]))
  const teamState = gameIndex >= 0 ? computeStateAtGame(games, gameIndex) : new Map()

  // Teams that appear in at least one game in the sequence.
  // Teams NOT in this set are play-in losers who never played in R64+.
  // They should be treated as eliminated once the tournament starts.
  const teamsInSequence = new Set<string>()
  for (const g of games) {
    teamsInSequence.add(g.winnerId)
    teamsInSequence.add(g.loserId)
  }

  const entries = users.map(user => {
    const userPicks = customPicks?.get(user.id) ?? user.picks
    let currentScore = 0
    let teamsRemaining = 0
    const picks: ResolvedPickSummary[] = []

    // Build team info map for bracket-aware PPR
    const bracketInfoMap = new Map<string, TeamBracketInfo>()

    for (const teamId of userPicks) {
      const team = teamMap.get(teamId)
      if (!team) continue

      // Teams absent from the state map but not in the game sequence are play-in
      // losers — they never played R64 and should be marked as eliminated.
      const state = teamState.get(teamId) ?? {
        wins: 0,
        eliminated: !teamsInSequence.has(teamId) && gameIndex >= 0,
      }
      const score = team.seed * state.wins

      currentScore += score
      if (!state.eliminated) teamsRemaining++

      bracketInfoMap.set(teamId, {
        seed: team.seed,
        region: team.region,
        wins: state.wins,
        eliminated: state.eliminated,
      })

      picks.push({
        teamId,
        name: team.name,
        shortName: team.shortName,
        seed: team.seed,
        region: team.region,
        wins: state.wins,
        eliminated: state.eliminated,
        logoUrl: team.logoUrl,
        isPlayIn: team.isPlayIn,
      })
    }

    // Compute bracket-aware PPR (accounts for teams sharing bracket paths)
    const { totalPPR: ppr } = computeBracketAwarePPR(userPicks, bracketInfoMap)

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      isPaid: user.isPaid,
      currentScore,
      ppr,
      tps: currentScore + ppr,
      teamsRemaining,
      picks,
    }
  })

  // Sort: currentScore desc → TPS desc → name asc
  entries.sort(
    (a, b) => b.currentScore - a.currentScore || b.tps - a.tps || a.name.localeCompare(b.name)
  )

  const total = entries.length
  return entries.map((e, i) => {
    const rank = i + 1
    return {
      ...e,
      rank,
      percentile: total > 1 ? Math.round((rank / total) * 1000) / 10 : 0,
      tierName: rank === 1 ? "Champion" : rank === 2 ? "Runner Up" : rank <= 4 ? "Final 4" : rank <= 8 ? "Elite 8" : rank <= 16 ? "Sweet 16" : rank <= 32 ? "Worthy 32" : rank <= 64 ? "Dancing 64" : rank <= 68 ? "Play In 68" : null,
      charity: i < 4
        ? (users.find(u => u.id === e.userId)?.charityPreference ?? null)
        : null,
    }
  })
}

// ─── LiveGameData Conversion ─────────────────────────────────────────────────

/**
 * Converts game sequence into LiveGameData[] (the type ScoresGrid expects).
 * Games at index ≤ gameIndex are "post", next game is "pre", rest don't appear.
 */
export function computeGamesAsLiveData(
  teams: DemoTeam[],
  games: DemoGameEvent[],
  gameIndex: number
): LiveGameData[] {
  const teamMap = new Map(teams.map(t => [t.id, t]))
  const result: LiveGameData[] = []

  for (let i = 0; i < games.length; i++) {
    if (i > gameIndex + 3) break // show completed + a few upcoming

    const g = games[i]
    const winnerTeam = teamMap.get(g.winnerId)
    const loserTeam = teamMap.get(g.loserId)
    const isFinal = i <= gameIndex
    const isUpcoming = i > gameIndex

    result.push({
      id: g.gameId,
      startTime: new Date(2025, 2, 20 + Math.floor(i / 8), 12 + (i % 8) * 2).toISOString(),
      round: g.round,
      status: {
        state: isFinal ? "post" : "pre",
        detail: isFinal ? "Final" : "Upcoming",
        completed: isFinal,
      },
      teams: [
        {
          name: g.winnerName,
          abbreviation: winnerTeam?.shortName ?? g.winnerShortName,
          score: isFinal ? String(g.winnerScore) : "0",
          winner: isFinal,
          logo: winnerTeam?.logoUrl ?? "",
          seed: g.winnerSeed,
        },
        {
          name: g.loserName,
          abbreviation: loserTeam?.shortName ?? g.loserShortName,
          score: isFinal ? String(g.loserScore) : "0",
          winner: false,
          logo: loserTeam?.logoUrl ?? "",
          seed: g.loserSeed,
        },
      ],
    })
  }

  return result
}

// ─── Teams for PicksForm ─────────────────────────────────────────────────────

/**
 * Returns team data in the shape PicksForm expects (matching Prisma Team type).
 * Includes current wins/eliminated state at the given game index.
 */
export function computeTeamsForPicks(
  teams: DemoTeam[],
  games: DemoGameEvent[],
  gameIndex: number
): Array<{
  id: string
  espnId: string
  name: string
  shortName: string
  seed: number
  region: string
  isPlayIn: boolean
  eliminated: boolean
  wins: number
  logoUrl: string | null
  createdAt: Date
  updatedAt: Date
}> {
  const teamState = gameIndex >= 0 ? computeStateAtGame(games, gameIndex) : new Map()

  return teams.map(t => {
    const state = teamState.get(t.id) ?? { wins: 0, eliminated: false }
    return {
      id: t.id,
      espnId: t.id,
      name: t.name,
      shortName: t.shortName,
      seed: t.seed,
      region: t.region,
      isPlayIn: t.isPlayIn,
      eliminated: state.eliminated,
      wins: state.wins,
      logoUrl: t.logoUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  })
}

// ─── Round Boundaries ────────────────────────────────────────────────────────

/**
 * Returns the game index where each round starts — used for chart reference
 * lines and timeline tick marks.
 */
export function getRoundBoundaries(games: DemoGameEvent[]): RoundBoundary[] {
  const boundaries: RoundBoundary[] = []
  let lastRound = 0

  for (const game of games) {
    if (game.round !== lastRound) {
      boundaries.push({
        gameIndex: game.gameIndex,
        roundLabel: game.roundLabel,
      })
      lastRound = game.round
    }
  }

  return boundaries
}

// ─── R64 Matchup Map ─────────────────────────────────────────────────────────

/**
 * Returns a map of teamId → first-round opponent info (R64 matchups).
 * Uses standard bracket seed pairings: 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15.
 * Used by the demo picks page to show matchup context on team cards.
 */
// Minimal structural type so the function works with both DemoTeam[] and computeTeamsForPicks output
type TeamWithSeedInfo = { id: string; name: string; shortName: string; seed: number; region: string; isPlayIn: boolean }

export function getR64Matchups(
  teams: TeamWithSeedInfo[]
): Map<string, { opponentId: string; opponentName: string; opponentShortName: string; opponentSeed: number }> {
  type MatchupInfo = { opponentId: string; opponentName: string; opponentShortName: string; opponentSeed: number }
  const result = new Map<string, MatchupInfo>()

  const regions = ["East", "West", "South", "Midwest"]
  for (const region of regions) {
    const regionTeams = teams.filter(t => t.region === region && !t.isPlayIn)
    for (const [seedA, seedB] of R64_SEED_MATCHUPS) {
      const teamA = regionTeams.find(t => t.seed === seedA)
      const teamB = regionTeams.find(t => t.seed === seedB)
      if (!teamA || !teamB) continue
      result.set(teamA.id, {
        opponentId: teamB.id,
        opponentName: teamB.name,
        opponentShortName: teamB.shortName,
        opponentSeed: teamB.seed,
      })
      result.set(teamB.id, {
        opponentId: teamA.id,
        opponentName: teamA.name,
        opponentShortName: teamA.shortName,
        opponentSeed: teamA.seed,
      })
    }
  }

  return result
}
