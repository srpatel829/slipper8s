import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * Lightweight server-side route that checks registration status
 * after sign-in and redirects accordingly — avoids the flash of
 * /leaderboard before the (protected) layout redirects to /register.
 *
 * Routing logic:
 *  - Not registered → /register
 *  - Picks open (REGISTRATION status, before deadline) → /picks
 *  - Post-deadline (LOCKED / ACTIVE / COMPLETED) → /leaderboard
 *  - Pre-bracket (SETUP or no season) → /welcome
 */
export default async function AuthRedirectPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.registrationComplete) redirect("/register")

  // Determine where to send them based on season state
  try {
    const settings = await prisma.appSettings.findUnique({
      where: { id: "main" },
      select: { currentSeasonId: true, picksDeadline: true },
    })
    if (settings?.currentSeasonId) {
      const season = await prisma.season.findUnique({
        where: { id: settings.currentSeasonId },
        select: { status: true },
      })
      const status = season?.status ?? ""
      if (["LOCKED", "ACTIVE", "COMPLETED"].includes(status)) {
        redirect("/leaderboard")
      }
      if (status === "REGISTRATION") {
        const deadlinePassed = settings.picksDeadline && new Date() > new Date(settings.picksDeadline)
        redirect(deadlinePassed ? "/leaderboard" : "/picks")
      }
    }
  } catch {
    // Fall through to default
  }

  redirect("/leaderboard")
}
