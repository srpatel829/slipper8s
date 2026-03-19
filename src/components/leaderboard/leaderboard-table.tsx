"use client"

import { useEffect, useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Heart, ChevronDown, ChevronUp, TrendingUp, Sparkles } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { LeaderboardEntry, ResolvedPickSummary } from "@/types"
import { getSeedColor, REGION_COLORS, REGION_ABBREV, STATUS_COLORS } from "@/lib/colors"
import { getPrimaryArchetypeEmoji, getArchetypeByKey, ARCHETYPE_LEGEND } from "@/lib/archetypes"
import { ArchetypePopover } from "@/components/archetype-popover"
import { TeamCallout } from "@/components/team-callout"
import { buildTeamCalloutData, type TeamLikeForCallout } from "@/lib/team-callout-helpers"

// ── Entry name display helper ────────────────────────────────────────────────
/** Renders username in bold and entry label (parenthetical) in grey */
function EntryNameDisplay({ name, className }: { name: string; className?: string }) {
  const match = name.match(/^(.+?)(\s*\(.+\))$/)
  if (match) {
    return (
      <span className={className}>
        <span className="font-semibold">{match[1]}</span>
        <span className="text-muted-foreground font-normal">{match[2]}</span>
      </span>
    )
  }
  return <span className={className}>{name}</span>
}

// ── Team pill status ─────────────────────────────────────────────────────────

function getTeamPillStatus(pick: ResolvedPickSummary): "green" | "yellow" | "red" {
  if (pick.eliminated) return "red"
  if (pick.wins > 0) return "green"
  return "yellow"
}

const STATUS_BORDER_COLORS = STATUS_COLORS

const PILL_STATUS_CLASSES = {
  green: "bg-green-500/20 border-green-500/40 text-green-300",
  yellow: "bg-amber-500/20 border-amber-500/40 text-amber-300",
  red: "bg-red-500/20 border-red-500/40 text-red-400 line-through",
}

// ── Spec-compliant team pill ─────────────────────────────────────────────────

