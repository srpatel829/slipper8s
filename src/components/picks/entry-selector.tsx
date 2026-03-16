"use client"

import { useRouter } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, FileText, Pencil, Check, X } from "lucide-react"
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
  userName?: string | null
}

export function EntrySelector({ entries, activeEntryId, seasonId, deadlinePassed, userName }: EntrySelectorProps) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showNicknamePrompt, setShowNicknamePrompt] = useState(false)
  const [nicknameInput, setNicknameInput] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const nicknameRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showNicknamePrompt && nicknameRef.current) nicknameRef.current.focus()
  }, [showNicknamePrompt])

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus()
  }, [editingId])

  function handleNewEntryClick() {
    // If this would be entry #2+, prompt for nickname
    if (entries.length >= 1) {
      const defaultName = `Entry Slip ${entries.length + 1}`
      setNicknameInput(defaultName)
      setShowNicknamePrompt(true)
    } else {
      createNewEntry(null)
    }
  }

  async function createNewEntry(nickname: string | null) {
    setCreating(true)
    setShowNicknamePrompt(false)
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonId,
          nickname: nickname?.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to create entry slip")
        return
      }
      const data = await res.json()
      toast.success(`Entry slip #${data.entryNumber} created`)
      router.push(`/picks?entry=${data.entryId}`)
      router.refresh()
    } finally {
      setCreating(false)
    }
  }

  async function renameEntry(entryId: string) {
    const name = editValue.trim()
    if (!name) {
      setEditingId(null)
      return
    }
    try {
      const res = await fetch("/api/entries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, nickname: name }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to rename entry slip")
        return
      }
      toast.success("Entry slip renamed")
      router.refresh()
    } finally {
      setEditingId(null)
    }
  }

  async function deleteEntry(entryId: string) {
    if (!confirm("Delete this entry slip? This cannot be undone.")) return
    setDeleting(entryId)
    try {
      const res = await fetch("/api/picks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to delete entry slip")
        return
      }
      toast.success("Entry slip deleted")
      router.push("/picks")
      router.refresh()
    } finally {
      setDeleting(null)
    }
  }

  function getEntryLabel(entry: EntryInfo) {
    if (entry.nickname) return entry.nickname
    if (userName && entries.length <= 1) return userName
    if (entry.leagueEntries.length > 0) return `${entry.leagueEntries[0].league.name} entry slip`
    if (entries.length > 1) return `Entry Slip #${entry.entryNumber}`
    return "My Entry Slip"
  }

  // Don't show selector if user has no entries
  if (entries.length === 0 && deadlinePassed) return null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {entries.map((entry) => {
          const isEditing = editingId === entry.id

          return (
            <div key={entry.id} className="flex items-center gap-1">
              {isEditing ? (
                <div className="flex items-center gap-1 bg-muted/50 border border-border rounded-md px-2 py-1">
                  <input
                    ref={editRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") renameEntry(entry.id)
                      if (e.key === "Escape") setEditingId(null)
                    }}
                    maxLength={30}
                    className="text-xs bg-transparent w-28 focus:outline-none"
                  />
                  <button
                    onClick={() => renameEntry(entry.id)}
                    className="text-green-400 hover:text-green-300"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <>
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
                  {!deadlinePassed && (
                    <button
                      onClick={() => {
                        setEditingId(entry.id)
                        setEditValue(entry.nickname || getEntryLabel(entry))
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Rename entry slip"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
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
                </>
              )}
            </div>
          )
        })}

        {!deadlinePassed && !showNicknamePrompt && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-dashed"
            onClick={handleNewEntryClick}
            disabled={creating}
          >
            <Plus className="h-3 w-3" />
            {creating ? "Creating..." : "New entry slip"}
          </Button>
        )}
      </div>

      {/* Nickname prompt for new entry */}
      {showNicknamePrompt && (
        <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg px-3 py-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Name this entry slip:</span>
          <input
            ref={nicknameRef}
            type="text"
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createNewEntry(nicknameInput)
              if (e.key === "Escape") setShowNicknamePrompt(false)
            }}
            maxLength={30}
            placeholder="e.g. Upset Special"
            className="text-xs bg-transparent border-b border-border px-1 py-0.5 flex-1 max-w-[200px] focus:outline-none focus:border-primary"
          />
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => createNewEntry(nicknameInput)}
            disabled={creating}
          >
            {creating ? "Creating..." : "Create"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowNicknamePrompt(false)}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
