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
import { calculateEntryExpectedScore } from "@/lib/silver-bulletin-2025"
import { classifyArchetypes } from "@/lib/archetypes"

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

    // Compute expected score from Silver Bulletin probabilities
    const preTournament = gameIndex < 0
    const expectedScore = calculateEntryExpectedScore(userPicks, teamState, preTournament)

    // Classify archetypes from pick seeds and regions
    const pickSeeds = picks.map(p => p.seed)
    const pickRegions = picks.map(p => p.region).filter((r): r is string => !!r)
    const archetypeResults = classifyArchetypes(pickSeeds, pickRegions)

    return {
      entryId: user.id, // use userId as entryId in demo
      userId: user.id,
      name: user.name,
      email: user.email,
      isPaid: user.isPaid,
      entryNumber: 1,
      nickname: null,
      currentScore,
      ppr,
      tps: currentScore + ppr,
      teamsRemaining,
      expectedScore,
      archetypes: archetypeResults.map(a => a.key),
      picks,
    }
  })

  // Sort: score desc → max score (tps) desc → expected desc → name asc
  entries.sort(
    (a, b) =>
      b.currentScore - a.currentScore ||
      b.tps - a.tps ||
      (b.expectedScore ?? 0) - (a.expectedScore ?? 0) ||
      a.name.localeCompare(b.name)
  )

  // Tie-aware ranking: entries with same score get same rank (T4 etc.)
  const total = entries.length
  const ranked: LeaderboardEntry[] = []
  for (let i = 0; i < entries.length; i++) {
    // Find the first entry in this tie group
    let tieStart = i
    while (tieStart > 0 && entries[tieStart - 1].currentScore === entries[i].currentScore) {
      tieStart--
    }
    const rank = tieStart + 1
    ranked.push({
      ...entries[i],
      rank,
      percentile: total > 1 ? Math.round((rank / total) * 1000) / 10 : 0,
      tierName: rank === 1 ? "Champion" : rank === 2 ? "Runner Up" : rank <= 4 ? "Final 4" : rank <= 8 ? "Elite 8" : rank <= 16 ? "Sweet 16" : rank <= 32 ? "Worthy 32" : rank <= 64 ? "Dancing 64" : rank <= 68 ? "Play In 68" : null,
      charity: i < 4
        ? (users.find(u => u.id === entries[i].userId)?.charityPreference ?? null)
        : null,
    })
  }
  return ranked
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
  sCurveRank: number | null
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
      sCurveRank: t.sCurveRank ?? null,
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

// ─── Day Checkpoints ────────────────────────────────────────────────────────

export interface DayCheckpoint {
  /** 0-based checkpoint index */
  index: number
  /** Human-readable label */
  label: string
  /** Short label for compact display */
  shortLabel: string
  /** The gameIndex of the LAST game in this checkpoint (-1 for pre-tournament) */
  lastGameIndex: number
}

/**
 * 11 checkpoint positions: Pre-tournament + 10 end-of-day checkpoints.
 * Each day in the tournament has half the games split across 2 days,
 * except Final Four (1 day) and Championship (1 day).
 *
 * For 2025: 32 R64 games split 16/16, 16 R32 split 8/8, 8 S16 split 4/4,
 * 4 E8 split 2/2, 2 F4 in 1 day, 1 Championship in 1 day.
 */
export function getDayCheckpoints(games: DemoGameEvent[]): DayCheckpoint[] {
  // Group games by round
  const gamesByRound = new Map<number, DemoGameEvent[]>()
  for (const g of games) {
    const list = gamesByRound.get(g.round) ?? []
    list.push(g)
    gamesByRound.set(g.round, list)
  }

  const checkpoints: DayCheckpoint[] = [
    { index: 0, label: "Pre-Tournament", shortLabel: "Pre", lastGameIndex: -1 },
  ]

  // Rounds 1-4 split into 2 days each
  const roundDayConfig: Array<{ round: number; labelDay1: string; labelDay2: string; shortDay1: string; shortDay2: string }> = [
    { round: 1, labelDay1: "Round of 64 Day 1", labelDay2: "Round of 64 Day 2", shortDay1: "R64 D1", shortDay2: "R64 D2" },
    { round: 2, labelDay1: "Round of 32 Day 1", labelDay2: "Round of 32 Day 2", shortDay1: "R32 D1", shortDay2: "R32 D2" },
    { round: 3, labelDay1: "Sweet 16 Day 1", labelDay2: "Sweet 16 Day 2", shortDay1: "S16 D1", shortDay2: "S16 D2" },
    { round: 4, labelDay1: "Elite 8 Day 1", labelDay2: "Elite 8 Day 2", shortDay1: "E8 D1", shortDay2: "E8 D2" },
  ]

  for (const cfg of roundDayConfig) {
    const roundGames = gamesByRound.get(cfg.round) ?? []
    const half = Math.ceil(roundGames.length / 2)
    const day1Games = roundGames.slice(0, half)
    const day2Games = roundGames.slice(half)

    if (day1Games.length > 0) {
      checkpoints.push({
        index: checkpoints.length,
        label: cfg.labelDay1,
        shortLabel: cfg.shortDay1,
        lastGameIndex: day1Games[day1Games.length - 1].gameIndex,
      })
    }
    if (day2Games.length > 0) {
      checkpoints.push({
        index: checkpoints.length,
        label: cfg.labelDay2,
        shortLabel: cfg.shortDay2,
        lastGameIndex: day2Games[day2Games.length - 1].gameIndex,
      })
    }
  }

  // F4 = 1 day
  const f4Games = gamesByRound.get(5) ?? []
  if (f4Games.length > 0) {
    checkpoints.push({
      index: checkpoints.length,
      label: "Final Four",
      shortLabel: "F4",
      lastGameIndex: f4Games[f4Games.length - 1].gameIndex,
    })
  }

  // Championship = 1 day
  const champGames = gamesByRound.get(6) ?? []
  if (champGames.length > 0) {
    checkpoints.push({
      index: checkpoints.length,
      label: "Championship",
      shortLabel: "Champ",
      lastGameIndex: champGames[champGames.length - 1].gameIndex,
    })
  }

  return checkpoints
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
