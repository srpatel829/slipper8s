"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Calendar, Plus, Loader2, Check, Star, Settings2,
} from "lucide-react"
import { toast } from "sonner"

interface SeasonData {
  id: string
  year: number
  status: string
  entryDeadlineUtc: string | null
  entries: number
  leagues: number
  isCurrent: boolean
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  SETUP: { label: "Setup", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  REGISTRATION: { label: "Registration Open", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  LOCKED: { label: "Entries Locked", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  ACTIVE: { label: "Active (Tournament)", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  COMPLETED: { label: "Completed", color: "bg-muted text-muted-foreground border-border" },
}

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<SeasonData[]>([])
  const [currentSeasonId, setCurrentSeasonId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newYear, setNewYear] = useState(new Date().getFullYear())
  const [newDeadline, setNewDeadline] = useState("")
  const [setAsCurrent, setSetAsCurrent] = useState(true)

  const fetchSeasons = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/seasons")
      if (res.ok) {
        const data = await res.json()
        setSeasons(data.seasons)
        setCurrentSeasonId(data.currentSeasonId)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSeasons()
  }, [fetchSeasons])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch("/api/admin/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: newYear,
          entryDeadline: newDeadline || null,
          setAsCurrent,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to create season")
        return
      }
      toast.success(`Season ${data.year} created!`)
      setShowCreate(false)
      setNewDeadline("")
      fetchSeasons()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setCreating(false)
    }
  }

  async function handleStatusChange(seasonId: string, newStatus: string) {
    try {
      const res = await fetch("/api/admin/seasons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId, status: newStatus }),
      })
      if (res.ok) {
        toast.success(`Season status updated to ${STATUS_LABELS[newStatus]?.label ?? newStatus}`)
        fetchSeasons()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to update status")
      }
    } catch {
      toast.error("Something went wrong")
    }
  }

  async function handleSetCurrent(seasonId: string) {
    try {
      const res = await fetch("/api/admin/seasons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId, setAsCurrent: true }),
      })
      if (res.ok) {
        toast.success("Active season updated")
        fetchSeasons()
      }
    } catch {
      toast.error("Something went wrong")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Seasons</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage tournament seasons, set deadlines, and control season lifecycle.
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Season
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Create New Season</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="year" className="text-sm">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={newYear}
                  onChange={(e) => setNewYear(parseInt(e.target.value))}
                  min={2016}
                  max={2099}
                  required
                  className="h-10 bg-muted/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deadline" className="text-sm">Entry Deadline (UTC)</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="h-10 bg-muted/50"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={setAsCurrent}
                onChange={(e) => setSetAsCurrent(e.target.checked)}
                className="rounded border-border"
              />
              Set as active season
            </label>
            <div className="flex gap-3">
              <Button type="submit" disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Season"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Season list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : seasons.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No seasons created yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Create a season to start accepting entries.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {seasons.map((season) => {
            const statusInfo = STATUS_LABELS[season.status] ?? STATUS_LABELS.SETUP
            return (
              <div
                key={season.id}
                className={`bg-card border rounded-xl p-5 ${
                  season.isCurrent ? "border-primary/40" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{season.year}</h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      {season.isCurrent && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                          <Star className="h-2.5 w-2.5" />
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{season.entries} entries</span>
                      <span>{season.leagues} leagues</span>
                      {season.entryDeadlineUtc && (
                        <span>Deadline: {new Date(season.entryDeadlineUtc).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!season.isCurrent && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => handleSetCurrent(season.id)}
                      >
                        <Check className="h-3 w-3" />
                        Set Active
                      </Button>
                    )}
                    <Select
                      value={season.status}
                      onValueChange={(v) => handleStatusChange(season.id, v)}
                    >
                      <SelectTrigger className="h-8 w-[160px] text-xs">
                        <Settings2 className="h-3 w-3 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SETUP">Setup</SelectItem>
                        <SelectItem value="REGISTRATION">Registration Open</SelectItem>
                        <SelectItem value="LOCKED">Entries Locked</SelectItem>
                        <SelectItem value="ACTIVE">Active (Tournament)</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
