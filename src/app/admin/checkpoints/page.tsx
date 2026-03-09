"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  CheckCircle2, Plus, Loader2, RefreshCw, Trash2, ChevronDown, ChevronUp,
} from "lucide-react"
import { toast } from "sonner"

interface DimensionSnapshot {
  id: string
  dimensionType: string
  dimensionValue: string
  leaderEntryId: string | null
  medianEntryId: string | null
  totalEntries: number
  rollingOptimal8Score: number | null
  hindsightOptimal8Score: number | null
}

interface CheckpointData {
  id: string
  gameIndex: number
  roundLabel: string
  isSession: boolean
  dailyRecapSentAt: string | null
  createdAt: string
  dimensionCount: number
  dimensions: DimensionSnapshot[]
}

const ROUND_LABELS = [
  "First Four",
  "Round of 64",
  "Round of 32",
  "Sweet 16",
  "Elite 8",
  "Final Four",
  "National Championship",
]

export default function CheckpointsPage() {
  const [checkpoints, setCheckpoints] = useState<CheckpointData[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newGameIndex, setNewGameIndex] = useState(0)
  const [newRoundLabel, setNewRoundLabel] = useState("Round of 64")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [recalculating, setRecalculating] = useState<string | null>(null)

  const fetchCheckpoints = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/checkpoints")
      if (res.ok) {
        const data = await res.json()
        setCheckpoints(data.checkpoints)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCheckpoints()
  }, [fetchCheckpoints])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch("/api/admin/checkpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameIndex: newGameIndex,
          roundLabel: newRoundLabel,
          isSession: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to create checkpoint")
        return
      }
      toast.success(`Checkpoint created: ${newRoundLabel}`)
      setShowCreate(false)
      fetchCheckpoints()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setCreating(false)
    }
  }

  async function handleRecalculate(checkpointId: string) {
    setRecalculating(checkpointId)
    try {
      const res = await fetch("/api/admin/checkpoints", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpointId, action: "recalculate" }),
      })
      if (res.ok) {
        toast.success("Dimension snapshots recalculated")
        fetchCheckpoints()
      } else {
        const data = await res.json()
        toast.error(data.error || "Recalculation failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setRecalculating(null)
    }
  }

  async function handleDelete(checkpoint: CheckpointData) {
    const confirmed = window.confirm(
      `Delete checkpoint "${checkpoint.roundLabel}" (game ${checkpoint.gameIndex})?\n\nThis will also delete all ${checkpoint.dimensionCount} dimension snapshots. This cannot be undone.`
    )
    if (!confirmed) return

    try {
      const res = await fetch(`/api/admin/checkpoints?id=${checkpoint.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        toast.success("Checkpoint deleted")
        fetchCheckpoints()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to delete")
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
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Checkpoints</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            View and manage tournament checkpoints. Checkpoints capture leaderboard state at key moments.
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="gap-2">
          <Plus className="h-4 w-4" />
          Manual Checkpoint
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Create Manual Checkpoint</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="gameIndex" className="text-sm">Game Index</Label>
                <Input
                  id="gameIndex"
                  type="number"
                  value={newGameIndex}
                  onChange={(e) => setNewGameIndex(parseInt(e.target.value))}
                  min={0}
                  required
                  className="h-10 bg-muted/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="roundLabel" className="text-sm">Round Label</Label>
                <select
                  id="roundLabel"
                  value={newRoundLabel}
                  onChange={(e) => setNewRoundLabel(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm"
                >
                  {ROUND_LABELS.map((label) => (
                    <option key={label} value={label}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Checkpoint"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Checkpoint list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : checkpoints.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No checkpoints yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Checkpoints are created automatically when rounds complete, or manually above.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {checkpoints.map((cp) => {
            const isExpanded = expandedId === cp.id
            const isRecalc = recalculating === cp.id
            return (
              <div
                key={cp.id}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold">{cp.roundLabel}</h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-blue-500/20 text-blue-400 border-blue-500/30">
                          Game {cp.gameIndex}
                        </span>
                        {cp.isSession && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-green-500/20 text-green-400 border-green-500/30">
                            Session
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{cp.dimensionCount} dimension snapshots</span>
                        <span>Created {new Date(cp.createdAt).toLocaleString()}</span>
                        {cp.dailyRecapSentAt && (
                          <span>Recap sent {new Date(cp.dailyRecapSentAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => handleRecalculate(cp.id)}
                        disabled={isRecalc}
                      >
                        {isRecalc ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Recalculate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(cp)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setExpandedId(isExpanded ? null : cp.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Dimension snapshots detail */}
                {isExpanded && cp.dimensions.length > 0 && (
                  <div className="border-t border-border bg-muted/30 px-5 py-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Dimension Snapshots
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-muted-foreground border-b border-border/50">
                            <th className="pb-2 pr-4">Type</th>
                            <th className="pb-2 pr-4">Value</th>
                            <th className="pb-2 pr-4">Entries</th>
                            <th className="pb-2 pr-4">Leader ID</th>
                            <th className="pb-2 pr-4">Median ID</th>
                            <th className="pb-2 pr-4">Rolling O8</th>
                            <th className="pb-2">Hindsight O8</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cp.dimensions.map((dim) => (
                            <tr key={dim.id} className="border-b border-border/20">
                              <td className="py-1.5 pr-4 font-medium">{dim.dimensionType}</td>
                              <td className="py-1.5 pr-4">{dim.dimensionValue}</td>
                              <td className="py-1.5 pr-4 font-mono">{dim.totalEntries}</td>
                              <td className="py-1.5 pr-4 font-mono text-muted-foreground truncate max-w-[120px]">
                                {dim.leaderEntryId ? dim.leaderEntryId.slice(0, 8) + "..." : "—"}
                              </td>
                              <td className="py-1.5 pr-4 font-mono text-muted-foreground truncate max-w-[120px]">
                                {dim.medianEntryId ? dim.medianEntryId.slice(0, 8) + "..." : "—"}
                              </td>
                              <td className="py-1.5 pr-4 font-mono">{dim.rollingOptimal8Score ?? "—"}</td>
                              <td className="py-1.5 font-mono">{dim.hindsightOptimal8Score ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
