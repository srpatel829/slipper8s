"use client"

/**
 * SimulatorPanel — Bracket Game Picker with sticky leaderboard.
 *
 * Full-viewport layout: scrollable bracket/list picker on left, sticky
 * simulated leaderboard on right. Picks cascade through the bracket tree
 * (changing a pick clears invalid downstream selections).
 *
 * Works in two modes:
 *   - Demo mode: pass `gameSequence` + `gameIndex` for full bracket history
 *   - Real app mode: computes upcoming matchups from `aliveTeams` bracket positions
 */

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { useTimeline } from "@/components/layout/timeline-provider"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy, RotateCcw, ChevronDown, ChevronRight, Lock, LayoutTemplate, List } from "lucide-react"
import { computeSimulatedLeaderboard, type HypotheticalState } from "@/lib/scoring"
import { seedToSlot } from "@/lib/bracket-ppr"
import type { LeaderboardEntry, PlayInSlotDisplay } from "@/types"
import type { Team } from "@/generated/prisma"
import type { DemoGameEvent } from "@/lib/demo-game-sequence"
import { AdvancingBracket } from "@/components/bracket/advancing-bracket"
import { TeamCallout } from "@/components/team-callout"
import { buildTeamCalloutData } from "@/lib/team-callout-helpers"

// ─── Types ────────────────────────────────────────────────────────────────────

interface SimulatorPanelProps {
  initialLeaderboard: LeaderboardEntry[]
  /** Alive teams — used for real-app matchup computation */
  aliveTeams: Team[]
  /** All teams incl. eliminated — used for logo lookups in demo bracket */
  allTeams?: Team[]
  /** Game sequence for bracket view */
  gameSequence?: DemoGameEvent[]
  /** Current timeline position (0 = some complete, -1 = pre-tournament) */
  gameIndex?: number
  /** Whether to show the leaderboard sidebar (hidden until entries are locked) */
  showLeaderboard?: boolean
  /** Play-in slot data for showing matchup names instead of TBD */
  playInSlots?: PlayInSlotDisplay[]
  /** User's leagues for private league filter */
  userLeagues?: Array<{ id: string; name: string }>
  /** Current user ID for default dimension selection */
  currentUserId?: string
  /** User profile for dimension defaults when entry data is missing */
  userProfile?: {
    country: string | null
    state: string | null
    gender: string | null
    favoriteTeam: string | null
    favoriteTeamId: string | null
    conference: string | null
  } | null
}

