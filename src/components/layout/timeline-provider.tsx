"use client"

/**
 * TimelineProvider — Client wrapper that provides global timeline state
 * and renders the TimelineFooter on protected pages.
 *
 * Supports both checkpoint-level and game-level navigation.
 * The timeline appears when the season is ACTIVE or COMPLETED.
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react"
import { TimelineFooter } from "./timeline-footer"

// ── Checkpoint-to-game mapping ──────────────────────────────────────────────

/**
 * Given a checkpoint index and the list of completed games,
 * find the game index that corresponds to the END of that checkpoint.
 * For pre-tournament (checkpoint 0), returns -1.
 */
function checkpointToGameIndex(
  checkpointIndex: number,
  completedGames: CompletedGameInfo[],
  checkpointGameBoundaries: Map<number, number>,
): number {
  if (checkpointIndex <= 0) return -1
  return checkpointGameBoundaries.get(checkpointIndex) ?? -1
}

/**
 * Given a game index, find which checkpoint it belongs to.
 * Returns the checkpoint index (0-10) that this game falls under.
 */
function gameIndexToCheckpoint(
  gameIdx: number,
  checkpointGameBoundaries: Map<number, number>,
): number {
  if (gameIdx < 0) return 0
  // Find the highest checkpoint whose boundary is >= this game index
  let cp = 0
  for (const [cpIdx, boundaryGameIdx] of checkpointGameBoundaries) {
    if (gameIdx <= boundaryGameIdx && cpIdx > cp) {
      cp = cpIdx
    }
  }
  // If game is beyond all boundaries, use the latest
  for (const [cpIdx, boundaryGameIdx] of checkpointGameBoundaries) {
    if (gameIdx > boundaryGameIdx && cpIdx >= cp) {
      // Game is past this checkpoint, so it's in a later one
    }
  }
  // Simpler: walk checkpoints and find the one this game is within
  const sortedBoundaries = [...checkpointGameBoundaries.entries()].sort((a, b) => a[0] - b[0])
  for (const [cpIdx, boundaryGameIdx] of sortedBoundaries) {
    if (gameIdx <= boundaryGameIdx) return cpIdx
  }
  return sortedBoundaries.length > 0 ? sortedBoundaries[sortedBoundaries.length - 1][0] : 0
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface CompletedGameInfo {
  id: string
  gameIndex: number // 0-based sequential order
  round: number
}

interface TimelineState {
  /** Current game index being viewed (-1 = pre-tournament) */
  currentGameIndex: number
  /** Latest completed game index */
  latestGameIndex: number
  /** Current checkpoint (0-10) */
  currentCheckpoint: number
  /** Latest completed checkpoint (0-10) */
  latestCheckpoint: number
  /** Whether viewing the live/latest state */
  isLive: boolean
  /** Total number of completed games */
  totalCompletedGames: number
  /** The game ID at the current position (null if pre-tournament) */
  currentGameId: string | null
  /** Navigate to a specific checkpoint */
  goToCheckpoint: (index: number) => void
  /** Step forward or back by one game */
  stepGame: (direction: 1 | -1) => void
  /** Snap back to live state */
  goLive: () => void
  /** List of completed games in order */
  completedGames: CompletedGameInfo[]
}

const TimelineContext = createContext<TimelineState | null>(null)

export function useTimeline() {
  return useContext(TimelineContext)
}

interface TimelineProviderProps {
  children: ReactNode
  /** The latest completed checkpoint index (from server, 0-10). -1 = no checkpoints */
  latestCompletedCheckpoint?: number
  /** Whether to show the timeline footer */
  showTimeline?: boolean
  /** Ordered list of completed game IDs with their round info */
  completedGames?: CompletedGameInfo[]
  /** Map of checkpoint index → last game index in that checkpoint */
  checkpointBoundaries?: Record<number, number>
}

export function TimelineProvider({
  children,
  latestCompletedCheckpoint = -1,
  showTimeline = false,
  completedGames = [],
  checkpointBoundaries = {},
}: TimelineProviderProps) {
  const latestGameIndex = completedGames.length > 0
    ? completedGames[completedGames.length - 1].gameIndex
    : -1

  const [currentGameIndex, setCurrentGameIndex] = useState(latestGameIndex)
  const [isLive, setIsLive] = useState(true)

  const boundariesMap = useMemo(
    () => new Map(Object.entries(checkpointBoundaries).map(([k, v]) => [parseInt(k), v])),
    [checkpointBoundaries],
  )

  // Derive current checkpoint from current game index
  const currentCheckpoint = useMemo(() => {
    if (isLive) return latestCompletedCheckpoint
    if (currentGameIndex < 0) return 0
    return gameIndexToCheckpoint(currentGameIndex, boundariesMap)
  }, [currentGameIndex, isLive, latestCompletedCheckpoint, boundariesMap])

  const goToCheckpoint = useCallback((cpIndex: number) => {
    if (cpIndex >= latestCompletedCheckpoint) {
      // Going to latest checkpoint = going live
      setCurrentGameIndex(latestGameIndex)
      setIsLive(true)
    } else {
      const targetGameIndex = checkpointToGameIndex(cpIndex, completedGames, boundariesMap)
      setCurrentGameIndex(targetGameIndex)
      setIsLive(false)
    }
  }, [latestCompletedCheckpoint, latestGameIndex, completedGames, boundariesMap])

  const stepGame = useCallback((direction: 1 | -1) => {
    if (direction === -1) {
      // Step back
      if (isLive) {
        // Going from live to the second-to-last game
        if (completedGames.length >= 2) {
          setCurrentGameIndex(completedGames[completedGames.length - 2].gameIndex)
          setIsLive(false)
        } else if (completedGames.length === 1) {
          setCurrentGameIndex(-1) // Pre-tournament
          setIsLive(false)
        }
      } else {
        // Find current position in completedGames and step back
        const idx = completedGames.findIndex(g => g.gameIndex === currentGameIndex)
        if (idx > 0) {
          setCurrentGameIndex(completedGames[idx - 1].gameIndex)
        } else {
          setCurrentGameIndex(-1) // Pre-tournament
        }
      }
    } else {
      // Step forward
      if (currentGameIndex < 0 && completedGames.length > 0) {
        setCurrentGameIndex(completedGames[0].gameIndex)
      } else {
        const idx = completedGames.findIndex(g => g.gameIndex === currentGameIndex)
        if (idx >= 0 && idx < completedGames.length - 1) {
          setCurrentGameIndex(completedGames[idx + 1].gameIndex)
        } else if (idx === completedGames.length - 1) {
          // We're at the last game, go live
          setIsLive(true)
        }
      }
    }
  }, [isLive, currentGameIndex, completedGames])

  const goLive = useCallback(() => {
    setCurrentGameIndex(latestGameIndex)
    setIsLive(true)
  }, [latestGameIndex])

  const currentGameId = useMemo(() => {
    if (isLive) return completedGames.length > 0 ? completedGames[completedGames.length - 1].id : null
    if (currentGameIndex < 0) return null
    return completedGames.find(g => g.gameIndex === currentGameIndex)?.id ?? null
  }, [isLive, currentGameIndex, completedGames])

  const value: TimelineState = {
    currentGameIndex: isLive ? latestGameIndex : currentGameIndex,
    latestGameIndex,
    currentCheckpoint,
    latestCheckpoint: latestCompletedCheckpoint,
    isLive,
    totalCompletedGames: completedGames.length,
    currentGameId,
    goToCheckpoint,
    stepGame,
    goLive,
    completedGames,
  }

  return (
    <TimelineContext.Provider value={value}>
      {children}
      {showTimeline && (
        <TimelineFooter
          latestCheckpoint={latestCompletedCheckpoint}
          currentCheckpoint={currentCheckpoint}
          onCheckpointChange={goToCheckpoint}
          isLive={isLive}
          onGoLive={goLive}
          currentGameIndex={isLive ? latestGameIndex : currentGameIndex}
          latestGameIndex={latestGameIndex}
          onGameStep={stepGame}
          totalCompletedGames={completedGames.length}
        />
      )}
    </TimelineContext.Provider>
  )
}
