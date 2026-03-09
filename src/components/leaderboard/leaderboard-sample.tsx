"use client"

/**
 * LeaderboardSample — approved data-table format.
 *
 * Layout (approved mockup):
 *   Frozen: Optimal 8 Rolling | Optimal 8 Final | You
 *   Blue divider
 *   Full data table sorted by rank
 *
 * Columns: Rank (Act/Max/Floor) | Percentile | Player | Score (Act/Max/Exp) | Teams | Left
 */

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { LeaderboardEntry, ResolvedPickSummary } from "@/types"
import { getSeedColor, REGION_COLORS, REGION_ABBREV, STATUS_COLORS } from "@/lib/colors"
import { getPrimaryArchetypeEmoji, getArchetypeByKey, ARCHETYPE_LEGEND } from "@/lib/archetypes"
import { ArchetypePopover } from "@/components/archetype-popover"
import { TeamCallout, type TeamCalloutData } from "@/components/team-callout"

// ── Types ───────────────────────────────────────────────────────────────────

export interface Optimal8Data {
  score: number
  ppr: number
  tps: number
  picks: ResolvedPickSummary[]
  expectedScore?: number | null
}

interface LeaderboardSampleProps {
  /** All leaderboard entries, sorted by rank */
  entries: LeaderboardEntry[]
  currentUserId?: string
  optimal8?: Optimal8Data
  optimal8Final?: Optimal8Data
}

// ── Archetype legend (imported from centralized definitions) ────────────────

// ── Helpers ─────────────────────────────────────────────────────────────────

function getTeamStatus(pick: ResolvedPickSummary): "green" | "yellow" | "red" {
  if (pick.eliminated) return "red"
  if (pick.wins > 0) return "green"
  return "yellow"
}

/**
 * Format rank with T-prefix for ties. No # symbol.
 * Returns "—" for null/undefined values.
 */
function formatRankValue(value: number | undefined | null, allValues: (number | undefined | null)[]): string {
  if (value == null) return "\u2014"
  const count = allValues.filter(v => v === value).length
  return count > 1 ? `T${value}` : `${value}`
}

/** Inverted percentile: 99.6% means better than 99.6% of entries */
function displayPercentile(entry: LeaderboardEntry, total: number): string {
  if (total <= 1) return "100.0"
  const pct = ((total - entry.rank) / total) * 100
  return pct.toFixed(1)
}

/** Teams-left color class (7-8 green, 5-6 gold, 3-4 orange, 1-2 red, 0 grey) */
function teamsLeftColor(count: number): string {
  if (count >= 7) return "text-green-600 dark:text-green-400"
  if (count >= 5) return "text-yellow-600 dark:text-yellow-400"
  if (count >= 3) return "text-orange-600 dark:text-orange-400"
  if (count >= 1) return "text-red-600 dark:text-red-400"
  return "text-muted-foreground"
}

// ── Team Logo (with circular badges) ────────────────────────────────────────

function TeamLogo({ pick }: { pick: ResolvedPickSummary }) {
  const status = getTeamStatus(pick)
  const statusColor = pick.eliminated ? "#6b7280" : STATUS_COLORS[status]
  const seedColor = getSeedColor(pick.seed)
  const regionAbbrev = pick.region ? REGION_ABBREV[pick.region] ?? pick.region.substring(0, 2) : ""
  const regionColor = pick.region ? REGION_COLORS[pick.region] ?? "#888" : "#888"

  const calloutData: TeamCalloutData = {
    name: pick.name,
    shortName: pick.shortName,
    seed: pick.seed,
    region: pick.region ?? "",
    wins: pick.wins,
    eliminated: pick.eliminated,
    logoUrl: pick.logoUrl,
  }

  return (
    <TeamCallout team={calloutData}>
      <div
        className={`relative w-8 h-8 shrink-0 cursor-pointer ${pick.eliminated ? "opacity-40 grayscale" : ""}`}
      >
        {/* Logo box */}
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center bg-card overflow-visible"
          style={{ border: `2.5px solid ${statusColor}` }}
        >
          {pick.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pick.logoUrl} alt="" className="w-[22px] h-[22px] object-contain" />
          ) : (
            <span className="text-[7px] font-bold text-muted-foreground">{pick.shortName.substring(0, 3)}</span>
          )}
        </div>
        {/* Region badge — circle, top-left */}
        {regionAbbrev && (
          <div
            className="absolute -top-1.5 -left-1.5 w-[13px] h-[13px] rounded-full flex items-center justify-center text-[6px] font-black text-white border border-background z-10"
            style={{ backgroundColor: regionColor }}
          >
            {regionAbbrev}
          </div>
        )}
        {/* Seed badge — circle, bottom-right */}
        <div
          className="absolute -bottom-1.5 -right-1.5 w-[14px] h-[14px] rounded-full flex items-center justify-center text-[7px] font-black text-white border border-background z-10"
          style={{ backgroundColor: seedColor }}
        >
          {pick.seed}
        </div>
      </div>
    </TeamCallout>
  )
}

