import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { MobileTabBar } from "@/components/layout/mobile-tab-bar"
import { TimelineProvider } from "@/components/layout/timeline-provider"
import { prisma } from "@/lib/prisma"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.registrationComplete) redirect("/register")

  // Check if we should show the timeline footer
  // Only show when the season is ACTIVE or COMPLETED (tournament has started)
  let showTimeline = false
  let latestCheckpoint = -1

  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
    if (settings?.currentSeasonId) {
      const season = await prisma.season.findUnique({
        where: { id: settings.currentSeasonId },
        select: { status: true },
      })
      if (season?.status === "ACTIVE" || season?.status === "COMPLETED") {
        showTimeline = true
        // Get the latest checkpoint index
        const latestCp = await prisma.checkpoint.findFirst({
          where: { seasonId: settings.currentSeasonId },
          orderBy: { gameIndex: "desc" },
          select: { gameIndex: true },
        })
        if (latestCp) {
          latestCheckpoint = latestCp.gameIndex
        }
      }
    }
  } catch {
    // No-op: timeline won't show if DB/schema isn't ready
  }

  return (
    <TimelineProvider showTimeline={showTimeline} latestCompletedCheckpoint={latestCheckpoint}>
      <div className="min-h-screen flex flex-col bg-background bg-court">
        <Navbar session={session} />
        <main className={`flex-1 container mx-auto px-4 py-6 max-w-5xl ${showTimeline ? "pb-28 md:pb-16" : "pb-20 md:pb-6"}`}>
          {children}
        </main>
        <MobileTabBar />
      </div>
    </TimelineProvider>
  )
}
