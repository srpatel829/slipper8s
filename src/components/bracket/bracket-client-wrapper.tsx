"use client"

/**
 * BracketClientWrapper — thin client wrapper for the bracket page.
 *
 * Receives pre-built gameSequence from the server (built by the same
 * deterministic buildGameSequence used by the simulator) and renders
 * AdvancingBracket in "simulator" mode so users can click to pick winners.
 */

import { useState } from "react"
import { AdvancingBracket } from "@/components/bracket/advancing-bracket"
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

  function pickGame(gameId: string, winnerId: string) {
    setGamePicks(prev => ({ ...prev, [gameId]: winnerId }))
  }

  return (
    <AdvancingBracket
      teams={teams as Parameters<typeof AdvancingBracket>[0]["teams"]}
      mode="simulator"
      gamePicks={gamePicks}
      onPickGame={pickGame}
      gameSequence={gameSequence}
      gameIndex={gameIndex}
      isPreTournament={gameSequence.length === 0}
      playInSlots={playInSlots}
    />
  )
}
