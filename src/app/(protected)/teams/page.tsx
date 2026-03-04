import { prisma } from "@/lib/prisma"
import { TeamsTable, type TeamRow } from "@/components/teams/teams-table"

export const dynamic = "force-dynamic"

export default async function TeamsPage() {
  // Get current season
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  const seasonId = settings?.currentSeasonId

  const [teams, entryPickCounts, totalEntries] = await Promise.all([
    prisma.team.findMany({
      where: { isPlayIn: false },
      orderBy: [{ region: "asc" }, { seed: "asc" }],
    }),
    // Count how many entries picked each team (using EntryPick, not legacy Pick)
    prisma.entryPick.groupBy({
      by: ["teamId"],
      _count: { teamId: true },
      where: {
        teamId: { not: null },
        ...(seasonId ? { entry: { seasonId } } : {}),
      },
    }),
    // Total entries for percentage calculation
    prisma.entry.count({
      where: seasonId ? { seasonId } : {},
    }),
  ])

  const countMap = new Map(entryPickCounts.map(p => [p.teamId!, p._count.teamId]))

  const rows: TeamRow[] = teams.map(t => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    seed: t.seed,
    region: t.region,
    eliminated: t.eliminated,
    wins: t.wins,
    logoUrl: t.logoUrl,
    conference: t.conference,
    pickerCount: countMap.get(t.id) ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tournament Teams</h1>
        <p className="text-muted-foreground text-sm mt-1">
          All {teams.length} teams · {totalEntries} entries · Default sort: % Selected
        </p>
      </div>
      <TeamsTable teams={rows} totalEntries={totalEntries} />
    </div>
  )
}
