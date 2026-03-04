import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Users, Trophy, Settings, RefreshCw, CheckCircle2, Clock, BarChart3, Database } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

async function getStats() {
  const [userCount, pickCount, teamCount, settings] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { picks: { some: {} } } }),
    prisma.team.count({ where: { isPlayIn: false } }),
    prisma.appSettings.findUnique({ where: { id: "main" } }),
  ])
  const paidCount = await prisma.user.count({ where: { isPaid: true, picks: { some: {} } } })
  return { userCount, pickCount, teamCount, paidCount, settings }
}

export default async function AdminDashboardPage() {
  const session = await auth()
  const { userCount, pickCount, teamCount, paidCount, settings } = await getStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Signed in as{" "}
          <span className="text-foreground font-medium">{session?.user?.name ?? session?.user?.email}</span>{" "}
          <span className="text-primary text-xs font-semibold">({session?.user?.role})</span>
        </p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Entries" value={pickCount} color="text-blue-400" />
        <StatCard icon={CheckCircle2} label="Paid" value={paidCount} color="text-green-400" />
        <StatCard icon={BarChart3} label="Total Users" value={userCount} color="text-primary" />
        <StatCard icon={Database} label="Teams in DB" value={teamCount} color="text-violet-400" />
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Picks Deadline</h3>
          </div>
          {settings?.picksDeadline ? (
            <p className="text-sm text-foreground font-medium">
              {new Date(settings.picksDeadline).toLocaleString()}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Not set</p>
          )}
          <Button asChild variant="outline" size="sm" className="mt-4 h-7 text-xs">
            <Link href="/admin/settings">Edit settings</Link>
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Tournament Data</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Pull latest game results and team data from ESPN.
          </p>
          <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1.5">
            <Link href="/admin/sync">
              <RefreshCw className="h-3 w-3" />
              Go to ESPN Sync
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick nav cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { href: "/admin/seasons", icon: Trophy, label: "Seasons", desc: "Create and manage tournament seasons" },
          { href: "/admin/users", icon: Users, label: "Manage Users", desc: "Mark paid, change roles" },
          { href: "/admin/content", icon: Settings, label: "Content Pages", desc: "Edit rules, prizes, info pages" },
          { href: "/admin/settings", icon: Trophy, label: "Pool Settings", desc: "Deadline, payouts, charities" },
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
