import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Users, Trophy, Settings, RefreshCw, CheckCircle2, Clock, BarChart3, Database, Calendar, Download, ScrollText, Mail, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HealthBoard } from "@/components/admin/health-board"

export const dynamic = "force-dynamic"

async function getStats() {
  const [userCount, entryCount, teamCount, settings, recentAuditLogs] = await Promise.all([
    prisma.user.count(),
    prisma.entry.count(),
    prisma.team.count({ where: { isPlayIn: false } }),
    prisma.appSettings.findUnique({ where: { id: "main" } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ])
  const paidCount = await prisma.user.count({ where: { isPaid: true } })
  return { userCount, entryCount, teamCount, paidCount, settings, recentAuditLogs }
}

export default async function AdminDashboardPage() {
  const session = await auth()
  const { userCount, entryCount, teamCount, paidCount, settings, recentAuditLogs } = await getStats()

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

      {/* Maintenance mode banner */}
      {settings?.maintenanceMode && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-400">Maintenance Mode is ON</p>
            <p className="text-xs text-muted-foreground">All non-admin users are being redirected to the maintenance page.</p>
          </div>
          <Button asChild variant="outline" size="sm" className="h-7 text-xs border-amber-500/30 hover:bg-amber-500/10">
            <Link href="/admin/settings">Disable</Link>
          </Button>
        </div>
      )}

      {/* Health Board — green/red status at a glance */}
      <HealthBoard />

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Entries" value={entryCount} color="text-blue-400" />
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

      {/* Data export — Google Sheets fallback */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Download className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Data Export</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Download CSV files for Google Sheets. Use as fallback if the app has issues during the tournament.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <a href="/api/admin/export" download>
              <Download className="h-3 w-3" />
              All Entries + Picks
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <a href="/api/admin/export/players" download>
              <Download className="h-3 w-3" />
              Player Directory
            </a>
          </Button>
        </div>
      </div>

      {/* Email Status + Audit Log */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email notification status */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Automated Emails</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Deadline Reminder (24h)</span>
              {settings?.deadlineReminderSentAt ? (
                <span className="text-green-400 font-medium">
                  Sent {new Date(settings.deadlineReminderSentAt).toLocaleDateString()}
                </span>
              ) : (
                <span className="text-amber-400 font-medium">Pending</span>
              )}
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Entries Locked</span>
              {settings?.entriesLockedSentAt ? (
                <span className="text-green-400 font-medium">
                  Sent {new Date(settings.entriesLockedSentAt).toLocaleDateString()}
                </span>
              ) : (
                <span className="text-amber-400 font-medium">Pending</span>
              )}
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Daily Recap</span>
              <span className="text-muted-foreground/60 font-medium">Auto (per game day)</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">Final Results</span>
              {settings?.finalResultsSentAt ? (
                <span className="text-green-400 font-medium">
                  Sent {new Date(settings.finalResultsSentAt).toLocaleDateString()}
                </span>
              ) : (
                <span className="text-muted-foreground/60 font-medium">After tournament ends</span>
              )}
            </div>
          </div>
        </div>

        {/* Recent audit log */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Recent Activity</h3>
          </div>
          {recentAuditLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No admin actions recorded yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {recentAuditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-xs py-1 border-b border-border/30 last:border-0">
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {new Date(log.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-foreground font-medium truncate">{log.action}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick nav cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { href: "/admin/seasons", icon: Calendar, label: "Seasons", desc: "Create and manage tournament seasons" },
          { href: "/admin/users", icon: Users, label: "Manage Users", desc: "Mark paid, change roles" },
          { href: "/admin/content", icon: Settings, label: "Content Pages", desc: "Edit rules, prizes, info pages" },
          { href: "/admin/settings", icon: Trophy, label: "Pool Settings", desc: "Deadline, payouts, charities" },
          { href: "/admin/broadcast", icon: Mail, label: "Broadcast Email", desc: "Send email to all players" },
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
