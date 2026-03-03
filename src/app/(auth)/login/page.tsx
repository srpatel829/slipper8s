import { signIn } from "@/lib/auth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Trophy, Zap, TrendingUp, Play } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-court p-4">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-15"
          style={{ background: "radial-gradient(ellipse, oklch(0.72 0.18 42), transparent 70%)" }}
        />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg glow-orange">
            <Trophy className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Slipper8s</h1>
          <p className="text-muted-foreground text-sm mt-1">College Basketball Tournament Pool</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Sign in to play</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Use Google or email to get started.
            </p>
          </div>

          {/* Google OAuth */}
          <form
            action={async () => {
              "use server"
              await signIn("google", { redirectTo: "/leaderboard" })
            }}
          >
            <Button
              type="submit"
              variant="outline"
              className="w-full h-11 gap-2 font-medium border-border hover:border-primary/50 mb-4"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Magic link */}
          <form
            action={async (formData: FormData) => {
              "use server"
              await signIn("resend", {
                email: formData.get("email") as string,
                redirectTo: "/leaderboard",
              })
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="h-11 bg-muted/50 border-border focus:border-primary/50"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold glow-orange-sm"
            >
              Send magic link
            </Button>
          </form>
        </div>

        {/* Feature pills */}
        <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
          {[
            { icon: Trophy, text: "Pick 8 teams" },
            { icon: TrendingUp, text: "Seed x wins" },
            { icon: Zap, text: "Live scores" },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card border border-border rounded-full px-3 py-1.5"
            >
              <Icon className="h-3 w-3 text-primary" />
              {text}
            </div>
          ))}
        </div>

        <div className="text-center mt-4">
          <Link href="/demo" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1.5">
            <Play className="h-3 w-3" />
            Try the demo first — no sign-in required
          </Link>
        </div>
      </div>
    </div>
  )
}
