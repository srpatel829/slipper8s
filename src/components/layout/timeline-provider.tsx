"use client"

/**
 * TimelineProvider — Client wrapper that provides global timeline state
 * and renders the TimelineFooter on protected pages.
 *
 * Timeline only appears when there's an active season with game data.
 * During pre-tournament (registration phase), the footer is hidden.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { TimelineFooter } from "./timeline-footer"

interface TimelineState {
  /** Current checkpoint being viewed (-1 = pre-tournament) */
  currentCheckpoint: number
  /** Latest completed checkpoint index */
  latestCheckpoint: number
  /** Whether viewing the live/latest state */
  isLive: boolean
  /** Navigate to a specific checkpoint */
  goToCheckpoint: (index: number) => void
  /** Snap back to live state */
  goLive: () => void
}

const TimelineContext = createContext<TimelineState | null>(null)

export function useTimeline() {
  return useContext(TimelineContext)
}

interface TimelineProviderProps {
  children: ReactNode
  /** The latest completed checkpoint index (from server). -1 = no checkpoints yet */
  latestCompletedCheckpoint?: number
  /** Whether to show the timeline footer (only during/after tournament) */
  showTimeline?: boolean
}

export function TimelineProvider({
  children,
  latestCompletedCheckpoint = -1,
  showTimeline = false,
}: TimelineProviderProps) {
  const [currentCheckpoint, setCurrentCheckpoint] = useState(latestCompletedCheckpoint)
  const [isLive, setIsLive] = useState(true)

  const goToCheckpoint = useCallback((index: number) => {
    setCurrentCheckpoint(index)
    setIsLive(index >= latestCompletedCheckpoint)
  }, [latestCompletedCheckpoint])

  const goLive = useCallback(() => {
    setCurrentCheckpoint(latestCompletedCheckpoint)
    setIsLive(true)
  }, [latestCompletedCheckpoint])

  const value: TimelineState = {
    currentCheckpoint,
    latestCheckpoint: latestCompletedCheckpoint,
    isLive,
    goToCheckpoint,
    goLive,
  }

  return (
    <TimelineContext.Provider value={value}>
      {children}
      {showTimeline && latestCompletedCheckpoint >= 0 && (
        <TimelineFooter
          latestCheckpoint={latestCompletedCheckpoint}
          currentCheckpoint={currentCheckpoint}
          onCheckpointChange={goToCheckpoint}
          isLive={isLive}
          onGoLive={goLive}
        />
      )}
    </TimelineContext.Provider>
  )
}
