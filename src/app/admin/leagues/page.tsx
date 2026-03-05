"use client"

import { useState, useEffect, useCallback } from "react"
import { Users, Loader2, Search, Trash2, Copy, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface LeagueData {
  id: string
  name: string
  inviteCode: string
  admin: {
    firstName: string | null
    lastName: string | null
    username: string | null
    email: string
  }
  seasonYear: number
  memberCount: number
  createdAt: string
}

export default function AdminLeaguesPage() {
  const [leagues, setLeagues] = useState<LeagueData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchLeagues = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/leagues?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLeagues(data.leagues)
      }
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchLeagues()
  }, [fetchLeagues])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    fetchLeagues()
  }

  async function handleCopyCode(leagueId: string, code: string) {
    await navigator.clipboard.writeText(code)
    setCopiedId(leagueId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleDelete(leagueId: string, name: string, memberCount: number) {
    const confirmed = window.confirm(
      `Delete league "${name}"?\n\nThis league has ${memberCount} member(s). Their entries will be preserved but removed from this league.\n\nThis cannot be undone.`
    )
    if (!confirmed) return

    setDeletingId(leagueId)
    try {
      const res = await fetch("/api/admin/leagues", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId, reason: "Admin deleted league" }),
      })
      if (res.ok) {
        toast.success(`League "${name}" deleted`)
        fetchLeagues()
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed to delete league")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Private Leagues</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          View and manage all private leagues. Delete leagues with inappropriate names or if needed.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, or admin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-muted/50"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="h-9">
          Search
        </Button>
      </form>

      {/* Stats */}
      {!loading && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{leagues.length} league{leagues.length !== 1 ? "s" : ""}</span>
          <span>{leagues.reduce((sum, l) => sum + l.memberCount, 0)} total members</span>
        </div>
      )}

      {/* League list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : leagues.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No leagues found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leagues.map((league) => {
            const adminName = [league.admin.firstName, league.admin.lastName].filter(Boolean).join(" ") || league.admin.email

            return (
              <div
                key={league.id}
                className="bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{league.name}</h3>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border bg-muted/50 text-muted-foreground border-border">
                        {league.seasonYear}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                      <span>Admin: {adminName}</span>
                      <span>{league.memberCount} member{league.memberCount !== 1 ? "s" : ""}</span>
                      <span className="flex items-center gap-1">
                        Code:{" "}
                        <code className="font-mono bg-muted/50 px-1 py-0.5 rounded text-[10px]">
                          {league.inviteCode}
                        </code>
                        <button
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => handleCopyCode(league.id, league.inviteCode)}
                        >
                          {copiedId === league.id ? (
                            <Check className="h-3 w-3 text-green-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                    disabled={deletingId === league.id}
                    onClick={() => handleDelete(league.id, league.name, league.memberCount)}
                  >
                    {deletingId === league.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
