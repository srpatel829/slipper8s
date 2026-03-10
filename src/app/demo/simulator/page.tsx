"use client"

/**
 * Demo Simulator Page — full-page layout with sticky leaderboard.
 *
 * Left: scrollable full bracket picker (all 63 games, locked or pickable)
 * Right: sticky simulated leaderboard that re-sorts as picks change
 */

import { useState, useMemo } from "react"
import { Trophy, RotateCcw, Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDemoContext } from "@/lib/demo-context"
import { computeSimulatedLeaderboard, type HypotheticalState } from "@/lib/scoring"
import { AdvancingBracket } from "@/components/bracket/advancing-bracket"

export default function DemoSimulatorPage() {
  const { leaderboardData, teamsData, gameSequence, gameIndex } = useDemoContext()
  const isPreTournament = gameIndex < 0

  // ── Pick state ────────────────────────────────────────────────────────────
  const [gamePicks, setGamePicks] = useState<Record<string, string>>({})

  /**
   * downstreamMap: gameId → gameId of the next game its winner feeds into.
   * Encodes the full bracket tree (R64→R32→S16→E8→F4→Championship).
   */
  const downstreamMap = useMemo(() => {
    const map = new Map<string, string>()
    const byRegionRound = new Map<string, Map<number, string[]>>()
    for (const region of ["East", "West", "South", "Midwest"]) {
      byRegionRound.set(region, new Map())
    }
    for (const game of gameSequence) {
      if (game.round >= 1 && game.round <= 4) {
        const rm = byRegionRound.get(game.region)
        if (!rm) continue
        const arr = rm.get(game.round) ?? []
        arr.push(game.gameId)
        rm.set(game.round, arr)
      }
    }
    // Within-region cascades: R64[i] → R32[floor(i/2)] → S16[...] → E8[0]
    for (const [, regMap] of byRegionRound) {
      for (let round = 1; round <= 3; round++) {
        const cur = regMap.get(round) ?? []
        const nxt = regMap.get(round + 1) ?? []
        for (let i = 0; i < cur.length; i++) {
          const nextId = nxt[Math.floor(i / 2)]
          if (nextId) map.set(cur[i], nextId)
        }
      }
    }
    // E8 → F4
    const f4Games = gameSequence.filter(g => g.round === 5)
    const e8Pairs: [string, number][] = [
      ["East", 0], ["West", 0], ["South", 1], ["Midwest", 1]
    ]
    for (const [region, f4Idx] of e8Pairs) {
      const e8 = byRegionRound.get(region)?.get(4) ?? []
      const f4Id = f4Games[f4Idx]?.gameId
      if (e8[0] && f4Id) map.set(e8[0], f4Id)
    }
    // F4 → Championship
    const champId = gameSequence.find(g => g.round === 6)?.gameId
    if (champId) {
      for (const f4 of f4Games) map.set(f4.gameId, champId)
    }
    return map
  }, [gameSequence])

  function pickGame(gameId: string, winnerId: string) {
    setGamePicks(prev => {
      const oldWinnerId = prev[gameId]
      const next = { ...prev }

      if (oldWinnerId === winnerId) {
        delete next[gameId]   // toggle off — also clear downstream
      } else {
        next[gameId] = winnerId
      }

      // Cascade-clear downstream picks that still reference the old winner
      // (they are now unreachable since the old winner can no longer advance)
      if (oldWinnerId) {
        let cur = gameId
        while (true) {
          const downId = downstreamMap.get(cur)
          if (!downId) break
          if (next[downId] === oldWinnerId) {
            delete next[downId]   // clear the stale downstream pick
            cur = downId          // continue walking further downstream
          } else {
            break  // downstream picked a different team — stop here
          }
        }
      }

      return next
    })
  }

  function resetPicks() {
    setGamePicks({})
  }

  // ── Hypothetical state from picks ─────────────────────────────────────────
  const allGames = gameSequence

  const hypothetical = useMemo<HypotheticalState>(() => {
    if (Object.keys(gamePicks).length === 0) return {}

    const baseWins: Record<string, number> = {}
    for (const entry of leaderboardData) {
      for (const pick of entry.picks) {
        baseWins[pick.teamId] = pick.wins
      }
    }

    const hyp: HypotheticalState = {}
    const sorted = [...allGames].sort((a, b) => a.round - b.round || a.gameIndex - b.gameIndex)
    for (const game of sorted) {
      const pickedWinnerId = gamePicks[game.gameId]
      if (!pickedWinnerId) continue

      const pickedLoserId = pickedWinnerId === game.winnerId ? game.loserId : game.winnerId
      const currentWins = hyp[pickedWinnerId]?.wins ?? baseWins[pickedWinnerId] ?? 0
      hyp[pickedWinnerId] = { wins: currentWins + 1, eliminated: false }
      hyp[pickedLoserId] = { wins: baseWins[pickedLoserId] ?? 0, eliminated: true }
    }

    return hyp
  }, [gamePicks, allGames, leaderboardData])

  const simLeaderboard = useMemo(() => {
    const lb = computeSimulatedLeaderboard(leaderboardData, hypothetical)
    // Re-sort by currentScore desc (then tps as tiebreaker, then name)
    return [...lb].sort(
      (a, b) => b.currentScore - a.currentScore || b.tps - a.tps || a.name.localeCompare(b.name)
    ).map((s, i) => ({ ...s, rank: i + 1 }))
  }, [leaderboardData, hypothetical])

  const hasChanges = Object.keys(gamePicks).length > 0
  const futureGames = allGames.filter(g => g.gameIndex > gameIndex)
  const pickedCount = Object.keys(gamePicks).length

  return (
    // Full-viewport layout: stacked on mobile, side-by-side on desktop
    <div className="flex flex-col md:flex-row h-[calc(100vh-60px)] overflow-hidden">

      {/* ── Top/Left: scrollable bracket picker ───────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
        <div className="px-4 py-4">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-bold">Scenario Simulator</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Pick winners for any unplayed game to see how the leaderboard shifts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="text-xs text-primary border-primary/40">
                  {pickedCount} pick{pickedCount !== 1 ? "s" : ""} made
                </Badge>
              )}
              {futureGames.length === 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 border border-border/30 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Tournament complete
                </div>
              )}
              {hasChanges && (
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={resetPicks}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Full bracket */}
          <AdvancingBracket
            teams={teamsData as Parameters<typeof AdvancingBracket>[0]["teams"]}
            mode="simulator"
            gamePicks={gamePicks}
            onPickGame={pickGame}
            gameSequence={gameSequence}
            gameIndex={gameIndex}
            isPreTournament={isPreTournament}
          />
        </div>
      </div>

      {/* ── Bottom/Right: sticky leaderboard panel ─────────────────────── */}
      <div className="w-full md:w-80 shrink-0 border-t md:border-t-0 md:border-l border-border/40 bg-card/20 backdrop-blur-sm flex flex-col overflow-hidden max-h-[40vh] md:max-h-none">
        {/* Leaderboard header — always visible */}
        <div className="px-4 py-3 border-b border-border/30 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Leaderboard</span>
              {hasChanges && (
                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/40 py-0">
                  Simulated
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              {simLeaderboard.length} players
            </span>
          </div>
          {hasChanges && (
            <p className="text-[10px] text-muted-foreground/70 mt-1">
              Sorted by TPS (score + potential) with your picks applied
            </p>
          )}
        </div>

        {/* Scrollable leaderboard rows */}
        <div className="flex-1 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="w-10 text-[10px] py-2 pl-4">#</TableHead>
                <TableHead className="text-[10px] py-2">Player</TableHead>
                <TableHead className="text-right text-[10px] py-2">Pts</TableHead>
                <TableHead className="text-right text-[10px] py-2 pr-4">TPS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {simLeaderboard.map((entry) => {
                const original = leaderboardData.find(e => e.userId === entry.userId)
                const rankDelta = original ? original.rank - entry.rank : 0 // positive = moved up
                const scoreChanged = original && original.currentScore !== entry.currentScore
                const tpsChanged = original && original.tps !== entry.tps

                return (
                  <TableRow
                    key={entry.userId}
                    className={tpsChanged ? "bg-primary/3" : ""}
                  >
                    <TableCell className="py-2 pl-4">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs">#{entry.rank}</span>
                        {rankDelta > 0 && (
                          <span className="text-[9px] text-green-500 font-bold">▲{rankDelta}</span>
                        )}
                        {rankDelta < 0 && (
                          <span className="text-[9px] text-red-500 font-bold">▼{Math.abs(rankDelta)}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 max-w-[100px]">
                      <span className="text-xs font-medium truncate block">{entry.name}</span>
                    </TableCell>
                    <TableCell className="text-right py-2 font-mono text-xs">
                      <span className={scoreChanged && hasChanges ? "text-primary font-semibold" : ""}>
                        {entry.currentScore}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-2 pr-4 font-mono font-bold text-xs text-primary">
                      {entry.tps}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Footer legend */}
        <div className="px-4 py-2.5 border-t border-border/20 shrink-0 bg-muted/10">
          <div className="flex items-center justify-between text-[9px] text-muted-foreground/60">
            <span># = Rank &nbsp;·&nbsp; Pts = Score &nbsp;·&nbsp; TPS = Total Potential</span>
          </div>
        </div>
      </div>
    </div>
  )
}
