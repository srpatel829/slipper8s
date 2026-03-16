"use client"

/**
 * PreTournamentBracket — Shows the initial R64 bracket structure from seeded teams.
 *
 * Before TournamentGame records exist, generates matchups from the NCAA standard
 * bracket pairings (1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15).
 *
 * For play-in slots, shows both teams with a "/" divider (like CBS bracket).
 */

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getSeedColor, REGION_COLORS } from "@/lib/colors"

interface TeamInfo {
  id: string
  name: string
  shortName: string
  seed: number
  region: string
  logoUrl: string | null
  isPlayIn: boolean
}

interface PlayInSlotInfo {
  id: string
  seed: number
  region: string
  team1: TeamInfo
  team2: TeamInfo
  winnerId: string | null
}

interface PreTournamentBracketProps {
  teams: TeamInfo[]
  playInSlots: PlayInSlotInfo[]
  regions: string[]
  userPickTeamIds: string[]
}

// Standard NCAA R64 seed pairings (top seed vs bottom seed)
const R64_PAIRINGS = [
  [1, 16],
  [8, 9],
  [5, 12],
  [4, 13],
  [6, 11],
  [3, 14],
  [7, 10],
  [2, 15],
]

function TeamSlot({
  team,
  isPick,
  isPlayIn,
  playInSlot,
}: {
  team: TeamInfo | null
  isPick: boolean
  isPlayIn?: boolean
  playInSlot?: PlayInSlotInfo | null
}) {
  // Play-in slot: show "Team1 / Team2" with both logos
  if (isPlayIn && playInSlot) {
    const t1Pick = isPick // The play-in slot is picked as a whole
    return (
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1 h-8 transition-colors",
          t1Pick && "ring-1 ring-primary/50 ring-inset"
        )}
      >
        <span
          className="text-[9px] font-bold w-4 text-center rounded text-white px-0.5"
          style={{ backgroundColor: getSeedColor(playInSlot.seed) }}
        >
          {playInSlot.seed}
        </span>
        {playInSlot.team1.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={playInSlot.team1.logoUrl} alt="" className="h-3.5 w-3.5 object-contain" />
        )}
        <span className="text-[10px] font-medium text-foreground truncate">
          {playInSlot.team1.shortName}
        </span>
        <span className="text-[9px] text-muted-foreground/60 font-medium">/</span>
        {playInSlot.team2.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={playInSlot.team2.logoUrl} alt="" className="h-3.5 w-3.5 object-contain" />
        )}
        <span className="text-[10px] font-medium text-foreground truncate">
          {playInSlot.team2.shortName}
        </span>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 h-7 bg-muted/20">
        <span className="text-[10px] text-muted-foreground/40 font-mono w-4">—</span>
        <span className="text-muted-foreground/40 text-[10px]">TBD</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 h-7 transition-colors",
        isPick && "ring-1 ring-primary/50 ring-inset"
      )}
    >
      <span
        className="text-[9px] font-bold w-4 text-center rounded text-white px-0.5"
        style={{ backgroundColor: getSeedColor(team.seed) }}
      >
        {team.seed}
      </span>
      {team.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logoUrl} alt="" className="h-3.5 w-3.5 object-contain" />
      ) : null}
      <span className="flex-1 truncate text-[11px] font-medium text-foreground">
        {team.shortName}
      </span>
    </div>
  )
}

function MatchupCard({
  topTeam,
  bottomTeam,
  userPickTeamIds,
  topPlayIn,
  bottomPlayIn,
}: {
  topTeam: TeamInfo | null
  bottomTeam: TeamInfo | null
  userPickTeamIds: string[]
  topPlayIn?: PlayInSlotInfo | null
  bottomPlayIn?: PlayInSlotInfo | null
}) {
  return (
    <div className="bg-card border border-border/60 rounded-lg overflow-hidden text-xs">
      <TeamSlot
        team={topTeam}
        isPick={topTeam ? userPickTeamIds.includes(topTeam.id) : false}
        isPlayIn={!!topPlayIn}
        playInSlot={topPlayIn}
      />
      <div className="h-px bg-border/40" />
      <TeamSlot
        team={bottomTeam}
        isPick={bottomTeam ? userPickTeamIds.includes(bottomTeam.id) : false}
        isPlayIn={!!bottomPlayIn}
        playInSlot={bottomPlayIn}
      />
    </div>
  )
}

function RegionBracket({
  region,
  teams,
  playInSlots,
  userPickTeamIds,
}: {
  region: string
  teams: TeamInfo[]
  playInSlots: PlayInSlotInfo[]
  userPickTeamIds: string[]
}) {
  const regionColor = REGION_COLORS[region] ?? "#888"
  const regionTeams = teams.filter(t => t.region === region && !t.isPlayIn)

  // Build a seed → team map for this region
  const seedMap = new Map<number, TeamInfo>()
  for (const t of regionTeams) {
    seedMap.set(t.seed, t)
  }

  // Build a seed → play-in slot map for this region
  const playInMap = new Map<number, PlayInSlotInfo>()
  for (const slot of playInSlots.filter(s => s.region === region)) {
    playInMap.set(slot.seed, slot)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: regionColor }} />
        <h3 className="text-sm font-bold">{region} Region</h3>
      </div>

      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Round of 64
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {R64_PAIRINGS.map(([topSeed, bottomSeed]) => {
            const topPlayIn = playInMap.get(topSeed) ?? null
            const bottomPlayIn = playInMap.get(bottomSeed) ?? null

            return (
              <MatchupCard
                key={`${region}-${topSeed}-${bottomSeed}`}
                topTeam={topPlayIn ? null : seedMap.get(topSeed) ?? null}
                bottomTeam={bottomPlayIn ? null : seedMap.get(bottomSeed) ?? null}
                userPickTeamIds={userPickTeamIds}
                topPlayIn={topPlayIn}
                bottomPlayIn={bottomPlayIn}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function PreTournamentBracket({ teams, playInSlots, regions, userPickTeamIds }: PreTournamentBracketProps) {
  const [activeRegion, setActiveRegion] = useState(regions[0] ?? "East")

  return (
    <div className="space-y-6">
      {/* Legend */}
      {userPickTeamIds.length > 0 && (
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded border border-primary/50 bg-primary/5" />
            <span>Your pick</span>
          </div>
        </div>
      )}

      {/* Mobile: tabs per region */}
      <div className="md:hidden">
        <Tabs value={activeRegion} onValueChange={setActiveRegion}>
          <TabsList className="w-full grid grid-cols-4">
            {regions.map(region => (
              <TabsTrigger key={region} value={region} className="text-xs">
                {region.slice(0, 4)}
              </TabsTrigger>
            ))}
          </TabsList>
          {regions.map(region => (
            <TabsContent key={region} value={region}>
              <RegionBracket
                region={region}
                teams={teams}
                playInSlots={playInSlots}
                userPickTeamIds={userPickTeamIds}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Desktop: 2x2 grid */}
      <div className="hidden md:grid grid-cols-2 gap-6">
        {regions.map(region => (
          <RegionBracket
            key={region}
            region={region}
            teams={teams}
            playInSlots={playInSlots}
            userPickTeamIds={userPickTeamIds}
          />
        ))}
      </div>
    </div>
  )
}
