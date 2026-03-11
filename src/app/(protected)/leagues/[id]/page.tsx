"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft, Crown, Copy, Check, Loader2, Users, Settings, Trash2,
  LogOut, DollarSign, ChevronDown, ChevronUp,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface LeagueMember {
  leagueEntryId: string
  entryId: string
  userId: string
  name: string
  entryNumber: number
  score: number
  paid: boolean
  joinedAt: string
}

interface LeagueDetail {
  id: string
  name: string
  inviteCode: string
  description: string | null
  maxEntries: number | null
  trackPayments: boolean
  isAdmin: boolean
  adminName: string
  members: LeagueMember[]
  createdAt: string
}

export default function LeagueDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { data: session } = useSession()

  const [league, setLeague] = useState<LeagueDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Settings form state
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editMaxEntries, setEditMaxEntries] = useState("")
  const [editTrackPayments, setEditTrackPayments] = useState(false)

  const fetchLeague = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${id}`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to load league")
        return
      }
      const data: LeagueDetail = await res.json()
      setLeague(data)
      setEditName(data.name)
      setEditDescription(data.description ?? "")
      setEditMaxEntries(data.maxEntries != null ? String(data.maxEntries) : "")
      setEditTrackPayments(data.trackPayments)
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchLeague()
  }, [fetchLeague])

  function handleCopyCode() {
    if (!league) return
    navigator.clipboard.writeText(league.inviteCode)
    setCopied(true)
    toast.success("Invite code copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSaveSettings() {
    if (!league) return
    setSaving(true)
    try {
      const res = await fetch(`/api/leagues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          maxEntries: editMaxEntries ? Number(editMaxEntries) : null,
          trackPayments: editTrackPayments,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to save settings")
        return
      }
      toast.success("Settings saved")
      setShowSettings(false)
      fetchLeague()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleTogglePaid(leagueEntryId: string, currentPaid: boolean) {
    try {
      const res = await fetch(`/api/leagues/${id}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueEntryId, paid: !currentPaid }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to update payment status")
        return
      }
      fetchLeague()
    } catch {
      toast.error("Something went wrong")
    }
  }

  async function handleLeave() {
    setLeaving(true)
    try {
      const res = await fetch(`/api/leagues/${id}/leave`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to leave league")
        return
      }
      toast.success("Left the league")
      router.push("/leagues")
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLeaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/leagues/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to delete league")
        return
      }
      toast.success("League deleted")
      router.push("/leagues")
    } catch {
      toast.error("Something went wrong")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !league) {
    return (
      <div className="space-y-4">
        <Link href="/leagues" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to leagues
        </Link>
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <p className="text-muted-foreground">{error || "League not found"}</p>
        </div>
      </div>
    )
  }

  // Rank members by score desc
  const rankedMembers = [...league.members].sort((a, b) => b.score - a.score)

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/leagues" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to leagues
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">{league.name}</h1>
          {league.isAdmin && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
              <Crown className="h-2.5 w-2.5" />
              Admin
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {league.members.length} entr{league.members.length !== 1 ? "ies" : "y"}
          </span>
          <span>Admin: {league.adminName}</span>
          <span>Created {new Date(league.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Description */}
      {league.description && (
        <div className="bg-muted/30 border border-border rounded-xl p-4 text-sm text-muted-foreground">
          {league.description}
        </div>
      )}

      {/* Invite section */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-medium mb-3">Invite Code</p>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-muted/50 border border-border rounded-lg px-4 py-2.5 font-mono text-lg tracking-widest text-center">
            {league.inviteCode}
          </code>
          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={handleCopyCode}>
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Share this code with friends so they can join your league.
        </p>
      </div>

      {/* Settings (admin only) */}
      {league.isAdmin && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">League Settings</span>
            </div>
            {showSettings ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {showSettings && (
            <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="leagueName" className="text-sm">League Name</Label>
                <Input
                  id="leagueName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-muted/50"
                  minLength={3}
                  maxLength={50}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm">Description</Label>
                <Textarea
                  id="description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add a description for your league..."
                  className="bg-muted/50 min-h-[80px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="maxEntries" className="text-sm">Max Entries</Label>
                <Input
                  id="maxEntries"
                  type="number"
                  min={1}
                  value={editMaxEntries}
                  onChange={(e) => setEditMaxEntries(e.target.value)}
                  placeholder="Unlimited"
                  className="bg-muted/50 max-w-[200px]"
                />
                <p className="text-xs text-muted-foreground">Leave blank for unlimited entries.</p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm">Track Payments</Label>
                  <p className="text-xs text-muted-foreground">Track who has paid their entry fee.</p>
                </div>
                <Switch
                  checked={editTrackPayments}
                  onCheckedChange={setEditTrackPayments}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveSettings} disabled={saving} size="sm">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Settings"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Members table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-sm">Members</h2>
        </div>

        {rankedMembers.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No members yet
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Table header */}
            <div className={`grid ${league.trackPayments ? "grid-cols-[2rem_1fr_4rem_4rem_6rem]" : "grid-cols-[2rem_1fr_4rem_6rem]"} gap-3 px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`}>
              <span>#</span>
              <span>Player</span>
              <span className="text-right">Score</span>
              {league.trackPayments && <span className="text-center">Paid</span>}
              <span className="text-right">Joined</span>
            </div>

            {rankedMembers.map((member, i) => {
              const isMe = member.userId === session?.user?.id
              const isLeagueAdmin = member.userId === league.adminName // simplified — compare with actual admin data
              const rank = i + 1

              return (
                <div
                  key={member.leagueEntryId}
                  className={`grid ${league.trackPayments ? "grid-cols-[2rem_1fr_4rem_4rem_6rem]" : "grid-cols-[2rem_1fr_4rem_6rem]"} gap-3 px-5 py-3 items-center ${isMe ? "bg-primary/5" : "hover:bg-muted/30"} transition-colors`}
                >
                  <span className="text-sm font-mono text-muted-foreground">{rank}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium truncate ${isMe ? "text-primary" : ""}`}>
                        {member.name}
                      </span>
                      {member.entryNumber > 1 && (
                        <span className="text-[10px] text-muted-foreground">#{member.entryNumber}</span>
                      )}
                      {isMe && (
                        <span className="text-[10px] font-medium text-primary bg-primary/10 rounded px-1.5 py-0.5">You</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-mono text-right">{member.score}</span>
                  {league.trackPayments && (
                    <div className="flex justify-center">
                      {league.isAdmin ? (
                        <button
                          onClick={() => handleTogglePaid(member.leagueEntryId, member.paid)}
                          className={`text-[10px] font-semibold rounded-full px-2 py-0.5 transition-colors ${
                            member.paid
                              ? "bg-green-500/15 text-green-500 hover:bg-green-500/25"
                              : "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                          }`}
                        >
                          {member.paid ? "Paid" : "Unpaid"}
                        </button>
                      ) : (
                        <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                          member.paid
                            ? "bg-green-500/15 text-green-500"
                            : "bg-red-500/15 text-red-400"
                        }`}>
                          {member.paid ? "Paid" : "Unpaid"}
                        </span>
                      )}
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground text-right">
                    {new Date(member.joinedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {league.isAdmin ? (
          <>
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete League
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-destructive">Are you sure?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Delete"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            {!showLeaveConfirm ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowLeaveConfirm(true)}
              >
                <LogOut className="h-3.5 w-3.5" />
                Leave League
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Leave this league?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleLeave}
                  disabled={leaving}
                >
                  {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Leave"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowLeaveConfirm(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
