import { prisma } from "@/lib/prisma"
import { BracketClientWrapper } from "@/components/bracket/bracket-client-wrapper"
import { PreTournamentBracketWrapper } from "@/components/bracket/pre-tournament-bracket-wrapper"
import { buildGameSequence } from "@/lib/build-game-sequence"
import { GitBranch } from "lucide-react"

export const dynamic = "force-dynamic"

const ROUND_NAMES: Record<number, string> = {
  1: "Round of 64",
  2: "Round of 32",
  3: "Sweet 16",
  4: "Elite 8",
  5: "Final Four",
  6: "Championship",
}

export default async function BracketPage() {
  // Get resolved play-in winner IDs so we can include them in the team list
  const resolvedPlayInWinnerIds = (await prisma.playInSlot.findMany({
    where: { winnerId: { not: null } },
    select: { winnerId: true },
  })).map(s => s.winnerId!).filter(Boolean)

  const [teams, games, playInSlots] = await Promise.all([
    prisma.team.findMany({
      orderBy: [{ region: "asc" }, { seed: "asc" }],
    }),
    prisma.tournamentGame.findMany({
      select: {
        id: true,
        round: true,
        region: true,
        team1Id: true,
        team2Id: true,
        winnerId: true,
        team1Score: true,
        team2Score: true,
        isComplete: true,
        startTime: true,
      },
      orderBy: [{ round: "asc" }, { startTime: "asc" }],
    }),
    prisma.playInSlot.findMany({
      include: { team1: true, team2: true, winner: true },
    }),
  ])

  // Mark resolved play-in winners as non-play-in so they appear in the bracket
  const teamsWithResolvedPlayIns = teams.map(t =>
    resolvedPlayInWinnerIds.includes(t.id) ? { ...t, isPlayIn: false } : t
  )

  // Filter out play-in games (round 0) for bracket display purposes
  const tournamentGames = games.filter(g => g.round > 0)

  // Game progress info
  const completedGames = tournamentGames.filter(g => g.isComplete).length
  const totalGames = tournamentGames.length
  const allComplete = totalGames > 0 && completedGames === totalGames

  // Determine current round
  const currentRoundNum = totalGames === 0
    ? 0
    : allComplete
      ? 6
      : Math.min(...games.filter(g => !g.isComplete && g.round > 0).map(g => g.round))
  const currentRound = totalGames === 0
    ? "Pre-Tournament"
    : allComplete
      ? "Tournament Complete"
      : ROUND_NAMES[currentRoundNum] ?? `Round ${currentRoundNum}`

  // Last completed game (include play-in games for the badge)
  const lastGame = [...games]
    .filter(g => g.isComplete && g.winnerId)
    .sort((a, b) => (b.startTime?.getTime() ?? 0) - (a.startTime?.getTime() ?? 0))[0]

  // Look up last game teams for display
  const lastGameDisplay = lastGame ? (() => {
    const winner = teams.find(t => t.id === lastGame.winnerId)
    const team1 = teams.find(t => t.id === lastGame.team1Id)
    const team2 = teams.find(t => t.id === lastGame.team2Id)
    if (!winner || !team1 || !team2) return null
    const loser = winner.id === team1.id ? team2 : team1
    return { winner, loser, team1Score: lastGame.team1Score, team2Score: lastGame.team2Score }
  })() : null

  // No teams seeded yet
  const noTeams = teams.length === 0

  // Build bracket using the same deterministic seed-based logic as the simulator
  const { gameSequence, gameIndex } = buildGameSequence(teamsWithResolvedPlayIns, games)

  return (
    <div className="space-y-4">
      {/* Header with game progress badges */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Tournament Bracket</h1>
        </div>

        {totalGames > 0 && (
          <div className="flex flex-wrap items-center gap-2 sm:ml-4">
            <div className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-[11px] font-medium text-primary">
              {currentRound}
            </div>
            <div className="px-2.5 py-1 rounded-md bg-muted/60 border border-border/30 text-[11px] text-muted-foreground font-mono">
              {completedGames} / {totalGames} games
            </div>
            {lastGameDisplay && (
              <div className="px-2.5 py-1 rounded-md bg-card/60 border border-border/30 text-[11px] text-muted-foreground">
                Last: <span className="text-foreground font-medium">
                  #{lastGameDisplay.winner.seed} {lastGameDisplay.winner.shortName}
                </span>
                {" "}def.{" "}
                <span>
                  #{lastGameDisplay.loser.seed}{" "}
                  {lastGameDisplay.loser.shortName}
                </span>
                {lastGameDisplay.team1Score != null && lastGameDisplay.team2Score != null && (
                  <span className="ml-1.5 text-muted-foreground/60">
                    ({Math.max(lastGameDisplay.team1Score, lastGameDisplay.team2Score)}–{Math.min(lastGameDisplay.team1Score, lastGameDisplay.team2Score)})
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {totalGames === 0 && !noTeams && (
          <div className="flex flex-wrap items-center gap-2 sm:ml-4">
            <div className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              Pre-Tournament
            </div>
            {lastGameDisplay && (
              <div className="px-2.5 py-1 rounded-md bg-card/60 border border-border/30 text-[11px] text-muted-foreground">
                Last: <span className="text-foreground font-medium">
                  #{lastGameDisplay.winner.seed} {lastGameDisplay.winner.shortName}
                </span>
                {" "}def.{" "}
                <span>
                  #{lastGameDisplay.loser.seed}{" "}
                  {lastGameDisplay.loser.shortName}
                </span>
                {lastGameDisplay.team1Score != null && lastGameDisplay.team2Score != null && (
                  <span className="ml-1.5 text-muted-foreground/60">
                    ({Math.max(lastGameDisplay.team1Score, lastGameDisplay.team2Score)}–{Math.min(lastGameDisplay.team1Score, lastGameDisplay.team2Score)})
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {noTeams ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <p className="text-muted-foreground">No bracket data available yet.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            The bracket will populate once the tournament field is announced.
          </p>
        </div>
      ) : tournamentGames.length === 0 ? (
        <PreTournamentBracketWrapper
          teams={teams.map(t => ({
            id: t.id,
            name: t.name,
            shortName: t.shortName,
            seed: t.seed,
            region: t.region,
            logoUrl: t.logoUrl,
            eliminated: t.eliminated,
            wins: t.wins,
            isPlayIn: t.isPlayIn,
            espnId: t.espnId,
            conference: t.conference,
          }))}
          playInSlots={playInSlots.map(s => ({
            id: s.id,
            seed: s.seed,
            region: s.region,
            team1ShortName: s.team1.shortName,
            team2ShortName: s.team2.shortName,
            team1Name: s.team1.name,
            team2Name: s.team2.name,
            winnerId: s.winner?.id ?? null,
            winnerName: s.winner?.name ?? null,
            winnerShortName: s.winner?.shortName ?? null,
            winnerLogoUrl: s.winner?.logoUrl ?? null,
          }))}
        />
      ) : (
        <BracketClientWrapper
          teams={teamsWithResolvedPlayIns.map(t => ({
            id: t.id,
            name: t.name,
            shortName: t.shortName,
            seed: t.seed,
            region: t.region,
            logoUrl: t.logoUrl,
            eliminated: t.eliminated,
            wins: t.wins,
            isPlayIn: t.isPlayIn,
          }))}
          gameSequence={gameSequence}
          gameIndex={gameIndex}
          playInSlots={playInSlots.map(s => ({
            id: s.id,
            seed: s.seed,
            region: s.region,
            team1ShortName: s.team1.shortName,
            team2ShortName: s.team2.shortName,
            team1LogoUrl: s.team1.logoUrl,
            team2LogoUrl: s.team2.logoUrl,
            winnerId: s.winnerId,
          }))}
        />
      )}
    </div>
  )
}