// ── Teams strip (alive | red divider | eliminated) ──────────────────────────

function TeamsStrip({ picks }: { picks: ResolvedPickSummary[] }) {
  const alive = [...picks]
    .filter(p => !p.eliminated)
    .sort((a, b) => {
      // Sort by actual score (seed × wins) descending; tiebreak by seed desc (higher potential)
      const aScore = a.seed * a.wins
      const bScore = b.seed * b.wins
      return bScore - aScore || b.seed - a.seed
    })

  const eliminated = [...picks]
    .filter(p => p.eliminated)
    .sort((a, b) => {
      // Sort by score contribution (highest first)
      return (b.seed * b.wins) - (a.seed * a.wins) || b.seed - a.seed
    })

  return (
    <div className="flex items-center gap-1">
      {alive.map(p => <TeamLogo key={p.teamId} pick={p} />)}
      {alive.length > 0 && eliminated.length > 0 && (
        <div className="w-[2px] h-7 bg-red-500 rounded-full mx-0.5 shrink-0" />
      )}
      {eliminated.map(p => <TeamLogo key={p.teamId} pick={p} />)}
    </div>
  )
}

// ── Legend components ────────────────────────────────────────────────────────

function StatusLegend() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[70px]">Status</span>
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS.green }} />
        Won round
      </span>
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS.yellow }} />
        Yet to play
      </span>
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#6b7280" }} />
        Eliminated
      </span>
    </div>
  )
}

function ArchetypeLegendRow() {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[70px]">Archetypes</span>
      {ARCHETYPE_LEGEND.map(a => (
        <ArchetypePopover key={a.key} emoji={a.emoji} label={a.label} description={a.description}>
          <span className="flex items-center gap-1 hover:bg-muted/50 rounded px-1 py-0.5 transition-colors text-[11px] text-muted-foreground">
            <span>{a.emoji}</span>
            <span>{a.label}</span>
          </span>
        </ArchetypePopover>
      ))}
    </div>
  )
}

// ── Table row renderers ─────────────────────────────────────────────────────

function Optimal8Row({
  data,
  variant,
}: {
  data: Optimal8Data
  variant: "rolling" | "final"
}) {
  const isRolling = variant === "rolling"
  const teamsLeft = data.picks.filter(p => !p.eliminated).length
  const rowBg = isRolling
    ? "bg-primary/[0.04] dark:bg-primary/[0.06]"
    : "bg-orange-500/[0.04] dark:bg-orange-500/[0.06]"
  const nameColor = isRolling
    ? "text-primary"
    : "text-orange-600 dark:text-orange-400"

  return (
    <tr className={rowBg}>
      {/* Rank: Actual, Max, Floor — all dashes */}
      <td className="px-2 py-2.5 text-center"><span className="text-muted-foreground/40 text-xs">{"\u2014"}</span></td>
      <td className="px-2 py-2.5 text-center"><span className="text-muted-foreground/40 text-xs">{"\u2014"}</span></td>
      <td className="px-2 py-2.5 text-center"><span className="text-muted-foreground/40 text-xs">{"\u2014"}</span></td>
      {/* Percentile */}
      <td className="px-2 py-2.5 text-center"><span className="text-muted-foreground/40 text-xs">{"\u2014"}</span></td>
      {/* Player */}
      <td className="px-2 py-2.5 text-left whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{isRolling ? "\u2728" : "\uD83C\uDFC6"}</span>
          <span className={`text-xs font-bold ${nameColor}`}>
            {isRolling ? "Optimal 8 (Rolling)" : "Optimal 8 (Final)"}
          </span>
        </div>
      </td>
      {/* Score: Actual */}
      <td className="px-2 py-2.5 text-center"><span className="text-sm font-bold">{data.score}</span></td>
      {/* Score: Max */}
      <td className="px-2 py-2.5 text-center"><span className="text-sm text-muted-foreground">{data.tps}</span></td>
      {/* Score: Expected */}
      <td className="px-2 py-2.5 text-center">
        <span className="text-xs text-muted-foreground">
          {data.expectedScore != null ? data.expectedScore.toFixed(1) : "\u2014"}
        </span>
      </td>
      {/* Teams */}
      <td className="px-2 py-2.5 text-left">
        <TeamsStrip picks={data.picks} />
      </td>
      {/* Left */}
      <td className="px-2 py-2.5 text-center">
        <span className={`text-sm font-semibold ${teamsLeftColor(teamsLeft)}`}>{teamsLeft}</span>
      </td>
    </tr>
  )
}

