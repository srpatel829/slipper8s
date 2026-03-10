import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Trophy, ArrowRight, Calendar, Share2, Users2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma"
import { CopyButton } from "@/components/ui/copy-button"

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
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-5 shadow-lg glow-blue">
            <Trophy className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Congratulations, {firstName}!</h1>
          <p className="text-muted-foreground mt-3 text-base leading-relaxed">
            You are the{" "}
            <span className="text-foreground font-semibold">{ordinal(playerCount)} player</span>{" "}
            to register for Slipper8s 2026.
          </p>
        </div>

        {/* Deadline reminder */}
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
          <Calendar className="h-4 w-4 text-orange-400 shrink-0" />
          <p className="text-sm text-orange-300">
            <span className="font-semibold">Picks deadline:</span> Thursday, March 19 · 12:15pm ET
          </p>
        </div>

        {/* Primary CTA — conditional on bracket status */}
        {bracketIsLive ? (
          <Button
            asChild
            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold glow-blue text-base mb-6"
          >
            <Link href="/picks">
              Make my picks
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        ) : (
          <div className="bg-card border border-border rounded-xl px-5 py-4 mb-6 text-center">
            <p className="text-sm font-medium text-foreground mb-1">Picks open Sunday, March 15</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The bracket gets announced Sunday evening. Log back in then to make your 8 picks before the Thursday deadline.
            </p>
          </div>
        )}

        {/* In the meantime */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            In the meantime
          </p>

          {/* Invite friends */}
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Share2 className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-0.5">Invite friends to play</p>
              <p className="text-xs text-muted-foreground mb-3">
                Share this link — works in texts, email, WhatsApp, anywhere.
              </p>
              <CopyButton
                text={APP_URL}
                label="Copy invite link"
                className="h-8 text-xs w-full sm:w-auto"
              />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Private league */}
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Users2 className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-0.5">Create a private league</p>
              <p className="text-xs text-muted-foreground mb-3">
                Compete head-to-head with friends, family, or your office.
              </p>
              <Button
                asChild
                variant="outline"
                className="h-8 text-xs w-full sm:w-auto"
              >
                <Link href="/leagues">Set up a league</Link>
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
