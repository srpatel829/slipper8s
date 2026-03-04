"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Menu, Trophy, BarChart3, Target, Zap, Play, Settings,
  Users, LogOut, ChevronDown, Crown, X, Grid2X2, GitBranch
} from "lucide-react"
import type { Session } from "next-auth"
import { ThemeToggle } from "@/components/layout/theme-toggle"

interface NavbarProps {
  session: Session | null
  demoMode?: boolean
  linkPrefix?: string
}

const NAV_LINKS = [
  { href: "/leaderboard", label: "Leaderboard", icon: BarChart3 },
  { href: "/picks", label: "My Picks", icon: Target },
  { href: "/scores", label: "Scores", icon: Zap },
  { href: "/bracket", label: "Bracket", icon: GitBranch },
  { href: "/simulator", label: "Simulator", icon: Play },
  { href: "/teams", label: "Teams", icon: Grid2X2 },
  { href: "/leagues", label: "Leagues", icon: Users },
]

export function Navbar({ session, demoMode, linkPrefix = "" }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const user = session?.user
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN"

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?"

  // Prefix hrefs for demo mode
  const prefixHref = (href: string) => `${linkPrefix}${href}`

  // Check if a nav link is active (works with both /demo/leaderboard and /leaderboard)
  const isActive = (href: string) => {
    const fullHref = prefixHref(href)
    return pathname === fullHref || (fullHref !== linkPrefix + "/" && pathname.startsWith(fullHref))
  }

  const isAdminActive = pathname.startsWith(prefixHref("/admin"))

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 gap-4">
        {/* Logo */}
        <Link href={user ? prefixHref("/leaderboard") : "/"} className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
            <Trophy className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-base tracking-tight">Slipper8s</span>
          {demoMode && (
            <Badge variant="outline" className="text-[10px] h-4 border-primary/40 text-primary">
              Demo
            </Badge>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          {user && NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={prefixHref(href)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            )
          })}
          {isAdmin && (
            <Link
              href={prefixHref("/admin")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isAdminActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
            >
              <Settings className="h-3.5 w-3.5" />
              Admin
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme toggle — desktop only */}
          <div className="hidden md:flex">
            <ThemeToggle />
          </div>

          {/* Demo link (desktop) — hide when already in demo */}
          {!demoMode && (
            <Link href="/demo" className="hidden lg:flex">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground gap-1.5">
                <Play className="h-3 w-3" />
                Demo
              </Button>
            </Link>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 h-8 px-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    {initials}
                  </div>
                  <span className="hidden sm:block text-xs max-w-[100px] truncate">
                    {user.name ?? user.email}
                  </span>
                  {user.role === "SUPERADMIN" && (
                    <Crown className="h-3 w-3 text-amber-400 hidden sm:block" />
                  )}
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-medium truncate">{user.name ?? user.email}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Badge variant="outline" className="text-[10px] h-4">{user.role}</Badge>
                    {user.isPaid ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] h-4">Paid</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-4 text-red-400 border-red-500/30">Unpaid</Badge>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href={prefixHref("/admin")} className="gap-2 text-sm">
                        <Settings className="h-3.5 w-3.5" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={prefixHref("/admin/users")} className="gap-2 text-sm">
                        <Users className="h-3.5 w-3.5" />
                        Manage Users
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {demoMode ? (
                  <DropdownMenuItem
                    className="gap-2 text-sm cursor-pointer"
                    onClick={() => router.push("/")}
                  >
                    <X className="h-3.5 w-3.5" />
                    Exit Demo
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="gap-2 text-sm text-destructive focus:text-destructive cursor-pointer"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button size="sm" className="h-8 bg-primary text-primary-foreground hover:bg-primary/90">
                Sign in
              </Button>
            </Link>
          )}

          {/* Mobile hamburger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-4">
              <div className="flex items-center gap-2 mb-6">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="font-bold">Slipper8s</span>
                {demoMode && (
                  <Badge variant="outline" className="text-[10px] h-4 border-primary/40 text-primary">
                    Demo
                  </Badge>
                )}
              </div>
              <div className="space-y-0.5">
                {user && NAV_LINKS.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href)
                  return (
                    <Link
                      key={href}
                      href={prefixHref(href)}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-2.5 text-sm px-3 py-2.5 rounded-lg transition-colors ${active
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  )
                })}
                {isAdmin && (
                  <Link
                    href={prefixHref("/admin")}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 text-sm px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  >
                    <Settings className="h-4 w-4" />
                    Admin
                  </Link>
                )}
                {!demoMode && (
                  <Link
                    href="/demo"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 text-sm px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  >
                    <Play className="h-4 w-4" />
                    Demo Mode
                  </Link>
                )}
              </div>

              {user && (
                <div className="absolute bottom-6 left-4 right-4">
                  {demoMode ? (
                    <Button
                      variant="outline"
                      className="w-full gap-2 text-sm"
                      onClick={() => { router.push("/"); setOpen(false) }}
                    >
                      <X className="h-3.5 w-3.5" />
                      Exit Demo
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full gap-2 text-sm"
                      onClick={() => { signOut({ callbackUrl: "/" }); setOpen(false) }}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out
                    </Button>
                  )}
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
