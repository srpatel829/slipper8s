import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ScrollText, Trophy } from "lucide-react"

export const metadata = {
  title: "Letter from the Commissioner | Slipper8s",
  description: "A letter from the Slipper8s commissioner — the story behind the game.",
}

export default function CommissionerPage() {
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

      <main className="max-w-3xl mx-auto px-6 pb-20">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <ScrollText className="h-5 w-5 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Letter from the Commissioner</h1>
        </div>

        {/* Letter content */}
        <div className="bg-card border border-border rounded-2xl p-8 space-y-5">
          <p className="text-foreground leading-relaxed italic">Dear Player,</p>

          <p className="text-muted-foreground leading-relaxed">
            Slipper8s (formerly known as Super 8s) started the way most good things do &mdash; small and with a simple spreadsheet.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            Back in 2015, while working as a junior investment banker at Goldman Sachs in New York City, my roommate (and cousin) introduced me to a simple tournament prediction game: pick 8 teams, score seed times wins, highest total wins. Being the Excel obsessive I am, I built a spreadsheet to run it and started an office pool with a handful of colleagues. That was year one. Over the years the game grew &mdash; and here&apos;s the thing: I didn&apos;t grow it. The players did. Every year, players invited their own friends, family, and colleagues. Word spread from office to office, city to city, group chat to group chat. By 2019 we had 62 players entering online for the first time. By 2022, 135 people showed up. By 2025, 265 players from across this country (and a few international ones) had picked their 8 sleepers &mdash; almost entirely because someone they knew told them that this game was worth playing.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            Since adding a charitable component in 2022, the game has quietly done some real good &mdash; over $17,000 donated to causes chosen by the winners themselves, from local community organizations to national charities. The winners decided where it went. I just made sure it got there.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            This year, with the help of Claude AI, I rebuilt the game from the ground up and gave it a proper home &mdash; and a proper name. I rebranded to Slipper8s to better capture what the game is really about: the sleeper picks, the Cinderella stories, the teams nobody believed in that end up fitting the glass slipper. (It also avoids any confusion with a certain motel chain.) I&apos;ll be honest with you &mdash; I&apos;m a finance guy, not a coder. Building this with Claude AI and some help from my brother means we&apos;re figuring this out as we go. This is the first year Slipper8s has a real home on the internet, and like any first year, there may be a hiccup or two along the way. If something doesn&apos;t look right or feel right, please don&apos;t suffer in silence &mdash; use the Feedback button and let me know. Every input helps me fix things faster and build something we&apos;re all proud of. Your patience and support means everything.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            The game is now free for everyone. No entry fee, no bracket to fill out &mdash; just 8 picks and a reason to root for chaos. Don&apos;t worry, you can still create private leagues and I plan to continue running my own with a charitable component.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            But the vision is bigger now too. In 2025 an estimated 39 million brackets were submitted across ESPN, CBS, Yahoo, and the NCAA&apos;s own challenge. Slipper8s is easier to enter than any of them &mdash; you pick 8 teams, not 63 games. There&apos;s no reason this game can&apos;t reach millions of players. Let&apos;s be honest about what this game is: an underdog. A free game built by one person, grown entirely by its community, going up against platforms backed by billion-dollar sports media companies. Sound familiar? It&apos;s exactly the kind of story we root for every March. Getting to millions of players would be one of the great Cinderella stories in the history of this sport &mdash; and just like the teams we pick, we control our own destiny.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            Every time you share this game with someone new, you&apos;re making that one shining moment a little more possible.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            If you&apos;re new here: welcome &mdash; we hope you&apos;ll stick around for years to come and help grow the game. If you&apos;ve been playing since the Goldman days: you know what to do.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            Either way &mdash; pick your sleepers, invite others, and who knows &mdash; maybe in a few years, the glass slipper fits us too.
          </p>

          <div className="pt-4 border-t border-border">
            <p className="text-sm font-semibold text-foreground">&mdash; Sumeet Patel</p>
            <p className="text-xs text-muted-foreground">Founder and Commissioner of Slipper8s</p>
          </div>
        </div>
      </main>
    </div>
  )
}
