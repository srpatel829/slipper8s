"use client"

/**
 * TournamentBracket — Full 64-team read-only bracket visualization.
 *
 * Shows only results up to the current gameIndex — no future peeking.
 * Layout: East (→) | Final Four + Championship (center) | West (←)
 *         South (→) | [spacer]                           | Midwest (←)
 *
 * The center column is vertically centered in the viewport between the two bracket rows.
 */

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import { computeStateAtGame, type DemoGameEvent } from "@/lib/demo-game-sequence"
import { TeamCallout } from "@/components/team-callout"
import { buildTeamCalloutData } from "@/lib/team-callout-helpers"

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamLike {
    id: string
    name: string
    shortName: string
    seed: number
    region: string
    logoUrl: string | null
    espnId?: string | null
    conference?: string | null
    eliminated: boolean
    wins: number
    isPlayIn: boolean
}

interface TournamentBracketProps {
    teams: TeamLike[]
    gameSequence: DemoGameEvent[]
    gameIndex: number
    isPreTournament?: boolean
    userPickTeamIds?: string[]
}

const R64_ORDER = [[1, 16], [8, 9], [5, 12], [4, 13], [6, 11], [3, 14], [7, 10], [2, 15]] as const
const REGIONS = ["East", "West", "South", "Midwest"] as const
type Region = typeof REGIONS[number]
const ROUND_LABELS: Record<number, string> = { 1: "R64", 2: "R32", 3: "S16", 4: "E8" }

// ─── Team slot ────────────────────────────────────────────────────────────────

function SlotCell({
    team,
    isWinner,
    isCompleted,
    reversed,
    isChampion,
    isPreTournament = false,
    isUserPick = false,
}: {
    team: TeamLike | null
    isWinner: boolean
    isCompleted: boolean
    reversed?: boolean
    isChampion?: boolean
    isPreTournament?: boolean
    isUserPick?: boolean
}) {
    if (!team) {
        return (
            <div className={cn(
                "h-7 flex items-center px-1.5 text-[9px] text-muted-foreground/25 border border-border/15 rounded bg-card/5",
                reversed && "flex-row-reverse",
                isChampion && "h-8 border-primary/20 bg-primary/5"
            )}>
                <span>TBD</span>
            </div>
        )
    }

    const dimmed = isCompleted && !isWinner

    const slot = (
        <div className={cn(
            "h-7 flex items-center gap-1 px-1.5 rounded border text-[9px] font-medium select-none cursor-pointer",
            reversed && "flex-row-reverse",
            isChampion
                ? "h-9 text-[10px] border-yellow-400/50 bg-yellow-400/8 font-bold"
                : isWinner
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : isCompleted
                        ? "border-border/15 bg-muted/5 text-muted-foreground/30 line-through"
                        : isUserPick
                            ? "border-primary/40 bg-primary/5 text-foreground/75 ring-1 ring-primary/20"
                            : "border-border/25 bg-card/20 text-foreground/65",
        )}>
            {team.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={team.logoUrl} alt="" className={cn("object-contain shrink-0", isChampion ? "h-4 w-4" : "h-3.5 w-3.5")} />
            ) : (
                <span className={cn(
                    "shrink-0 flex items-center justify-center rounded-full bg-muted font-bold",
                    isChampion ? "h-4 w-4 text-[8px]" : "h-3.5 w-3.5 text-[7px]"
                )}>
                    {team.shortName[0]}
                </span>
            )}
            <span className={cn(
                "shrink-0 text-[8px]",
                dimmed ? "text-muted-foreground/30" : "text-muted-foreground/60",
                isChampion && "text-yellow-500/70"
            )}>
                #{team.seed}
            </span>
            <span className={cn("truncate min-w-0", dimmed && "text-muted-foreground/30", isChampion && "text-yellow-300")}>
                {team.shortName}
            </span>
            {isWinner && !isChampion && (
                <span className={cn("shrink-0 ml-auto text-primary text-[7px]", reversed && "ml-0 mr-auto")}>✓</span>
            )}
            {isChampion && isWinner && (
                <span className="shrink-0 ml-auto text-yellow-400 text-[10px]">🏆</span>
            )}
        </div>
    )

    return (
        <TeamCallout
            team={buildTeamCalloutData(
                { id: team.id, name: team.name, shortName: team.shortName, seed: team.seed, region: team.region, wins: team.wins, eliminated: team.eliminated, logoUrl: team.logoUrl, espnId: team.espnId, conference: team.conference },
                isPreTournament,
            )}
        >
            {slot}
        </TeamCallout>
    )
}