function TeamPill({ pick }: { pick: ResolvedPickSummary }) {
  const status = getTeamPillStatus(pick)
  const pts = pick.seed * pick.wins
  const regionLabel = pick.region ? `${pick.region} Region` : ""

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer hover:opacity-80 transition-opacity ${PILL_STATUS_CLASSES[status]}`}
        >
          <span className="font-bold">#{pick.seed}</span>
          <span className="truncate max-w-[4rem]">{pick.shortName}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3" side="top" align="center">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">#{pick.seed} {pick.name}</span>
          </div>
          {regionLabel && (
            <span className="text-[10px] text-muted-foreground">{regionLabel}</span>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs pt-1 border-t border-border/50">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wins:</span>
              <span className="font-medium">{pick.wins}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pts:</span>
              <span className="font-medium">{pts}</span>
            </div>
            <div className="flex justify-between col-span-2">
              <span className="text-muted-foreground">Status:</span>
              <span className={`font-medium ${pick.eliminated ? "text-red-400" : "text-green-400"}`}>
                {pick.eliminated ? "Eliminated" : "Alive"}
              </span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ── Inline logo strip — always visible in the leaderboard row ──────────────
// Now with: region badge (top-left), seed badge with spec color (bottom-right),
// thick status borders (green/yellow/red)

function PicksLogoStrip({ picks, padTo, isPreTournament = false, pickerPctMap }: { picks: ResolvedPickSummary[], padTo?: number, isPreTournament?: boolean, pickerPctMap?: Map<string, number> }) {
  const activePicks = picks.filter(p => !p.eliminated)
  const eliminatedPicks = picks.filter(p => p.eliminated)

  const emptySlots = Math.max(0, (padTo || 0) - picks.length)

  if (!picks.length && !emptySlots) return null

  const renderPick = (pick: ResolvedPickSummary) => {
    const status = getTeamPillStatus(pick)
    const statusColor = STATUS_BORDER_COLORS[status]
    const seedColor = getSeedColor(pick.seed)
    const regionAbbrev = pick.region ? REGION_ABBREV[pick.region] ?? pick.region.substring(0, 2) : ""
    const regionColor = pick.region ? REGION_COLORS[pick.region] ?? "#888" : "#888"

    const teamLike: TeamLikeForCallout = {
      id: pick.teamId,
      name: pick.name,
      shortName: pick.shortName,
      seed: pick.seed,
      region: pick.region ?? "",
      wins: pick.wins,
      eliminated: pick.eliminated,
      logoUrl: pick.logoUrl,
      espnId: pick.espnId,
      conference: pick.conference,
    }
    const calloutData = buildTeamCalloutData(teamLike, isPreTournament, {
      selectedPct: pickerPctMap?.get(pick.teamId) ?? null,
    })

    return (
      <TeamCallout key={pick.teamId} team={calloutData}>
        <div
          className="relative w-8 h-8 shrink-0 cursor-pointer"
        >
          {/* Logo box with thick status border */}
          <div
            className="relative w-8 h-8 rounded-md overflow-hidden flex items-center justify-center p-0.5 text-[8px] font-bold shadow-sm"
            style={{ border: `2.5px solid ${statusColor}`, backgroundColor: "var(--background)" }}
          >
            {pick.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pick.logoUrl} alt="" className="w-full h-full object-contain" />
            ) : (
              <span className="text-[8px] font-bold text-muted-foreground leading-none text-center break-all">{pick.shortName.substring(0, 3)}</span>
            )}
          </div>

          {/* Region badge — top-left */}
          {regionAbbrev && (
            <div
              className="absolute -top-1.5 -left-1.5 h-[13px] min-w-[13px] px-0.5 rounded-sm flex items-center justify-center text-[6.5px] font-black text-white shadow-sm border border-background"
              style={{ backgroundColor: regionColor }}
            >
              {regionAbbrev}
            </div>
          )}

          {/* Seed badge — bottom-right with spec colors */}
          <div
            className="absolute -bottom-1.5 -right-1.5 w-[15px] h-[15px] rounded-sm flex items-center justify-center text-[8px] font-black text-white shadow-sm border border-background"
            style={{ backgroundColor: seedColor }}
          >
            {pick.seed}
          </div>
        </div>
      </TeamCallout>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mt-1.5">
      {activePicks.map(renderPick)}

      {eliminatedPicks.length > 0 && (
        <>
          {activePicks.length > 0 && (
            <div className="w-[2px] h-6 bg-red-500/60 rounded-full mx-0.5 shrink-0" />
          )}
          {eliminatedPicks.map(renderPick)}
        </>
      )}

      {Array.from({ length: emptySlots }).map((_, i) => (
        <div key={`empty-${i}`} className="w-8 h-8 rounded-md border-2 border-dashed border-border/30 bg-muted/10 shrink-0" title="Empty slot" />
      ))}
    </div>
  )
}

function PickCard({ pick, isPreTournament = false, pickerPctMap }: { pick: ResolvedPickSummary, isPreTournament?: boolean, pickerPctMap?: Map<string, number> }) {
  const pts = pick.seed * pick.wins
  const status = getTeamPillStatus(pick)
  const statusColor = STATUS_BORDER_COLORS[status]
  const seedColor = getSeedColor(pick.seed)
  const regionAbbrev = pick.region ? REGION_ABBREV[pick.region] ?? pick.region.substring(0, 2) : ""
  const regionColor = pick.region ? REGION_COLORS[pick.region] ?? "#888" : "#888"

  const teamLike: TeamLikeForCallout = {
    id: pick.teamId,
    name: pick.name,
    shortName: pick.shortName,
    seed: pick.seed,
    region: pick.region ?? "",
    wins: pick.wins,
    eliminated: pick.eliminated,
    logoUrl: pick.logoUrl,
    espnId: pick.espnId,
    conference: pick.conference,
  }
  const calloutData = buildTeamCalloutData(teamLike, isPreTournament, {
    selectedPct: pickerPctMap?.get(pick.teamId) ?? null,
  })

  return (
    <TeamCallout team={calloutData}>
      <div className="flex flex-col items-center gap-1.5 w-16 cursor-pointer">
        {/* Logo container with status border */}
        <div
          className="relative w-12 h-12 rounded-lg flex items-center justify-center bg-card shadow-sm p-1.5"
          style={{ border: `3px solid ${statusColor}` }}
        >
          {pick.logoUrl ? (
            <img src={pick.logoUrl} alt={pick.shortName} className="w-full h-full object-contain" />
          ) : (
            <span className="text-[10px] font-bold text-muted-foreground">{pick.shortName.substring(0, 3)}</span>
          )}

          {/* Region badge — top-left */}
          {regionAbbrev && (
            <div
              className="absolute -top-2 -left-2 h-[15px] min-w-[15px] px-0.5 rounded-sm flex items-center justify-center text-[7px] font-black text-white shadow-sm border border-background"
              style={{ backgroundColor: regionColor }}
            >
              {regionAbbrev}
            </div>
          )}

          {/* Seed badge — bottom-right with spec colors */}
          <div
            className="absolute -bottom-2 -right-2 w-[18px] h-[18px] rounded flex items-center justify-center text-[9px] font-black text-white shadow-sm border border-background"
            style={{ backgroundColor: seedColor }}
          >
            {pick.seed}
          </div>
        </div>

        {/* Details below logo */}
        <div className="w-full rounded border border-border/50 p-1.5 flex flex-col items-center justify-center text-center bg-muted/20">
          <span className="text-[9px] font-extrabold truncate w-full">{pick.shortName}</span>
          <div className="flex flex-col items-center gap-0 text-[9px] mt-0.5 opacity-90 font-medium">
            <span className="font-semibold text-[8px] opacity-80 uppercase tracking-wider">{pick.wins} Wins</span>
            <span className="font-mono font-bold mt-0.5">{pts > 0 ? `${pts} pts` : "\u2013"}</span>
          </div>
        </div>
      </div>
    </TeamCallout>
  )
}

export function ExpandedPicksGrid({ picks, isPreTournament = false, pickerPctMap }: { picks: ResolvedPickSummary[], isPreTournament?: boolean, pickerPctMap?: Map<string, number> }) {
  const regions = [
    { name: "West", id: "West" },
    { name: "East", id: "East" },
    { name: "Midwest", id: "Midwest" },
    { name: "South", id: "South" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 w-full bg-muted/10 p-4 border-t border-border/50">
      {regions.map((region) => {
        const regionPicks = picks.filter(p => p.region === region.id);

        return (
          <div key={region.id} className="rounded-xl border border-border/60 bg-card p-3 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 px-2.5 py-1 bg-muted/60 text-[9px] font-bold uppercase tracking-wider text-muted-foreground rounded-bl-lg border-l border-b border-border/40">
              {region.name}
            </div>

            <div className="flex flex-wrap gap-4 mt-3">
              {regionPicks.length > 0 ? (
                regionPicks.map(pick => <PickCard key={pick.teamId} pick={pick} isPreTournament={isPreTournament} pickerPctMap={pickerPctMap} />)
              ) : (
                <span className="text-[10px] text-muted-foreground/50 italic py-2 pl-1">No picks</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Optimal 8 card ────────────────────────────────────────────────────────────

export interface Optimal8Data {
  score: number
  ppr: number
  tps: number
  picks: ResolvedPickSummary[]
}

function Optimal8Card({ data, label = "Optimal 8", description = "Best available picks by max score potential", variant = "rolling", isPreTournament = false, pickerPctMap }: { data: Optimal8Data; label?: string; description?: string; variant?: "rolling" | "hindsight"; isPreTournament?: boolean; pickerPctMap?: Map<string, number> }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isHindsight = variant === "hindsight"

  return (
    <div className={`rounded-xl border mb-3 overflow-hidden transition-all shadow-sm ${isHindsight ? "border-amber-400/25 bg-amber-400/5 shadow-amber-400/10" : "border-primary/25 bg-primary/5 shadow-primary/10"}`}>
      <button
        className={`w-full text-left px-4 py-3 transition-colors ${isHindsight ? "hover:bg-amber-400/10" : "hover:bg-primary/10"}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Label + scores */}
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className={`h-4 w-4 shrink-0 ${isHindsight ? "text-amber-400" : "text-primary"}`} />
            <div>
              <p className={`text-xs font-bold ${isHindsight ? "text-amber-400" : "text-primary"}`}>{label}</p>
              <p className="text-[10px] text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs shrink-0">
            <div className="text-right">
              <p className="text-muted-foreground text-[10px]">Score</p>
              <p className="font-mono font-semibold">{data.score}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-[10px]">PPR</p>
              <p className="font-mono text-muted-foreground">+{data.ppr}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-[10px]">Max</p>
              <p className="font-mono font-bold text-primary text-base">{data.tps}</p>
            </div>
          </div>
        </div>
        {/* Team logos */}
        <div className="mt-2 pt-2 border-t border-primary/15">
          <PicksLogoStrip picks={data.picks} padTo={8} isPreTournament={isPreTournament} pickerPctMap={pickerPctMap} />
        </div>
      </button>

      {/* Expanded picks */}
      {isExpanded && (
        <ExpandedPicksGrid picks={data.picks} isPreTournament={isPreTournament} pickerPctMap={pickerPctMap} />
      )}
    </div>
  )
}

