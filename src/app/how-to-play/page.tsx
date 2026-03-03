import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Trophy, TrendingUp, Zap, ArrowRight, Play, HelpCircle, User } from "lucide-react"

export const metadata = {
  title: "How to Play | Slipper8s",
  description: "Learn how Slipper8s works — pick 8 teams, score seed x wins, highest total wins.",
}

export default function HowToPlayPage() {
  return (
    <div className="min-h-screen bg-background bg-court">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Trophy className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">Slipper8s</span>
        </Link>
        <Link href="/login">
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            Sign in
          </Button>
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pb-20">
        {/* How to Play */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">How to Play</h1>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">1</div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Pick 8 teams from the tournament bracket</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Before the tournament starts, choose any 8 teams from the 68-team field.
                  You can pick from any region, any seed. Some seeds (11, 16) have play-in games —
                  pick those slots and the winning team automatically counts for you.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">2</div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Score points based on seed x wins</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Every time one of your teams wins a tournament game, you earn points equal to their seed number.
                  A #12 seed winning a game earns 12 points. A #1 seed winning earns just 1 point.
                  Higher seeds are worth more per win — that&apos;s why sleeper picks matter.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">3</div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Track your picks in real time as the tournament unfolds</h3>
                <p className="text-muted-foreground leading-relaxed">
                  The leaderboard updates live during games. See your score, your rank, and which
                  teams you still have alive. The player with the highest total score at the end wins.
                </p>
              </div>
            </div>
          </div>

          {/* Worked example */}
          <div className="mt-10 bg-card border border-border rounded-2xl p-8">
            <h3 className="font-bold text-lg mb-4">Why upsets matter — a worked example</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl mx-auto">
              <div className="text-center p-4 rounded-xl border border-border">
                <div className="text-lg font-bold mb-1">#1 Florida</div>
                <div className="text-sm text-muted-foreground mb-2">Won 6 games (National Champion)</div>
                <div className="text-3xl font-black text-muted-foreground">6 pts</div>
                <div className="text-xs text-muted-foreground mt-1">1 seed x 6 wins</div>
              </div>
              <div className="text-center p-4 rounded-xl border border-primary/40 bg-primary/5">
                <div className="text-lg font-bold mb-1">#12 McNeese</div>
                <div className="text-sm text-muted-foreground mb-2">Won 1 game (R64 upset)</div>
                <div className="text-3xl font-black text-primary">12 pts</div>
                <div className="text-xs text-muted-foreground mt-1">12 seed x 1 win</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center mt-4">
              One upset win from a #12 seed is worth double what a #1 seed earns winning the whole tournament.
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "How many teams do I pick?",
                a: "Exactly 8. You can pick from any region and any seed.",
              },
              {
                q: "What are play-in games?",
                a: "Some seeds (typically 11 and 16) have play-in games before the main bracket. When you pick one of these slots, the winner of the play-in game automatically becomes your pick. The seed value stays the same.",
              },
              {
                q: "Can I change my picks after submitting?",
                a: "Yes — you can edit your picks as many times as you want before the entry deadline. Once the deadline passes, all picks are locked.",
              },
              {
                q: "Can I submit multiple entries?",
                a: "Yes. There is no cap on the number of entries per player per season.",
              },
              {
                q: "How is the score calculated?",
                a: "Score = seed x wins for each of your 8 teams, summed together. Play-in game wins do not count.",
              },
              {
                q: "What is Max Score?",
                a: "Max Score is the highest score your entry could theoretically achieve if all your remaining alive teams win every future game. It accounts for bracket collisions — if two of your picks would meet each other, only one can advance.",
              },
              {
                q: "What is the Optimal 8?",
                a: "The 8 teams with the highest combined score at any given point in the tournament. It represents the theoretical ceiling — the best possible picks given what has happened so far.",
              },
              {
                q: "What are private leagues?",
                a: "Private leagues let you compete with friends or coworkers. You appear on both the global leaderboard and your league leaderboard. Create a league and share the invite code.",
              },
              {
                q: "When is the entry deadline?",
                a: "Picks lock before the first game of the tournament. The exact deadline is shown on the homepage countdown timer. All deadlines are enforced server-side in UTC.",
              },
              {
                q: "Is it free to play?",
                a: "Yes. Slipper8s is completely free.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-sm mb-2">{q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <User className="h-5 w-5 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">About</h2>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8">
            <p className="text-muted-foreground leading-relaxed mb-4">
              Slipper8s started as a spreadsheet among friends in 2016. Every March, we&apos;d pick 8 teams,
              track scores by hand, and argue about who was really winning. Ten years and 265 players later,
              it was time to build something better.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The name is a play on &quot;sleeper picks&quot; and &quot;glass slippers&quot; — because in this game,
              the Cinderella teams are the ones that win you the pool. A #12 seed winning one game is worth
              more than a #1 seed winning the championship. That&apos;s the whole point.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Built with love for the tournament by Sumeet Patel and friends.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8 h-12">
                Sign in to play <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="text-base px-8 h-12 gap-2">
                <Play className="h-4 w-4 text-primary" />
                Try the demo
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