// ─── Matchup pair ─────────────────────────────────────────────────────────────

function MatchupPair({
    topTeam,
    botTeam,
    winnerId,
    isCompleted,
    reversed,
    isPreTournament,
    userPickIds,
}: {
    topTeam: TeamLike | null
    botTeam: TeamLike | null
    winnerId?: string
    isCompleted: boolean
    reversed?: boolean
    isPreTournament?: boolean
    userPickIds?: Set<string>
}) {
    return (
        <div className="flex flex-col gap-px">
            <SlotCell
                team={topTeam}
                isWinner={isCompleted && winnerId === topTeam?.id}
                isCompleted={isCompleted}
                reversed={reversed}
                isPreTournament={isPreTournament}
                isUserPick={!!topTeam && !!userPickIds?.has(topTeam.id)}
            />
            <SlotCell
                team={botTeam}
                isWinner={isCompleted && winnerId === botTeam?.id}
                isCompleted={isCompleted}
                reversed={reversed}
                isPreTournament={isPreTournament}
                isUserPick={!!botTeam && !!userPickIds?.has(botTeam.id)}
            />
        </div>
    )
}

// ─── Region bracket builder ───────────────────────────────────────────────────

interface RoundData {
    round: number
    matchups: Array<{
        topTeam: TeamLike | null
        botTeam: TeamLike | null
        winnerId?: string
        isCompleted: boolean
    }>
}

function buildRegionRounds(
    region: Region,
    teamMap: Map<string, TeamLike>,
    gameSequence: DemoGameEvent[],
    gameIndex: number
): { rounds: RoundData[]; e8WinnerId: string | null } {
    const regionTeams = Array.from(teamMap.values()).filter(t => t.region === region && !t.isPlayIn)

    // Get only completed games in this region for R1-R4
    const completedGames = gameSequence.filter(g =>
        g.round >= 1 && g.round <= 4 && g.region === region && g.gameIndex <= gameIndex
    )
    const gameByRound = new Map<number, DemoGameEvent[]>()
    for (const g of completedGames) {
        const arr = gameByRound.get(g.round) ?? []
        arr.push(g)
        gameByRound.set(g.round, arr)
    }

    // Track effective winners per round slot (null if not yet played)
    // Slot ordering matches game sequence order within the round
    let prevWinnerIds: (string | null)[] = []

    const rounds: RoundData[] = []

    for (let round = 1; round <= 4; round++) {
        const roundGames = gameByRound.get(round) ?? []
        const numMatchups = round === 1 ? 8 : round === 2 ? 4 : round === 3 ? 2 : 1

        const matchups = []
        const nextWinnerIds: (string | null)[] = []

        if (round === 1) {
            // R64: standard seed pairings — teams always known
            for (const [seedA, seedB] of R64_ORDER) {
                const topTeam = regionTeams.find(t => t.seed === seedA) ?? null
                const botTeam = regionTeams.find(t => t.seed === seedB) ?? null

                // Find the completed game between these two
                const game = gameSequence.find(g =>
                    g.round === 1 && g.region === region &&
                    g.gameIndex <= gameIndex &&
                    ((g.winnerId === topTeam?.id && g.loserId === botTeam?.id) ||
                        (g.winnerId === botTeam?.id && g.loserId === topTeam?.id))
                )
                const isCompleted = !!game
                matchups.push({ topTeam, botTeam, winnerId: game?.winnerId, isCompleted })
                nextWinnerIds.push(game?.winnerId ?? null)
            }
        } else {
            // R32, S16, E8: participants come from prior round winners
            for (let i = 0; i < numMatchups; i++) {
                const topId = prevWinnerIds[i * 2] ?? null
                const botId = prevWinnerIds[i * 2 + 1] ?? null
                const topTeam = topId ? teamMap.get(topId) ?? null : null
                const botTeam = botId ? teamMap.get(botId) ?? null : null

                // Find the completed game for this slot
                let game: DemoGameEvent | undefined
                if (topTeam && botTeam) {
                    game = gameSequence.find(g =>
                        g.round === round && g.region === region &&
                        g.gameIndex <= gameIndex &&
                        ((g.winnerId === topTeam.id && g.loserId === botTeam.id) ||
                            (g.winnerId === botTeam.id && g.loserId === topTeam.id))
                    )
                }

                const isCompleted = !!game
                matchups.push({ topTeam, botTeam, winnerId: game?.winnerId, isCompleted })
                nextWinnerIds.push(game?.winnerId ?? null)
            }
        }

        rounds.push({ round, matchups })
        prevWinnerIds = nextWinnerIds
    }

    const e8WinnerId = prevWinnerIds[0] ?? null
    return { rounds, e8WinnerId }
}

