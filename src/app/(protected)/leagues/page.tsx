"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Users, Plus, LogIn, Copy, Check, Loader2, Trophy, Crown, Trash2,
} from "lucide-react"
import { toast } from "sonner"

interface LeagueListItem {
  id: string
  name: string
  inviteCode: string
  isAdmin: boolean
  adminName: string
  memberCount: number
  createdAt: string
}

export default function LeaguesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [leagues, setLeagues] = useState<LeagueListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [newLeagueName, setNewLeagueName] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchLeagues = useCallback(async () => {
    try {
      const res = await fetch("/api/leagues")
      if (res.ok) {
        setLeagues(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeagues()
  }, [fetchLeagues])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLeagueName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to create league")
        return
      }
      toast.success(`League "${data.name}" created! Invite code: ${data.inviteCode}`)
      setNewLeagueName("")
      setShowCreate(false)
      fetchLeagues()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setCreating(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setJoining(true)
    try {
      const res = await fetch("/api/leagues/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to join league")
        return
      }
      toast.success(`Joined "${data.name}"!`)
      setInviteCode("")
      setShowJoin(false)
      fetchLeagues()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setJoining(false)
    }
  }

  async function handleDelete(leagueId: string, leagueName: string) {
    if (!confirm(`Delete "${leagueName}"? This will remove all members.`)) return
    try {
      const res = await fetch(`/api/leagues/${leagueId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("League deleted")
        fetchLeagues()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to delete league")
      }
    } catch {
      toast.error("Something went wrong")
    }
  }

  function copyInviteCode(code: string, leagueId: string) {
    navigator.clipboard.writeText(code)
    setCopiedId(leagueId)
    toast.success("Invite code copied!")
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Private Leagues</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Compete with friends and coworkers. You appear on both the global and league leaderboards.
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          onClick={() => { setShowCreate(true); setShowJoin(false) }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create League
        </Button>
        <Button
          variant="outline"
          onClick={() => { setShowJoin(true); setShowCreate(false) }}
          className="gap-2"
        >
          <LogIn className="h-4 w-4" />
          Join League
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-3">Create a New League</h3>
          <form onSubmit={handleCreate} className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="leagueName" className="text-sm">League name</Label>
              <Input
                id="leagueName"
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
                placeholder="e.g. Office Pool 2026"
                required
                minLength={3}
                maxLength={50}
                className="h-10 bg-muted/50"
              />
            </div>
            <Button type="submit" disabled={creating || !newLeagueName.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </form>
        </div>
      )}

      {/* Join form */}
      {showJoin && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-3">Join a League</h3>
          <form onSubmit={handleJoin} className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="inviteCode" className="text-sm">Invite code</Label>
              <Input
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. A1B2C3D4"
                required
                className="h-10 bg-muted/50 font-mono tracking-wider uppercase"
              />
            </div>
            <Button type="submit" disabled={joining || !inviteCode.trim()}>
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowJoin(false)}>
              Cancel
            </Button>
          </form>
        </div>
      )}

      {/* League list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : leagues.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No leagues yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Create a league and share the invite code with friends!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leagues.map((league) => (
            <div
              key={league.id}
              className="bg-card border border-border rounded-xl p-5 hover:border-border/80 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg truncate">{league.name}</h3>
                    {league.isAdmin && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                        <Crown className="h-2.5 w-2.5" />
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{league.memberCount} member{league.memberCount !== 1 ? "s" : ""}</span>
                    <span>Created by {league.adminName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Invite code */}
                  <button
                    onClick={() => copyInviteCode(league.inviteCode, league.id)}
                    className="flex items-center gap-1.5 text-xs font-mono bg-muted/50 hover:bg-muted px-3 py-1.5 rounded-lg border border-border transition-colors"
                    title="Copy invite code"
                  >
                    {copiedId === league.id ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {league.inviteCode}
                  </button>
                  {league.isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                      onClick={() => handleDelete(league.id, league.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
