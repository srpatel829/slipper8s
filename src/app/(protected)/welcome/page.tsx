import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Trophy, CheckCircle2, ArrowRight, Calendar, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function WelcomePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.registrationComplete) redirect("/register")

  const firstName = session.user.name?.split(" ")[0] ?? "there"

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-8">
      <div className="w-full max-w-lg">
        {/* Success icon */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg glow-blue-sm">
              <Trophy className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">You&apos;re in, {firstName}!</h1>
          <p className="text-muted-foreground mt-2 text-center">
            Your Slipper8s account is ready. Now pick your 8 teams.
          </p>
        </div>

        {/* How it works — quick recap */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4 shadow-lg">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">How it works</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">1</div>
              <div>
                <p className="font-medium text-sm">Pick 8 teams</p>
                <p className="text-xs text-muted-foreground mt-0.5">Choose any 8 teams from the tournament bracket — mix chalk and sleepers.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">2</div>
              <div>
                <p className="font-medium text-sm">Score = seed × wins</p>
                <p className="text-xs text-muted-foreground mt-0.5">A #12 seed winning 3 games scores 36 pts. Upsets are worth more.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">3</div>
              <div>
                <p className="font-medium text-sm">Highest total wins</p>
                <p className="text-xs text-muted-foreground mt-0.5">Track your picks in real time as the tournament unfolds.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Deadline reminder */}
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
          <Calendar className="h-4 w-4 text-orange-400 shrink-0" />
          <p className="text-sm text-orange-300">
            <span className="font-semibold">Deadline:</span> Thursday, March 19 · 12:00pm ET — entries lock when the tournament tips off.
          </p>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Button asChild className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold glow-blue text-base">
            <Link href="/picks">
              Make my picks
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full h-11 border-border">
            <Link href="/leaderboard">
              <Users className="mr-2 h-4 w-4" />
              Browse the leaderboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
