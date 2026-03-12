"use client"

/**
 * Demo layout — wraps all /demo/* pages with:
 * - DemoProvider (all shared state + computed data)
 * - Navbar in demo mode with /demo link prefix
 * - DemoControlPanel pinned at bottom
 * - Bottom padding to prevent content hiding under control panel
 */

import Link from "next/link"
import { DemoProvider } from "@/lib/demo-context"
import { DemoControlPanel } from "@/components/demo/demo-control-panel"
import { DemoNavbar } from "@/components/demo/demo-navbar"
import { Badge } from "@/components/ui/badge"
import { LogIn } from "lucide-react"

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      {/* Navbar in demo mode */}
      <DemoNavbar />

      {/* DEMO MODE banner with exit link */}
      <div className="fixed top-[60px] left-0 right-0 z-40 flex items-center justify-center gap-3 bg-primary/10 border-b border-primary/20 py-1.5 px-4">
        <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-mono tracking-wider px-2 py-0.5">
          DEMO MODE
        </Badge>
        <span className="text-xs text-muted-foreground">You&apos;re viewing sample data based on 2025 results.</span>
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <LogIn className="h-3 w-3" />
          Sign in for the real thing
        </Link>
      </div>

      {/* Main content — pt accounts for navbar + demo banner, pb for control panel */}
      <main className="pt-24 pb-36 min-h-screen">
        {children}
      </main>

      {/* Fixed demo control panel */}
      <DemoControlPanel />
    </DemoProvider>
  )
}
