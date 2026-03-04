"use client"

/**
 * BracketViewer — Region-based bracket display for live data (from DB).
 *
 * Mobile: drill-down by region.
 * Desktop: 2x2 region grid.
 * Shows user's picks highlighted.
 */

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamInfo {
  id: string
  name: string
  shortName: string
  seed: number
  region: string
  logoUrl: string | null
  eliminated: boolean
}

interface GameInfo {
  id: string
  round: number
  region: string | null
  team1: TeamInfo | null
  team2: TeamInfo | null
  winner: { id: string; name: string; shortName: string; seed: number } | null
  team1Score: number | null
  team2Score: number | null
  isComplete: boolean
}

interface BracketViewerProps {
  teams: Array<{
    id: string
    name: string
    shortName: string
    seed: number
    region: string
    logoUrl: string | null
    eliminated: boolean
    wins: number
    isPlayIn: boolean
  }>
  games: GameInfo[]
  regions: string[]
  userPickTeamIds: string[]
}

// ─── Spec seed colors ─────────────────────────────────────────────────────────

function getSeedColor(seed: number): string {
  if (seed <= 4) return "#C0392B"
  if (seed <= 8) return "#E67E22"
  if (seed <= 12) return "#D4AC0D"
  return "#27AE60"
}

const REGION_COLORS: Record<string, string> = {
  South: "#C0392B",
  West: "#2E86C1",
  East: "#27AE60",
  Midwest: "#8E44AD",
}

const ROUND_NAMES: Record<number, string> = {
  1: "Round of 64",
  2: "Round of 32",
  3: "Sweet 16",
  4: "Elite 8",
  5: "Final Four",
  6: "Championship",
}

// ─── Game matchup card ────────────────────────────────────────────────────────

function GameCard({ game, userPickTeamIds }: { game: GameInfo; userPickTeamIds: string[] }) {
  return (
    <div className="bg-card border border-border/60 rounded-lg overflow-hidden text-xs">
      <TeamSlot
        team={game.team1}
        score={game.team1Score}
        isWinner={game.isComplete && game.winner?.id === game.team1?.id}
        isLoser={game.isComplete && game.winner?.id !== game.team1?.id}
        isPick={game.team1 ? userPickTeamIds.includes(game.team1.id) : false}
      />
      <div className="h-px bg-border/40" />
      <TeamSlot
        team={game.team2}
        score={game.team2Score}
        isWinner={game.isComplete && game.winner?.id === game.team2?.id}
        isLoser={game.isComplete && game.winner?.id !== game.team2?.id}
        isPick={game.team2 ? userPickTeamIds.includes(game.team2.id) : false}
      />
    </div>
  )
}

function TeamSlot({
  team,
  score,
  isWinner,
  isLoser,
  isPick,
}: {
  team: TeamInfo | null
  score: number | null
  isWinner: boolean
  isLoser: boolean
  isPick: boolean
}) {
  if (!team) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 h-7 bg-muted/20">
        <span className="text-[10px] text-muted-foreground/40 font-mono w-4">—</span>
        <span className="text-muted-foreground/40 text-[10px]">TBD</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 h-7 transition-colors",
        isWinner && "bg-green-500/10",
        isLoser && "bg-muted/30 opacity-50",
        isPick && "ring-1 ring-primary/50 ring-inset"
      )}
    >
      <span
        className="text-[9px] font-bold w-4 text-center rounded text-white px-0.5"
        style={{ backgroundColor: getSeedColor(team.seed) }}
      >
        {team.seed}
      </span>
      {team.logoUrl ? (
        <img src={team.logoUrl} alt="" className={cn("h-3.5 w-3.5 object-contain", isLoser && "grayscale")} />
      ) : null}
      <span className={cn(
        "flex-1 truncate text-[11px] font-medium",
        isWinner && "text-green-400",
        isLoser && "text-muted-foreground line-through"
      )}>
        {team.shortName}
      </span>
      {score !== null && (
        <span className={cn("font-mono text-[10px] tabular-nums", isWinner ? "font-bold" : "text-muted-foreground")}>
          {score}
        </span>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BracketViewer({ teams, games, regions, userPickTeamIds }: BracketViewerProps) {
  const [activeRegion, setActiveRegion] = useState(regions[0] ?? "East")

  // Group games by round for a region
  function gamesForRegion(region: string) {
    return games.filter(g => g.region === region)
  }

  function gamesForRound(regionGames: GameInfo[], round: number) {
    return regionGames.filter(g => g.round === round)
  }

  // Final Four and Championship (no region)
  const finalFourGames = games.filter(g => g.round === 5)
  const championshipGames = games.filter(g => g.round === 6)

  // Available rounds in region games (usually 1-4)
  const regionRounds = [1, 2, 3, 4]

  function RegionBracket({ region }: { region: string }) {
    const regionGames = gamesForRegion(region)
    const regionColor = REGION_COLORS[region] ?? "#888"

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: regionColor }} />
          <h3 className="text-sm font-bold">{region} Region</h3>
          <span className="text-[10px] text-muted-foreground">
            {regionGames.filter(g => g.isComplete).length}/{regionGames.length} complete
          </span>
        </div>

        {regionRounds.map(round => {
          const roundGames = gamesForRound(regionGames, round)
          if (roundGames.length === 0) return null

          return (
            <div key={round}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {ROUND_NAMES[round]}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {roundGames.map(game => (
                  <GameCard key={game.id} game={game} userPickTeamIds={userPickTeamIds} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      {userPickTeamIds.length > 0 && (
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded border border-primary/50 bg-primary/5" />
            <span>Your pick</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded bg-green-500/10 border border-green-500/20" />
            <span>Winner</span>
          </div>
        </div>
      )}

      {/* Mobile: tabs per region */}
      <div className="md:hidden">
        <Tabs value={activeRegion} onValueChange={setActiveRegion}>
          <TabsList className="w-full grid grid-cols-4">
            {regions.map(region => (
              <TabsTrigger key={region} value={region} className="text-xs">
                {region.slice(0, 4)}
              </TabsTrigger>
            ))}
          </TabsList>
          {regions.map(region => (
            <TabsContent key={region} value={region}>
              <RegionBracket region={region} />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Desktop: 2x2 grid */}
      <div className="hidden md:grid grid-cols-2 gap-6">
        {regions.map(region => (
          <RegionBracket key={region} region={region} />
        ))}
      </div>

      {/* Final Four + Championship */}
      {(finalFourGames.length > 0 || championshipGames.length > 0) && (
        <div className="border-t border-border pt-6">
          <h3 className="text-sm font-bold mb-3">Final Four & Championship</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl">
            {finalFourGames.map(game => (
              <GameCard key={game.id} game={game} userPickTeamIds={userPickTeamIds} />
            ))}
            {championshipGames.map(game => (
              <GameCard key={game.id} game={game} userPickTeamIds={userPickTeamIds} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
