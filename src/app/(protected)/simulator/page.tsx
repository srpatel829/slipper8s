import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { computeLeaderboardFromEntries, type EntryWithRelations } from "@/lib/scoring"
import { SimulatorPanel } from "@/components/simulator/simulator-panel"
import { buildGameSequence } from "@/lib/build-game-sequence"

export const dynamic = "force-dynamic"

// ── Page component ──────────────────────────────────────────────────────────

export default async function SimulatorPage() {
  const session = await auth()
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  const seasonId = settings?.currentSeasonId

  // Check season status to determine if leaderboard should be visible
  let showLeaderboard = false
  if (seasonId) {
    const season = await prisma.season.findUnique({ where: { id: seasonId }, select: { status: true } })
    const showStatuses = ["LOCKED", "ACTIVE", "COMPLETED"]
    showLeaderboard = showStatuses.includes(season?.status ?? "")
  }

  // Get resolved play-in winner IDs so we can include them in the team list
  const resolvedPlayInWinnerIds = (await prisma.playInSlot.findMany({
    where: { winnerId: { not: null } },
    select: { winnerId: true },
  })).map(s => s.winnerId!).filter(Boolean)

  const [teams, entries, tournamentGames, playInSlots] = await Promise.all([
    // Get ALL teams (including play-in) — buildGameSequence handles isPlayIn filtering
    prisma.team.findMany({
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
                favoriteTeam: { select: { id: true, name: true, conference: true } },
              },
            },
            entryPicks: {
              include: {
                team: true,
                playInSlot: { include: { team1: true, team2: true, winner: true } },
              },
            },
            leagueEntries: { select: { leagueId: true } },
          },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
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

  const leaderboard = computeLeaderboardFromEntries(entries as EntryWithRelations[])
  const aliveTeams = teamsWithResolvedPlayIns.filter(t => !t.eliminated)

  // Get user's leagues for leaderboard filter
  const userLeagues = session?.user?.id
    ? await prisma.league.findMany({
        where: {
          OR: [
            { adminId: session.user.id },
            { members: { some: { userId: session.user.id } } },
          ],
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : []

  // Build bracket game sequence from teams + actual results
  const { gameSequence, gameIndex } = buildGameSequence(teamsWithResolvedPlayIns, tournamentGames)

  return (
    <Suspense fallback={null}>
      <SimulatorPanel
        initialLeaderboard={leaderboard}
        aliveTeams={aliveTeams}
        allTeams={teamsWithResolvedPlayIns}
        gameSequence={gameSequence}
        gameIndex={gameIndex}
        showLeaderboard={showLeaderboard}
        userLeagues={userLeagues}
        currentUserId={session?.user?.id}
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
    </Suspense>
  )
}
