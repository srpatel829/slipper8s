import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BarChart3 } from "lucide-react"
import { Slipper8sLogo } from "@/components/logo/slipper8s-logo"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background bg-court p-6 text-center">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, oklch(0.71 0.17 213), transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
          <Slipper8sLogo size={32} className="text-primary" />
        </div>

        <h1 className="text-6xl font-extrabold text-primary mb-2">404</h1>
        <h2 className="text-xl font-semibold mb-3">Page Not Found</h2>
        <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto">
          Looks like this page pulled a Cinderella and disappeared at midnight.
          Let&apos;s get you back to the tournament.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Button>
          </Link>
          <Link href="/leaderboard">
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <BarChart3 className="h-4 w-4" />
              Leaderboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
