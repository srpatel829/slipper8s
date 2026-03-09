"use client"

import { useState } from "react"
import { useDemoContext } from "@/lib/demo-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Link2, Trophy, Crown } from "lucide-react"

interface DemoLeague {
  id: string
  name: string
  code: string
  memberCount: number
  adminName: string
}

const TROPHY_COLORS = [
  "text-yellow-400 bg-yellow-400/10",
  "text-blue-400 bg-blue-400/10",
  "text-purple-400 bg-purple-400/10",
  "text-emerald-400 bg-emerald-400/10",
  "text-rose-400 bg-rose-400/10",
  "text-orange-400 bg-orange-400/10",
]

const DEMO_LEAGUES: DemoLeague[] = [
  { id: "lg-1", name: "The Patel Family", code: "PATEL26", memberCount: 12, adminName: "Sumeet Patel" },
  { id: "lg-2", name: "Office Pool 2025", code: "OFFICE25", memberCount: 34, adminName: "Mike Johnson" },
  { id: "lg-3", name: "College Buddies", code: "CBUDS26", memberCount: 8, adminName: "Sarah Kim" },
]

export default function DemoLeaguesPage() {
  const { currentPersona } = useDemoContext()
  const [joinCode, setJoinCode] = useState("")

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leagues</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create or join private leagues to compete with friends
          </p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Create League
        </Button>
      </div>

      {/* Join a league */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          Join a League
        </h2>
        <div className="flex gap-2">
          <Input
            placeholder="Enter invite code (e.g. PATEL26)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="h-9 text-sm bg-muted/50"
          />
          <Button size="sm" variant="outline" disabled={!joinCode.trim()}>
            Join
          </Button>
        </div>
      </div>

      {/* Your leagues */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Users className="h-4 w-4" />
          Your Leagues
        </h2>

        {DEMO_LEAGUES.map((league, i) => {
          const [trophyText, trophyBg] = TROPHY_COLORS[i % TROPHY_COLORS.length].split(" ")
          return (
          <div key={league.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${trophyBg} flex items-center justify-center`}>
                  <Trophy className={`h-5 w-5 ${trophyText}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{league.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{league.memberCount} members</span>
                    <span className="text-muted-foreground/30">|</span>
                    <span className="flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      {league.adminName}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-[10px] font-mono">{league.code}</Badge>
                <p className="text-[10px] text-muted-foreground mt-1">Invite code</p>
              </div>
            </div>
          </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        This is a demo view. Leagues will be fully functional for the 2026 tournament.
      </p>
    </div>
  )
}
