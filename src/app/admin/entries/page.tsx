"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ClipboardList, Loader2, Search, ChevronLeft, ChevronRight,
  Trash2, PlusCircle, MinusCircle, Download,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface EntryPick {
  id: string
  team: { name: string; shortName: string; seed: number; eliminated: boolean } | null
  playInSlot: {
    seed: number
    region: string
    team1: { shortName: string }
    team2: { shortName: string }
    winner: { shortName: string } | null
  } | null
}

interface EntryData {
  id: string
  entryNumber: number
  nickname: string | null
  score: number
  maxPossibleScore: number
  teamsAlive: number
  draftInProgress: boolean
  createdAt: string
  user: {
    firstName: string | null
    lastName: string | null
    username: string | null
    email: string
  }
  league: { name: string } | null
  entryPicks: EntryPick[]
}

const PAGE_SIZE = 20

function getSeedColorClasses(seed: number): string {
  if (seed <= 4) return "bg-sky-800/20 text-sky-300 border-sky-800/30"
  if (seed <= 8) return "bg-orange-500/20 text-orange-400 border-orange-500/30"
  if (seed <= 12) return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
  return "bg-amber-800/20 text-amber-600 border-amber-800/30"
}

export default function AdminEntriesPage() {
  const [entries, setEntries] = useState<EntryData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        skip: String(page * PAGE_SIZE),
        take: String(PAGE_SIZE),
      })
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/entries?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries)
        setTotal(data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(0)
    fetchEntries()
  }

  async function handleVoidEntry(entryId: string, playerName: string) {
    const confirmed = window.confirm(
      `Void entry slip for ${playerName}?\n\nThis will permanently delete this entry slip and all associated picks. This cannot be undone.`
    )
    if (!confirmed) return

    setActionLoading(entryId)
    try {
      const res = await fetch("/api/admin/entries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, action: "void", reason: "Admin voided entry slip" }),
      })
      if (res.ok) {
        toast.success("Entry slip voided successfully")
        fetchEntries()
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed to void entry slip")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleScoreAdjust(entryId: string, adjustment: number) {
    const direction = adjustment > 0 ? "add" : "subtract"
    const amount = Math.abs(adjustment)
    const confirmed = window.confirm(
      `${direction === "add" ? "Add" : "Subtract"} ${amount} point(s) ${direction === "add" ? "to" : "from"} this entry slip's score?`
    )
    if (!confirmed) return

    setActionLoading(entryId)
    try {
      const res = await fetch("/api/admin/entries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId,
          action: "adjustScore",
          scoreAdjustment: adjustment,
          reason: `Manual ${direction} of ${amount} points`,
        }),
      })
      if (res.ok) {
        toast.success("Score adjusted successfully")
        fetchEntries()
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed to adjust score")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setActionLoading(null)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Entry Slip Management</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            View, search, and manage player entry slips. Void entries or adjust scores if needed.
          </p>
        </div>
        <a
          href="/api/admin/export"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, username, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-muted/50"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="h-9">
          Search
        </Button>
      </form>

      {/* Entry list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No entry slips found</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {entries.map((entry) => {
              const isExpanded = expandedId === entry.id
              const playerName = [entry.user.firstName, entry.user.lastName].filter(Boolean).join(" ") || entry.user.email
              const displayName = entry.nickname
                ? `${entry.nickname} (${playerName} ${entry.entryNumber})`
                : entry.entryNumber > 1
                  ? `${playerName} ${entry.entryNumber}`
                  : playerName

              return (
                <div
                  key={entry.id}
                  className="bg-card border border-border rounded-xl overflow-hidden"
                >
                  {/* Summary row */}
                  <button
                    className="w-full text-left p-4 hover:bg-muted/20 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{displayName}</span>
                          {entry.user.username && (
                            <span className="text-xs text-muted-foreground">@{entry.user.username}</span>
                          )}
                          {entry.draftInProgress && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border bg-amber-500/20 text-amber-400 border-amber-500/30">
                              Draft
                            </span>
                          )}
                          {entry.league && (
                            <span className="text-[10px] text-muted-foreground">
                              League: {entry.league.name}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {entry.user.email}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-right">
                        <div>
                          <div className="text-lg font-bold tabular-nums">{entry.score}</div>
                          <div className="text-[10px] text-muted-foreground">pts</div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <div>{entry.teamsAlive}/8 alive</div>
                          <div>Max: {entry.maxPossibleScore}</div>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 py-4 bg-muted/10">
                      {/* Picks */}
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">PICKS ({entry.entryPicks.length}/8)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {entry.entryPicks.map((pick) => {
                            if (pick.team) {
                              const color = getSeedColorClasses(pick.team.seed)
                              return (
                                <span
                                  key={pick.id}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${color} ${pick.team.eliminated ? "opacity-50 line-through" : ""}`}
                                >
                                  #{pick.team.seed} {pick.team.shortName}
                                </span>
                              )
                            }
                            if (pick.playInSlot) {
                              const slot = pick.playInSlot
                              return (
                                <span
                                  key={pick.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-muted/50 text-muted-foreground border-border"
                                >
                                  #{slot.seed} {slot.winner?.shortName ?? `${slot.team1.shortName}/${slot.team2.shortName}`}
                                  <span className="text-[8px]">({slot.region})</span>
                                </span>
                              )
                            }
                            return null
                          })}
                          {entry.entryPicks.length === 0 && (
                            <span className="text-xs text-muted-foreground/50">No picks yet</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          disabled={actionLoading === entry.id}
                          onClick={() => handleScoreAdjust(entry.id, 1)}
                        >
                          <PlusCircle className="h-3 w-3" />
                          +1 pt
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          disabled={actionLoading === entry.id}
                          onClick={() => handleScoreAdjust(entry.id, -1)}
                        >
                          <MinusCircle className="h-3 w-3" />
                          -1 pt
                        </Button>
                        <div className="flex-1" />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                          disabled={actionLoading === entry.id}
                          onClick={() => handleVoidEntry(entry.id, playerName)}
                        >
                          {actionLoading === entry.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          Void Entry Slip
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-3 w-3" />
                Prev
              </Button>
              <span className="tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                Next
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