// ─── Region bracket component ─────────────────────────────────────────────────

const CELL_H = 14
const MATCHUP_H = CELL_H * 2 + 2  // ~30px

function RegionBracket({
    region,
    rounds,
    reversed,
    isPreTournament,
    userPickIds,
}: {
    region: string
    rounds: RoundData[]
    reversed?: boolean
    isPreTournament?: boolean
    userPickIds?: Set<string>
}) {
    const COL_W = 112

    return (
        <div className="flex flex-col gap-1">
            <div className={cn(
                "text-[7px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-0.5",
                reversed ? "text-right" : "text-left"
            )}>
                {region}
            </div>

            <div className={cn("flex gap-0 items-start", reversed && "flex-row-reverse")}>
                {rounds.map((roundData, rIdx) => {
                    const spacingMult = Math.pow(2, rIdx)
                    const betweenGap = MATCHUP_H * (spacingMult - 1) + (rIdx === 0 ? 4 : 4 * spacingMult)
                    const topPad = rIdx === 0 ? 0 : (MATCHUP_H * spacingMult / 2 - MATCHUP_H / 2)

                    return (
                        <div key={roundData.round} className="flex flex-col" style={{ width: COL_W }}>
                            <div className={cn(
                                "text-[7px] text-muted-foreground/30 font-mono mb-1",
                                reversed ? "text-right pr-1" : "pl-1"
                            )}>
                                {ROUND_LABELS[roundData.round]}
                            </div>
                            <div
                                className="flex flex-col"
                                style={{ gap: `${betweenGap}px`, paddingTop: `${topPad}px` }}
                            >
                                {roundData.matchups.map((m, mIdx) => (
                                    <div key={mIdx} className={cn("flex items-center", reversed && "flex-row-reverse")}>
                                        <div style={{ width: COL_W - 10 }}>
                                            <MatchupPair
                                                topTeam={m.topTeam}
                                                botTeam={m.botTeam}
                                                winnerId={m.winnerId}
                                                isCompleted={m.isCompleted}
                                                reversed={reversed}
                                                isPreTournament={isPreTournament}
                                                userPickIds={userPickIds}
                                            />
                                        </div>
                                        {rIdx < rounds.length - 1 && (
                                            <div className="w-2.5 shrink-0" style={{ height: MATCHUP_H }}>
                                                <svg width={10} height={MATCHUP_H}>
                                                    <line
                                                        x1={reversed ? 10 : 0} y1={MATCHUP_H / 2}
                                                        x2={reversed ? 0 : 10} y2={MATCHUP_H / 2}
                                                        stroke="hsl(var(--border) / 0.2)" strokeWidth={1}
                                                    />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Center column: F4 + Championship ────────────────────────────────────────

function CenterColumn({
    gameSequence,
    gameIndex,
    teamMap,
    e8Winners,
    isPreTournament,
    userPickIds,
}: {
    gameSequence: DemoGameEvent[]
    gameIndex: number
    teamMap: Map<string, TeamLike>
    e8Winners: Map<Region, string | null>
    isPreTournament?: boolean
    userPickIds?: Set<string>
}) {
    const f4Games = gameSequence.filter(g => g.round === 5)
    const champGame = gameSequence.find(g => g.round === 6)

    // F4 pair 0: East vs South winner
    // F4 pair 1: West vs Midwest winner
    const f4Pairs: [Region, Region][] = [["East", "South"], ["West", "Midwest"]]

    // Compute F4 participants and results
    const f4Data = f4Pairs.map(([rA, rB], i) => {
        const topId = e8Winners.get(rA) ?? null
        const botId = e8Winners.get(rB) ?? null
        const topTeam = topId ? teamMap.get(topId) ?? null : null
        const botTeam = botId ? teamMap.get(botId) ?? null : null
        const game = f4Games[i]
        const isCompleted = game ? game.gameIndex <= gameIndex : false
        const winnerId = isCompleted ? game?.winnerId : undefined
        return { topTeam, botTeam, game, isCompleted, winnerId }
    })

    // Championship participants come from F4 winners
    const champTopId = f4Data[0].isCompleted ? f4Data[0].winnerId : undefined
    const champBotId = f4Data[1].isCompleted ? f4Data[1].winnerId : undefined
    const champTopTeam = champTopId ? teamMap.get(champTopId) ?? null : null
    const champBotTeam = champBotId ? teamMap.get(champBotId) ?? null : null
    const champCompleted = champGame ? champGame.gameIndex <= gameIndex : false
    const champWinnerId = champCompleted ? champGame?.winnerId : undefined

    function GameSlot({
        team, isWinner, isCompleted, isChampion
    }: {
        team: TeamLike | null
        isWinner: boolean
        isCompleted: boolean
        isChampion?: boolean
    }) {
        return <SlotCell team={team} isWinner={isWinner} isCompleted={isCompleted} isChampion={isChampion} isPreTournament={isPreTournament} isUserPick={!!team && !!userPickIds?.has(team.id)} />
    }

    return (
        <div className="flex flex-col items-center gap-0 min-w-[150px]">
            {/* F4 label */}
            <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-2">
                Final Four
            </div>

            {/* F4 Game 1: East/West */}
            <div className="w-full space-y-px mb-1">
                <div className="text-[7px] text-muted-foreground/35 text-center font-mono">East / West</div>
                <MatchupPair
                    topTeam={f4Data[0].topTeam}
                    botTeam={f4Data[0].botTeam}
                    winnerId={f4Data[0].winnerId}
                    isCompleted={f4Data[0].isCompleted}
                    isPreTournament={isPreTournament}
                    userPickIds={userPickIds}
                />
            </div>

            {/* Arrow lines down to championship */}
            <div className="flex flex-col items-center my-1 opacity-30">
                <div className="w-px h-3 bg-muted-foreground" />
                <div className="w-2 h-px bg-muted-foreground" />
            </div>

            {/* Championship */}
            <div className="w-full space-y-1 mb-1">
                <div className="text-[8px] font-bold text-primary/50 text-center uppercase tracking-widest">
                    Championship
                </div>
                <MatchupPair
                    topTeam={champTopTeam}
                    botTeam={champBotTeam}
                    winnerId={champWinnerId}
                    isCompleted={champCompleted}
                    isPreTournament={isPreTournament}
                    userPickIds={userPickIds}
                />
                {/* Champion badge */}
                {champWinnerId && champCompleted && (() => {
                    const champ = teamMap.get(champWinnerId)
                    return champ ? (
                        <div className="mt-1 px-2 py-1 rounded border border-yellow-400/40 bg-yellow-400/8 flex items-center gap-1.5 justify-center">
                            {champ.logoUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={champ.logoUrl} alt="" className="h-4 w-4 object-contain" />
                            )}
                            <span className="text-[9px] font-bold text-yellow-400">{champ.shortName} 🏆</span>
                        </div>
                    ) : null
                })()}
            </div>

            {/* Arrow lines up from F4 game 2 */}
            <div className="flex flex-col items-center my-1 opacity-30">
                <div className="w-2 h-px bg-muted-foreground" />
                <div className="w-px h-3 bg-muted-foreground" />
            </div>

            {/* F4 Game 2: South/Midwest */}
            <div className="w-full space-y-px">
                <div className="text-[7px] text-muted-foreground/35 text-center font-mono">South / Midwest</div>
                <MatchupPair
                    topTeam={f4Data[1].topTeam}
                    botTeam={f4Data[1].botTeam}
                    winnerId={f4Data[1].winnerId}
                    isCompleted={f4Data[1].isCompleted}
                    isPreTournament={isPreTournament}
                    userPickIds={userPickIds}
                />
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TournamentBracket({ teams, gameSequence, gameIndex, isPreTournament = false, userPickTeamIds = [] }: TournamentBracketProps) {
    const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams])
    const pickSet = useMemo(() => new Set(userPickTeamIds), [userPickTeamIds])

    const { eastRounds, westRounds, southRounds, midwestRounds, e8Winners } = useMemo(() => {
        const eastData = buildRegionRounds("East", teamMap, gameSequence, gameIndex)
        const westData = buildRegionRounds("West", teamMap, gameSequence, gameIndex)
        const southData = buildRegionRounds("South", teamMap, gameSequence, gameIndex)
        const midwestData = buildRegionRounds("Midwest", teamMap, gameSequence, gameIndex)

        const e8Winners = new Map<Region, string | null>([
            ["East", eastData.e8WinnerId],
            ["West", westData.e8WinnerId],
            ["South", southData.e8WinnerId],
            ["Midwest", midwestData.e8WinnerId],
        ])

        return {
            eastRounds: eastData.rounds,
            westRounds: westData.rounds,
            southRounds: southData.rounds,
            midwestRounds: midwestData.rounds,
            e8Winners,
        }
    }, [teamMap, gameSequence, gameIndex])

    const [zoom, setZoom] = useState(1.0)

    return (
        <div className="relative">
            {/* Zoom controls */}
            <div className="sticky top-16 z-20 flex items-center gap-1 mb-2 justify-end">
                <button
                    onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                    className="h-7 w-7 rounded border border-border/40 bg-card/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] font-mono text-muted-foreground w-10 text-center">
                    {Math.round(zoom * 100)}%
                </span>
                <button
                    onClick={() => setZoom(z => Math.min(1.5, z + 0.25))}
                    className="h-7 w-7 rounded border border-border/40 bg-card/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                    onClick={() => setZoom(1.0)}
                    className="h-7 w-7 rounded border border-border/40 bg-card/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                    <Maximize2 className="h-3.5 w-3.5" />
                </button>
            </div>

            <div className="w-full overflow-x-auto overflow-y-hidden">
                <div
                    className="min-w-[1100px] origin-top-left transition-transform"
                    style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }}
                >
                    {/* Top row */}
                    <div className="flex gap-2 justify-center items-start">
                        <div className="flex-1 min-w-0">
                            <RegionBracket region="East" rounds={eastRounds} reversed={false} isPreTournament={isPreTournament} userPickIds={pickSet} />
                        </div>

                        <div className="shrink-0 flex items-start justify-center pt-5">
                            <CenterColumn
                                gameSequence={gameSequence}
                                gameIndex={gameIndex}
                                teamMap={teamMap}
                                e8Winners={e8Winners}
                                isPreTournament={isPreTournament}
                                userPickIds={pickSet}
                            />
                        </div>

                        <div className="flex-1 min-w-0">
                            <RegionBracket region="West" rounds={westRounds} reversed={true} isPreTournament={isPreTournament} userPickIds={pickSet} />
                        </div>
                    </div>

                    <div className="my-4 border-t border-border/15" />

                    {/* Bottom row */}
                    <div className="flex gap-2 justify-center items-start">
                        <div className="flex-1 min-w-0">
                            <RegionBracket region="South" rounds={southRounds} reversed={false} isPreTournament={isPreTournament} userPickIds={pickSet} />
                        </div>

                        <div className="shrink-0 min-w-[150px] px-2" /> {/* spacer matching center */}

                        <div className="flex-1 min-w-0">
                            <RegionBracket region="Midwest" rounds={midwestRounds} reversed={true} isPreTournament={isPreTournament} userPickIds={pickSet} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
