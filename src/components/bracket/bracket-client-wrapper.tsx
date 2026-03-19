"use client"

/**
 * BracketClientWrapper — thin client wrapper for the bracket page.
 *
 * Receives pre-built gameSequence from the server and renders
 * AdvancingBracket in "simulator" mode so users can click to pick winners.
 *
 * Timeline-aware: when the timeline is scrubbed back, only games completed
 * up to that point appear as locked. Games completed after the timeline
 * position appear as unlocked (as if they haven't happened yet).
 */

import { useState, useMemo } from "react"
import { AdvancingBracket } from "@/components/bracket/advancing-bracket"
import { useTimeline } from "@/components/layout/timeline-provider"
import type { DemoGameEvent } from "@/lib/demo-game-sequence"
import type { PlayInSlotDisplay } from "@/types"

interface TeamData {
  id: string
  name: string
  shortName: string
  seed: number
  region: string
  logoUrl: string | null
  eliminated: boolean
  wins: number
  isPlayIn: boolean
}

interface Props {
  teams: TeamData[]
  gameSequence: DemoGameEvent[]
  gameIndex: number
  playInSlots: PlayInSlotDisplay[]
}

export function BracketClientWrapper({ teams, gameSequence, gameIndex, playInSlots }: Props) {
  const [gamePicks, setGamePicks] = useState<Record<string, string>>({})
  const timeline = useTimeline()

  function pickGame(gameId: string, winnerId: string) {
    setGamePicks(prev => ({ ...prev, [gameId]: winnerId }))
  }

  // When timeline is scrubbed back, override which games appear locked
  const { effectiveSequence, effectiveGameIndex } = useMemo(() => {
    if (!timeline || timeline.isLive) {
      return { effectiveSequence: gameSequence, effectiveGameIndex: gameIndex }
    }

    // Build set of game IDs completed up to the timeline position
    const completedAtPosition = new Set(
      timeline.completedGames
        .filter(g => g.gameIndex <= timeline.currentGameIndex)
        .map(g => g.id)
    )

    // Override gameIndex in the sequence: 0 = locked (completed), 1 = unlocked
    const modified = gameSequence.map(event => {
      if (completedAtPosition.has(event.gameId)) {
        return { ...event, gameIndex: 0 }
      }
      // Mark as unlocked even if originally completed
      return { ...event, gameIndex: 1 }
    })

    return {
      effectiveSequence: modified,
      effectiveGameIndex: completedAtPosition.size > 0 ? 0 : -1,
    }
  }, [gameSequence, gameIndex, timeline])

  return (
    <AdvancingBracket
      teams={teams as Parameters<typeof AdvancingBracket>[0]["teams"]}
      mode="simulator"
      gamePicks={gamePicks}
      onPickGame={pickGame}
      gameSequence={effectiveSequence}
      gameIndex={effectiveGameIndex}
      isPreTournament={effectiveSequence.length === 0}
      playInSlots={playInSlots}
    />
  )
}
