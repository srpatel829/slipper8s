"use client"

import { useState } from "react"
import { Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import Link from "next/link"

export function JoinLeagueForm() {
  const [inviteCode, setInviteCode] = useState("")
  const [joining, setJoining] = useState(false)
  const [joinedLeague, setJoinedLeague] = useState<{ id: string; name: string } | null>(null)

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const code = inviteCode.trim()
    if (!code) return

    setJoining(true)
    try {
      const res = await fetch("/api/leagues/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to join league")
        return
      }
      toast.success(`Joined "${data.name}"!`)
      setJoinedLeague({ id: data.id, name: data.name })
      setInviteCode("")
    } catch {
      toast.error("Something went wrong")
    } finally {
      setJoining(false)
    }
  }

  if (joinedLeague) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Check className="h-4 w-4 text-green-500" />
          <p className="text-sm font-medium text-foreground">
            Joined &quot;{joinedLeague.name}&quot;!
          </p>
        </div>
        <Link
          href={`/leagues/${joinedLeague.id}`}
          className="text-sm text-primary hover:underline"
        >
          View League &rarr;
        </Link>
        <button
          onClick={() => setJoinedLeague(null)}
          className="block text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
        >
          Join another league
        </button>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-1">Join an existing private league</p>
      <p className="text-xs text-muted-foreground mb-3">
        Have an invite code? Enter it below to join your friends.
      </p>
      <form onSubmit={handleJoin} className="flex gap-2">
        <Input
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          placeholder="e.g. A1B2C3D4"
          required
          className="h-9 flex-1 bg-muted/50 font-mono tracking-wider uppercase text-sm"
        />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="h-9 px-4"
          disabled={joining || !inviteCode.trim()}
        >
          {joining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Join"}
        </Button>
      </form>
    </div>
  )
}
