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
  LogOut, DollarSign, ChevronDown, ChevronUp, X, Share2, UserMinus,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface LeagueMember {
  leagueMemberId: string
  userId: string
  name: string
  score: number
  paid: boolean
  joinedAt: string
  entryCount: number
}

interface LeagueDetail {
  id: string
  name: string
  inviteCode: string
  description: string | null
  maxEntries: number | null
  trackPayments: boolean
  isAdmin: boolean
  adminId: string
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
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)

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

  async function handleTogglePaid(leagueMemberId: string, currentPaid: boolean) {
    try {
      const res = await fetch(`/api/leagues/${id}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueMemberId, paid: !currentPaid }),
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

  async function handleRemoveMember(userId: string) {
    try {
      const res = await fetch(`/api/leagues/${id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to remove member")
        return
      }
      toast.success("Member removed")
      setRemovingUserId(null)
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
            {league.members.length} member{league.members.length !== 1 ? "s" : ""}
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
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <div>
          <p className="text-sm font-medium text-foreground mb-3">Invite friends to your league</p>

          {/* Visual invite card — click to copy */}
          <button
            onClick={() => {
              const inviteUrl = `https://www.slipper8s.com/leagues/join?code=${league.inviteCode}`
              const text = `Join my Slipper8s league "${league.name}"!\nUse invite code: ${league.inviteCode}\n${inviteUrl}`
              navigator.clipboard.writeText(text)
              setCopied(true)
              toast.success("Invite link copied!")
              setTimeout(() => setCopied(false), 2000)
            }}
            className="relative block w-full text-left cursor-pointer group"
          >
            <div className="bg-gradient-to-br from-primary to-blue-600 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <div className="p-4 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-bold">{league.name}</div>
                    <div className="text-xs opacity-90">Private League</div>
                  </div>
                </div>
                <div className="text-sm font-semibold mb-2">
                  You&apos;re invited to join my Slipper8s league!
                </div>
                <div className="text-xs opacity-90 mb-2">
                  Compete head-to-head with friends in the 2026 tournament.
                </div>
                <div className="flex items-center gap-2 text-xs opacity-75 mt-3 pt-3 border-t border-white/20">
                  <span>Code: <strong className="tracking-widest">{league.inviteCode}</strong></span>
                  <span className="opacity-50">·</span>
                  <span>slipper8s.com</span>
                </div>
              </div>
            </div>

            {/* Copied overlay */}
            {copied && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl transition-opacity">
                <div className="flex items-center gap-2 bg-white text-gray-900 rounded-lg px-4 py-2 text-sm font-semibold shadow-lg">
                  <Check className="h-4 w-4 text-green-500" />
                  Invite copied!
                </div>
              </div>
            )}
          </button>

          {/* Share buttons row */}
          <div className="flex items-center gap-2 mt-3">
            {/* Copy link */}
            <button
              onClick={() => {
                const inviteUrl = `https://www.slipper8s.com/leagues/join?code=${league.inviteCode}`
                const text = `Join my Slipper8s league "${league.name}"!\nUse invite code: ${league.inviteCode}\n${inviteUrl}`
                navigator.clipboard.writeText(text)
                setCopied(true)
                toast.success("Invite link copied!")
                setTimeout(() => setCopied(false), 2000)
              }}
              className="flex-1 flex items-center justify-center gap-2 h-8 text-xs px-3 border border-border rounded-lg hover:bg-accent transition-colors text-muted-foreground"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy link
                </>
              )}
            </button>

            {/* X (Twitter) */}
            <button
              onClick={() => {
                const inviteUrl = `https://www.slipper8s.com/leagues/join?code=${league.inviteCode}`
                const text = `Join my Slipper8s league "${league.name}"! Use code: ${league.inviteCode}`
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(inviteUrl)}`, "_blank", "noopener,noreferrer")
              }}
              title="Share on X"
              className="flex items-center justify-center h-8 w-8 border border-border rounded-lg hover:bg-accent transition-colors text-muted-foreground"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </button>

            {/* Facebook */}
            <button
              onClick={async () => {
                const inviteUrl = `https://www.slipper8s.com/leagues/join?code=${league.inviteCode}`
                const text = `Join my Slipper8s league "${league.name}"! Use code: ${league.inviteCode} ${inviteUrl}`
                try { await navigator.clipboard.writeText(text) } catch { /* ignore */ }
                setCopied(true)
                toast.success("Invite text copied — paste it in your Facebook post!")
                setTimeout(() => setCopied(false), 2000)
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://www.slipper8s.com")}`, "_blank", "noopener,noreferrer")
              }}
              title="Share on Facebook (copies invite text & opens share dialog)"
              className="flex items-center justify-center h-8 w-8 border border-border rounded-lg hover:bg-accent transition-colors text-muted-foreground"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </button>

            {/* LinkedIn */}
            <button
              onClick={() => {
                const inviteUrl = `https://www.slipper8s.com/leagues/join?code=${league.inviteCode}`
                const text = `Join my Slipper8s league "${league.name}"! Use code: ${league.inviteCode} ${inviteUrl}`
                window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer")
              }}
              title="Share on LinkedIn"
              className="flex items-center justify-center h-8 w-8 border border-border rounded-lg hover:bg-accent transition-colors text-muted-foreground"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </button>

            {/* Instagram */}
            <button
              onClick={async () => {
                const inviteUrl = `https://www.slipper8s.com/leagues/join?code=${league.inviteCode}`
                const text = `Join my Slipper8s league "${league.name}"! Use code: ${league.inviteCode} ${inviteUrl}`
                try { await navigator.clipboard.writeText(text) } catch { /* ignore */ }
                setCopied(true)
                toast.success("Invite link copied! Opening Instagram...")
                setTimeout(() => setCopied(false), 2000)
                window.open("https://instagram.com", "_blank", "noopener,noreferrer")
              }}
              title="Share on Instagram (copies link first)"
              className="flex items-center justify-center h-8 w-8 border border-border rounded-lg hover:bg-accent transition-colors text-muted-foreground"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Invite code for manual entry */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Or share the invite code directly:</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-muted/50 border border-border rounded-lg px-4 py-2.5 font-mono text-lg tracking-widest text-center">
              {league.inviteCode}
            </code>
            <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={handleCopyCode}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
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
                <Label htmlFor="maxEntries" className="text-sm">Max Entry Slips</Label>
                <Input
                  id="maxEntries"
                  type="number"
                  min={1}
                  value={editMaxEntries}
                  onChange={(e) => setEditMaxEntries(e.target.value)}
                  placeholder="Unlimited"
                  className="bg-muted/50 max-w-[200px]"
                />
                <p className="text-xs text-muted-foreground">Leave blank for unlimited entry slips.</p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm">Track Payments</Label>
                  <p className="text-xs text-muted-foreground">Track who has paid their entry fee (if you decide to set one).</p>
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
            <div className={`grid ${league.isAdmin && league.trackPayments ? "grid-cols-[2rem_1fr_4rem_4rem_5rem_5.5rem]" : league.isAdmin && !league.trackPayments ? "grid-cols-[2rem_1fr_4rem_5rem_5.5rem]" : league.trackPayments ? "grid-cols-[2rem_1fr_4rem_4rem_5rem]" : "grid-cols-[2rem_1fr_4rem_5rem]"} gap-3 px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`}>
              <span>#</span>
              <span>Player</span>
              <span className="text-right">Score</span>
              {league.trackPayments && <span className="text-center">Paid</span>}
              <span className="text-right">Joined</span>
              {league.isAdmin && <span />}
            </div>

            {rankedMembers.map((member, i) => {
              const isMe = member.userId === session?.user?.id
              const isLeagueAdmin = member.userId === league.adminId
              const rank = i + 1

              return (
                <div
                  key={member.leagueMemberId}
                  className={`grid ${league.isAdmin && league.trackPayments ? "grid-cols-[2rem_1fr_4rem_4rem_5rem_5.5rem]" : league.isAdmin && !league.trackPayments ? "grid-cols-[2rem_1fr_4rem_5rem_5.5rem]" : league.trackPayments ? "grid-cols-[2rem_1fr_4rem_4rem_5rem]" : "grid-cols-[2rem_1fr_4rem_5rem]"} gap-3 px-5 py-3 items-center ${isMe ? "bg-primary/5" : "hover:bg-muted/30"} transition-colors`}
                >
                  <span className="text-sm font-mono text-muted-foreground">{rank}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium truncate ${isMe ? "text-primary" : ""}`}>
                        {member.name}
                      </span>
                      {member.entryCount > 0 && (
                        <span className="text-[10px] text-muted-foreground">{member.entryCount} {member.entryCount === 1 ? "entry slip" : "entry slips"}</span>
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
                          onClick={() => handleTogglePaid(member.leagueMemberId, member.paid)}
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
                  {league.isAdmin && (
                    <div className="flex justify-end">
                      {!isLeagueAdmin ? (
                        removingUserId === member.userId ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleRemoveMember(member.userId)}
                              className="text-[11px] font-semibold text-destructive hover:text-destructive/80 px-2 py-0.5 bg-destructive/10 rounded"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setRemovingUserId(null)}
                              className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-0.5"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRemovingUserId(member.userId)}
                            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors px-2 py-0.5 rounded hover:bg-destructive/10"
                            title="Remove member"
                          >
                            <UserMinus className="h-3 w-3" />
                            <span>Remove</span>
                          </button>
                        )
                      ) : (
                        <span className="text-[10px] text-muted-foreground/50">Admin</span>
                      )}
                    </div>
                  )}
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
