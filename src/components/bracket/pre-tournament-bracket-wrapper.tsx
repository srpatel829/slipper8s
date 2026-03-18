"use client"

/**
 * PreTournamentBracketWrapper — Renders TournamentBracket in pre-tournament mode.
 *
 * For play-in seeds, creates synthetic combined team entries ("Team1/Team2")
 * so TournamentBracket shows them inline rather than TBD.
 */

import { useMemo } from "react"
import { TournamentBracket } from "@/components/bracket/tournament-bracket"

interface TeamForBracket {
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

interface PlayInSlotSimple {
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
  teams: TeamForBracket[]
  playInSlots: PlayInSlotSimple[]
}

export function PreTournamentBracketWrapper({ teams, playInSlots }: Props) {
  // Build the team list, replacing play-in teams with synthetic combined entries
  const bracketTeams = useMemo(() => {
    // Start with non-play-in teams
    const result = teams.filter(t => !t.isPlayIn)

    // For each play-in slot, show winner if resolved, otherwise "Team1/Team2"
    for (const slot of playInSlots) {
      if (slot.winnerId && slot.winnerName && slot.winnerShortName) {
        // Play-in resolved — show the winner as a regular team
        result.push({
          id: slot.winnerId,
          name: slot.winnerName,
          shortName: slot.winnerShortName,
          seed: slot.seed,
          region: slot.region,
          logoUrl: slot.winnerLogoUrl,
          eliminated: false,
          wins: 0,
          isPlayIn: false,
          espnId: null,
          conference: null,
        })
      } else {
        // Unresolved — show "Team1/Team2" placeholder
        result.push({
          id: `playin-${slot.id}`,
          name: `${slot.team1Name} / ${slot.team2Name}`,
          shortName: `${slot.team1ShortName}/${slot.team2ShortName}`,
          seed: slot.seed,
          region: slot.region,
          logoUrl: null,
          eliminated: false,
          wins: 0,
          isPlayIn: false,
          espnId: null,
          conference: null,
        })
      }
    }

    return result
  }, [teams, playInSlots])

  return (
    <TournamentBracket
      teams={bracketTeams}
      gameSequence={[]}
      gameIndex={-1}
      isPreTournament={true}
    />
  )
}
