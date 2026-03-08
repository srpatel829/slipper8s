"use client"

import { useState, useEffect, useCallback } from "react"
import { Shirt, Loader2, Search, Save, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

const CONFERENCES = [
  "ACC", "American", "Atlantic 10", "Big 12", "Big East", "Big Ten",
  "Big West", "CAA", "Conference USA", "Horizon", "Ivy League",
  "MAAC", "MAC", "MEAC", "Missouri Valley", "Mountain West",
  "NEC", "Ohio Valley", "Pac-12", "Patriot", "SEC",
  "Southern", "Southland", "Summit", "Sun Belt", "SWAC",
  "WAC", "WCC",
]

interface TeamData {
  id: string
  name: string
  shortName: string
  seed: number
  region: string
  conference: string | null
  eliminated: boolean
  wins: number
}

function getSeedColorClasses(seed: number): string {
  if (seed <= 4) return "bg-sky-800/20 text-sky-300 border-sky-800/30"
  if (seed <= 8) return "bg-orange-500/20 text-orange-400 border-orange-500/30"
  if (seed <= 12) return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
  return "bg-amber-800/20 text-amber-600 border-amber-800/30"
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [changes, setChanges] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const fetchTeams = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/teams")
      if (res.ok) {
        const data = await res.json()
        setTeams(data.teams)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  function handleConferenceChange(teamId: string, conference: string) {
    setChanges(prev => ({ ...prev, [teamId]: conference === "none" ? "" : conference }))
  }

  async function handleSaveAll() {
    const updates = Object.entries(changes).map(([teamId, conference]) => ({
      teamId,
      conference: conference || null,
    }))

    if (updates.length === 0) {
      toast.info("No changes to save")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Updated conference for ${data.updated} team(s)`)
        setChanges({})
        fetchTeams()
      } else {
        const data = await res.json()
        toast.error(data.error ?? "Failed to save")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const filteredTeams = teams.filter(t =>
    !search ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.shortName.toLowerCase().includes(search.toLowerCase()) ||
    (t.conference ?? "").toLowerCase().includes(search.toLowerCase()) ||
    t.region.toLowerCase().includes(search.toLowerCase())
  )

  // Group by conference for easier viewing
  const conferences = new Map<string, TeamData[]>()
  for (const team of filteredTeams) {
    const conf = team.conference ?? "Unassigned"
    if (!conferences.has(conf)) conferences.set(conf, [])
    conferences.get(conf)!.push(team)
  }

  const pendingCount = Object.keys(changes).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shirt className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Team Conferences</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Assign or update conference mappings for tournament teams. Changes apply immediately to leaderboard filters.
          </p>
        </div>
        {pendingCount > 0 && (
          <Button onClick={handleSaveAll} disabled={saving} className="gap-2 shrink-0">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save {pendingCount} change{pendingCount !== 1 ? "s" : ""}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search teams, conferences, regions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 bg-muted/50"
        />
      </div>

      {/* Team list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(conferences.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([confName, confTeams]) => (
              <div key={confName}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold">{confName}</h3>
                  <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                    {confTeams.length} team{confTeams.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="divide-y divide-border/50">
                    {confTeams
                      .sort((a, b) => a.seed - b.seed || a.name.localeCompare(b.name))
                      .map((team) => {
                        const seedColor = getSeedColorClasses(team.seed)
                        const hasChange = team.id in changes
                        const currentConf = hasChange ? changes[team.id] : (team.conference ?? "")

                        return (
                          <div
                            key={team.id}
                            className={`flex items-center gap-3 px-4 py-2.5 ${hasChange ? "bg-primary/5" : ""}`}
                          >
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${seedColor}`}>
                              #{team.seed}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm font-medium ${team.eliminated ? "text-muted-foreground line-through" : ""}`}>
                                {team.name}
                              </span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {team.region}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {hasChange && (
                                <Check className="h-3 w-3 text-primary" />
                              )}
                              <Select
                                value={currentConf || "none"}
                                onValueChange={(v) => handleConferenceChange(team.id, v)}
                              >
                                <SelectTrigger className="h-7 w-[140px] text-xs">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">
                                    <span className="text-muted-foreground">None</span>
                                  </SelectItem>
                                  {CONFERENCES.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
