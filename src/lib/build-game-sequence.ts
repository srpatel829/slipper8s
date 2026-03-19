/**
 * Shared bracket-building logic.
 *
 * Deterministically constructs a 63-game bracket from team seeds and
 * completed TournamentGame records. Used by both the Simulator and
 * Bracket pages so the bracket structure is always seed-based (not
 * dependent on what ESPN happens to have in its API).
 */

import type { DemoGameEvent } from "@/lib/demo-game-sequence"

// ── Bracket structure constants ─────────────────────────────────────────────

export const R64_PAIRS = [[1,16],[8,9],[5,12],[4,13],[6,11],[3,14],[7,10],[2,15]] as const
export const REGIONS = ["East", "West", "South", "Midwest"] as const
export const ROUND_LABELS: Record<number, string> = {
  1: "Round of 64", 2: "Round of 32", 3: "Sweet 16",
  4: "Elite 8", 5: "Final Four", 6: "Championship",
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface BracketTeam {
  id: string
  name: string
  shortName: string
  seed: number
  region: string
  isPlayIn: boolean
  [key: string]: unknown // allow extra fields
}

export interface BracketTournamentGame {
  id: string
  round: number
  region: string | null
  team1Id: string | null
  team2Id: string | null
  winnerId: string | null
  team1Score: number | null
  team2Score: number | null
  isComplete: boolean
}

// ── Builder ─────────────────────────────────────────────────────────────────

/**
 * Builds a 63-game bracket sequence from team seeds + actual TournamentGame results.
 *
 * Bracket structure is deterministic from seeds. For each game:
 * - R64: matchups are fixed by seed pairs (1v16, 8v9, etc.)
 * - R32+: participants cascade from prior-round winners
 *
 * Completed games use gameIndex=0 (locked), incomplete use gameIndex=1 (unlocked).
 * The returned gameIndex prop is 0 if any games are complete, -1 otherwise.
 */
export function buildGameSequence(
  teams: BracketTeam[],
  tournamentGames: BracketTournamentGame[]
): { gameSequence: DemoGameEvent[], gameIndex: number } {
  // Build lookup maps — only non-play-in teams go into teamBySeed.
  const teamById = new Map(teams.map(t => [t.id, t]))
  const teamBySeed = new Map<string, BracketTeam>()
  for (const t of teams) {
    if (!t.isPlayIn) teamBySeed.set(`${t.region}-${t.seed}`, t)
  }

  // Index TournamentGames by sorted team pair for O(1) lookup
  const tgByPair = new Map<string, BracketTournamentGame>()
  for (const tg of tournamentGames) {
    if (tg.team1Id && tg.team2Id) {
      const key = [tg.team1Id, tg.team2Id].sort().join("|")
      tgByPair.set(key, tg)
    }
  }

  const events: DemoGameEvent[] = []
  const eventWinners: (string | null)[] = []
  let hasAnyComplete = false

  function makeEvent(
    round: number,
    region: string,
    teamA: BracketTeam | null,
    teamB: BracketTeam | null,
    slotLabel: string
  ): { event: DemoGameEvent; winner: string | null } {
    let tg: BracketTournamentGame | undefined
    if (teamA && teamB) {
      const key = [teamA.id, teamB.id].sort().join("|")
      tg = tgByPair.get(key)
    }

    const isComplete = tg?.isComplete ?? false
    if (isComplete) hasAnyComplete = true

    let winnerId: string, loserId: string
    let winnerName: string, loserName: string
    let winnerShort: string, loserShort: string
    let winnerSeed: number, loserSeed: number
    let winnerScore = 0, loserScore = 0

    if (isComplete && tg?.winnerId && teamA && teamB) {
      const w = tg.winnerId === teamA.id ? teamA : teamB
      const l = tg.winnerId === teamA.id ? teamB : teamA
      winnerId = w.id; loserId = l.id
      winnerName = w.name; loserName = l.name
      winnerShort = w.shortName; loserShort = l.shortName
      winnerSeed = w.seed; loserSeed = l.seed
      winnerScore = tg.winnerId === tg.team1Id ? (tg.team1Score ?? 0) : (tg.team2Score ?? 0)
      loserScore = tg.winnerId === tg.team1Id ? (tg.team2Score ?? 0) : (tg.team1Score ?? 0)
    } else if (teamA && teamB) {
      winnerId = teamA.id; loserId = teamB.id
      winnerName = teamA.name; loserName = teamB.name
      winnerShort = teamA.shortName; loserShort = teamB.shortName
      winnerSeed = teamA.seed; loserSeed = teamB.seed
    } else if (teamA && !teamB) {
      winnerId = teamA.id; loserId = `tbd-${slotLabel}-b`
      winnerName = teamA.name; loserName = "TBD"
      winnerShort = teamA.shortName; loserShort = "TBD"
      winnerSeed = teamA.seed; loserSeed = 0
    } else if (!teamA && teamB) {
      winnerId = `tbd-${slotLabel}-a`; loserId = teamB.id
      winnerName = "TBD"; loserName = teamB.name
      winnerShort = "TBD"; loserShort = teamB.shortName
      winnerSeed = 0; loserSeed = teamB.seed
    } else {
      winnerId = `tbd-${slotLabel}-a`; loserId = `tbd-${slotLabel}-b`
      winnerName = "TBD"; loserName = "TBD"
      winnerShort = "TBD"; loserShort = "TBD"
      winnerSeed = 0; loserSeed = 0
    }

    return {
      event: {
        gameIndex: isComplete ? 0 : 1,
        gameId: tg?.id ?? `synthetic-${slotLabel}`,
        round,
        roundLabel: ROUND_LABELS[round] ?? `Round ${round}`,
        region,
        winnerId, loserId, winnerName, loserName,
        winnerShortName: winnerShort, loserShortName: loserShort,
        winnerSeed, loserSeed, winnerScore, loserScore,
        isUpset: isComplete ? winnerSeed > loserSeed : false,
      },
      winner: isComplete ? winnerId : null,
    }
  }

  // ── R64: 32 games (4 regions × 8 seed matchups) ──
  for (const region of REGIONS) {
    for (const [seedA, seedB] of R64_PAIRS) {
      const teamA = teamBySeed.get(`${region}-${seedA}`) ?? null
      const teamB = teamBySeed.get(`${region}-${seedB}`) ?? null
      const { event, winner } = makeEvent(1, region, teamA, teamB, `r1-${region}-${seedA}v${seedB}`)
      events.push(event)
      eventWinners.push(winner)
    }
  }

  // ── R32 through E8 (rounds 2-4): cascade from prior-round winners ──
  for (let round = 2; round <= 4; round++) {
    for (const region of REGIONS) {
      const prevRound = events.filter(e => e.round === round - 1 && e.region === region)
      const numGames = prevRound.length / 2

      for (let i = 0; i < numGames; i++) {
        const feederAIdx = events.indexOf(prevRound[i * 2])
        const feederBIdx = events.indexOf(prevRound[i * 2 + 1])
        const wA = eventWinners[feederAIdx]
        const wB = eventWinners[feederBIdx]
        const teamA = wA ? teamById.get(wA) ?? null : null
        const teamB = wB ? teamById.get(wB) ?? null : null

        const { event, winner } = makeEvent(round, region, teamA, teamB, `r${round}-${region}-${i}`)
        events.push(event)
        eventWinners.push(winner)
      }
    }
  }

  // ── F4 (round 5): East vs South, West vs Midwest ──
  // REGIONS order is [East, West, South, Midwest] → indices [0,1,2,3]
  // NCAA 2026 bracket: East(0) vs South(2), West(1) vs Midwest(3)
  const e8Events = events.filter(e => e.round === 4)
  const f4Pairs: [number, number][] = [[0, 2], [1, 3]]
  for (const [idxA, idxB] of f4Pairs) {
    const wA = eventWinners[events.indexOf(e8Events[idxA])]
    const wB = eventWinners[events.indexOf(e8Events[idxB])]
    const teamA = wA ? teamById.get(wA) ?? null : null
    const teamB = wB ? teamById.get(wB) ?? null : null
    const label = idxA === 0 ? "f4-east-south" : "f4-west-midwest"
    const { event, winner } = makeEvent(5, "Final Four", teamA, teamB, label)
    events.push(event)
    eventWinners.push(winner)
  }

  // ── Championship (round 6) ──
  const f4Events = events.filter(e => e.round === 5)
  const wF4A = eventWinners[events.indexOf(f4Events[0])]
  const wF4B = eventWinners[events.indexOf(f4Events[1])]
  const champA = wF4A ? teamById.get(wF4A) ?? null : null
  const champB = wF4B ? teamById.get(wF4B) ?? null : null
  const { event: champEvent } = makeEvent(6, "Championship", champA, champB, "championship")
  events.push(champEvent)

  return {
    gameSequence: events,
    gameIndex: hasAnyComplete ? 0 : -1,
  }
}
