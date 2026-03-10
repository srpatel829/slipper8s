"use client"

/**
 * Demo Scores — reuses real ScoresGrid with demo game data.
 */

import { ScoresGrid } from "@/components/scores/scores-grid"
import { useDemoContext } from "@/lib/demo-context"

const ROUND_NAMES: Record<number, string> = {
  1: "Round of 64",
  2: "Round of 32",
  3: "Sweet 16",
  4: "Elite 8",
  5: "Final Four",
  6: "Championship",
}

export default function DemoScoresPage() {
  const { scoresData, gameIndex } = useDemoContext()
  const isPreTournament = gameIndex < 0

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <ScoresGrid initialGames={scoresData} roundNames={ROUND_NAMES} demoMode isPreTournament={isPreTournament} />
    </div>
  )
}
