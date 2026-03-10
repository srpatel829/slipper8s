"use client"

import { useState, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Radio } from "lucide-react"
import type { LiveGameData } from "@/types"

interface ScoresGridProps {
  initialGames: LiveGameData[]
  roundNames: Record<number, string>
  demoMode?: boolean
  isPreTournament?: boolean
}

export function ScoresGrid({ initialGames, roundNames, demoMode, isPreTournament = false }: ScoresGridProps) {
  const [games, setGames] = useState<LiveGameData[]>(initialGames)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  // Sync initialGames → games when it changes in demo mode
  useEffect(() => {
    if (demoMode) setGames(initialGames)
  }, [demoMode, initialGames])

  const refresh = useCallback(async () => {
    if (demoMode) return
    setLoading(true)
    try {
      const res = await fetch("/api/scores")
      if (res.ok) {
        setGames(await res.json())
        setLastUpdated(new Date())
      }
    } finally {
      setLoading(false)
    }
  }, [demoMode])

  useEffect(() => {
    if (demoMode) return
    const id = setInterval(refresh, 60_000)
    return () => clearInterval(id)
  }, [refresh, demoMode])

  const inProgress = games.filter((g) => g.status.state === "in")
  const scheduled = games.filter((g) => g.status.state === "pre")
  const final = games.filter((g) => g.status.state === "post")

  if (games.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl py-16 text-center">
        <Radio className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
        <p className="text-muted-foreground text-sm">No tournament games found yet.</p>
        <p className="text-muted-foreground text-xs mt-1 opacity-60">Data syncs from ESPN every 5 minutes.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!demoMode && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()} · Auto-refreshes every 60s
          </p>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      )}

      {inProgress.length > 0 && (
        <GameSection title="Live Now" games={inProgress} roundNames={roundNames} isLiveSection />
      )}
      {scheduled.length > 0 && (
        <GameSection title="Upcoming" games={scheduled} roundNames={roundNames} />
      )}
      {final.length > 0 && (
        <GameSection title="Final" games={final} roundNames={roundNames} />
      )}
    </div>
  )
}

function GameSection({
  title,
  games,
  roundNames,
  isLiveSection,
}: {
  title: string
  games: LiveGameData[]
  roundNames: Record<number, string>
  isLiveSection?: boolean
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {isLiveSection && (
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
        )}
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h2>
        <span className="text-xs text-muted-foreground">({games.length})</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {games.map((game) => (
          <GameCard key={game.id} game={game} roundNames={roundNames} />
        ))}
      </div>
    </div>
  )
}

function GameCard({ game, roundNames }: { game: LiveGameData; roundNames: Record<number, string> }) {
  const [t1, t2] = game.teams
  const isLive = game.status.state === "in"
  const isFinal = game.status.state === "post"

  return (
    <div
      className={`border rounded-xl p-4 bg-card transition-all ${
        isLive
          ? "border-green-500/30 bg-green-500/5 shadow-sm shadow-green-500/10"
          : "border-border hover:border-border/80"
      }`}
    >
      {/* Round + status */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
          {roundNames[game.round] ?? "Tournament"}
        </span>
        {isLive ? (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] h-4 gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            {game.status.detail}
          </Badge>
        ) : isFinal ? (
          <Badge variant="outline" className="text-[10px] h-4 text-muted-foreground">Final</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] h-4 text-muted-foreground">Upcoming</Badge>
        )}
      </div>

      {/* Teams */}
      <div className="space-y-2">
        {[t1, t2].filter(Boolean).map((team, i) => (
          <div
            key={i}
            className={`flex items-center justify-between ${
              isFinal && team.winner
                ? "text-foreground"
                : isFinal && !team.winner
                ? "text-muted-foreground opacity-50"
                : ""
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {team.logo ? (
                <img src={team.logo} alt={team.name} className={`h-6 w-6 object-contain shrink-0 ${isFinal && !team.winner ? "opacity-50 grayscale" : ""}`} />
              ) : (
                <div className="h-6 w-6 rounded-full bg-muted shrink-0 flex items-center justify-center text-[9px] font-bold">
                  {team.abbreviation?.[0] ?? "?"}
                </div>
              )}
              {team.seed && (
                <span className="text-[10px] text-muted-foreground w-4 shrink-0">#{team.seed}</span>
              )}
              <span className={`text-sm truncate ${isFinal && team.winner ? "font-semibold" : ""}`}>
                {team.name}
              </span>
            </div>
            {(isLive || isFinal) && (
              <span
                className={`font-mono text-lg ml-3 shrink-0 ${
                  isFinal && team.winner ? "text-primary font-bold" : ""
                }`}
              >
                {team.score}
              </span>
            )}
          </div>
        ))}
      </div>

      {!isLive && !isFinal && (
        <p className="text-[10px] text-muted-foreground mt-2.5 pt-2.5 border-t border-border/50">
          {new Date(game.startTime).toLocaleString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  )
}