function EntryRow({
  entry,
  isYou,
  isFrozenYou,
  allRanks,
  allMaxRanks,
  allFloorRanks,
  totalEntries,
}: {
  entry: LeaderboardEntry
  isYou: boolean
  /** True only for the pinned "You" row above the divider */
  isFrozenYou: boolean
  allRanks: number[]
  allMaxRanks: number[]
  allFloorRanks: number[]
  totalEntries: number
}) {
  const allArchetypes = (entry.archetypes ?? []).map(k => getArchetypeByKey(k)).filter(Boolean) as { key: string; emoji: string; label: string; description: string }[]
  const teamsLeft = entry.teamsRemaining

  const rankDisplay = formatRankValue(entry.rank, allRanks)
  const maxRankDisplay = formatRankValue(entry.maxRank, allMaxRanks)
  const floorRankDisplay = formatRankValue(entry.floorRank, allFloorRanks)
  const pctDisplay = displayPercentile(entry, totalEntries)

  const rowBg = isFrozenYou
    ? "bg-primary/[0.08] dark:bg-primary/10"
    : isYou
      ? "bg-primary/[0.04] dark:bg-primary/[0.06]"
      : ""

  return (
    <tr className={`${rowBg} border-b border-border/30 hover:bg-muted/50 transition-colors`}>
      {/* Rank: Actual */}
      <td className="px-2 py-2.5 text-center">
        <span className="text-sm font-semibold">{rankDisplay}</span>
      </td>
      {/* Rank: Max */}
      <td className="px-2 py-2.5 text-center">
        <span className="text-sm font-semibold text-green-600 dark:text-green-400">{maxRankDisplay}</span>
      </td>
      {/* Rank: Floor */}
      <td className="px-2 py-2.5 text-center">
        <span className="text-sm font-semibold text-red-600 dark:text-red-400">{floorRankDisplay}</span>
      </td>
      {/* Percentile */}
      <td className="px-2 py-2.5 text-center">
        <span className="text-xs text-muted-foreground">{pctDisplay}%</span>
      </td>
      {/* Player */}
      <td className="px-2 py-2.5 text-left whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          {allArchetypes.map(a => (
            <ArchetypePopover key={a.key} emoji={a.emoji} label={a.label} description={a.description}>
              <span className="text-sm">{a.emoji}</span>
            </ArchetypePopover>
          ))}
          <span className="text-sm font-medium">{entry.name}</span>
          {isYou && (
            <Badge variant="outline" className="text-[9px] border-primary/40 text-primary h-4 px-1.5 shrink-0">You</Badge>
          )}
          {entry.rankChange != null && entry.rankChange > 0 && (
            <span className="text-[10px] font-bold text-green-600 dark:text-green-400">{"\u25B2"}{entry.rankChange}</span>
          )}
          {entry.rankChange != null && entry.rankChange < 0 && (
            <span className="text-[10px] font-bold text-red-600 dark:text-red-400">{"\u25BC"}{Math.abs(entry.rankChange)}</span>
          )}
        </div>
      </td>
      {/* Score: Actual */}
      <td className="px-2 py-2.5 text-center">
        <span className="text-sm font-bold">{entry.currentScore}</span>
      </td>
      {/* Score: Max */}
      <td className="px-2 py-2.5 text-center">
        <span className="text-sm text-muted-foreground">{entry.maxPossibleScore ?? entry.tps}</span>
      </td>
      {/* Score: Expected */}
      <td className="px-2 py-2.5 text-center">
        <span className="text-xs text-muted-foreground">
          {entry.expectedScore != null ? entry.expectedScore.toFixed(1) : "\u2014"}
        </span>
      </td>
      {/* Teams */}
      <td className="px-2 py-2.5 text-left">
        {entry.picks.length > 0 ? (
          <TeamsStrip picks={entry.picks} />
        ) : (
          <span className="text-xs text-muted-foreground/40 italic">No picks</span>
        )}
      </td>
      {/* Left */}
      <td className="px-2 py-2.5 text-center">
        <span className={`text-sm font-semibold ${teamsLeftColor(teamsLeft)}`}>{teamsLeft}</span>
      </td>
    </tr>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

