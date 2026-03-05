import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import Link from "next/link"
import { LayoutDashboard, Users, Settings, RefreshCw, FileText, ShieldCheck, Calendar, Mail, ScrollText, ClipboardList } from "lucide-react"

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/seasons", label: "Seasons", icon: Calendar },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/entries", label: "Entries", icon: ClipboardList },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/sync", label: "ESPN Sync", icon: RefreshCw },
  { href: "/admin/content", label: "Content", icon: FileText },
  { href: "/admin/broadcast", label: "Broadcast", icon: Mail },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const role = session?.user?.role
  if (!session || (role !== "ADMIN" && role !== "SUPERADMIN")) {
    redirect("/leaderboard")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar session={session} />
      <div className="flex flex-1 container mx-auto px-4 py-6 gap-6">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col gap-0.5 w-48 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3 px-2">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Admin
            </p>
          </div>
          {adminLinks.map((link) => (
            <AdminLink key={link.href} href={link.href} label={link.label} icon={link.icon} />
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}

function AdminLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      {label}
    </Link>
  )
}
