import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TrendingUp, Zap, ArrowRight, Play, HelpCircle, Trophy } from "lucide-react"

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
          <Trophy className="h-7 w-7 text-primary" />
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
        <section className="mb-16" id="faq">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Frequently Asked Questions</h2>
          </div>

          {/* Section 1: Getting Started */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <span className="h-px flex-1 bg-border" />
              Getting Started
              <span className="h-px flex-1 bg-border" />
            </h3>
            <div className="space-y-3">
              {[
                {
                  q: "How many teams do I pick?",
                  a: "Exactly 8. You can pick from any region and any seed — there are no restrictions other than you can not pick a team more than once.",
                },
                {
                  q: "When is the entry deadline?",
                  a: "Picks lock before the first game of the tournament. The exact date and time is shown on the homepage countdown timer and is always displayed in Eastern Time. All deadlines are enforced server-side — if you are mid-edit when the deadline passes, your save will be rejected.",
                },
                {
                  q: "Can I change my picks after submitting?",
                  a: "Yes — you can edit your picks as many times as you want before the entry deadline. You will receive a confirmation email each time you save. Once the deadline passes, all picks are permanently locked.",
                },
                {
                  q: "Can I submit multiple entries?",
                  a: "Yes. There is no cap on the number of entries per player per season. Each entry is scored independently. You can give each entry a nickname to keep track of them.",
                },
                {
                  q: "Can I delete an entry?",
                  a: "Yes, but only before the deadline. Once the tournament starts, all entries are locked and cannot be deleted. A confirmation warning is shown before deletion since it cannot be undone.",
                },
              ].map(({ q, a }) => (
                <div key={q} className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-sm mb-2">{q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Scoring & Strategy */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <span className="h-px flex-1 bg-border" />
              Scoring & Strategy
              <span className="h-px flex-1 bg-border" />
            </h3>
            <div className="space-y-3">
              {[
                {
                  q: "What are play-in games and how do they work?",
                  a: "Some seeds (typically 11/12 and 15/16) have play-in games before the main bracket begins. When you pick one of these play-in slots, the winner of the play-in game automatically becomes your pick. The seed value stays the same regardless of which team wins the play-in.",
                },
                {
                  q: "What is Max Score?",
                  a: "Max Score is the highest score your entry could theoretically achieve if all your remaining alive teams win every future game. Importantly, it accounts for bracket collisions — if two of your picks are in the same region and would eventually meet, only one can advance. The higher-seeded pick (larger seed number) is assumed to survive because it earns more points per win.",
                },
                {
                  q: "What is Expected Score?",
                  a: "Expected Score uses pre-tournament win probabilities to estimate how many points your picks will earn. It is calculated using marginal win probabilities for each remaining round. During the tournament, it updates to use actual wins for completed rounds and probabilities for future rounds only.",
                },
                {
                  q: "What is the Optimal 8?",
                  a: "The Optimal 8 (Rolling) is the set of 8 teams with the highest combined score at any given point in the tournament. It represents the theoretical ceiling — the best possible picks given results so far. After the tournament ends, a Optimal 8 (Final) shows the true best picks knowing all final results.",
                },
              ].map(({ q, a }) => (
                <div key={q} className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-sm mb-2">{q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Leaderboard & Rankings */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <span className="h-px flex-1 bg-border" />
              Leaderboard & Rankings
              <span className="h-px flex-1 bg-border" />
            </h3>
            <div className="space-y-3">
              {[
                {
                  q: "How are rankings determined?",
                  a: "Before the tournament, entries are ranked by Total Potential Score (TPS) — your current score (0) plus the maximum additional points your remaining alive picks could earn. During the tournament entries are ranked by actual score and if there are multiple entries with the same score then the rank has \u201CT\u201D in front of it. In terms of display order for tied entries, the entry with higher TPS is shown first. If TPS is tied, then alphabetically by name. After the tournament ends, TPS equals current score for everyone, so final rankings reflect actual results. Rankings update after every completed game.",
                },
                {
                  q: "What are the archetype names and definitions?",
                  a: "Each entry is assigned one or more archetypes based on pick patterns. \uD83D\uDC60 Cinderella Chaser: all 8 picks are seeds 10+. \uD83C\uDFAF Sweet Spotter: all 8 picks are seeds 5\u201312. \uD83E\uDDE0 Strategist: balanced spread across seed tiers and regions. \uD83C\uDF2A\uFE0F Chaos Agent: 2+ picks are seeds 13\u201316. \uD83D\uDDFA\uFE0F Regional Purist: 5+ picks from the same region. \u270F\uFE0F Chalk Artist: 4+ picks are seeds 1\u20134. \uD83D\uDD04 Contrarian: picks from the top and bottom of the bracket, skipping the middle. \uD83C\uDFB2 Mixer: no single strategy \u2014 just vibes. Archetypes are shown as emoji badges next to your name on the leaderboard.",
                },
                {
                  q: "What is the percentile ranking?",
                  a: "Percentile shows where you stand relative to all entries. So if your entry is in the 95th percentile, it means your score is better than 95% of all entries. Percentile is shown alongside your absolute rank on the leaderboard, your scores page, share cards, and in email notifications.",
                },
                {
                  q: "What are the leaderboard dimensions?",
                  a: "You can view rankings filtered by different dimensions: Global (everyone), Country, State (US only), Gender, Fan Base (based on your favorite team), Conference (also based on your favorite team), and League (private league). Each dimension has its own independent rankings and percentiles. Fill in your profile to appear in dimension-specific views.",
                },
                {
                  q: "What are Max Rank and Floor Rank?",
                  a: "Max Rank is the best finishing position your entry could achieve if everything goes your way — it uses collision-aware bracket analysis. Floor Rank is the worst case. Together they show the range of possible outcomes for your entry.",
                },
              ].map(({ q, a }) => (
                <div key={q} className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-sm mb-2">{q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Features */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <span className="h-px flex-1 bg-border" />
              Features
              <span className="h-px flex-1 bg-border" />
            </h3>
            <div className="space-y-3">
              {[
                {
                  q: "What are private leagues?",
                  a: "Private leagues let you compete with friends, family, or coworkers. Create a league and share the invite link — you can copy a direct join link, share to Twitter/X, Facebook, LinkedIn, or Instagram, or give out the raw invite code for manual entry. Your group gets its own leaderboard while you still appear on the global leaderboard too. League admins can optionally enable payment tracking. There is no limit on how many leagues you can join.",
                },
                {
                  q: "How does the score history chart work?",
                  a: "The score history chart shows how scores evolved throughout the tournament. It plots your entry, the current leader, the median player, and the Optimal 8 at each checkpoint. Checkpoints are created after all games in a session are final.",
                },
                {
                  q: "How does the simulator work?",
                  a: "The simulator lets you explore \"what if\" scenarios. Completed game results are locked, but you can change the outcomes of future games to see how the leaderboard would change. The leaderboard panel updates in real time as you modify scenarios.",
                },
                {
                  q: "What email notifications will I receive?",
                  a: "You will always receive: a welcome email, an entry confirmation when you save picks, a notification when entries lock, and final results after the tournament. Optional notifications (on by default) include deadline reminders and daily recaps during the tournament. You can turn off optional notifications in your profile settings.",
                },
                {
                  q: "Can I share my results?",
                  a: "Yes. Share cards are generated with your rank, percentile, score, and teams remaining. They work as rich previews in WhatsApp, iMessage, Twitter, Slack, and anywhere else that supports Open Graph previews.",
                },
              ].map(({ q, a }) => (
                <div key={q} className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-sm mb-2">{q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: General */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <span className="h-px flex-1 bg-border" />
              General
              <span className="h-px flex-1 bg-border" />
            </h3>
            <div className="space-y-3">
              {[
                {
                  q: "Is it free to play?",
                  a: "Yes. Slipper8s is completely free to play. No entry fees, no hidden costs.",
                },
                {
                  q: "Do I need to fill in all my profile fields?",
                  a: "No. Only your first name, last name, and username are required. Optional fields like country, state, gender, favorite team, date of birth, and phone number are there for additional features — for example, filling in your state lets you see how you rank among players in your state, and adding your phone number opts you in for future score-update text notifications (likely to be rolled out in future years).",
                },
                {
                  q: "Can I change my username after registration?",
                  a: "No. Your username is set once during registration and cannot be changed afterward. Choose carefully! The system will suggest a username based on your name, but you can customize it before confirming.",
                },
                {
                  q: "How is this different from a traditional bracket?",
                  a: "In a traditional bracket, you predict every game outcome. In Slipper8s, you just pick 8 teams. The scoring system (seed x wins) means higher-seeded underdogs are worth more per win, making sleeper picks and upsets central to your strategy — not just picking favorites.",
                },
                {
                  q: "Where can I see past results?",
                  a: "Check out Demo mode to explore tournament results 2025. You can browse the full leaderboard, simulate game outcomes, view the bracket, and see how scores played out — all with real data from previous seasons.",
                },
                {
                  q: "Are there more features coming?",
                  a: "Yes, the Commissioner has plenty of ideas that he still needs to code & deploy (e.g. Hall of Champions) but your suggestions are welcome and can be submitted via the feedback button.",
                },
              ].map(({ q, a }) => (
                <div key={q} className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-sm mb-2">{q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
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
                See how 2025 played out
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