const COLLAPSED_COUNT = 10

export function LeaderboardSample({ entries, currentUserId, optimal8, optimal8Final }: LeaderboardSampleProps) {
  const totalEntries = entries.length
  const [showAll, setShowAll] = useState(false)

  // Collect all rank values for tie detection
  const allRanks = entries.map(e => e.rank)
  const allMaxRanks = entries.map(e => e.maxRank).filter((v): v is number => v != null)
  const allFloorRanks = entries.map(e => e.floorRank).filter((v): v is number => v != null)

  // Find the "You" entry
  const youEntry = entries.find(e => e.userId === currentUserId)

  // Full table sorted by rank
  const sortedEntries = [...entries].sort((a, b) => a.rank - b.rank)

  // Determine which entries to display in the data table
  const hasMore = sortedEntries.length > COLLAPSED_COUNT
  const visibleEntries = showAll ? sortedEntries : sortedEntries.slice(0, COLLAPSED_COUNT)
  const hiddenCount = sortedEntries.length - COLLAPSED_COUNT

  return (
    <div className="space-y-4">
      {/* ── Legends (two rows) ── */}
      <div className="rounded-lg border border-border bg-card p-3 space-y-2">
        <StatusLegend />
        <ArchetypeLegendRow />
      </div>

      {/* ── Data Table ── */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ minWidth: 920 }}>
          <thead>
            {/* Super header */}
            <tr className="bg-muted/50">
              <th colSpan={3} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b-0">
                Rank
              </th>
              <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b-0">
                <span className="hidden md:inline">Percentile</span>
                <span className="md:hidden">%ile</span>
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b-0">
                Player
              </th>
              <th colSpan={3} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b-0">
                Score
              </th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b-0">
                Teams
              </th>
              <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b-0">
                Left
              </th>
            </tr>
            {/* Sub header */}
            <tr className="bg-muted/50 border-b-2 border-border">
              <th className="px-2 pb-2 text-center text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70">
                <span className="hidden md:inline">Actual</span>
                <span className="md:hidden">Act</span>
              </th>
              <th className="px-2 pb-2 text-center text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70">Max</th>
              <th className="px-2 pb-2 text-center text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70">Floor</th>
              <th className="px-2 pb-2" />
              <th className="px-2 pb-2" />
              <th className="px-2 pb-2 text-center text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70">
                <span className="hidden md:inline">Actual</span>
                <span className="md:hidden">Act</span>
              </th>
              <th className="px-2 pb-2 text-center text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70">Max</th>
              <th className="px-2 pb-2 text-center text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70">Exp</th>
              <th className="px-2 pb-2" />
              <th className="px-2 pb-2" />
            </tr>
          </thead>
          <tbody>
            {/* ═══ Frozen rows ═══ */}

            {/* Optimal 8 (Rolling) */}
            {optimal8 && <Optimal8Row data={optimal8} variant="rolling" />}

            {/* Optimal 8 (Final) */}
            {optimal8Final && <Optimal8Row data={optimal8Final} variant="final" />}

            {/* You row */}
            {youEntry && (
              <EntryRow
                entry={youEntry}
                isYou
                isFrozenYou
                allRanks={allRanks}
                allMaxRanks={allMaxRanks}
                allFloorRanks={allFloorRanks}
                totalEntries={totalEntries}
              />
            )}

            {/* ═══ Blue divider ═══ */}
            <tr>
              <td colSpan={10} className="p-0">
                <div className="h-[3px] bg-primary" />
              </td>
            </tr>

            {/* ═══ Data table (top 10 or all) ═══ */}
            {visibleEntries.map(entry => (
              <EntryRow
                key={entry.entryId}
                entry={entry}
                isYou={entry.userId === currentUserId}
                isFrozenYou={false}
                allRanks={allRanks}
                allMaxRanks={allMaxRanks}
                allFloorRanks={allFloorRanks}
                totalEntries={totalEntries}
              />
            ))}

            {sortedEntries.length === 0 && (
              <tr>
                <td colSpan={10} className="py-12 text-center text-sm text-muted-foreground">
                  No entries yet
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Expand / Collapse button */}
        {hasMore && (
          <button
            onClick={() => setShowAll(prev => !prev)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-primary hover:bg-muted/50 transition-colors border-t border-border"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Show Top {COLLAPSED_COUNT} Only
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Show All {totalEntries} Entries ({hiddenCount} more)
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
