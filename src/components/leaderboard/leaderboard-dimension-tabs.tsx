"use client"

/**
 * LeaderboardDimensionTabs — Dimension filter tabs for the leaderboard.
 *
 * 7 tabs: Global | By Country | By State | By Gender | By Fan Base | By Conference | Private Leagues
 *
 * Each non-global tab has a sub-selector dropdown to choose a specific value.
 * Default selection = current user's value for that dimension.
 * "No Response" always appears last in dropdowns.
 * State, Fan Base, and Conference use searchable dropdowns.
 */

import { useState, useMemo, useEffect, useRef, useCallback, type ReactNode } from "react"
import { Search } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { LeaderboardEntry } from "@/types"
import {
  DIMENSION_CONFIGS,
  type DimensionType,
  getDimensionValues,
  filterAndRerank,
  getDefaultDimensionValue,
  formatDimensionValue,
  countResponses,
  NO_RESPONSE,
} from "@/lib/leaderboard-dimensions"

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface LeaderboardDimensionTabsProps {
  /** Full global leaderboard entries */
  entries: LeaderboardEntry[]
  /** Current logged-in user's ID */
  currentUserId: string
  /** Teams array for resolving fan base IDs → display names */
  teams: Array<{ id: string; name: string }>
  /** User's leagues for Private Leagues tab */
  userLeagues?: Array<{ id: string; name: string }>
  /** Render callback for the leaderboard content */
  renderLeaderboard: (filteredEntries: LeaderboardEntry[]) => ReactNode
  /** Called whenever the filtered set of user IDs changes (for chart sync) */
  onFilterChange?: (filteredUserIds: Set<string>) => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCHABLE SELECT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function SearchableSelect({
  value,
  onValueChange,
  options,
  formatOption,
}: {
  value: string
  onValueChange: (value: string) => void
  options: string[]
  formatOption: (value: string) => string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    if (!search) return options
    const lower = search.toLowerCase()
    return options.filter(opt =>
      formatOption(opt).toLowerCase().includes(lower)
    )
  }, [options, search, formatOption])

  // Focus input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setSearch("")
    }
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 justify-between gap-2 min-w-[160px] text-sm font-normal"
        >
          <span className="truncate">{formatOption(value)}</span>
          <Search className="h-3.5 w-3.5 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <div className="p-2 border-b border-border/50">
          <Input
            ref={inputRef}
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="max-h-[240px] overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">No results</div>
          ) : (
            filtered.map(opt => (
              <button
                key={opt}
                className={`flex items-center w-full px-2 py-1.5 rounded-sm text-sm text-left transition-colors hover:bg-muted/50 ${
                  opt === value ? "bg-muted font-medium" : ""
                }`}
                onClick={() => {
                  onValueChange(opt)
                  setOpen(false)
                }}
              >
                {formatOption(opt)}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LeaderboardDimensionTabs({
  entries,
  currentUserId,
  teams,
  userLeagues = [],
  renderLeaderboard,
  onFilterChange,
}: LeaderboardDimensionTabsProps) {
  const [activeDimension, setActiveDimension] = useState<DimensionType>("global")

  // Per-tab remembered sub-selections
  const [subSelections, setSubSelections] = useState<Partial<Record<DimensionType, string>>>({})

  const activeConfig = useMemo(
    () => DIMENSION_CONFIGS.find(d => d.type === activeDimension)!,
    [activeDimension]
  )

  // Available values for the active dimension
  const dimensionValues = useMemo(
    () => getDimensionValues(entries, activeConfig),
    [entries, activeConfig]
  )

  // Compute the selected value synchronously (no effect delay).
  // If user hasn't explicitly picked a sub-value for this tab yet,
  // default to the logged-in player's own value for that dimension.
  const selectedValue = useMemo(() => {
    if (activeDimension === "global") return "global"

    // Private Leagues: use userLeagues for selector (independent of entry data)
    if (activeDimension === "privateLeague") {
      const explicit = subSelections[activeDimension]
      if (explicit && userLeagues.some(l => l.id === explicit)) return explicit
      return userLeagues.length > 0 ? userLeagues[0].id : ""
    }

    // User already made an explicit selection for this tab
    const explicit = subSelections[activeDimension]
    if (explicit) return explicit

    // Default to the logged-in player's own value
    return getDefaultDimensionValue(currentUserId, entries, activeConfig, dimensionValues)
  }, [activeDimension, subSelections, currentUserId, entries, activeConfig, dimensionValues, userLeagues])

  // Filter and re-rank entries
  const filteredEntries = useMemo(
    () => filterAndRerank(entries, activeConfig, selectedValue),
    [entries, activeConfig, selectedValue]
  )

  // Notify parent of filter changes (for chart sync)
  const filteredUserIds = useMemo(
    () => new Set(filteredEntries.map(e => e.userId)),
    [filteredEntries]
  )

  useEffect(() => {
    onFilterChange?.(filteredUserIds)
  }, [filteredUserIds, onFilterChange])

  const responseCount = useMemo(
    () => countResponses(entries, activeConfig),
    [entries, activeConfig]
  )

  // Format function for display names (memoized for fan base / leagues)
  const formatOption = useCallback((value: string) => {
    // For privateLeague: resolve league IDs to names
    if (activeConfig.type === "privateLeague") {
      const league = userLeagues.find(l => l.id === value)
      return league?.name ?? value
    }
    return formatDimensionValue(value, activeConfig, teams)
  }, [activeConfig, teams, userLeagues])

  const handleSubChange = (value: string) => {
    setSubSelections(prev => ({ ...prev, [activeDimension]: value }))
  }

  return (
    <div className="space-y-4">
      {/* ── Dimension Tabs ── */}
      <Tabs
        value={activeDimension}
        onValueChange={(v) => setActiveDimension(v as DimensionType)}
      >
        <TabsList variant="line" className="w-full overflow-x-auto flex-nowrap justify-start">
          {DIMENSION_CONFIGS.map(dim => (
            <TabsTrigger
              key={dim.type}
              value={dim.type}
              className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3"
            >
              <span className="hidden sm:inline">{dim.label}</span>
              <span className="sm:hidden">{dim.shortLabel}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* ── Sub-Selector ── */}
      {activeDimension !== "global" && activeDimension !== "privateLeague" && dimensionValues.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {activeConfig.searchable ? (
            <SearchableSelect
              value={selectedValue}
              onValueChange={handleSubChange}
              options={dimensionValues}
              formatOption={formatOption}
            />
          ) : (
            <Select value={selectedValue} onValueChange={handleSubChange}>
              <SelectTrigger size="sm" className="min-w-[140px]">
                <SelectValue>{formatOption(selectedValue)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {dimensionValues.map(val => (
                  <SelectItem key={val} value={val}>
                    {formatOption(val)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <span className="text-xs text-muted-foreground">
            {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
            {" · "}
            {responseCount} of {entries.length} specified
          </span>
        </div>
      )}

      {/* ── Private Leagues Sub-Selector + Content ── */}
      {activeDimension === "privateLeague" && (
        <>
          {userLeagues.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-sm text-muted-foreground">
                You haven&apos;t joined any leagues yet.
              </p>
              <p className="text-xs text-muted-foreground/60">
                Create or join a league to see league leaderboards here.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={selectedValue} onValueChange={handleSubChange}>
                  <SelectTrigger size="sm" className="min-w-[160px]">
                    <SelectValue>{formatOption(selectedValue)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {userLeagues.map(league => (
                      <SelectItem key={league.id} value={league.id}>
                        {league.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              {filteredEntries.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No entries in this league yet.
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    League leaderboards will populate once entries have picks submitted.
                  </p>
                </div>
              ) : (
                renderLeaderboard(filteredEntries)
              )}
            </>
          )}
        </>
      )}

      {/* ── Filtered Leaderboard (non-league dimensions) ── */}
      {activeDimension !== "privateLeague" && renderLeaderboard(filteredEntries)}
    </div>
  )
}
