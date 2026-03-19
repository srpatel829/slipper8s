"use client"

/**
 * LiveBracketWrapper — Interactive bracket for the bracket page.
 *
 * Uses AdvancingBracket in "simulator" mode so users can click to pick
 * winners and fill out the bracket. Completed games from the DB are
 * converted to locked game events that can't be changed.
 */

import { useState, useMemo } from "react"
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
  espnId?: string | null
  conference?: string | null
}

interface GameData {
  id: string
  round: number
  region: string | null
  team1: { id: string; name: string; shortName: string; seed: number } | null
  team2: { id: string; name: string; shortName: string; seed: number } | null
  winner: { id: string; name: string; shortName: string; seed: number } | null
  team1Score: number | null
  team2Score: number | null
  isComplete: boolean
}

interface PlayInSlotData {
  id: string
  seed: number
  region: string
  team1ShortName: string
  team2ShortName: string
  team1Name: string
  team2Name: string
  winnerId: string | null
  winnerName: string | null
  winnerShortName: string | null
  winnerLogoUrl: string | null
}

interface Props {
  teams: TeamData[]
  games: GameData[]
  playInSlots: PlayInSlotData[]
}

const ROUND_LABELS: Record<number, string> = {
  1: "Round of 64",
  2: "Round of 32",
  3: "Sweet 16",
  4: "Elite 8",
  5: "Final Four",
  6: "Championship",
}

export function LiveBracketWrapper({ teams, games, playInSlots }: Props) {
  const [gamePicks, setGamePicks] = useState<Record<string, string>>({})

  function pickGame(gameId: string, winnerId: string) {
    setGamePicks(prev => ({ ...prev, [gameId]: winnerId }))
  }

  // Build team list and game sequence from live data
  const { gameSequence, gameIndex, bracketTeams, playInSlotDisplays } = useMemo(() => {
    // Build team list: non-play-in teams + resolved play-in winners or synthetic combined entries
    const teamList: TeamData[] = teams.filter(t => !t.isPlayIn)

    const slotDisplays: PlayInSlotDisplay[] = []

    for (const slot of playInSlots) {
      if (slot.winnerId && slot.winnerName && slot.winnerShortName) {
        teamList.push({
          id: slot.winnerId,
          name: slot.winnerName,
          shortName: slot.winnerShortName,
          seed: slot.seed,
          region: slot.region,
          logoUrl: slot.winnerLogoUrl,
          eliminated: false,
          wins: 0,
          isPlayIn: false,
        })
      } else {
        // Unresolved play-in — show combined name via play-in slot display
        slotDisplays.push({
          id: slot.id,
          seed: slot.seed,
          region: slot.region,
          team1ShortName: slot.team1ShortName,
          team2ShortName: slot.team2ShortName,
          team1LogoUrl: null,
          team2LogoUrl: null,
          winnerId: null,
        })
      }
    }

    // Convert completed games (round > 0) to DemoGameEvent format
    const completedGames = games
      .filter(g => g.round > 0 && g.isComplete && g.winner && g.team1 && g.team2)
      .sort((a, b) => a.round - b.round)

    const sequence: DemoGameEvent[] = completedGames.map((g, i) => {
      const winner = g.winner!
      const loser = g.team1!.id === winner.id ? g.team2! : g.team1!
      const winnerScore = g.team1!.id === winner.id ? (g.team1Score ?? 0) : (g.team2Score ?? 0)
      const loserScore = g.team1!.id === winner.id ? (g.team2Score ?? 0) : (g.team1Score ?? 0)

      return {
        gameIndex: i,
        gameId: g.id,
        round: g.round,
        roundLabel: ROUND_LABELS[g.round] ?? `Round ${g.round}`,
        region: g.region ?? "Unknown",
        winnerId: winner.id,
        loserId: loser.id,
        winnerName: winner.name,
        loserName: loser.name,
        winnerShortName: winner.shortName,
        loserShortName: loser.shortName,
        winnerSeed: winner.seed,
        loserSeed: loser.seed,
        winnerScore,
        loserScore,
        isUpset: loser.seed < winner.seed,
      }
    })

    return {
      gameSequence: sequence,
      gameIndex: sequence.length - 1,
      bracketTeams: teamList,
      playInSlotDisplays: slotDisplays,
    }
  }, [teams, games, playInSlots])

  return (
    <AdvancingBracket
      teams={bracketTeams as Parameters<typeof AdvancingBracket>[0]["teams"]}
      mode="simulator"
      gamePicks={gamePicks}
      onPickGame={pickGame}
      gameSequence={gameSequence}
      gameIndex={gameIndex}
      isPreTournament={gameSequence.length === 0}
      playInSlots={playInSlotDisplays}
    />
  )
}