// ── Status color legend ────────────────────────────────────────────────────────

function StatusLegend() {
  return (
    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_BORDER_COLORS.green }} />
        Won round
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_BORDER_COLORS.yellow }} />
        Yet to play
      </span>
    </div>
  )
}

// ── Archetype emoji legend ───────────────────────────────────────────────────

function ArchetypeLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
      <span className="font-semibold uppercase tracking-wider mr-1">Archetypes:</span>
      {ARCHETYPE_LEGEND.map(a => (
        <ArchetypePopover key={a.key} emoji={a.emoji} label={a.label} description={a.description}>
          <span className="flex items-center gap-1 hover:bg-muted/50 rounded px-1 py-0.5 transition-colors">
            <span>{a.emoji}</span>
            <span>{a.label}</span>
          </span>
        </ArchetypePopover>
      ))}
    </div>
  )
}

export type DimensionTab = "global" | "state" | "country" | "gender" | "fanbase" | "conference" | "league"

interface LeagueInfo {
  id: string
  name: string
}

interface UserProfile {
  country?: string | null
  state?: string | null
  gender?: string | null
  favoriteTeam?: string | null
  conference?: string | null
}

interface LeaderboardTableProps {
  initialData: LeaderboardEntry[]
  currentUserId?: string
  demoMode?: boolean
  optimal8?: Optimal8Data
  optimal8Hindsight?: Optimal8Data
  userLeagues?: LeagueInfo[]
  userProfile?: UserProfile | null
  isPreTournament?: boolean
  pickerPctMap?: Map<string, number>
}

