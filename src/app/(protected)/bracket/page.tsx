import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { BracketViewer } from "@/components/bracket/bracket-viewer"

export const dynamic = "force-dynamic"

export default async function BracketPage() {
  const session = await auth()

  // Get teams and games from database
  const [teams, games] = await Promise.all([
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tournament Bracket</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {games.filter(g => g.isComplete).length} of {games.length} games complete
          {userPickTeamIds.length > 0 && " · Your picks highlighted in blue"}
        </p>
      </div>

      {games.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <p className="text-muted-foreground">No bracket data available yet.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            The bracket will populate once the tournament field is announced.
          </p>
        </div>
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
