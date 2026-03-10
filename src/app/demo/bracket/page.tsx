"use client"

/**
 * Demo Bracket Page — full 64-team tournament bracket visualization.
 * Data comes from DemoContext (timeline-aware, no API calls).
 */

import { GitBranch } from "lucide-react"
import { TournamentBracket } from "@/components/bracket/tournament-bracket"
import { useDemoContext } from "@/lib/demo-context"

export default function DemoBracketPage() {
    const { teamsData, gameSequence, gameIndex, currentGameInfo, roundBoundaries } = useDemoContext()

    // Current round label
    const currentRound = currentGameInfo
        ? currentGameInfo.roundLabel
        : gameIndex < 0
            ? "Pre-Tournament"
            : "Tournament Complete"

    // Count completed games
    const completedGames = gameIndex + 1
    const totalGames = gameSequence.length

    // Last game result summary
    const lastGame = gameIndex >= 0 ? gameSequence[gameIndex] : null

    return (
        <div className="container mx-auto px-4 py-4 max-w-[1800px]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-primary" />
                    <h1 className="text-xl font-bold">Tournament Bracket</h1>
                </div>

                {/* Game progress info */}
                <div className="flex flex-wrap items-center gap-2 sm:ml-4">
                    <div className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-[11px] font-medium text-primary">
                        {currentRound}
                    </div>
                    <div className="px-2.5 py-1 rounded-md bg-muted/60 border border-border/30 text-[11px] text-muted-foreground font-mono">
                        {completedGames} / {totalGames} games
                    </div>
                    {lastGame && (
                        <div className="px-2.5 py-1 rounded-md bg-card/60 border border-border/30 text-[11px] text-muted-foreground">
                            Last: <span className="text-foreground font-medium">
                                #{lastGame.winnerSeed} {lastGame.winnerShortName}
                            </span>
                            {" "}def.{" "}
                            <span>
                                #{lastGame.loserSeed} {lastGame.loserShortName}
                            </span>
                            <span className="ml-1.5 text-muted-foreground/60">({lastGame.winnerScore}–{lastGame.loserScore})</span>
                        </div>
                    )}
                </div>
            </div>

            {/* The bracket */}
            <TournamentBracket
                teams={teamsData}
                gameSequence={gameSequence}
                gameIndex={gameIndex}
                isPreTournament={gameIndex < 0}
            />
        </div>
    )
}