type SortKey = "rank" | "currentScore" | "teamsRemaining" | "percentile" | "maxPossibleScore" | "expectedScore"
type SortDir = "asc" | "desc"

function filterByDimension(
  data: LeaderboardEntry[],
  dim: DimensionTab,
  userProfile?: UserProfile | null,
  leagueId?: string | null,
): LeaderboardEntry[] {
  if (dim === "global") return data
  if (dim === "state" && userProfile?.state) {
    return data.filter((e) => e.state === userProfile.state)
  }
  if (dim === "country" && userProfile?.country) {
    return data.filter((e) => e.country === userProfile.country)
  }
  if (dim === "gender" && userProfile?.gender) {
    return data.filter((e) => e.gender === userProfile.gender)
  }
  if (dim === "fanbase" && userProfile?.favoriteTeam) {
    return data.filter((e) => e.favoriteTeam === userProfile.favoriteTeam)
  }
  if (dim === "conference" && userProfile?.conference) {
    return data.filter((e) => e.conference === userProfile.conference)
  }
  if (dim === "league" && leagueId) {
    return data.filter((e) => e.leagueIds?.includes(leagueId))
  }
  return data
}

function rerankFiltered(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const sorted = [...entries].sort(
    (a, b) =>
      b.currentScore - a.currentScore ||
      b.tps - a.tps ||
      (b.expectedScore ?? 0) - (a.expectedScore ?? 0) ||
      a.name.localeCompare(b.name)
  )
  const total = sorted.length
  return sorted.map((e, i) => {
    let tieStart = i
    while (tieStart > 0 && sorted[tieStart - 1].currentScore === e.currentScore) tieStart--
    const rank = tieStart + 1
    return { ...e, rank, percentile: total <= 1 ? 0 : Math.round((rank / total) * 1000) / 10 }
  })
}

const GENDER_LABELS: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  NO_RESPONSE: "All",
}

/** Format rank with tie prefix: T4 if tied, #4 otherwise */
function formatRank(entry: LeaderboardEntry, allEntries: LeaderboardEntry[]): string {
  const isTied = allEntries.filter(e => e.rank === entry.rank).length > 1
  return isTied ? `T${entry.rank}` : `#${entry.rank}`
}

