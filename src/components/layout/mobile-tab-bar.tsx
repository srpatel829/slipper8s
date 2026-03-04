"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Target, Zap, Play } from "lucide-react"

const TABS = [
  { href: "/leaderboard", label: "Board", icon: BarChart3 },
  { href: "/picks", label: "Picks", icon: Target },
  { href: "/scores", label: "Scores", icon: Zap },
  { href: "/simulator", label: "Sim", icon: Play },
]

interface MobileTabBarProps {
  linkPrefix?: string
}

export function MobileTabBar({ linkPrefix = "" }: MobileTabBarProps) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-md border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-14">
        {TABS.map(({ href, label, icon: Icon }) => {
          const fullHref = `${linkPrefix}${href}`
          const isActive = pathname === fullHref || pathname.startsWith(fullHref + "/")
          return (
            <Link
              key={href}
              href={fullHref}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
