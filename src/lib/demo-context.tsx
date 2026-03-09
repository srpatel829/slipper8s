"use client"

/**
 * DemoProvider — React context that powers the entire demo mode.
 *
 * Holds timeline state (game-by-game), persona, picks, and settings.
 * Computes all data shapes the real app's components expect so they can
 * be reused unchanged with a `demoMode` prop.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react"
import type { DemoTeam, DemoUser } from "@/lib/demo-data"
import type { LeaderboardEntry, LiveGameData, HistorySnapshot } from "@/types"
import type { Role } from "@/generated/prisma"
import { getTournamentData, AVAILABLE_YEARS, getAvailableTournaments } from "@/lib/tournament-data"
import { DEMO_USER_SETS } from "@/lib/demo-data"
import { computeOptimal8 } from "@/lib/scoring"
import type { TeamBracketInfo } from "@/lib/bracket-ppr"
import {
  generateDemoGameSequence,
  computeLeaderboardAtGame,
  computeGamesAsLiveData,
  computeTeamsForPicks,
  computeStateAtGame,
  getRoundBoundaries,
  getDayCheckpoints,
  type DemoGameEvent,
  type RoundBoundary,
  type DayCheckpoint,
} from "@/lib/demo-game-sequence"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DemoPersona {
  userId: string
  name: string
  email: string
  role: Role
  isPaid: boolean
}

interface DemoSettings {
  picksDeadline: string | null
  payoutStructure: Array<{ place: number; label: string; amount: string }>
  defaultCharities: Array<{ name: string; url?: string }>
}

interface DemoContextValue {
  // Tournament year
  selectedYear: number
  setSelectedYear: (year: number) => void
  availableTournaments: Array<{ year: number; label: string }>

  // Timeline (checkpoint-based: 11 positions)
  gameIndex: number
  totalGames: number
  setGameIndex: (idx: number) => void
  checkpointIndex: number
  totalCheckpoints: number
  setCheckpointIndex: (idx: number) => void
  checkpoints: DayCheckpoint[]
  stepForward: () => void
  stepBack: () => void
  jumpToNextRound: () => void
  jumpToPrevRound: () => void
  isPlaying: boolean
  togglePlay: () => void
  playSpeed: number
  setPlaySpeed: (ms: number) => void

  // Persona
  currentPersona: DemoPersona
  setPersona: (persona: DemoPersona) => void
  availablePersonas: DemoPersona[]

  // Picks
  demoUserPicks: Map<string, string[]>
  setDemoUserPicks: (userId: string, picks: string[]) => void

  // Settings
  demoSettings: DemoSettings
  updateDemoSettings: (settings: Partial<DemoSettings>) => void

  // Users (mutable for admin)
  demoUsers: DemoUser[]
  updateDemoUser: (userId: string, patch: { isPaid?: boolean; role?: Role }) => void

  // Computed data (shapes matching real app components)
  leaderboardData: LeaderboardEntry[]
  scoresData: LiveGameData[]
  teamsData: ReturnType<typeof computeTeamsForPicks>
  aliveTeams: ReturnType<typeof computeTeamsForPicks>
  gameSequence: DemoGameEvent[]
  roundBoundaries: RoundBoundary[]
  currentGameInfo: DemoGameEvent | null
  leaderboardHistory: HistorySnapshot[]

  // Precomputed chart data
  optimal8RollingScores: number[]
  optimal8FinalScores: number[]

  // Fake session for Navbar
  session: {
    user: {
      id: string
      name: string
      email: string
      role: Role
      isPaid: boolean
      image: null
    }
    expires: string
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const DemoContext = createContext<DemoContextValue | null>(null)

export function useDemoContext(): DemoContextValue {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error("useDemoContext must be used within <DemoProvider>")
  return ctx
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function DemoProvider({ children }: { children: ReactNode }) {
  // ── Tournament year ──
  const [selectedYear, setSelectedYearRaw] = useState(AVAILABLE_YEARS[0])

  // ── Load data for selected year ──
  const tournamentData = useMemo(() => getTournamentData(selectedYear), [selectedYear])
  const gameSequence = useMemo(
    () => generateDemoGameSequence(tournamentData.teams),
    [tournamentData]
  )
  const roundBoundaries = useMemo(() => getRoundBoundaries(gameSequence), [gameSequence])
  const checkpoints = useMemo(() => getDayCheckpoints(gameSequence), [gameSequence])
  const totalGames = gameSequence.length
  const totalCheckpoints = checkpoints.length

  // ── User set (always real 2025 data) ──
  const activeUserSet = useMemo(() => DEMO_USER_SETS.real_2025.users, [])

  // ── Timeline state ──
  const [gameIndex, setGameIndexRaw] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState(1000)

  // ── Persona state ──
  const availablePersonas = useMemo<DemoPersona[]>(() => {
    const userPersonas: DemoPersona[] = activeUserSet.map(u => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      role: "USER" as Role,
      isPaid: u.isPaid,
    }))
    return [
      ...userPersonas,
      { userId: "demo-admin", name: "Demo Admin", email: "admin@demo.test", role: "ADMIN" as Role, isPaid: true },
      { userId: "demo-superadmin", name: "Super Admin", email: "superadmin@demo.test", role: "SUPERADMIN" as Role, isPaid: true },
    ]
  }, [activeUserSet])

  const [currentPersona, setCurrentPersona] = useState<DemoPersona>(
    () => availablePersonas.find(p => p.userId === "user-you") ?? availablePersonas[0]
  )

  // ── Picks state ──
  const [demoUserPicks, setDemoUserPicksMap] = useState<Map<string, string[]>>(
    () => new Map(activeUserSet.map(u => [u.id, [...u.picks]]))
  )

  // ── Mutable demo users (for admin edits) ──
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>(() => [...activeUserSet])

  // ── Settings state ──
  const [demoSettings, setDemoSettings] = useState<DemoSettings>({
    picksDeadline: null,
    payoutStructure: [
      { place: 1, label: "1st Place", amount: "$200" },
      { place: 2, label: "2nd Place", amount: "$100" },
      { place: 3, label: "3rd Place", amount: "$50" },
      { place: 4, label: "4th Place", amount: "$25" },
    ],
    defaultCharities: [],
  })

  // ── Year change resets everything ──
  const setSelectedYear = useCallback((year: number) => {
    setSelectedYearRaw(year)
    setGameIndexRaw(-1)
    setIsPlaying(false)
    // Data will recompute via useMemo; picks reset in effect below
  }, [])

  // Reset picks and users when tournament data or user set changes
  useEffect(() => {
    setDemoUserPicksMap(new Map(activeUserSet.map(u => [u.id, [...u.picks]])))
    setDemoUsers([...activeUserSet])
    const youPersona = activeUserSet.find(u => u.id === "user-you")

    // If current persona corresponds to a user that might not exist in the new set, adjust it
    setCurrentPersona(prev => {
      // preserve non-USER roles (admins)
      if (prev.role !== "USER") return prev;

      // try to find the previous user in the new set
      const existsInNewSet = activeUserSet.find(u => u.id === prev.userId)
      if (existsInNewSet) {
        return {
          userId: existsInNewSet.id,
          name: existsInNewSet.name,
          email: existsInNewSet.email,
          role: "USER" as Role,
          isPaid: existsInNewSet.isPaid
        }
      }

      // fallback to "you" or the first available
      if (youPersona) {
        return {
          userId: youPersona.id,
          name: youPersona.name,
          email: youPersona.email,
          role: "USER" as Role,
          isPaid: youPersona.isPaid,
        }
      }

      const first = activeUserSet[0]
      return {
        userId: first.id,
        name: first.name,
        email: first.email,
        role: "USER" as Role,
        isPaid: first.isPaid
      }
    })
  }, [activeUserSet])

  // ── Timeline methods ──
  const setGameIndex = useCallback(
    (idx: number) => setGameIndexRaw(Math.max(-1, Math.min(totalGames - 1, idx))),
    [totalGames]
  )

  // Derive checkpointIndex from current gameIndex
  const checkpointIndex = useMemo(() => {
    for (let i = checkpoints.length - 1; i >= 0; i--) {
      if (gameIndex >= checkpoints[i].lastGameIndex) return i
    }
    return 0
  }, [gameIndex, checkpoints])

  // Set gameIndex from checkpoint position
  const setCheckpointIndex = useCallback((cpIdx: number) => {
    const clamped = Math.max(0, Math.min(totalCheckpoints - 1, cpIdx))
    const cp = checkpoints[clamped]
    if (cp) setGameIndexRaw(cp.lastGameIndex)
  }, [checkpoints, totalCheckpoints])

  // Single arrow: step forward/back by 1 game
  const stepForward = useCallback(() => {
    setGameIndex(gameIndex + 1)
  }, [gameIndex, setGameIndex])

  const stepBack = useCallback(() => {
    setGameIndex(gameIndex - 1)
  }, [gameIndex, setGameIndex])

  const togglePlay = useCallback(() => setIsPlaying(p => !p), [])

  // Double arrow: jump to next/prev checkpoint
  const jumpToNextRound = useCallback(() => {
    setCheckpointIndex(checkpointIndex + 1)
  }, [checkpointIndex, setCheckpointIndex])

  const jumpToPrevRound = useCallback(() => {
    setCheckpointIndex(checkpointIndex - 1)
  }, [checkpointIndex, setCheckpointIndex])

  // ── Auto-advance (checkpoint by checkpoint) ──
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const checkpointIndexRef = useRef(checkpointIndex)
  checkpointIndexRef.current = checkpointIndex

  useEffect(() => {
    if (playIntervalRef.current) clearInterval(playIntervalRef.current)
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        const nextCp = checkpointIndexRef.current + 1
        if (nextCp >= totalCheckpoints) {
          setIsPlaying(false)
          return
        }
        const cp = checkpoints[nextCp]
        if (cp) setGameIndexRaw(cp.lastGameIndex)
      }, playSpeed)
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current)
    }
  }, [isPlaying, playSpeed, totalCheckpoints, checkpoints])

  // ── Picks methods ──
  const setDemoUserPicks = useCallback((userId: string, picks: string[]) => {
    setDemoUserPicksMap(prev => {
      const next = new Map(prev)
      next.set(userId, picks)
      return next
    })
  }, [])

  // ── Settings methods ──
  const updateDemoSettings = useCallback((patch: Partial<DemoSettings>) => {
    setDemoSettings(prev => ({ ...prev, ...patch }))
  }, [])

  // ── User admin methods ──
  const updateDemoUser = useCallback((userId: string, patch: { isPaid?: boolean; role?: Role }) => {
    setDemoUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, ...patch } : u))
    )
  }, [])

  // ── Computed data ──
  const leaderboardDataRaw = useMemo(
    () => computeLeaderboardAtGame(tournamentData.teams, demoUsers, gameSequence, gameIndex, demoUserPicks),
    [tournamentData.teams, demoUsers, gameSequence, gameIndex, demoUserPicks]
  )

  // Compute rankChange by comparing with previous game's leaderboard
  // When gameIndex=0 (first game), compare against pre-tournament (gameIndex=-1)
  const leaderboardData = useMemo(() => {
    if (gameIndex < 0) return leaderboardDataRaw
    const prevLeaderboard = computeLeaderboardAtGame(
      tournamentData.teams, demoUsers, gameSequence, gameIndex - 1, demoUserPicks
    )
    const prevRankMap = new Map(prevLeaderboard.map(e => [e.userId, e.rank]))
    return leaderboardDataRaw.map(entry => ({
      ...entry,
      rankChange: prevRankMap.has(entry.userId)
        ? (prevRankMap.get(entry.userId)! - entry.rank) // positive = moved up
        : null,
    }))
  }, [leaderboardDataRaw, gameIndex, tournamentData.teams, demoUsers, gameSequence, demoUserPicks])

  const scoresData = useMemo(
    () => computeGamesAsLiveData(tournamentData.teams, gameSequence, gameIndex),
    [tournamentData.teams, gameSequence, gameIndex]
  )

  const teamsData = useMemo(
    () => computeTeamsForPicks(tournamentData.teams, gameSequence, gameIndex),
    [tournamentData.teams, gameSequence, gameIndex]
  )

  const aliveTeams = useMemo(
    () => teamsData.filter(t => !t.eliminated),
    [teamsData]
  )

  const currentGameInfo = useMemo(
    () => (gameIndex >= 0 && gameIndex < gameSequence.length ? gameSequence[gameIndex] : null),
    [gameIndex, gameSequence]
  )

  // ── Leaderboard history (precomputed for chart) ──
  const leaderboardHistory = useMemo(() => {
    const history: HistorySnapshot[] = []
    for (let i = 0; i < gameSequence.length; i++) {
      const g = gameSequence[i]
      const entries = computeLeaderboardAtGame(tournamentData.teams, demoUsers, gameSequence, i, demoUserPicks)

      history.push({
        gameIndex: i,
        gameLabel: `#${g.winnerSeed} ${g.winnerShortName} def. #${g.loserSeed} ${g.loserShortName}`,
        roundLabel: g.roundLabel,
        entries,
      })
    }
    return history
  }, [tournamentData.teams, demoUsers, gameSequence, demoUserPicks])

  // ── Optimal 8 Rolling scores (one per game) ──
  const optimal8RollingScores = useMemo(() => {
    return leaderboardHistory.map(snap => {
      const teamScores = new Map<string, number>()
      for (const entry of snap.entries) {
        for (const pick of entry.picks) {
          if (pick.seed > 0 && !pick.isPlayIn) {
            const score = pick.seed * pick.wins
            const existing = teamScores.get(pick.teamId) ?? 0
            if (score > existing) teamScores.set(pick.teamId, score)
          }
        }
      }
      const top8 = [...teamScores.values()].sort((a, b) => b - a).slice(0, 8)
      return top8.reduce((s, v) => s + v, 0)
    })
  }, [leaderboardHistory])

  // ── Optimal 8 Final (hindsight) — fixed team IDs scored at each game ──
  const optimal8FinalData = useMemo(() => {
    if (gameSequence.length === 0) return { teamIds: [] as string[], seedMap: {} as Record<string, number> }
    const finalState = computeStateAtGame(gameSequence, gameSequence.length - 1)
    const scored = tournamentData.teams
      .filter(t => !t.isPlayIn)
      .map(t => {
        const state = finalState.get(t.id) ?? { wins: 0, eliminated: false }
        return { id: t.id, seed: t.seed, score: t.seed * state.wins }
      })
      .sort((a, b) => b.score - a.score || a.seed - b.seed)
      .slice(0, 8)
    const seedMap: Record<string, number> = {}
    for (const t of scored) seedMap[t.id] = t.seed
    return { teamIds: scored.map(t => t.id), seedMap }
  }, [tournamentData.teams, gameSequence])

  const optimal8FinalScores = useMemo(() => {
    if (!optimal8FinalData.teamIds.length || gameSequence.length === 0) return []
    return gameSequence.map((_, i) => {
      const state = computeStateAtGame(gameSequence, i)
      return optimal8FinalData.teamIds.reduce((sum, teamId) => {
        const seed = optimal8FinalData.seedMap[teamId] ?? 0
        const wins = state.get(teamId)?.wins ?? 0
        return sum + seed * wins
      }, 0)
    })
  }, [optimal8FinalData, gameSequence])

  // ── Fake session ──
  const [sessionExpires] = useState(() => new Date(Date.now() + 86400000).toISOString())
  const session = useMemo(() => ({
    user: {
      id: currentPersona.userId,
      name: currentPersona.name,
      email: currentPersona.email,
      role: currentPersona.role,
      isPaid: currentPersona.isPaid,
      image: null,
    },
    expires: sessionExpires,
  }), [currentPersona, sessionExpires])

  const availableTournaments = useMemo(() => getAvailableTournaments(), [])

  // ── Context value ──
  const value: DemoContextValue = {
    selectedYear,
    setSelectedYear,
    availableTournaments,
    gameIndex,
    totalGames,
    setGameIndex,
    checkpointIndex,
    totalCheckpoints,
    setCheckpointIndex,
    checkpoints,
    stepForward,
    stepBack,
    jumpToNextRound,
    jumpToPrevRound,
    isPlaying,
    togglePlay,
    playSpeed,
    setPlaySpeed,
    currentPersona,
    setPersona: setCurrentPersona,
    availablePersonas,
    demoUserPicks,
    setDemoUserPicks,
    demoSettings,
    updateDemoSettings,
    demoUsers,
    updateDemoUser,
    leaderboardData,
    scoresData,
    teamsData,
    aliveTeams,
    gameSequence,
    roundBoundaries,
    currentGameInfo,
    leaderboardHistory,
    optimal8RollingScores,
    optimal8FinalScores,
    session,
  }

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}
