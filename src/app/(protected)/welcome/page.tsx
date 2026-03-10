import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma"
import { CountdownTimer } from "@/components/welcome/countdown-timer"
import { ShareCard } from "@/components/welcome/share-card"

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const APP_URL = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "https://slipper8s.com"

export default async function WelcomePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.registrationComplete) redirect("/register")

  const firstName = session.user.name?.split(" ")[0] ?? "there"

  // Player count (all registered players including this one)
  const playerCount = await prisma.user.count({ where: { registrationComplete: true } })

  // Check if bracket/picks are live
  let bracketIsLive = false
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
    if (settings?.currentSeasonId) {
      const season = await prisma.season.findUnique({
        where: { id: settings.currentSeasonId },
        select: { status: true },
      })
      // REGISTRATION = bracket announced, picks open
      // LOCKED / ACTIVE / COMPLETED = also fine to show picks link
      bracketIsLive = ["REGISTRATION", "LOCKED", "ACTIVE", "COMPLETED"].includes(season?.status ?? "")
    }
  } catch {
    // No-op: treat as pre-bracket
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-8">
      <div className="w-full max-w-lg">

        {/* Hero */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-5 shadow-lg shadow-primary/30">
            <svg className="h-8 w-8 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L15.09 8.26H22L17.55 12.5L19.64 18.74L12 14.5L4.36 18.74L6.45 12.5L2 8.26H8.91L12 2Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Congratulations, {firstName}!</h1>
          <p className="text-muted-foreground mt-3 text-base leading-relaxed">
            You are the{" "}
            <span className="text-foreground font-semibold">{ordinal(playerCount)} player</span>{" "}
            to register for Slipper8s 2026.
          </p>
        </div>

        {bracketIsLive ? (
          <>
            {/* Deadline reminder */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
              <Calendar className="h-4 w-4 text-orange-400 shrink-0" />
              <p className="text-sm text-orange-300">
                <span className="font-semibold">Picks deadline:</span> Thursday, March 19 · 12:15pm ET
              </p>
            </div>

            {/* Primary CTA: Make My Picks */}
            <Button
              asChild
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg shadow-primary/30 text-base mb-6"
            >
              <Link href="/picks">
                Make my picks
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </>
        ) : (
          <>
            {/* Countdown to Selection Sunday */}
            <div className="mb-6">
              <CountdownTimer
                targetDate="2026-03-15T18:00:00-04:00"
                label="Selection Sunday Countdown"
                subtitle="Bracket announcement: 6pm ET Sunday, March 15th"
              />
            </div>

            {/* Bracket announcement message */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-4 mb-6 text-center">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The committee will announce the bracket at 6pm ET on Sunday March 15th.
                Slipper 8s will go live shortly thereafter. Please log back in then to
                make your own selections.
              </p>
            </div>
          </>
        )}

        {/* Share and League CTAs */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-5 mb-6">

          {/* Share Card */}
          <ShareCard shareUrl={APP_URL} firstName={firstName} />

          <div className="border-t border-border" />

          {/* Private league */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Create a private league</p>
            <p className="text-xs text-muted-foreground mb-3">
              Compete head-to-head with friends, family, or your office.
            </p>
            <Button asChild className="w-full">
              <Link href="/leagues">Set up a league</Link>
            </Button>
          </div>
        </div>

        {/* YouTube Video */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-foreground mb-3">
            {bracketIsLive
              ? "Arguably the best way to spend 6 minutes on the internet:"
              : "While you wait for picks to go live, please enjoy Sumeet\u2019s One Shining Moment from 2025:"}
          </p>
          <div className="relative w-full overflow-hidden rounded-xl shadow-md" style={{ paddingBottom: "56.25%" }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src="https://www.youtube.com/embed/CpWGcVl3AM0"
              title="One Shining Moment 2025"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

      </div>
    </div>
  )
}
