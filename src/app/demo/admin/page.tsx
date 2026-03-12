"use client"

/**
 * Demo Admin Dashboard — mirrors the real /admin page with demo data.
 * Shows computed stats from DemoContext, quick nav cards, and info cards.
 */

import Link from "next/link"
import { Users, Trophy, Settings, RefreshCw, CheckCircle2, Clock, BarChart3, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDemoContext } from "@/lib/demo-context"

export default function DemoAdminDashboard() {
  const { demoUsers, demoUserPicks, teamsData, demoSettings, gameIndex, totalGames, currentPersona } = useDemoContext()

  // Computed stats
  const totalUsers = demoUsers.length
  const entryCount = demoUsers.filter(u => (demoUserPicks.get(u.id) ?? []).length > 0).length
  const paidCount = demoUsers.filter(u => u.isPaid).length
  const teamCount = teamsData.filter(t => !t.isPlayIn).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Signed in as{" "}
          <span className="text-foreground font-medium">{currentPersona.name}</span>{" "}
          <span className="text-primary text-xs font-semibold">({currentPersona.role})</span>
        </p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Entry Slips" value={entryCount} color="text-blue-400" />
        <StatCard icon={CheckCircle2} label="Paid" value={paidCount} color="text-green-400" />
        <StatCard icon={BarChart3} label="Total Users" value={totalUsers} color="text-primary" />
        <StatCard icon={Database} label="Teams" value={teamCount} color="text-violet-400" />
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Picks Deadline</h3>
          </div>
          {demoSettings.picksDeadline ? (
            <p className="text-sm text-foreground font-medium">
              {new Date(demoSettings.picksDeadline).toLocaleString()}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Not set</p>
          )}
          <Button asChild variant="outline" size="sm" className="mt-4 h-7 text-xs">
            <Link href="/demo/admin/settings">Edit settings</Link>
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Tournament Data</h3>
          </div>
          <p className="text-sm text-foreground font-medium mb-1">
            {gameIndex >= 0 ? `Game ${gameIndex + 1} of ${totalGames}` : "Pre-Tournament"}
          </p>
          <p className="text-xs text-muted-foreground">
            {gameIndex < 0
              ? "Timeline at pre-tournament state — no games played."
              : gameIndex >= totalGames - 1
              ? "All games complete. Tournament over."
              : `${totalGames - gameIndex - 1} games remaining.`}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4 h-7 text-xs gap-1.5">
            <Link href="/demo/admin/sync">
              <RefreshCw className="h-3 w-3" />
              View sync info
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick nav cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { href: "/demo/admin/users", icon: Users, label: "Manage Users", desc: "Mark paid, change roles" },
          { href: "/demo/admin/settings", icon: Settings, label: "Pool Settings", desc: "Deadline, payouts, charities" },
          { href: "/demo/admin/sync", icon: Trophy, label: "Data Sync", desc: "ESPN sync info & demo timeline" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:bg-primary/5 transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <link.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <p className="text-sm font-semibold">{link.label}</p>
            </div>
            <p className="text-xs text-muted-foreground">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}
