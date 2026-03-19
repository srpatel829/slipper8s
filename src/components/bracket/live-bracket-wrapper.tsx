"use client"

/**
 * LiveBracketWrapper — Renders TournamentBracket with live game data.
 *
 * Converts DB TournamentGame records into DemoGameEvent[] format
 * so TournamentBracket can render them with the same tree bracket layout
 * used by the simulator.
 */

import { useMemo } from "react"
import { TournamentBracket } from "@/components/bracket/tournament-bracket"
import type { DemoGameEvent } from "@/lib/demo-game-sequence"

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
  userPickTeamIds: string[]
}

const ROUND_LABELS: Record<number, string> = {
  1: "Round of 64",
  2: "Round of 32",
  3: "Sweet 16",
  4: "Elite 8",
  5: "Final Four",
  6: "Championship",
}

export function LiveBracketWrapper({ teams, games, playInSlots, userPickTeamIds }: Props) {
  // Convert completed DB games into DemoGameEvent[] for TournamentBracket
  const { gameSequence, gameIndex, bracketTeams } = useMemo(() => {
    // Build team list: non-play-in teams + resolved play-in winners or synthetic combined entries
    const teamList: TeamData[] = teams.filter(t => !t.isPlayIn)

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
        // Unresolved play-in — show combined name
        teamList.push({
          id: `playin-${slot.id}`,
          name: `${slot.team1Name}/${slot.team2Name}`,
          shortName: `${slot.team1ShortName}/${slot.team2ShortName}`,
          seed: slot.seed,
          region: slot.region,
          logoUrl: null,
          eliminated: false,
          wins: 0,
          isPlayIn: false,
        })
      }
    }

    // Convert completed games (round > 0) to DemoGameEvent format
    const completedGames = games
      .filter(g => g.round > 0 && g.isComplete && g.winner && g.team1 && g.team2)
      .sort((a, b) => a.round - b.round) // sort by round so state computes correctly

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
    }
  }, [teams, games, playInSlots])

  return (
    <TournamentBracket
      teams={bracketTeams}
      gameSequence={gameSequence}
      gameIndex={gameIndex}
      isPreTournament={gameSequence.length === 0}
      userPickTeamIds={userPickTeamIds}
    />
  )
}
