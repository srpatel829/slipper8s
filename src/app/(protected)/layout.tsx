import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { MobileTabBar } from "@/components/layout/mobile-tab-bar"
import { TimelineProvider, type CompletedGameInfo } from "@/components/layout/timeline-provider"
import { prisma } from "@/lib/prisma"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.registrationComplete) redirect("/register")

  // Check if we should show the timeline footer
  // Only show when the season is ACTIVE or COMPLETED (tournament has started)
  let showTimeline = false
  let latestCheckpoint = -1
  let completedGames: CompletedGameInfo[] = []
  let checkpointBoundaries: Record<number, number> = {}

  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })

    // Maintenance mode check — redirect non-admin users to maintenance page
    if (settings?.maintenanceMode) {
      const role = session.user.role
      if (role !== "ADMIN" && role !== "SUPERADMIN") {
        redirect("/maintenance")
      }
    }

    if (settings?.currentSeasonId) {
      const season = await prisma.season.findUnique({
        where: { id: settings.currentSeasonId },
        select: { status: true },
      })
      if (season?.status === "ACTIVE" || season?.status === "COMPLETED") {
        showTimeline = true

        // Get latest checkpoint (gameIndex is now 0-10 checkpoint index)
        const latestCp = await prisma.checkpoint.findFirst({
          where: { seasonId: settings.currentSeasonId, isSession: true },
          orderBy: { gameIndex: "desc" },
          select: { gameIndex: true },
        })
        if (latestCp) {
          latestCheckpoint = latestCp.gameIndex
        }

        // Get completed games in chronological order (R1+ only, not play-in)
        const games = await prisma.tournamentGame.findMany({
          where: { isComplete: true, round: { gte: 1 } },
          select: { id: true, round: true, startTime: true },
          orderBy: { startTime: "asc" },
        })
        completedGames = games.map((g, i) => ({
          id: g.id,
          gameIndex: i,
          round: g.round,
        }))

        // Build checkpoint boundaries: checkpoint index → last game index
        // Rounds 1-4 split into 2 day halves; rounds 5-6 are single checkpoints
        const roundGamesMap = new Map<number, typeof games>()
        for (const g of games) {
          if (!roundGamesMap.has(g.round)) roundGamesMap.set(g.round, [])
          roundGamesMap.get(g.round)!.push(g)
        }

        // Checkpoint index mapping: 1=R64D1, 2=R64D2, 3=R32D1, etc.
        const ROUND_TO_CP: Record<number, [number, number] | [number]> = {
          1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8],
          5: [9], 6: [10],
        }

        for (const [round, cpIndices] of Object.entries(ROUND_TO_CP)) {
          const rGames = roundGamesMap.get(parseInt(round))
          if (!rGames) continue

          if (cpIndices.length === 2) {
            const half = Math.ceil(rGames.length / 2)
            const day1 = rGames.slice(0, half)
            const day2 = rGames.slice(half)

            if (day1.length > 0) {
              const lastDay1 = day1[day1.length - 1]
              const idx = games.indexOf(lastDay1)
              if (idx >= 0) checkpointBoundaries[cpIndices[0]] = idx
            }
            if (day2.length > 0) {
              const lastDay2 = day2[day2.length - 1]
              const idx = games.indexOf(lastDay2)
              if (idx >= 0) checkpointBoundaries[cpIndices[1]] = idx
            }
          } else {
            if (rGames.length > 0) {
              const lastGame = rGames[rGames.length - 1]
              const idx = games.indexOf(lastGame)
              if (idx >= 0) checkpointBoundaries[cpIndices[0]] = idx
            }
          }
        }
      }
    }
  } catch {
    // No-op: timeline won't show if DB/schema isn't ready
  }

  return (
    <TimelineProvider
      showTimeline={showTimeline}
      latestCompletedCheckpoint={latestCheckpoint}
      completedGames={completedGames}
      checkpointBoundaries={checkpointBoundaries}
    >
      <div className="min-h-screen flex flex-col bg-background bg-court">
        <Navbar session={session} />
        <main className={`flex-1 container mx-auto px-4 py-6 max-w-5xl ${showTimeline ? "pb-28 md:pb-16" : "pb-20 md:pb-6"}`}>
          {children}
        </main>
        <footer className="border-t border-border/40 py-4 text-center text-[11px] text-muted-foreground/60 space-x-4 hidden md:block">
          <Link href="/how-to-play" className="hover:text-foreground transition-colors">How to Play / FAQ</Link>
          <span className="text-border">·</span>
          <Link href="/commissioner" className="hover:text-foreground transition-colors">Letter from Commissioner</Link>
          <span className="text-border">·</span>
          <Link href="/stats" className="hover:text-foreground transition-colors">Stats</Link>
          <span className="text-border">·</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <span className="text-border">·</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
        </footer>
        <MobileTabBar />
      </div>
    </TimelineProvider>
  )
}
