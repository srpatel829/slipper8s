"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

interface EntryInfo {
  id: string
  entryNumber: number
  nickname: string | null
  leagueEntries: { league: { id: string; name: string } }[]
  entryPicks: { id: string }[]
}

interface EntrySelectorProps {
  entries: EntryInfo[]
  activeEntryId: string | null
  seasonId: string
  deadlinePassed: boolean
}

export function EntrySelector({ entries, activeEntryId, seasonId, deadlinePassed }: EntrySelectorProps) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function createNewEntry() {
    setCreating(true)
    try {
      // Create an empty entry with placeholder picks — user will fill in the form
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to create entry")
        return
      }
      const data = await res.json()
      toast.success(`Entry #${data.entryNumber} created`)
      router.push(`/picks?entry=${data.entryId}`)
      router.refresh()
    } finally {
      setCreating(false)
    }
  }

  async function deleteEntry(entryId: string) {
    if (!confirm("Delete this entry? This cannot be undone.")) return
    setDeleting(entryId)
    try {
      const res = await fetch("/api/picks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to delete entry")
        return
      }
      toast.success("Entry deleted")
      router.push("/picks")
      router.refresh()
    } finally {
      setDeleting(null)
    }
  }

  function getEntryLabel(entry: EntryInfo) {
    if (entry.nickname) return entry.nickname
    if (entry.leagueEntries.length > 0) return `${entry.leagueEntries[0].league.name} entry`
    if (entries.length > 1) return `Entry #${entry.entryNumber}`
    return "My Entry"
  }

  // Don't show selector if user has 0 or 1 entries and deadline passed
  if (entries.length <= 1 && deadlinePassed) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-center gap-1">
          <Button
            variant={entry.id === activeEntryId ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 text-xs gap-1.5",
              entry.id === activeEntryId && "bg-primary text-primary-foreground"
            )}
            onClick={() => {
              router.push(`/picks?entry=${entry.id}`)
              router.refresh()
            }}
          >
            <FileText className="h-3 w-3" />
            {getEntryLabel(entry)}
            <span className="text-[10px] opacity-70">
              ({entry.entryPicks.length}/8)
            </span>
          </Button>
          {!deadlinePassed && entries.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => deleteEntry(entry.id)}
              disabled={deleting === entry.id}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}

      {!deadlinePassed && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 border-dashed"
          onClick={createNewEntry}
          disabled={creating}
        >
          <Plus className="h-3 w-3" />
          {creating ? "Creating..." : "New entry"}
        </Button>
      )}
    </div>
  )
}
