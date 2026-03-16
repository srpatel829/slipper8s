"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ClipboardList, Loader2, Search, ChevronLeft, ChevronRight,
  Trash2, Download,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Image from "next/image"

interface EntryPick {
  id: string
  team: {
    name: string
    shortName: string
    seed: number
    eliminated: boolean
    wins: number
    logoUrl: string | null
  } | null
  playInSlot: {
    seed: number
    region: string
    team1: { shortName: string; logoUrl: string | null }
    team2: { shortName: string; logoUrl: string | null }
    winner: {
      shortName: string
      seed: number
      eliminated: boolean
      wins: number
      logoUrl: string | null
    } | null
  } | null
}

interface EntryData {
  id: string
  userId: string
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

function getResolvedTeam(pick: EntryPick) {
  return pick.team ?? pick.playInSlot?.winner ?? null
}

function computeAlive(entryPicks: EntryPick[]): number {
  return entryPicks.filter(p => {
    const team = getResolvedTeam(p)
    return team && !team.eliminated
  }).length
}

function computeScoreAndMax(entryPicks: EntryPick[]): { currentScore: number; maxScore: number } {
  let currentScore = 0
  let potentialRemaining = 0

  for (const p of entryPicks) {
    const team = getResolvedTeam(p)
    if (!team) continue
    const seed = p.team ? p.team.seed : p.playInSlot?.seed ?? 0
    const wins = team.wins ?? 0
    currentScore += seed * wins
    if (!team.eliminated) {
      potentialRemaining += seed * (6 - wins)
    }
  }

  return { currentScore, maxScore: currentScore + potentialRemaining }
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

  // Build multi-entry lookup
  const entriesPerUser = new Map<string, number>()
  entries.forEach(e => entriesPerUser.set(e.userId, (entriesPerUser.get(e.userId) ?? 0) + 1))

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
            View, search, and manage player entry slips. Void entries if needed.
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
              const isMulti = (entriesPerUser.get(entry.userId) ?? 1) > 1
              const displayName = isMulti
                ? `${entry.user.username ?? entry.user.email}${entry.nickname ? ` (${entry.nickname})` : ` (#${entry.entryNumber})`}`
                : (entry.user.username ?? entry.user.email)

              // Compute alive and max on-the-fly
              const computedAlive = computeAlive(entry.entryPicks)
              const { currentScore, maxScore } = computeScoreAndMax(entry.entryPicks)

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
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{displayName}</span>
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
                        {/* Inline picks with team logos */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {entry.entryPicks.map((pick) => {
                            const team = getResolvedTeam(pick)
                            if (!team) {
                              // Unresolved play-in slot
                              if (pick.playInSlot) {
                                const slot = pick.playInSlot
                                return (
                                  <span
                                    key={pick.id}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border bg-muted/50 text-muted-foreground border-border"
                                  >
                                    <span className="font-bold text-[9px] text-muted-foreground/70">
                                      {slot.seed}
                                    </span>
                                    {slot.team1.shortName}/{slot.team2.shortName}
                                  </span>
                                )
                              }
                              return null
                            }
                            const logoUrl = team.logoUrl
                            const seed = pick.team ? pick.team.seed : pick.playInSlot?.seed ?? 0
                            const eliminated = team.eliminated
                            return (
                              <span
                                key={pick.id}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border border-border/60 bg-muted/30 ${eliminated ? "opacity-40 line-through" : ""}`}
                              >
                                {logoUrl ? (
                                  <Image
                                    src={logoUrl}
                                    alt={team.shortName}
                                    width={16}
                                    height={16}
                                    className="rounded-sm shrink-0"
                                    unoptimized
                                  />
                                ) : (
                                  <span className="w-4 h-4 rounded-sm bg-muted-foreground/20 shrink-0" />
                                )}
                                <span className="font-bold text-[9px] text-muted-foreground/70">
                                  {seed}
                                </span>
                                <span>{team.shortName}</span>
                              </span>
                            )
                          })}
                          {entry.entryPicks.length === 0 && (
                            <span className="text-[10px] text-muted-foreground/50">No picks yet</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-right">
                        <div>
                          <div className="text-lg font-bold tabular-nums">{currentScore}</div>
                          <div className="text-[10px] text-muted-foreground">pts</div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <div>{computedAlive}/8 alive</div>
                          <div>Max: {maxScore}</div>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 py-4 bg-muted/10">
                      {/* Entry info */}
                      <div className="mb-4 text-xs text-muted-foreground space-y-1">
                        <div>
                          <span className="font-semibold text-muted-foreground/80">Email:</span> {entry.user.email}
                        </div>
                        {entry.user.username && (
                          <div>
                            <span className="font-semibold text-muted-foreground/80">Username:</span> @{entry.user.username}
                          </div>
                        )}
                        {entry.nickname && (
                          <div>
                            <span className="font-semibold text-muted-foreground/80">Entry name:</span> {entry.nickname}
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-muted-foreground/80">Created:</span>{" "}
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                        <div className="flex-1" />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                          disabled={actionLoading === entry.id}
                          onClick={() => handleVoidEntry(entry.id, displayName)}
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
