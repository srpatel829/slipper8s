"use client"

/**
 * Demo layout — wraps all /demo/* pages with:
 * - DemoProvider (all shared state + computed data)
 * - Navbar in demo mode with /demo link prefix
 * - DemoControlPanel pinned at bottom
 * - Bottom padding to prevent content hiding under control panel
 */

import { DemoProvider } from "@/lib/demo-context"
import { DemoControlPanel } from "@/components/demo/demo-control-panel"
import { DemoNavbar } from "@/components/demo/demo-navbar"
import { Badge } from "@/components/ui/badge"

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      {/* Navbar in demo mode */}
      <DemoNavbar />

      {/* Subtle DEMO MODE watermark — always visible even when panel is collapsed */}
      <div className="fixed top-[68px] right-4 z-40 pointer-events-none">
        <Badge className="bg-primary/10 text-primary/50 border-primary/20 text-[10px] font-mono tracking-wider px-2 py-0.5">
          DEMO
        </Badge>
      </div>

      {/* Main content — pb accounts for control panel height (~110px) */}
      <main className="pt-16 pb-36 min-h-screen">
        {children}
      </main>

      {/* Fixed demo control panel */}
      <DemoControlPanel />
    </DemoProvider>
  )
}
