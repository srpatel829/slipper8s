"use client"

/**
 * QuickPickGenerator — generates 8 picks using intelligent strategies.
 * Note: 1-seeds are excluded from all strategies.
 *
 * Strategies:
 *  - Random       : 2 random teams per region
 *  - Balanced Mix : One team from each seed tier, spread across regions
 *  - Cinderella   : Seeds 8-12, high upset potential, spread across regions
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Sparkles, Shuffle, Star, Zap } from "lucide-react"
import type { SelectedPick } from "@/components/picks/picks-form"

// ─── Team shape from computeTeamsForPicks ────────────────────────────────────

interface Team {
  id: string
  name: string
  shortName: string
  seed: number
  region: string
  isPlayIn: boolean
  eliminated: boolean
  wins: number
}

interface QuickPickGeneratorProps {
  teams: Team[]
  onGenerate: (picks: SelectedPick[]) => void
}

// ─── Strategy definitions ─────────────────────────────────────────────────────

type Strategy = {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  color: string
  generate: (teams: Team[]) => string[]
}

const REGIONS = ["East", "West", "South", "Midwest"]

/** Seeded random for reproducible-ish results without true randomness */
function seededSample<T>(arr: T[], n: number, seed: number): T[] {
  const a = [...arr]
  let h = seed | 0
  const result: T[] = []
  for (let i = 0; i < n && a.length > 0; i++) {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
    h = (h ^ (h >>> 16)) >>> 0
    const idx = h % a.length
    result.push(a.splice(idx, 1)[0])
  }
  return result
}

/** Pick teams from a region matching a seed filter, prefer alive. Never picks 1-seeds. */
function pickFromRegion(
  regionTeams: Team[],
  count: number,
  seedFilter: (seed: number) => boolean,
  fallbackAll = true
): string[] {
  const filtered = regionTeams.filter(t => !t.eliminated && t.seed !== 1 && seedFilter(t.seed))
  const picks = seededSample(filtered, count, regionTeams.reduce((s, t) => s + t.seed, 0))
  if (picks.length < count && fallbackAll) {
    const used = new Set(picks.map(t => t.id))
    const rest = regionTeams.filter(t => !t.eliminated && t.seed !== 1 && !used.has(t.id))
    picks.push(...seededSample(rest, count - picks.length, 42))
  }
  return picks.map(t => t.id)
}

const STRATEGIES: Strategy[] = [
  {
    id: "random",
    label: "Random",
    description: "8 random teams — let the bracket gods decide",
    icon: <Shuffle className="h-4 w-4" />,
    color: "text-green-400",
    generate(teams) {
      const pool = teams.filter(t => !t.eliminated && t.seed !== 1)
      const seed = Date.now() % 9999
      const picked = seededSample(pool, 8, seed)
      return picked.map(t => t.id)
    },
  },
  {
    id: "balanced",
    label: "Balanced Mix",
    description: "One team per seed tier (2-4, 5-8, 9-12, 13-16) × 2 regions",
    icon: <Star className="h-4 w-4" />,
    color: "text-blue-400",
    generate(teams) {
      const tiers = [
        [2, 4],
        [5, 8],
        [9, 12],
        [13, 16],
      ] as [number, number][]
      const ids: string[] = []
      for (const [lo, hi] of tiers) {
        const candidates = teams.filter(t => !t.eliminated && t.seed >= lo && t.seed <= hi)
        const picked = seededSample(candidates, 2, lo * 100 + hi)
        ids.push(...picked.map(t => t.id))
      }
      return ids.slice(0, 8)
    },
  },
  {
    id: "cinderella",
    label: "Cinderella",
    description: "Seeds 8-12 with upset potential — high risk, high reward",
    icon: <Zap className="h-4 w-4" />,
    color: "text-purple-400",
    generate(teams) {
      const ids: string[] = []
      // Each region: 1 cinderella (seed 8-12) + 1 mid (seed 4-7)
      for (const region of REGIONS) {
        const rt = teams.filter(t => t.region === region)
        ids.push(...pickFromRegion(rt, 1, s => s >= 8 && s <= 12))
        ids.push(...pickFromRegion(rt, 1, s => s >= 4 && s <= 7))
      }
      return [...new Set(ids)].slice(0, 8)
    },
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickPickGenerator({ teams, onGenerate }: QuickPickGeneratorProps) {
  const [open, setOpen] = useState(false)
  const [lastStrategy, setLastStrategy] = useState<string | null>(null)

  function handleGenerate(strategy: Strategy) {
    const teamIds = strategy.generate(teams)
    const picks: SelectedPick[] = teamIds.map(id => ({ teamId: id }))
    setLastStrategy(strategy.id)
    onGenerate(picks)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Auto-pick
          {lastStrategy && (
            <Badge className="ml-1 h-4 px-1 text-[10px] bg-primary/20 text-primary border-0">
              {STRATEGIES.find(s => s.id === lastStrategy)?.label}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Quick Pick Strategies
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-1">
          Auto-fill your 8 picks using one of these strategies. Each picks 2 teams per region.
        </p>

        <div className="grid gap-2 mt-2">
          {STRATEGIES.map(strategy => (
            <button
              key={strategy.id}
              onClick={() => handleGenerate(strategy)}
              className="group text-left rounded-lg border border-border/60 bg-card/50 hover:border-primary/50 hover:bg-primary/5 p-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`${strategy.color} transition-transform group-hover:scale-110`}>
                  {strategy.icon}
                </span>
                <div>
                  <p className="font-semibold text-sm leading-none mb-1">{strategy.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {strategy.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-1">
          You can adjust individual picks after auto-filling.
        </p>
      </DialogContent>
    </Dialog>
  )
}
