import { prisma } from "@/lib/prisma"
import { computeLeaderboardFromEntries, type EntryWithRelations } from "@/lib/scoring"
import { SimulatorPanel } from "@/components/simulator/simulator-panel"

export const dynamic = "force-dynamic"

export default async function SimulatorPage() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  const seasonId = settings?.currentSeasonId

  const [teams, entries] = await Promise.all([
    prisma.team.findMany({
      where: { isPlayIn: false },
      orderBy: [{ region: "asc" }, { seed: "asc" }],
    }),
    seasonId
      ? prisma.entry.findMany({
          where: {
            seasonId,
            draftInProgress: false,
            entryPicks: { some: {} },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                isPaid: true,
                username: true,
                country: true,
                state: true,
                gender: true,
              },
            },
            entryPicks: {
              include: {
                team: true,
                playInSlot: { include: { team1: true, team2: true, winner: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ])

  const leaderboard = computeLeaderboardFromEntries(entries as EntryWithRelations[])
  const aliveTeams = teams.filter(t => !t.eliminated)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scenario Simulator</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pick winners for upcoming games to see how the leaderboard would change. Results are not saved.
        </p>
      </div>
      <SimulatorPanel
        initialLeaderboard={leaderboard}
        aliveTeams={aliveTeams}
        allTeams={teams}
      />
    </div>
  )
}
