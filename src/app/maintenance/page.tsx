import { Trophy, Wrench } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Maintenance | Slipper8s",
  description: "Slipper8s is currently undergoing maintenance. We'll be back shortly.",
}

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-court p-4">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, oklch(0.72 0.18 42), transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-5 shadow-lg">
            <Wrench className="h-8 w-8 text-amber-400" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <Trophy className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">Slipper8s</span>
          </div>
        </div>

        {/* Message card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <h1 className="text-xl font-bold mb-3">We&apos;ll be right back</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Slipper8s is undergoing a quick maintenance update.
            We&apos;re working to make things even better and will be back online shortly.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Don&apos;t worry!</strong>{" "}
              Your picks and entries are safe. The leaderboard will resume where it left off once we&apos;re back.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Questions? Email{" "}
            <a href="mailto:support@slipper8s.com" className="text-primary hover:underline">
              support@slipper8s.com
            </a>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
