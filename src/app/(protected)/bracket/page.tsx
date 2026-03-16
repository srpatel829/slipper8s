import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { BracketViewer } from "@/components/bracket/bracket-viewer"
import { PreTournamentBracket } from "@/components/bracket/pre-tournament-bracket"
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
  const session = await auth()

  // Get teams, games, and play-in slots from database
  const [teams, games, playInSlots] = await Promise.all([
    prisma.team.findMany({
      orderBy: [{ region: "asc" }, { seed: "asc" }],
    }),
    prisma.tournamentGame.findMany({
      include: {
        team1: { select: { id: true, name: true, shortName: true, seed: true, region: true, logoUrl: true, eliminated: true } },
        team2: { select: { id: true, name: true, shortName: true, seed: true, region: true, logoUrl: true, eliminated: true } },
        winner: { select: { id: true, name: true, shortName: true, seed: true } },
      },
      orderBy: [{ round: "asc" }, { startTime: "asc" }],
    }),
    prisma.playInSlot.findMany({
      include: {
        team1: true,
        team2: true,
      },
    }),
  ])

  // Get user's picks to highlight on the bracket
  let userPickTeamIds: string[] = []
  if (session?.user) {
    const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
    if (settings?.currentSeasonId) {
      const entry = await prisma.entry.findFirst({
        where: { userId: session.user.id, seasonId: settings.currentSeasonId },
        include: { entryPicks: { select: { teamId: true } } },
        orderBy: { entryNumber: "asc" },
      })
      if (entry) {
        userPickTeamIds = entry.entryPicks
          .filter(ep => ep.teamId)
          .map(ep => ep.teamId!)
      }
    }
  }

  const regions = [...new Set(teams.map(t => t.region))].sort()

  // Game progress info
  const completedGames = games.filter(g => g.isComplete).length
  const totalGames = games.length
  const allComplete = totalGames > 0 && completedGames === totalGames

  // Determine current round
  const currentRoundNum = totalGames === 0
    ? 0
    : allComplete
      ? 6
      : Math.min(...games.filter(g => !g.isComplete).map(g => g.round))
  const currentRound = totalGames === 0
    ? "Pre-Tournament"
    : allComplete
      ? "Tournament Complete"
      : ROUND_NAMES[currentRoundNum] ?? `Round ${currentRoundNum}`

  // Last completed game
  const lastGame = [...games]
    .filter(g => g.isComplete && g.winner)
    .sort((a, b) => (b.startTime?.getTime() ?? 0) - (a.startTime?.getTime() ?? 0))[0]

  // No teams seeded yet
  const noTeams = teams.length === 0

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
            {lastGame?.winner && lastGame.team1 && lastGame.team2 && (
              <div className="px-2.5 py-1 rounded-md bg-card/60 border border-border/30 text-[11px] text-muted-foreground">
                Last: <span className="text-foreground font-medium">
                  #{lastGame.winner.seed} {lastGame.winner.shortName}
                </span>
                {" "}def.{" "}
                <span>
                  #{lastGame.winner.id === lastGame.team1.id ? lastGame.team2.seed : lastGame.team1.seed}{" "}
                  {lastGame.winner.id === lastGame.team1.id ? lastGame.team2.shortName : lastGame.team1.shortName}
                </span>
                {lastGame.team1Score != null && lastGame.team2Score != null && (
                  <span className="ml-1.5 text-muted-foreground/60">
                    ({Math.max(lastGame.team1Score, lastGame.team2Score)}–{Math.min(lastGame.team1Score, lastGame.team2Score)})
                  </span>
                )}
              </div>
            )}
            {userPickTeamIds.length > 0 && (
              <div className="px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-600 dark:text-blue-400">
                Your picks highlighted
              </div>
            )}
          </div>
        )}

        {totalGames === 0 && !noTeams && (
          <div className="flex items-center gap-2 sm:ml-4">
            <div className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              Pre-Tournament
            </div>
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
      ) : games.length === 0 ? (
        /* Pre-tournament: show bracket structure from seeded teams */
        <PreTournamentBracket
          teams={teams.map(t => ({
            id: t.id,
            name: t.name,
            shortName: t.shortName,
            seed: t.seed,
            region: t.region,
            logoUrl: t.logoUrl,
            isPlayIn: t.isPlayIn,
          }))}
          playInSlots={playInSlots.map(s => ({
            id: s.id,
            seed: s.seed,
            region: s.region,
            team1: {
              id: s.team1.id,
              name: s.team1.name,
              shortName: s.team1.shortName,
              seed: s.team1.seed,
              region: s.team1.region,
              logoUrl: s.team1.logoUrl,
              isPlayIn: true,
            },
            team2: {
              id: s.team2.id,
              name: s.team2.name,
              shortName: s.team2.shortName,
              seed: s.team2.seed,
              region: s.team2.region,
              logoUrl: s.team2.logoUrl,
              isPlayIn: true,
            },
            winnerId: s.winnerId,
          }))}
          regions={regions}
          userPickTeamIds={userPickTeamIds}
        />
      ) : (
        <BracketViewer
          teams={teams}
          games={games}
          regions={regions}
          userPickTeamIds={userPickTeamIds}
        />
      )}
    </div>
  )
}