function LeaderboardRow({
  entry,
  isMe,
  isExpanded,
  rankStyle,
  onToggle,
  allEntries,
  isPreTournament = false,
  pickerPctMap,
}: {
  entry: LeaderboardEntry
  isMe: boolean
  isExpanded: boolean
  rankStyle: (rank: number) => string
  onToggle: () => void
  allEntries: LeaderboardEntry[]
  isPreTournament?: boolean
  pickerPctMap?: Map<string, number>
}) {
  const rankDisplay = formatRank(entry, allEntries)
  const allArchetypes = (entry.archetypes ?? []).map(k => getArchetypeByKey(k)).filter(Boolean) as { key: string; emoji: string; label: string; description: string }[]
  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all duration-200 ${isMe
        ? "border-primary/40 bg-primary/5 shadow-sm shadow-primary/10"
        : "border-border bg-card hover:border-border/80"
        }`}
    >
      {/* ─── Mobile card view (<sm) ─── */}
      <button
        className="w-full text-left sm:hidden"
        onClick={onToggle}
      >
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 ${rankStyle(entry.rank)}`}>
                  {rankDisplay}
                </div>
                {entry.rankChange != null && entry.rankChange > 0 && (
                  <span className="text-[9px] text-green-500 font-bold">▲{entry.rankChange}</span>
                )}
                {entry.rankChange != null && entry.rankChange < 0 && (
                  <span className="text-[9px] text-red-500 font-bold">▼{Math.abs(entry.rankChange)}</span>
                )}
              </div>
              {allArchetypes.map(a => (
                <ArchetypePopover key={a.key} emoji={a.emoji} label={a.label} description={a.description}>
                  <span className="text-sm">{a.emoji}</span>
                </ArchetypePopover>
              ))}
              <span className="text-[11px] font-medium text-muted-foreground">Top {entry.percentile}%</span>
              {isMe && <Badge variant="outline" className="text-[10px] border-primary/50 text-primary h-4">You</Badge>}
            </div>
            {entry.isPaid ? (
              <div className="w-2 h-2 rounded-full bg-green-400" title="Paid" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-red-400/50" title="Unpaid" />
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {allArchetypes.length > 0 && (
              <span className="text-sm">{allArchetypes.map(a => a.emoji).join("")}</span>
            )}
            <EntryNameDisplay name={entry.name} className="text-sm truncate font-semibold" />
            {isMe && <Badge variant="outline" className="text-[10px] border-primary/50 text-primary h-4 shrink-0">You</Badge>}
          </div>
          {entry.picks.length > 0 && (
            <div className="flex items-center gap-2">
              <PicksLogoStrip picks={entry.picks} isPreTournament={isPreTournament} pickerPctMap={pickerPctMap} />
              <span className={`text-xs font-mono shrink-0 ${
                entry.teamsRemaining >= 4 ? "text-green-400" : entry.teamsRemaining > 0 ? "text-amber-400" : "text-muted-foreground"
              }`}>
                {entry.teamsRemaining}/8
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span>Score: <strong className="font-mono">{entry.currentScore}</strong></span>
            {entry.expectedScore != null && (
              <span className="text-muted-foreground">Exp: <strong className="font-mono">{entry.expectedScore.toFixed(1)}</strong></span>
            )}
            <span>Max: <strong className="font-mono text-primary">{entry.maxPossibleScore ?? entry.tps}</strong></span>
            {entry.maxRank != null && (
              <span className="text-green-400">Max↑: <strong className="font-mono">#{entry.maxRank}</strong></span>
            )}
          </div>
        </div>
      </button>

      {/* ─── Desktop row (sm+) ─── */}
      <button
        className="w-full text-left hidden sm:block"
        onClick={onToggle}
      >
        <div className="grid grid-cols-[2.5rem_3.5rem_1fr_3rem_4rem_4rem_4.5rem_4rem] gap-2 items-center px-4 py-3">
          <div className="flex flex-col items-center gap-0">
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${rankStyle(entry.rank)}`}>
              {rankDisplay}
            </div>
            {entry.rankChange != null && entry.rankChange > 0 && (
              <span className="text-[9px] text-green-500 font-bold leading-none">▲{entry.rankChange}</span>
            )}
            {entry.rankChange != null && entry.rankChange < 0 && (
              <span className="text-[9px] text-red-500 font-bold leading-none">▼{Math.abs(entry.rankChange)}</span>
            )}
          </div>
          <div className="text-center">
            <span className="text-[10px] font-medium text-muted-foreground">Top {entry.percentile}%</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {allArchetypes.map(a => (
                <ArchetypePopover key={a.key} emoji={a.emoji} label={a.label} description={a.description}>
                  <span className="text-sm">{a.emoji}</span>
                </ArchetypePopover>
              ))}
              <EntryNameDisplay name={entry.name} className="text-sm truncate font-semibold" />
              {isMe && <Badge variant="outline" className="text-[10px] border-primary/50 text-primary h-4 shrink-0">You</Badge>}
              {entry.tierName && <Badge variant="outline" className="text-[10px] h-4 shrink-0">{entry.tierName}</Badge>}
            </div>
            {entry.charity && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                <Heart className="h-2.5 w-2.5 text-rose-400" />
                {entry.charity}
              </div>
            )}
            {entry.picks.length > 0 && <PicksLogoStrip picks={entry.picks} isPreTournament={isPreTournament} pickerPctMap={pickerPctMap} />}
          </div>
          <div className="text-right">
            <span className={`text-sm font-mono font-medium ${entry.teamsRemaining === 0 ? "text-muted-foreground" : entry.teamsRemaining >= 4 ? "text-green-400" : "text-amber-400"}`}>
              {entry.teamsRemaining}<span className="text-muted-foreground text-xs">/8</span>
            </span>
          </div>
          <div className="text-right"><span className="font-mono font-semibold text-sm">{entry.currentScore}</span></div>
          <div className="text-right">
            <span className="font-mono text-sm text-muted-foreground">
              {entry.expectedScore != null ? entry.expectedScore.toFixed(1) : "–"}
            </span>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-sm text-primary">
              {entry.maxPossibleScore != null ? entry.maxPossibleScore : entry.tps}
            </span>
          </div>
          <div className="text-center">
            {entry.maxRank != null ? (
              <span className="font-mono text-sm text-green-400">#{entry.maxRank}</span>
            ) : (
              <span className="text-sm text-muted-foreground/40">–</span>
            )}
          </div>
        </div>
      </button>

      {/* Expanded row */}
      {isExpanded && entry.picks.length > 0 && (
        <div className="border-t border-border/50 px-4 py-3 bg-muted/5">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {[...entry.picks]
              .sort((a, b) => {
                if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1
                const aPotential = a.eliminated ? 0 : a.seed * (6 - a.wins)
                const bPotential = b.eliminated ? 0 : b.seed * (6 - b.wins)
                return bPotential - aPotential
              })
              .map((pick) => (
                <TeamPill key={pick.teamId} pick={pick} />
              ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span>Rank: <strong className="text-foreground">#{entry.rank}</strong></span>
            {entry.maxRank != null ? (
              <span>Max Rank: <strong className="text-green-400">↑ #{entry.maxRank}</strong></span>
            ) : (
              <span>Max Rank: <span className="text-muted-foreground/40">–</span></span>
            )}
            {entry.floorRank != null ? (
              <span>Floor Rank: <strong className="text-red-400">↓ #{entry.floorRank}</strong></span>
            ) : (
              <span>Floor Rank: <span className="text-muted-foreground/40">–</span></span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1 flex-wrap">
            <span>Score: <strong className="text-foreground">{entry.currentScore}</strong></span>
            <span>Max Score: <strong className="text-foreground">{entry.maxPossibleScore ?? entry.tps}</strong></span>
            {entry.expectedScore != null && (
              <span>Expected: <strong className="text-foreground">{entry.expectedScore.toFixed(1)}</strong></span>
            )}
            {entry.percentile !== undefined && (
              <span>Percentile: <strong className="text-foreground">Top {entry.percentile}%</strong></span>
            )}
          </div>
          <details className="mt-2">
            <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
              Show detailed view
            </summary>
            <div className="mt-2">
              <ExpandedPicksGrid picks={entry.picks} isPreTournament={isPreTournament} pickerPctMap={pickerPctMap} />
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

export function LeaderboardTable({ initialData, currentUserId, demoMode, optimal8, optimal8Hindsight, userLeagues, userProfile, isPreTournament = false, pickerPctMap }: LeaderboardTableProps) {
  const [data, setData] = useState<LeaderboardEntry[]>(initialData)
  const [loading, setLoading] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>("rank")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dimension, setDimension] = useState<DimensionTab>("global")
  const [activeLeagueId, setActiveLeagueId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  // Sync initialData → data when it changes in demo mode (timeline scrubbing)
  useEffect(() => {
    if (demoMode) setData(initialData)
  }, [demoMode, initialData])

  const refresh = useCallback(async () => {
    if (demoMode) return
    setLoading(true)
    try {
      const res = await fetch("/api/leaderboard")
      if (res.ok) {
        setData(await res.json())
        setLastUpdated(new Date())
      }
    } finally {
      setLoading(false)
    }
  }, [demoMode])

  useEffect(() => {
    if (demoMode) return
    const id = setInterval(refresh, 30_000)
    return () => clearInterval(id)
  }, [refresh, demoMode])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "rank" || key === "teamsRemaining" ? "asc" : "desc")
    }
  }

  // Apply dimension filter, then re-rank, then sort
  const filtered = dimension === "global" ? data : rerankFiltered(filterByDimension(data, dimension, userProfile, activeLeagueId))
  const sorted = [...filtered].sort((a, b) => {
    const mult = sortDir === "asc" ? 1 : -1
    const aVal = a[sortKey] ?? 0
    const bVal = b[sortKey] ?? 0
    return ((aVal as number) - (bVal as number)) * mult
  })

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group"
      onClick={() => handleSort(col)}
    >
      {label}
      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
        {sortKey === col && sortDir === "asc" ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </span>
      {sortKey === col && (
        <span className="text-primary">
          {sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </span>
      )}
    </button>
  )

  const rankStyle = (rank: number) => {
    if (rank === 1) return "bg-primary/20 text-primary border-primary/30 shadow-sm"
    if (rank === 2) return "bg-slate-200/20 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 shadow-sm"
    if (rank === 3) return "bg-orange-800/10 text-orange-800 dark:text-orange-400 border-orange-800/20 shadow-sm"
    return "bg-muted/60 text-muted-foreground border-transparent"
  }

  return (
    <div className="space-y-3">
      {/* Header bar */}
      {!demoMode && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Auto-refreshes every 30s · Last updated {lastUpdated.toLocaleTimeString()}
          </p>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      )}

      {/* Status color legend */}
      <StatusLegend />

      {/* Archetype emoji legend */}
      <ArchetypeLegend />

      {/* Dimension tabs — always visible per spec */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {(
          [
            { key: "global" as DimensionTab, label: "Global", available: true },
            { key: "country" as DimensionTab, label: userProfile?.country ?? "Country", available: !!userProfile?.country },
            { key: "state" as DimensionTab, label: userProfile?.state ?? "State", available: !!userProfile?.state },
            { key: "gender" as DimensionTab, label: userProfile?.gender ? (GENDER_LABELS[userProfile.gender] ?? "Gender") : "Gender", available: !!userProfile?.gender && userProfile.gender !== "NO_RESPONSE" },
            { key: "fanbase" as DimensionTab, label: userProfile?.favoriteTeam ?? "Fanbase", available: !!userProfile?.favoriteTeam },
            { key: "conference" as DimensionTab, label: userProfile?.conference ?? "Conference", available: !!userProfile?.conference },
          ]
        ).map(({ key, label, available }) => (
          <button
            key={key}
            onClick={() => available && setDimension(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              dimension === key
                ? "bg-primary/15 text-primary"
                : available
                  ? "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  : "text-muted-foreground/30 cursor-not-allowed"
            }`}
            disabled={!available}
            title={!available ? `Add your ${key} in profile settings to filter` : undefined}
          >
            {label}
            {dimension === key && key !== "global" && (
              <span className="ml-1.5 text-[10px] opacity-60">
                ({filtered.length})
              </span>
            )}
          </button>
        ))}
        {/* League tabs */}
        {userLeagues && userLeagues.length > 0 && (
          <>
            <div className="w-px h-5 bg-border mx-1 shrink-0" />
            {userLeagues.map((league) => (
              <button
                key={league.id}
                onClick={() => {
                  setDimension("league")
                  setActiveLeagueId(league.id)
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  dimension === "league" && activeLeagueId === league.id
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {league.name}
                {dimension === "league" && activeLeagueId === league.id && (
                  <span className="ml-1.5 text-[10px] opacity-60">
                    ({filtered.length})
                  </span>
                )}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Column headers — Spec: Rank | Percentile | Player | Teams Left | Score | Expected | Max Score | Max Rank */}
      <div className="hidden sm:grid grid-cols-[2.5rem_3.5rem_1fr_3rem_4rem_4rem_4.5rem_4rem] gap-2 px-4 py-2">
        <SortBtn col="rank" label="#" />
        <SortBtn col="percentile" label="%" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Player</span>
        <div className="text-right"><SortBtn col="teamsRemaining" label="Left" /></div>
        <div className="text-right"><SortBtn col="currentScore" label="Score" /></div>
        <div className="text-right"><SortBtn col="expectedScore" label="Exp" /></div>
        <div className="text-right"><SortBtn col="maxPossibleScore" label="Max" /></div>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Max↑</span>
      </div>

      {/* Optimal 8 cards (above real leaderboard) */}
      {optimal8 && <Optimal8Card data={optimal8} label="Optimal 8 (Rolling)" description="Best 8 teams by current score at this moment" isPreTournament={isPreTournament} pickerPctMap={pickerPctMap} />}
      {optimal8Hindsight && <Optimal8Card data={optimal8Hindsight} label="Optimal 8 (Hindsight)" description="Best possible 8 picks knowing all tournament results" variant="hindsight" isPreTournament={isPreTournament} pickerPctMap={pickerPctMap} />}

      {/* Rows */}
      <div className="space-y-1.5">
        {sorted.length === 0 && (
          <div className="bg-card border border-border rounded-xl py-16 text-center text-muted-foreground text-sm">
            No picks submitted yet
          </div>
        )}

        {(() => {
          // Compute the default condensed view: top 10, your entries, bottom 2
          if (!showAll && sorted.length > 15 && currentUserId) {
            const top10 = sorted.slice(0, 10)
            const bottom2 = sorted.slice(-2)
            const top10EntryIds = new Set(top10.map((e) => e.entryId))
            const bottom2EntryIds = new Set(bottom2.map((e) => e.entryId))
            // User entries NOT already in top 10 or bottom 2
            const myEntries = sorted.filter(
              (e) => e.userId === currentUserId && !top10EntryIds.has(e.entryId) && !bottom2EntryIds.has(e.entryId)
            )
            const bottom2Filtered = bottom2.filter((e) => !top10EntryIds.has(e.entryId))
            const hasMyEntries = myEntries.length > 0
            const hasBottom = bottom2Filtered.length > 0

            const sections: { entries: LeaderboardEntry[]; separator?: string }[] = [
              { entries: top10 },
            ]
            if (hasMyEntries) {
              const myRank = myEntries[0]?.rank ?? 0
              sections.push({
                entries: myEntries,
                separator: `Your position — #${myRank} of ${sorted.length}`,
              })
            }
            if (hasBottom) {
              sections.push({
                entries: bottom2Filtered,
                separator: hasMyEntries ? undefined : `...`,
              })
            }

            return (
              <>
                {sections.map((section, sIdx) => (
                  <div key={sIdx}>
                    {section.separator && (
                      <div className="flex items-center gap-3 py-2 px-4">
                        <div className="flex-1 border-t border-border/50" />
                        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                          {section.separator}
                        </span>
                        <div className="flex-1 border-t border-border/50" />
                      </div>
                    )}
                    {!section.separator && sIdx > 0 && (
                      <div className="flex items-center gap-3 py-2 px-4">
                        <div className="flex-1 border-t border-dashed border-border/40" />
                        <span className="text-[10px] text-muted-foreground/50">···</span>
                        <div className="flex-1 border-t border-dashed border-border/40" />
                      </div>
                    )}
                    {section.entries.map((entry) => (
                      <LeaderboardRow
                        key={entry.entryId + "-" + sIdx}
                        entry={entry}
                        isMe={entry.userId === currentUserId}
                        isExpanded={expandedId === entry.entryId}
                        rankStyle={rankStyle}
                        onToggle={() =>
                          setExpandedId(expandedId === entry.entryId ? null : entry.entryId)
                        }
                        allEntries={sorted}
                        isPreTournament={isPreTournament}
                        pickerPctMap={pickerPctMap}
                      />
                    ))}
                  </div>
                ))}
                <div className="flex justify-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1.5 text-muted-foreground"
                    onClick={() => setShowAll(true)}
                  >
                    Show all {sorted.length} entries
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              </>
            )
          }

          // Full list view
          return (
            <>
              {sorted.map((entry) => (
                <LeaderboardRow
                  key={entry.entryId}
                  entry={entry}
                  isMe={entry.userId === currentUserId}
                  isExpanded={expandedId === entry.entryId}
                  rankStyle={rankStyle}
                  onToggle={() =>
                    setExpandedId(expandedId === entry.entryId ? null : entry.entryId)
                  }
                  allEntries={sorted}
                  isPreTournament={isPreTournament}
                  pickerPctMap={pickerPctMap}
                />
              ))}
              {showAll && sorted.length > 15 && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1.5 text-muted-foreground"
                    onClick={() => setShowAll(false)}
                  >
                    Show condensed view
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </>
          )
        })()}
      </div>

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" />
            Max Score = collision-aware maximum possible score
          </div>
          <span>
            {filtered.length} entr{filtered.length === 1 ? "y" : "ies"}
            {dimension !== "global" && ` (${data.length} total)`}
          </span>
        </div>
      )}
    </div>
  )
}