/** Unified game representation for both demo and real-app mode */
interface MatchupGame {
  gameId: string
  round: number
  roundLabel: string
  region: string
  isLocked: boolean
  teamAId: string
  teamAName: string
  teamAShortName: string
  teamASeed: number
  teamAWins: number
  teamALogo: string | null
  teamBId: string
  teamBName: string
  teamBShortName: string
  teamBSeed: number
  teamBWins: number
  teamBLogo: string | null
  /** Only set for locked games — which team actually won */
  actualWinnerId?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROUND_LABELS: Record<number, string> = {
  1: "Round of 64",
  2: "Round of 32",
  3: "Sweet 16",
  4: "Elite 8",
  5: "Final Four",
  6: "Championship",
}

/** Bracket merge pairs for real-app matchup computation */
const REGION_MERGE_PAIRS: Array<[number, number[], number[]]> = [
  [2, [0], [1]], [2, [2], [3]], [2, [4], [5]], [2, [6], [7]],
  [3, [0, 1], [2, 3]], [3, [4, 5], [6, 7]],
  [4, [0, 1, 2, 3], [4, 5, 6, 7]],
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build upcoming matchup list from alive teams' bracket positions (real-app mode) */
function computeUpcomingMatchups(aliveTeams: Team[]): MatchupGame[] {
  const matchups: MatchupGame[] = []
  const regions = ["East", "West", "South", "Midwest"]

  for (const region of regions) {
    const regional = aliveTeams
      .filter(t => t.region === region && !t.isPlayIn)
      .map(t => ({ ...t, slot: seedToSlot(t.seed) }))
      .filter(t => t.slot !== -1)

    if (regional.length < 2) continue

    for (const [round, groupA, groupB] of REGION_MERGE_PAIRS) {
      const inA = regional.filter(t => groupA.includes(t.slot) && t.wins === round - 1)
      const inB = regional.filter(t => groupB.includes(t.slot) && t.wins === round - 1)
      if (inA.length > 0 && inB.length > 0) {
        const tA = inA[0], tB = inB[0]
        const [first, second] = tA.seed <= tB.seed ? [tA, tB] : [tB, tA]
        matchups.push({
          gameId: `${region}-r${round}-${first.id}-vs-${second.id}`,
          round, roundLabel: ROUND_LABELS[round], region,
          isLocked: false,
          teamAId: first.id, teamAName: first.name, teamAShortName: first.shortName,
          teamASeed: first.seed, teamAWins: first.wins, teamALogo: first.logoUrl,
          teamBId: second.id, teamBName: second.name, teamBShortName: second.shortName,
          teamBSeed: second.seed, teamBWins: second.wins, teamBLogo: second.logoUrl,
        })
      }
    }
  }

  // Final Four (round 5)
  const f4Pairs: [string, string][] = [["East", "South"], ["West", "Midwest"]]
  for (const [rA, rB] of f4Pairs) {
    const champA = aliveTeams.find(t => t.region === rA && !t.isPlayIn && t.wins >= 4 && t.wins < 5)
    const champB = aliveTeams.find(t => t.region === rB && !t.isPlayIn && t.wins >= 4 && t.wins < 5)
    if (champA && champB) {
      const [first, second] = champA.seed <= champB.seed ? [champA, champB] : [champB, champA]
      matchups.push({
        gameId: `f4-${first.id}-vs-${second.id}`,
        round: 5, roundLabel: "Final Four", region: "Final Four",
        isLocked: false,
        teamAId: first.id, teamAName: first.name, teamAShortName: first.shortName,
        teamASeed: first.seed, teamAWins: first.wins, teamALogo: first.logoUrl,
        teamBId: second.id, teamBName: second.name, teamBShortName: second.shortName,
        teamBSeed: second.seed, teamBWins: second.wins, teamBLogo: second.logoUrl,
      })
    }
  }

  // Championship (round 6)
  const finalists = aliveTeams.filter(t => !t.isPlayIn && t.wins === 5)
  if (finalists.length === 2) {
    const [a, b] = finalists
    const [first, second] = a.seed <= b.seed ? [a, b] : [b, a]
    matchups.push({
      gameId: `championship-${first.id}-vs-${second.id}`,
      round: 6, roundLabel: "Championship", region: "Championship",
      isLocked: false,
      teamAId: first.id, teamAName: first.name, teamAShortName: first.shortName,
      teamASeed: first.seed, teamAWins: first.wins, teamALogo: first.logoUrl,
      teamBId: second.id, teamBName: second.name, teamBShortName: second.shortName,
      teamBSeed: second.seed, teamBWins: second.wins, teamBLogo: second.logoUrl,
    })
  }

  return matchups
}

/** Convert a DemoGameEvent to MatchupGame (show lower seed first) */
function demoEventToMatchup(g: DemoGameEvent, isLocked: boolean, logoMap: Map<string, string | null>): MatchupGame {
  const showWinnerFirst = g.winnerSeed <= g.loserSeed
  const teamA = showWinnerFirst
    ? { id: g.winnerId, name: g.winnerName, short: g.winnerShortName, seed: g.winnerSeed }
    : { id: g.loserId, name: g.loserName, short: g.loserShortName, seed: g.loserSeed }
  const teamB = showWinnerFirst
    ? { id: g.loserId, name: g.loserName, short: g.loserShortName, seed: g.loserSeed }
    : { id: g.winnerId, name: g.winnerName, short: g.winnerShortName, seed: g.winnerSeed }

  return {
    gameId: g.gameId,
    round: g.round,
    roundLabel: g.roundLabel,
    region: g.region,
    isLocked,
    teamAId: teamA.id, teamAName: teamA.name, teamAShortName: teamA.short,
    teamASeed: teamA.seed, teamAWins: 0, teamALogo: logoMap.get(teamA.id) ?? null,
    teamBId: teamB.id, teamBName: teamB.name, teamBShortName: teamB.short,
    teamBSeed: teamB.seed, teamBWins: 0, teamBLogo: logoMap.get(teamB.id) ?? null,
    actualWinnerId: isLocked ? g.winnerId : undefined,
  }
}

// ─── Team chip (for clickable matchup cards) ──────────────────────────────────

function TeamChip({
  teamId, shortName, seed, logo, wins,
  isSelected, isEliminated, isLocked,
  onClick,
  teamLookup,
  isPreTournament = false,
}: {
  teamId: string; shortName: string; seed: number; logo: string | null; wins: number
  isSelected: boolean; isEliminated: boolean; isLocked: boolean
  onClick: () => void
  teamLookup: Map<string, Team>
  isPreTournament?: boolean
}) {
  const team = teamLookup.get(teamId)

  const chipContent = (
    <>
      {logo ? (
        <img src={logo} alt="" className="h-5 w-5 object-contain shrink-0" />
      ) : (
        <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold shrink-0">
          {shortName[0]}
        </div>
      )}
      <span className={`font-semibold truncate flex-1 ${isEliminated && isLocked ? "line-through" : ""}`}>
        {shortName}
      </span>
      <span className="text-muted-foreground shrink-0">#{seed}</span>
      {isLocked && !isEliminated && (
        <span className="text-primary text-[9px] font-bold shrink-0">✓</span>
      )}
      {isSelected && !isLocked && (
        <span className="text-primary text-[9px] font-bold shrink-0">▶</span>
      )}
    </>
  )

  const button = (
    <button
      className={`flex-1 flex items-center gap-1.5 p-2 rounded-lg border text-left transition-all text-xs min-w-0 ${isLocked
          ? isEliminated
            ? "border-border/30 bg-muted/10 opacity-40 cursor-default"
            : "border-primary/30 bg-primary/5 cursor-default"
          : isSelected
            ? "border-primary bg-primary/15 shadow-sm"
            : "border-border/60 bg-card hover:border-border hover:bg-muted/30 cursor-pointer"
        }`}
      onClick={isLocked ? undefined : onClick}
      disabled={isLocked}
      type="button"
    >
      {chipContent}
    </button>
  )

  if (!team) {
    return button
  }

  return (
    <TeamCallout
      team={buildTeamCalloutData(
        { id: team.id, name: team.name, shortName: team.shortName ?? "", seed: team.seed, region: team.region ?? "", wins: team.wins, eliminated: team.eliminated, logoUrl: team.logoUrl, espnId: team.espnId, conference: team.conference },
        isPreTournament,
      )}
      interactiveChild
    >
      {button}
    </TeamCallout>
  )
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

const SIM_STORAGE_KEY = "slipper8s-sim-picks"

/** Encode gamePicks to a URL-safe base64 string */
function encodeSimPicks(picks: Record<string, string>): string {
  const entries = Object.entries(picks)
  if (entries.length === 0) return ""
  // Compact format: gameId:winnerId pairs separated by |
  const compact = entries.map(([gId, wId]) => `${gId}:${wId}`).join("|")
  return btoa(compact)
}

/** Decode URL-safe base64 string back to gamePicks */
function decodeSimPicks(encoded: string): Record<string, string> {
  try {
    const compact = atob(encoded)
    const picks: Record<string, string> = {}
    for (const pair of compact.split("|")) {
      const sep = pair.indexOf(":")
      if (sep === -1) continue
      picks[pair.slice(0, sep)] = pair.slice(sep + 1)
    }
    return picks
  } catch {
    return {}
  }
}

/**
 * Reconcile saved picks against current game state.
 * - Drop picks for games that are now completed (real results win)
 * - Drop picks whose chosen team no longer appears in the game (team eliminated upstream)
 * - Cascade-clear downstream picks that depended on dropped teams
 */
function reconcilePicks(
  saved: Record<string, string>,
  games: MatchupGame[],
  dsMap: Map<string, string>,
): Record<string, string> {
  const gameMap = new Map(games.map(g => [g.gameId, g]))
  const reconciled: Record<string, string> = {}
  const droppedTeams = new Set<string>()

  for (const [gameId, winnerId] of Object.entries(saved)) {
    const game = gameMap.get(gameId)
    if (!game) continue // game no longer exists
    if (game.isLocked) continue // game completed — real result wins

    // Check if the picked team is still a valid participant in this game
    if (winnerId !== game.teamAId && winnerId !== game.teamBId) {
      droppedTeams.add(winnerId)
      continue
    }
    reconciled[gameId] = winnerId
  }

  // Cascade-clear: walk downstream from any dropped pick
  if (droppedTeams.size > 0) {
    for (const gameId of Object.keys(reconciled)) {
      if (droppedTeams.has(reconciled[gameId])) {
        droppedTeams.add(reconciled[gameId])
        delete reconciled[gameId]
      }
    }
  }

  return reconciled
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SimulatorPanel({
  initialLeaderboard,
  aliveTeams,
  allTeams,
  gameSequence,
  gameIndex,
  showLeaderboard = true,
  playInSlots,
  userLeagues,
  currentUserId,
  userProfile,
}: SimulatorPanelProps) {
  const [gamePicks, setGamePicks] = useState<Record<string, string>>({})
  const [lbFilter, setLbFilter] = useState<string>("global")
  const [lbLeagueId, setLbLeagueId] = useState<string>("")
  const [lbSubValue, setLbSubValue] = useState<string>("")
  // Rounds that are collapsed (defaults: completed rounds)
  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(() => new Set())
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const initializedRef = useRef(false)
  const timeline = useTimeline()

  // ── Timeline-aware game sequence override ─────────────────────────────────
  // When timeline is scrubbed back, only show games completed up to that point
  const { effectiveGameSequence, effectiveGameIndex } = useMemo(() => {
    if (!timeline || timeline.isLive || !gameSequence) {
      return { effectiveGameSequence: gameSequence, effectiveGameIndex: gameIndex }
    }

    const completedAtPosition = new Set(
      timeline.completedGames
        .filter(g => g.gameIndex <= timeline.currentGameIndex)
        .map(g => g.id)
    )

    const modified = gameSequence.map(event => {
      if (completedAtPosition.has(event.gameId)) {
        return { ...event, gameIndex: 0 }
      }
      return { ...event, gameIndex: 1 }
    })

    return {
      effectiveGameSequence: modified,
      effectiveGameIndex: completedAtPosition.size > 0 ? 0 : -1,
    }
  }, [gameSequence, gameIndex, timeline])

  // ── Compute isPreTournament ─────────────────────────────────────────────────
  const isPreTournament = effectiveGameIndex === undefined || effectiveGameIndex < 0

  // ── Build logo lookup map and team lookup map ───────────────────────────────
  const { logoMap, teamLookup } = useMemo(() => {
    const source = allTeams ?? aliveTeams
    const logos = new Map<string, string | null>()
    const teams = new Map<string, Team>()
    for (const t of source) {
      logos.set(t.id, t.logoUrl)
      teams.set(t.id, t)
    }
    return { logoMap: logos, teamLookup: teams }
  }, [allTeams, aliveTeams])

  // ── Build unified game list ────────────────────────────────────────────────
  const allGames = useMemo<MatchupGame[]>(() => {
    if (effectiveGameSequence) {
      const currentIdx = effectiveGameIndex ?? -1
      return effectiveGameSequence.map(g => demoEventToMatchup(g, g.gameIndex <= currentIdx, logoMap))
    }
    return computeUpcomingMatchups(aliveTeams)
  }, [effectiveGameSequence, effectiveGameIndex, aliveTeams, logoMap])

  // ── Downstream cascade map ─────────────────────────────────────────────────
  // Maps each gameId → the gameId of the next game its winner feeds into.
  // Used to clear stale downstream picks when a user changes a pick.
  const downstreamMap = useMemo(() => {
    if (!gameSequence) return new Map<string, string>()

    const map = new Map<string, string>()
    const byRegionRound = new Map<string, Map<number, string[]>>()
    for (const region of ["East", "West", "South", "Midwest"]) {
      byRegionRound.set(region, new Map())
    }
    for (const game of gameSequence) {
      if (game.round >= 1 && game.round <= 4) {
        const rm = byRegionRound.get(game.region)
        if (!rm) continue
        const arr = rm.get(game.round) ?? []
        arr.push(game.gameId)
        rm.set(game.round, arr)
      }
    }
    // Within-region cascades: R64[i] → R32[floor(i/2)] → S16[...] → E8[0]
    for (const [, regMap] of byRegionRound) {
      for (let round = 1; round <= 3; round++) {
        const cur = regMap.get(round) ?? []
        const nxt = regMap.get(round + 1) ?? []
        for (let i = 0; i < cur.length; i++) {
          const nextId = nxt[Math.floor(i / 2)]
          if (nextId) map.set(cur[i], nextId)
        }
      }
    }
    // E8 → F4
    const f4Games = gameSequence.filter(g => g.round === 5)
    const e8Pairs: [string, number][] = [
      ["East", 0], ["South", 0], ["West", 1], ["Midwest", 1]
    ]
    for (const [region, f4Idx] of e8Pairs) {
      const e8 = byRegionRound.get(region)?.get(4) ?? []
      const f4Id = f4Games[f4Idx]?.gameId
      if (e8[0] && f4Id) map.set(e8[0], f4Id)
    }
    // F4 → Championship
    const champId = gameSequence.find(g => g.round === 6)?.gameId
    if (champId) {
      for (const f4 of f4Games) map.set(f4.gameId, champId)
    }
    return map
  }, [gameSequence])

  // ── Load saved picks on mount (URL params → localStorage fallback) ────────
  useEffect(() => {
    if (initializedRef.current) return
    if (allGames.length === 0) return // wait for games to be computed
    initializedRef.current = true

    const simParam = searchParams.get("sim")
    let loaded: Record<string, string> = {}

    if (simParam) {
      loaded = decodeSimPicks(simParam)
    } else {
      try {
        const stored = localStorage.getItem(SIM_STORAGE_KEY)
        if (stored) loaded = JSON.parse(stored)
      } catch { /* ignore */ }
    }

    if (Object.keys(loaded).length > 0) {
      const reconciled = reconcilePicks(loaded, allGames, downstreamMap)
      if (Object.keys(reconciled).length > 0) {
        setGamePicks(reconciled)
      }
    }
  }, [allGames, downstreamMap, searchParams])

  // ── Sync picks to URL + localStorage on change ──────────────────────────────
  const syncPicks = useCallback((picks: Record<string, string>) => {
    // localStorage
    try {
      if (Object.keys(picks).length > 0) {
        localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(picks))
      } else {
        localStorage.removeItem(SIM_STORAGE_KEY)
      }
    } catch { /* ignore */ }

    // URL params
    const encoded = encodeSimPicks(picks)
    const params = new URLSearchParams(searchParams.toString())
    if (encoded) {
      params.set("sim", encoded)
    } else {
      params.delete("sim")
    }
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false })
  }, [searchParams, router, pathname])

  // ── Historical team state when timeline is scrubbed back ──────────────────
  // Compute team wins/eliminated at the current timeline position using the
  // original gameSequence (which has winnerId/loserId for completed games).
  const historicalTeamState = useMemo<Record<string, { wins: number; eliminated: boolean }> | null>(() => {
    if (!timeline || timeline.isLive || !gameSequence) return null

    // Build set of completed games at the current timeline position
    const completedAtPosition = new Set(
      timeline.completedGames
        .filter(g => g.gameIndex <= timeline.currentGameIndex)
        .map(g => g.id)
    )

    // Walk the original game sequence and count wins/eliminations
    const teamState: Record<string, { wins: number; eliminated: boolean }> = {}
    for (const event of gameSequence) {
      if (completedAtPosition.has(event.gameId)) {
        // Winner gets a win
        if (!teamState[event.winnerId]) teamState[event.winnerId] = { wins: 0, eliminated: false }
        teamState[event.winnerId].wins++
        // Loser is eliminated
        if (!teamState[event.loserId]) teamState[event.loserId] = { wins: 0, eliminated: false }
        teamState[event.loserId].eliminated = true
      }
    }
    return teamState
  }, [timeline, gameSequence])

  // ── Effective base leaderboard (historical when scrubbed, live when at live) ──
  const effectiveLeaderboard = useMemo(() => {
    if (!historicalTeamState) return initialLeaderboard

    // Override each entry's pick wins/eliminated based on historical team state
    return initialLeaderboard.map(entry => {
      let currentScore = 0
      let ppr = 0
      let teamsRemaining = 0
      const picks = entry.picks.map(pick => {
        const hist = historicalTeamState[pick.teamId]
        const wins = hist?.wins ?? 0
        const eliminated = hist?.eliminated ?? false
        currentScore += pick.seed * wins
        if (!eliminated) {
          teamsRemaining++
          ppr += pick.seed * Math.max(0, 6 - wins)
        }
        return { ...pick, wins, eliminated }
      })
      return {
        ...entry,
        currentScore,
        ppr,
        tps: currentScore + ppr,
        teamsRemaining,
        picks,
      }
    })
  }, [initialLeaderboard, historicalTeamState])

  // ── Build hypothetical state from user's game picks ───────────────────────
  const hypothetical = useMemo<HypotheticalState>(() => {
    if (Object.keys(gamePicks).length === 0) return {}

    // Base wins from the effective leaderboard (historical or live)
    const baseWins: Record<string, number> = {}
    for (const entry of effectiveLeaderboard) {
      for (const pick of entry.picks) {
        baseWins[pick.teamId] = pick.wins
      }
    }

    const hyp: HypotheticalState = {}

    // Process games in sequence order so cascading picks compound correctly
    const sorted = [...allGames].sort((a, b) => a.round - b.round)
    for (const game of sorted) {
      const pickedWinnerId = gamePicks[game.gameId]
      if (!pickedWinnerId) continue

      const pickedLoserId = pickedWinnerId === game.teamAId ? game.teamBId : game.teamAId

      const currentWins = hyp[pickedWinnerId]?.wins ?? baseWins[pickedWinnerId] ?? 0
      hyp[pickedWinnerId] = { wins: currentWins + 1, eliminated: false }
      hyp[pickedLoserId] = { wins: baseWins[pickedLoserId] ?? 0, eliminated: true }
    }

    return hyp
  }, [gamePicks, allGames, effectiveLeaderboard])

  // ── Simulated leaderboard (re-sorted by score then TPS) ───────────────────
  const simLeaderboardFull = useMemo(() => {
    const lb = computeSimulatedLeaderboard(effectiveLeaderboard, hypothetical)
    return [...lb].sort(
      (a, b) => b.currentScore - a.currentScore || b.tps - a.tps || a.name.localeCompare(b.name)
    ).map((s, i) => ({ ...s, rank: i + 1 }))
  }, [effectiveLeaderboard, hypothetical])

  // ── Available sub-values for each dimension ────────────────────────────────
  const dimensionOptions = useMemo(() => {
    const extract = (key: "country" | "state" | "gender" | "favoriteTeam" | "conference") => {
      const vals = new Set<string>()
      for (const e of simLeaderboardFull) {
        const v = e[key]
        if (v) vals.add(v)
      }
      return [...vals].sort()
    }
    return {
      country: extract("country"),
      state: extract("state"),
      gender: extract("gender"),
      fanBase: extract("favoriteTeam"),
      conference: extract("conference"),
    }
  }, [simLeaderboardFull])

  // ── Build team ID → name map for fanBase display ──────────────────────────
  const teamIdToName = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of (allTeams ?? aliveTeams)) {
      map.set(t.id, t.name)
    }
    return map
  }, [allTeams, aliveTeams])

  // ── Default sub-value for a dimension (current user's value) ──────────────
  const getDefaultSubValue = useCallback((dim: string) => {
    const myEntry = simLeaderboardFull.find(e => e.userId === currentUserId)
    // Try entry data first, then fall back to userProfile
    const entryVal = (key: "country" | "state" | "gender" | "favoriteTeam" | "conference") =>
      myEntry?.[key] ?? null
    if (dim === "country") return entryVal("country") ?? userProfile?.country ?? ""
    if (dim === "state") return entryVal("state") ?? userProfile?.state ?? ""
    if (dim === "gender") return entryVal("gender") ?? userProfile?.gender ?? ""
    if (dim === "fanBase") return entryVal("favoriteTeam") ?? userProfile?.favoriteTeamId ?? ""
    if (dim === "conference") return entryVal("conference") ?? userProfile?.conference ?? ""
    return ""
  }, [simLeaderboardFull, currentUserId, userProfile])

  // ── Effective sub-value (explicit selection or default) ───────────────────
  const effectiveSubValue = useMemo(() => {
    if (lbFilter === "global" || lbFilter === "league") return ""
    if (lbSubValue) return lbSubValue
    return getDefaultSubValue(lbFilter)
  }, [lbFilter, lbSubValue, getDefaultSubValue])

  // ── Filter leaderboard by selected dimension ─────────────────────────────
  const simLeaderboard = useMemo(() => {
    if (lbFilter === "global") return simLeaderboardFull
    let filtered: typeof simLeaderboardFull
    if (lbFilter === "league") {
      filtered = lbLeagueId
        ? simLeaderboardFull.filter(e => e.leagueIds?.includes(lbLeagueId))
        : simLeaderboardFull
    } else if (lbFilter === "country") {
      filtered = effectiveSubValue ? simLeaderboardFull.filter(e => e.country === effectiveSubValue) : simLeaderboardFull
    } else if (lbFilter === "state") {
      filtered = effectiveSubValue ? simLeaderboardFull.filter(e => e.state === effectiveSubValue) : simLeaderboardFull
    } else if (lbFilter === "gender") {
      filtered = effectiveSubValue ? simLeaderboardFull.filter(e => e.gender === effectiveSubValue) : simLeaderboardFull
    } else if (lbFilter === "fanBase") {
      filtered = effectiveSubValue ? simLeaderboardFull.filter(e => e.favoriteTeam === effectiveSubValue) : simLeaderboardFull
    } else if (lbFilter === "conference") {
      filtered = effectiveSubValue ? simLeaderboardFull.filter(e => e.conference === effectiveSubValue) : simLeaderboardFull
    } else {
      filtered = simLeaderboardFull
    }
    // Re-rank within the filter
    return filtered.map((s, i) => ({ ...s, rank: i + 1 }))
  }, [simLeaderboardFull, lbFilter, lbLeagueId, effectiveSubValue])

  const hasChanges = Object.keys(gamePicks).length > 0
  const futureCount = allGames.filter(g => !g.isLocked).length
  const pickedCount = Object.keys(gamePicks).length

  // ── Group games by round ───────────────────────────────────────────────────
  const roundGroups = useMemo(() => {
    const groups = new Map<number, MatchupGame[]>()
    for (const g of allGames) {
      const arr = groups.get(g.round) ?? []
      arr.push(g)
      groups.set(g.round, arr)
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0])
  }, [allGames])

  function toggleRound(round: number) {
    setCollapsedRounds(prev => {
      const next = new Set(prev)
      if (next.has(round)) next.delete(round)
      else next.add(round)
      return next
    })
  }

  function pickGame(gameId: string, winnerId: string) {
    setGamePicks(prev => {
      const oldWinnerId = prev[gameId]
      const next = { ...prev }

      if (oldWinnerId === winnerId) {
        delete next[gameId]  // toggle off
      } else {
        next[gameId] = winnerId
      }

      // Cascade-clear downstream picks that reference the old winner
      // (they are now unreachable since the old winner can no longer advance)
      if (oldWinnerId && downstreamMap.size > 0) {
        let cur = gameId
        while (true) {
          const downId = downstreamMap.get(cur)
          if (!downId) break
          if (next[downId] === oldWinnerId) {
            delete next[downId]  // clear the stale downstream pick
            cur = downId         // continue walking further downstream
          } else {
            break  // downstream picked a different team — stop here
          }
        }
      }

      // Sync to URL + localStorage after state update
      // Use setTimeout to avoid calling router.replace inside state updater
      setTimeout(() => syncPicks(next), 0)
      return next
    })
  }

  function resetPicks() {
    setGamePicks({})
    syncPicks({})
  }

  return (
    // Full-viewport layout: stacked on mobile, side-by-side on desktop
    <div className="flex flex-col md:flex-row h-[calc(100vh-60px)] overflow-hidden -mt-6">

      {/* ── Left: scrollable bracket/list picker ─────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
        <div className="px-4 py-4">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-bold">Scenario Simulator</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Pick winners for any unplayed game to see how the leaderboard shifts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="text-xs text-primary border-primary/40">
                  {pickedCount} pick{pickedCount !== 1 ? "s" : ""} made
                </Badge>
              )}
              {futureCount === 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 border border-border/30 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Tournament complete
                </div>
              )}
              {hasChanges && (
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={resetPicks}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Bracket / List tabs */}
          <Tabs defaultValue={gameSequence ? "bracket" : "list"}>
            <TabsList className="w-full mb-3 h-7">
              <TabsTrigger value="bracket" className="flex-1 gap-1 text-[10px] h-6">
                <LayoutTemplate className="h-3 w-3" />
                Bracket
              </TabsTrigger>
              <TabsTrigger value="list" className="flex-1 gap-1 text-[10px] h-6">
                <List className="h-3 w-3" />
                List
              </TabsTrigger>
            </TabsList>

            {/* Visual advancing bracket */}
            <TabsContent value="bracket" className="mt-0">
              {effectiveGameSequence ? (
                <AdvancingBracket
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  teams={(allTeams ?? aliveTeams) as any[]}
                  mode="simulator"
                  gamePicks={gamePicks}
                  onPickGame={pickGame}
                  gameSequence={effectiveGameSequence}
                  gameIndex={effectiveGameIndex ?? -1}
                  isPreTournament={isPreTournament}
                  playInSlots={playInSlots}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No bracket data available. Run an ESPN sync to populate tournament games.
                </p>
              )}
            </TabsContent>

            {/* Existing list/accordion view */}
            <TabsContent value="list" className="mt-0 space-y-2">
              {roundGroups.map(([round, games]) => {
                const allLocked = games.every(g => g.isLocked)
                const isCollapsed = collapsedRounds.has(round)
                const label = ROUND_LABELS[round] ?? `Round ${round}`
                const picked = games.filter(g => !g.isLocked && gamePicks[g.gameId]).length
                const future = games.filter(g => !g.isLocked).length

                return (
                  <div key={round} className="rounded-lg border border-border/50 overflow-hidden">
                    {/* Round header */}
                    <button
                      className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${allLocked
                          ? "bg-muted/30 hover:bg-muted/50"
                          : "bg-muted/10 hover:bg-muted/20"
                        }`}
                      onClick={() => toggleRound(round)}
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed
                          ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        }
                        <span className={`text-sm font-semibold ${allLocked ? "text-muted-foreground" : ""}`}>
                          {label}
                        </span>
                        {allLocked && (
                          <Lock className="h-3 w-3 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {allLocked ? (
                          <span className="text-[10px] text-muted-foreground">{games.length} games</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">
                            {picked}/{future} picked
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Games list */}
                    {!isCollapsed && (
                      <div className="px-3 py-2 space-y-1.5 bg-background/30">
                        {games.map(game => {
                          const pickedWinner = gamePicks[game.gameId]
                          const isAWinner = game.actualWinnerId === game.teamAId
                          const isBWinner = game.actualWinnerId === game.teamBId

                          return (
                            <div key={game.gameId} className="space-y-0.5">
                              {/* Region/context label for multi-region rounds */}
                              {(round >= 5 || games.some(g => g.region !== game.region)) && (
                                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-0.5">
                                  {game.region}
                                </p>
                              )}
                              <div className="flex items-center gap-1.5">
                                <TeamChip
                                  teamId={game.teamAId}
                                  shortName={game.teamAShortName}
                                  seed={game.teamASeed}
                                  logo={game.teamALogo}
                                  wins={game.teamAWins}
                                  isSelected={pickedWinner === game.teamAId}
                                  isEliminated={game.isLocked && !isAWinner}
                                  isLocked={game.isLocked}
                                  onClick={() => pickGame(game.gameId, game.teamAId)}
                                  teamLookup={teamLookup}
                                  isPreTournament={isPreTournament}
                                />
                                <span className="text-[10px] text-muted-foreground shrink-0">vs</span>
                                <TeamChip
                                  teamId={game.teamBId}
                                  shortName={game.teamBShortName}
                                  seed={game.teamBSeed}
                                  logo={game.teamBLogo}
                                  wins={game.teamBWins}
                                  isSelected={pickedWinner === game.teamBId}
                                  isEliminated={game.isLocked && !isBWinner}
                                  isLocked={game.isLocked}
                                  onClick={() => pickGame(game.gameId, game.teamBId)}
                                  teamLookup={teamLookup}
                                  isPreTournament={isPreTournament}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {allGames.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No matchups available. Run an ESPN sync or advance the demo timeline.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── Right: sticky simulated leaderboard ──────────────────────── */}
      {showLeaderboard ? (
        <div className="w-full md:w-80 shrink-0 border-t md:border-t-0 md:border-l border-border/40 bg-card/20 backdrop-blur-sm flex flex-col overflow-hidden max-h-[40vh] md:max-h-none">
          {/* Leaderboard header */}
          <div className="px-4 py-3 border-b border-border/30 shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Leaderboard</span>
                {hasChanges && (
                  <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/40 py-0">
                    Simulated
                  </Badge>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                {simLeaderboard.length} players
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={lbFilter} onValueChange={(v) => { setLbFilter(v); setLbLeagueId(""); setLbSubValue(""); }}>
                <SelectTrigger className="h-7 text-[11px] w-auto min-w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="country">Country</SelectItem>
                  <SelectItem value="state">State</SelectItem>
                  <SelectItem value="gender">Gender</SelectItem>
                  <SelectItem value="fanBase">Fan Base</SelectItem>
                  <SelectItem value="conference">Conference</SelectItem>
                  {(userLeagues ?? []).length > 0 && <SelectItem value="league">League</SelectItem>}
                </SelectContent>
              </Select>
              {lbFilter === "league" && (userLeagues ?? []).length > 0 && (
                <Select value={lbLeagueId} onValueChange={setLbLeagueId}>
                  <SelectTrigger className="h-7 text-[11px] w-auto min-w-[90px]">
                    <SelectValue placeholder="Select league" />
                  </SelectTrigger>
                  <SelectContent>
                    {(userLeagues ?? []).map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {["country", "state", "gender", "fanBase", "conference"].includes(lbFilter) && (
                <Select value={effectiveSubValue} onValueChange={setLbSubValue}>
                  <SelectTrigger className="h-7 text-[11px] w-auto min-w-[90px] max-w-[140px]">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(dimensionOptions[lbFilter as keyof typeof dimensionOptions] ?? []).map(val => (
                      <SelectItem key={val} value={val}>
                        {lbFilter === "fanBase"
                          ? (teamIdToName.get(val) ?? val)
                          : lbFilter === "gender"
                            ? ({ MALE: "Male", FEMALE: "Female", OTHER: "Other", NO_RESPONSE: "Prefer not to say" }[val] ?? val)
                            : val}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Scrollable leaderboard rows */}
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead className="w-10 text-[10px] py-2 pl-4">#</TableHead>
                  <TableHead className="text-[10px] py-2">Player</TableHead>
                  <TableHead className="text-right text-[10px] py-2">Pts</TableHead>
                  <TableHead className="text-right text-[10px] py-2 pr-4">Max</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {simLeaderboard.map((entry) => {
                  const original = effectiveLeaderboard.find(e => e.entryId === entry.entryId)
                  const rankDelta = original ? original.rank - entry.rank : 0 // positive = moved up
                  const scoreChanged = original && original.currentScore !== entry.currentScore
                  const tpsChanged = original && original.tps !== entry.tps

                  return (
                    <TableRow
                      key={entry.entryId}
                      className={tpsChanged ? "bg-primary/3" : ""}
                    >
                      <TableCell className="py-2 pl-4">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs">#{entry.rank}</span>
                          {rankDelta > 0 && (
                            <span className="text-[9px] text-green-500 font-bold">▲{rankDelta}</span>
                          )}
                          {rankDelta < 0 && (
                            <span className="text-[9px] text-red-500 font-bold">▼{Math.abs(rankDelta)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 max-w-[100px]">
                        <span className="text-xs font-medium truncate block">{entry.name}</span>
                      </TableCell>
                      <TableCell className="text-right py-2 font-mono text-xs">
                        <span className={scoreChanged && hasChanges ? "text-primary font-semibold" : ""}>
                          {entry.currentScore}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-2 pr-4 font-mono font-bold text-xs text-primary">
                        {entry.tps}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Footer legend */}
          <div className="px-4 py-2.5 border-t border-border/20 shrink-0 bg-muted/10">
            <div className="flex items-center justify-between text-[9px] text-muted-foreground/60">
              <span># = Rank &nbsp;·&nbsp; Pts = Score &nbsp;·&nbsp; Max = Max Score</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full md:w-80 shrink-0 border-t md:border-t-0 md:border-l border-border/40 bg-card/20 backdrop-blur-sm flex flex-col items-center justify-center px-4 py-12 max-h-[40vh] md:max-h-none">
          <Lock className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground/70 text-center">Leaderboard hidden</p>
          <p className="text-[11px] text-muted-foreground/50 text-center mt-1">
            Rankings will appear once picks are locked and the tournament begins.
          </p>
        </div>
      )}
    </div>
  )
}
