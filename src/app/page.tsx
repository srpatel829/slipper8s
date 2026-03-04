import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TrendingUp, Zap, Users, ArrowRight, Check } from "lucide-react"
import { CountdownTimer } from "@/components/landing/countdown-timer"
import { Slipper8sLogo } from "@/components/logo/slipper8s-logo"

export default async function HomePage() {
  // Gracefully handle missing DB/auth config in demo environments
  let session = null
  try {
    session = await auth()
  } catch {
    // No-op: renders landing page without auth
  }
  if (session?.user) redirect("/leaderboard")

  return (
    <div className="min-h-screen bg-background bg-court overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, oklch(0.71 0.17 213), transparent 70%)" }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <Slipper8sLogo size={28} className="text-primary" />
          <span className="font-bold text-lg tracking-tight">Slipper8s</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/how-to-play">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground hidden sm:flex">
              How to Play
            </Button>
          </Link>
          <Link href="/how-to-play#faq">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              FAQ
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1">
              Sign in <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-10 pb-20 text-center">

        {/* Logo mark */}
        <div className="flex justify-center mb-5">
          <Slipper8sLogo size={72} className="text-primary" />
        </div>

        {/* Brand name */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-none mb-5">
          <span className="text-gradient-blue">Slipper8s</span>
        </h1>

        {/* 3-bullet summary */}
        <ul className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 mb-5 text-sm sm:text-base text-muted-foreground">
          {["Pick 8 teams", "Seed × Wins = Points", "Highest Score Wins"].map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-primary shrink-0" />
              <span className="text-foreground font-medium">{item}</span>
            </li>
          ))}
        </ul>

        {/* Tagline */}
        <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-10">
          No bracket to bust. Just pick 8 sleepers and root for chaos!
        </p>

        {/* Countdown */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <p className="text-sm text-muted-foreground">Your invitation to the big dance expires in...</p>
          <CountdownTimer />
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
          <Link href="/login">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-blue text-base px-8 h-12 w-full sm:w-auto">
              Sign in to play
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href="/demo">
            <Button size="lg" variant="outline" className="text-base px-8 h-12 border-border hover:border-primary/50 w-full sm:w-auto">
              See how 2025 played out
            </Button>
          </Link>
        </div>
      </section>

      {/* How the game works */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-14">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-8 text-center">
          How the game works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: "1",
              icon: Slipper8sLogo,
              title: "Pick 8 teams",
              desc: "Choose any 8 teams from the tournament bracket. Play-in slots let you pick both teams — only the winner counts.",
              color: "text-primary",
              bg: "bg-primary/10",
              isLogoIcon: true,
            },
            {
              step: "2",
              icon: TrendingUp,
              title: "Score = Seed × Wins",
              desc: "In 2025, Florida (#1 seed) won the national championship (1 × 6 = 6 points) while McNeese (#12 seed) only won their first game (12 × 1 = 12 points). Note: wins in play-in games don't count for scoring.",
              color: "text-emerald-400",
              bg: "bg-emerald-400/10",
              isLogoIcon: false,
            },
            {
              step: "3",
              icon: Zap,
              title: "Highest total wins",
              desc: "Track your picks in real time as the tournament unfolds. Live leaderboard shows who can still catch the leader.",
              color: "text-amber-400",
              bg: "bg-amber-400/10",
              isLogoIcon: false,
            },
          ].map(({ step, icon: Icon, title, desc, color, bg, isLogoIcon }) => (
            <div
              key={title}
              className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors relative"
            >
              <div className="absolute top-4 right-4 text-3xl font-black text-muted-foreground/10">
                {step}
              </div>
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                {isLogoIcon ? (
                  <Slipper8sLogo size={22} className={color} />
                ) : (
                  <Icon className={`h-5 w-5 ${color}`} />
                )}
              </div>
              <h3 className="font-semibold text-base mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Private league callout */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-card border border-border rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Playing with friends?</h3>
            <p className="text-sm text-muted-foreground">
              Create or join a private league. Compete on the global leaderboard while tracking your group separately.
              Share an invite link and see who has the best sleeper instincts.
            </p>
          </div>
          <Link href="/login" className="shrink-0">
            <Button variant="outline" className="gap-2 border-purple-500/30 hover:border-purple-500/60 text-purple-300">
              <Users className="h-3.5 w-3.5" />
              Create a league
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex justify-center sm:justify-end">
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link href="/how-to-play" className="hover:text-foreground transition-colors">How to Play</Link>
            <Link href="/demo" className="hover:text-foreground transition-colors">Demo</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
