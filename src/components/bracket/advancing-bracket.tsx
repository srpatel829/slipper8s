"use client"

/**
 * AdvancingBracket — Interactive bracket for picks selection or scenario simulation.
 *
 * mode="picks"  — Pre-tournament team selection (selectedTeamIds / onToggleTeam / disabled)
 * mode="simulator" — Game-by-game scenario picker (gamePicks / onPickGame / gameIndex)
 *
 * SIMULATOR CASCADE LOGIC:
 *   For each game, participants are derived from prior game results:
 *   - Locked game: use actual winner as the team that feeds into next round
 *   - Unlocked + user picked: use their pick as the "expected" next round participant
 *   - Unlocked + no pick: show TBD in next round
 *   This cascades all the way to F4 and Championship.
 */

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import type { DemoGameEvent } from "@/lib/demo-game-sequence"
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

type AdvancingBracketProps =
    | {
        teams: TeamLike[]
        mode: "picks"
        selectedTeamIds: Set<string>
        onToggleTeam: (teamId: string) => void
        disabled: boolean
        gameSequence: DemoGameEvent[]
        gameIndex: number
        isPreTournament?: boolean
        gamePicks?: never
        onPickGame?: never
    }
    | {
        teams: TeamLike[]
        mode: "simulator"
        gamePicks: Record<string, string>
        onPickGame: (gameId: string, winnerId: string) => void
        gameSequence: DemoGameEvent[]
        gameIndex: number
        isPreTournament?: boolean
        selectedTeamIds?: never
        onToggleTeam?: never
        disabled?: never
    }

const R64_ORDER = [[1, 16], [8, 9], [5, 12], [4, 13], [6, 11], [3, 14], [7, 10], [2, 15]] as const
const REGIONS = ["East", "West", "South", "Midwest"] as const
type Region = typeof REGIONS[number]

const ROUND_LABELS: Record<number, string> = {
    1: "R64", 2: "R32", 3: "S16", 4: "E8", 5: "F4", 6: "Champ"
}
const CELL_H = 26 + 2   // slot height + gap between slots in a pair

// ─── Cascade computation ─────────────────────────────────────────────────────

/**
 * For simulator mode: compute effective participants for every game,
 * cascading picks forward through the bracket tree.
 *
 * Returns a Map<gameId, { topTeamId, botTeamId, effectiveWinnerId, isLocked }>
 * where TBD is represented as null.
 */
function computeEffectiveBracket(
    teams: TeamLike[],
    gameSequence: DemoGameEvent[],
    gameIndex: number,
    gamePicks: Record<string, string>
): Map<string, {
    topTeam: TeamLike | null
    botTeam: TeamLike | null
    effectiveWinnerId: string | null
    isLocked: boolean
}> {
    const teamMap = new Map(teams.map(t => [t.id, t]))
    const result = new Map<string, {
        topTeam: TeamLike | null
        botTeam: TeamLike | null
        effectiveWinnerId: string | null
        isLocked: boolean
    }>()

    // "effective winner" = actual winner if locked, gamePick if picked, null otherwise
    function effectiveWinner(game: DemoGameEvent): string | null {
        if (game.gameIndex <= gameIndex) return game.winnerId
        return gamePicks[game.gameId] ?? null
    }

    // Process each region R1–R4
    const regionE8Effective = new Map<Region, string | null>()

    for (const region of REGIONS) {
        // Organize games by round
        const byRound = new Map<number, DemoGameEvent[]>()
        for (const g of gameSequence) {
            if (g.round >= 1 && g.round <= 4 && g.region === region) {
                const arr = byRound.get(g.round) ?? []
                arr.push(g)
                byRound.set(g.round, arr)
            }
        }

        const regionTeams = teams.filter(t => t.region === region && !t.isPlayIn)
        let prevSlotWinners: (string | null)[] = []

        for (let round = 1; round <= 4; round++) {
            const roundGames = byRound.get(round) ?? []
            const numSlots = roundGames.length
            const nextSlotWinners: (string | null)[] = []

            for (let i = 0; i < numSlots; i++) {
                const game = roundGames[i]
                const isLocked = game.gameIndex <= gameIndex

                let topTeam: TeamLike | null = null
                let botTeam: TeamLike | null = null

                if (round === 1) {
                    // R64: team identities always known (seed matchups)
                    const w = teamMap.get(game.winnerId)
                    const l = teamMap.get(game.loserId)
                    // lower seed on top
                    topTeam = (w?.seed ?? 99) <= (l?.seed ?? 99) ? w ?? null : l ?? null
                    botTeam = topTeam?.id === game.winnerId ? l ?? null : w ?? null
                } else {
                    // Higher rounds: participants come from prior effective winners
                    const topId = prevSlotWinners[i * 2] ?? null
                    const botId = prevSlotWinners[i * 2 + 1] ?? null
                    topTeam = topId ? teamMap.get(topId) ?? null : null
                    botTeam = botId ? teamMap.get(botId) ?? null : null
                }

                const eff = effectiveWinner(game)
                result.set(game.gameId, { topTeam, botTeam, effectiveWinnerId: eff, isLocked })
                nextSlotWinners.push(eff)
            }

            prevSlotWinners = nextSlotWinners
        }

        regionE8Effective.set(region, prevSlotWinners[0] ?? null)
    }

    // F4 games
    const f4Games = gameSequence.filter(g => g.round === 5)
    const f4Pairs: [Region, Region][] = [["East", "West"], ["South", "Midwest"]]
    const f4EffWinners: (string | null)[] = []

    for (let i = 0; i < f4Pairs.length; i++) {
        const [rA, rB] = f4Pairs[i]
        const topId = regionE8Effective.get(rA) ?? null
        const botId = regionE8Effective.get(rB) ?? null
        const topTeam = topId ? teamMap.get(topId) ?? null : null
        const botTeam = botId ? teamMap.get(botId) ?? null : null
        const game = f4Games[i]

        if (game) {
            const isLocked = game.gameIndex <= gameIndex
            const eff = effectiveWinner(game)
            result.set(game.gameId, { topTeam, botTeam, effectiveWinnerId: eff, isLocked })
            f4EffWinners.push(eff)
        } else {
            f4EffWinners.push(null)
        }
    }

    // Championship
    const champGame = gameSequence.find(g => g.round === 6)
    if (champGame) {
        const topId = f4EffWinners[0] ?? null
        const botId = f4EffWinners[1] ?? null
        const isLocked = champGame.gameIndex <= gameIndex
        result.set(champGame.gameId, {
            topTeam: topId ? teamMap.get(topId) ?? null : null,
            botTeam: botId ? teamMap.get(botId) ?? null : null,
            effectiveWinnerId: effectiveWinner(champGame),
            isLocked,
        })
    }

    return result
}

// ─── Team slot ────────────────────────────────────────────────────────────────

function TeamSlot({
    team,
    isLocked,
    isWinner,
    isEliminated,
    isActive,
    onClick,
    reversed,
    disabled,
    isPreTournament = false,
}: {
    team: TeamLike | null
    isLocked: boolean
    isWinner: boolean
    isEliminated: boolean
    isActive: boolean
    onClick: () => void
    reversed?: boolean
    disabled?: boolean
    isPreTournament?: boolean
}) {
    if (!team) {
        return (
            <div className={cn(
                "h-[26px] px-1.5 flex items-center gap-1 rounded text-[8px] text-muted-foreground/25 border border-border/12 bg-card/5",
                reversed && "flex-row-reverse"
            )}>
                <span>TBD</span>
            </div>
        )
    }

    const notClickable = isLocked || disabled

    const slotContent = (
        <>
            {team.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={team.logoUrl} alt="" className="h-3 w-3 object-contain shrink-0" />
            ) : (
                <span className="h-3 w-3 rounded-full bg-muted flex items-center justify-center text-[6px] font-bold shrink-0">
                    {team.shortName[0]}
                </span>
            )}
            <span className={cn("shrink-0 text-[7px]", isWinner && isLocked ? "text-primary/60" : "text-muted-foreground/60")}>
                #{team.seed}
            </span>
            <span className="truncate min-w-0">{team.shortName}</span>
            {isActive && !notClickable && (
                <span className={cn("ml-auto shrink-0 text-primary text-[7px]", reversed && "ml-0 mr-auto")}>▶</span>
            )}
            {isWinner && isLocked && (
                <span className={cn("ml-auto shrink-0 text-primary text-[7px]", reversed && "ml-0 mr-auto")}>✓</span>
            )}
        </>
    )

    const button = (
        <button
            type="button"
            onClick={notClickable ? undefined : onClick}
            disabled={notClickable}
            className={cn(
                "h-[26px] w-full px-1.5 flex items-center gap-1 rounded text-[8px] font-medium transition-all text-left border",
                reversed && "flex-row-reverse",
                notClickable
                    ? isWinner
                        ? "border-primary/40 bg-primary/10 text-foreground cursor-default"
                        : isEliminated
                            ? "border-border/12 bg-muted/5 text-muted-foreground/25 line-through cursor-default"
                            : "border-border/15 bg-card/15 text-muted-foreground/40 cursor-default"
                    : isActive
                        ? "border-primary bg-primary/15 text-foreground shadow-sm cursor-pointer"
                        : "border-border/30 bg-card/25 text-foreground/75 hover:border-border/60 hover:bg-muted/20 cursor-pointer"
            )}
        >
            {slotContent}
        </button>
    )

    return (
        <TeamCallout
            team={buildTeamCalloutData(
                { id: team.id, name: team.name, shortName: team.shortName, seed: team.seed, region: team.region, wins: team.wins, eliminated: team.eliminated, logoUrl: team.logoUrl, espnId: team.espnId, conference: team.conference },
                isPreTournament,
            )}
            interactiveChild
        >
            {button}
        </TeamCallout>
    )
}

// ─── Simulator matchup card ───────────────────────────────────────────────────

function SimMatchup({
    gameId,
    topTeam,
    botTeam,
    isLocked,
    effectiveWinnerId,
    gamePicks,
    onPickGame,
    reversed,
    isPreTournament,
}: {
    gameId: string
    topTeam: TeamLike | null
    botTeam: TeamLike | null
    isLocked: boolean
    effectiveWinnerId: string | null
    gamePicks: Record<string, string>
    onPickGame: (gameId: string, teamId: string) => void
    reversed?: boolean
    isPreTournament?: boolean
}) {
    const picked = gamePicks[gameId]

    return (
        <div className="flex flex-col gap-px">
            <TeamSlot
                team={topTeam}
                isLocked={isLocked}
                isWinner={isLocked && effectiveWinnerId === topTeam?.id}
                isEliminated={isLocked && effectiveWinnerId !== topTeam?.id}
                isActive={!isLocked && picked === topTeam?.id}
                onClick={() => topTeam && onPickGame(gameId, topTeam.id)}
                reversed={reversed}
                isPreTournament={isPreTournament}
            />
            <TeamSlot
                team={botTeam}
                isLocked={isLocked}
                isWinner={isLocked && effectiveWinnerId === botTeam?.id}
                isEliminated={isLocked && effectiveWinnerId !== botTeam?.id}
                isActive={!isLocked && picked === botTeam?.id}
                onClick={() => botTeam && onPickGame(gameId, botTeam.id)}
                reversed={reversed}
                isPreTournament={isPreTournament}
            />
        </div>
    )
}

// ─── Picks matchup card ───────────────────────────────────────────────────────

function PicksMatchup({
    topTeam,
    botTeam,
    selectedTeamIds,
    onToggle,
    disabled,
    reversed,
    isPreTournament,
}: {
    topTeam: TeamLike | null
    botTeam: TeamLike | null
    selectedTeamIds: Set<string>
    onToggle: (id: string) => void
    disabled: boolean
    reversed?: boolean
    isPreTournament?: boolean
}) {
    return (
        <div className="flex flex-col gap-px">
            <TeamSlot
                team={topTeam}
                isLocked={false}
                isWinner={false}
                isEliminated={topTeam?.eliminated ?? false}
                isActive={topTeam ? selectedTeamIds.has(topTeam.id) : false}
                onClick={() => topTeam && onToggle(topTeam.id)}
                reversed={reversed}
                disabled={disabled}
                isPreTournament={isPreTournament}
            />
            <TeamSlot
                team={botTeam}
                isLocked={false}
                isWinner={false}
                isEliminated={botTeam?.eliminated ?? false}
                isActive={botTeam ? selectedTeamIds.has(botTeam.id) : false}
                onClick={() => botTeam && onToggle(botTeam.id)}
                reversed={reversed}
                disabled={disabled}
                isPreTournament={isPreTournament}
            />
        </div>
    )
}

// ─── Region column ─────────────────────────────────────────────────────────────

interface SimRoundColumn {
    round: number
    games: Array<{
        gameId: string
        topTeam: TeamLike | null
        botTeam: TeamLike | null
        effectiveWinnerId: string | null
        isLocked: boolean
    }>
}

interface PicksRoundColumn {
    round: number
    matchups: Array<{ topTeam: TeamLike | null; botTeam: TeamLike | null }>
}

function SimRegionColumn({
    region,
    rounds,
    gamePicks,
    onPickGame,
    reversed,
    isPreTournament,
}: {
    region: string
    rounds: SimRoundColumn[]
    gamePicks: Record<string, string>
    onPickGame: (gameId: string, teamId: string) => void
    reversed?: boolean
    isPreTournament?: boolean
}) {
    return (
        <div className={cn("flex flex-col", reversed ? "items-end" : "items-start")}>
            <div className={cn(
                "text-[7px] font-bold uppercase tracking-widest mb-1.5 text-muted-foreground/35",
                reversed ? "pr-1" : "pl-1"
            )}>
                {region}
            </div>
            <div className={cn("flex gap-0", reversed && "flex-row-reverse")}>
                {rounds.map((roundCol, rIdx) => {
                    const spacingMult = Math.pow(2, rIdx)
                    const betweenGap = CELL_H * 2 * (spacingMult - 1) + 4 * spacingMult
                    const topPad = rIdx === 0 ? 0 : CELL_H * spacingMult - CELL_H

                    return (
                        <div key={roundCol.round} className="flex flex-col" style={{ width: 100 }}>
                            <div className={cn(
                                "text-[7px] text-muted-foreground/25 font-mono mb-1",
                                reversed ? "text-right pr-0.5" : "pl-0.5"
                            )}>
                                {ROUND_LABELS[roundCol.round]}
                            </div>
                            <div className="flex flex-col" style={{ gap: `${betweenGap}px`, paddingTop: `${topPad}px` }}>
                                {roundCol.games.map((g) => (
                                    <div key={g.gameId} className={cn("flex items-center", reversed && "flex-row-reverse")}>
                                        <div style={{ width: 88 }}>
                                            <SimMatchup
                                                gameId={g.gameId}
                                                topTeam={g.topTeam}
                                                botTeam={g.botTeam}
                                                isLocked={g.isLocked}
                                                effectiveWinnerId={g.effectiveWinnerId}
                                                gamePicks={gamePicks}
                                                onPickGame={onPickGame}
                                                reversed={reversed}
                                                isPreTournament={isPreTournament}
                                            />
                                        </div>
                                        <div style={{ width: 12, height: CELL_H * 2 }} className="shrink-0">
                                            <svg width={12} height={CELL_H * 2}>
                                                <line
                                                    x1={reversed ? 12 : 0} y1={CELL_H}
                                                    x2={reversed ? 0 : 12} y2={CELL_H}
                                                    stroke="hsl(var(--border) / 0.2)" strokeWidth={1}
                                                />
                                            </svg>
                                        </div>
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

function PicksRegionColumn({
    region,
    round,
    selectedTeamIds,
    onToggle,
    disabled,
    reversed,
    isPreTournament,
}: {
    region: string
    round: PicksRoundColumn
    selectedTeamIds: Set<string>
    onToggle: (id: string) => void
    disabled: boolean
    reversed?: boolean
    isPreTournament?: boolean
}) {
    return (
        <div className={cn("flex flex-col", reversed ? "items-end" : "items-start")}>
            <div className={cn(
                "text-[7px] font-bold uppercase tracking-widest mb-1.5 text-muted-foreground/35",
                reversed ? "pr-1" : "pl-1"
            )}>
                {region}
            </div>
            <div className="flex flex-col gap-1.5">
                {round.matchups.map((m, i) => (
                    <PicksMatchup
                        key={i}
                        topTeam={m.topTeam}
                        botTeam={m.botTeam}
                        selectedTeamIds={selectedTeamIds}
                        onToggle={onToggle}
                        disabled={disabled}
                        reversed={reversed}
                        isPreTournament={isPreTournament}
                    />
                ))}
            </div>
        </div>
    )
}

// ─── Simulator center column ──────────────────────────────────────────────────

function SimCenterColumn({
    effectiveBracket,
    gameSequence,
    gamePicks,
    onPickGame,
    isPreTournament,
}: {
    effectiveBracket: Map<string, { topTeam: TeamLike | null; botTeam: TeamLike | null; effectiveWinnerId: string | null; isLocked: boolean }>
    gameSequence: DemoGameEvent[]
    gamePicks: Record<string, string>
    onPickGame: (gameId: string, teamId: string) => void
    isPreTournament?: boolean
}) {
    const f4Games = gameSequence.filter(g => g.round === 5)
    const champGame = gameSequence.find(g => g.round === 6)

    function renderBlock(game: DemoGameEvent | undefined, label: string) {
        if (!game) {
            return (
                <div className="space-y-px">
                    <div className="text-[7px] text-muted-foreground/25 text-center font-mono mb-1">{label}</div>
                    <div className="h-[26px] rounded border border-border/12 bg-card/5 flex items-center px-1.5 text-[8px] text-muted-foreground/25">TBD</div>
                    <div className="h-[26px] rounded border border-border/12 bg-card/5 flex items-center px-1.5 text-[8px] text-muted-foreground/25">TBD</div>
                </div>
            )
        }
        const data = effectiveBracket.get(game.gameId)
        if (!data) return null
        return (
            <div className="space-y-px">
                <div className="text-[7px] text-muted-foreground/35 text-center font-mono mb-1">{label}</div>
                <SimMatchup
                    gameId={game.gameId}
                    topTeam={data.topTeam}
                    botTeam={data.botTeam}
                    isLocked={data.isLocked}
                    effectiveWinnerId={data.effectiveWinnerId}
                    gamePicks={gamePicks}
                    onPickGame={onPickGame}
                    isPreTournament={isPreTournament}
                />
            </div>
        )
    }

    // Champion
    const champData = champGame ? effectiveBracket.get(champGame.gameId) : null
    const champWinner = champData?.isLocked && champData.effectiveWinnerId
        ? (champData.topTeam?.id === champData.effectiveWinnerId ? champData.topTeam : champData.botTeam)
        : champData?.effectiveWinnerId && gamePicks[champGame?.gameId ?? ""]
            ? (champData.topTeam?.id === champData.effectiveWinnerId ? champData.topTeam : champData.botTeam)
            : null

    return (
        <div className="flex flex-col items-center gap-3 px-3 min-w-[150px]">
            <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/35">Final Four</div>
            <div className="w-full">{renderBlock(f4Games[0], "East / West")}</div>
            <div className="w-full space-y-1">
                <div className="text-[8px] font-bold text-primary/45 text-center uppercase tracking-widest">Championship</div>
                {champGame ? (
                    <SimMatchup
                        gameId={champGame.gameId}
                        topTeam={champData?.topTeam ?? null}
                        botTeam={champData?.botTeam ?? null}
                        isLocked={champData?.isLocked ?? false}
                        effectiveWinnerId={champData?.effectiveWinnerId ?? null}
                        gamePicks={gamePicks}
                        onPickGame={onPickGame}
                        isPreTournament={isPreTournament}
                    />
                ) : (
                    <div className="space-y-px">
                        <div className="h-[26px] rounded border border-border/12 bg-card/5 flex items-center px-1.5 text-[8px] text-muted-foreground/25">TBD</div>
                        <div className="h-[26px] rounded border border-border/12 bg-card/5 flex items-center px-1.5 text-[8px] text-muted-foreground/25">TBD</div>
                    </div>
                )}
                {champWinner && (
                    <div className="mt-1 flex items-center justify-center gap-1 px-2 py-1 rounded border border-yellow-400/35 bg-yellow-400/6">
                        {champWinner.logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={champWinner.logoUrl} alt="" className="h-4 w-4 object-contain" />
                        )}
                        <span className="text-[8px] font-bold text-yellow-400">{champWinner.shortName} 🏆</span>
                    </div>
                )}
            </div>
            <div className="w-full">{renderBlock(f4Games[1], "South / Midwest")}</div>
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdvancingBracket(props: AdvancingBracketProps) {
    const { teams, mode, gameSequence, gameIndex, isPreTournament = false } = props
    const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams])

    // ── Simulator mode: compute cascading bracket ─────────────────────────────
    const effectiveBracket = useMemo(() => {
        if (mode !== "simulator") return new Map()
        return computeEffectiveBracket(teams, gameSequence, gameIndex, props.gamePicks)
    }, [mode, teams, gameSequence, gameIndex, mode === "simulator" ? props.gamePicks : null])

    // ── Build simulator round columns per region ──────────────────────────────
    const simRegionRounds = useMemo(() => {
        if (mode !== "simulator") return new Map<Region, SimRoundColumn[]>()
        const byRegionRound = new Map<string, Map<number, DemoGameEvent[]>>()
        for (const region of REGIONS) byRegionRound.set(region, new Map())
        for (const game of gameSequence) {
            if (game.round >= 1 && game.round <= 4) {
                const rm = byRegionRound.get(game.region)
                if (!rm) continue
                const arr = rm.get(game.round) ?? []
                arr.push(game)
                rm.set(game.round, arr)
            }
        }
        const result = new Map<Region, SimRoundColumn[]>()
        for (const region of REGIONS) {
            const rm = byRegionRound.get(region)!
            result.set(region, [1, 2, 3, 4].filter(r => (rm.get(r) ?? []).length > 0).map(r => ({
                round: r,
                games: (rm.get(r) ?? []).map(game => {
                    const data = effectiveBracket.get(game.gameId)
                    return {
                        gameId: game.gameId,
                        topTeam: data?.topTeam ?? null,
                        botTeam: data?.botTeam ?? null,
                        effectiveWinnerId: data?.effectiveWinnerId ?? null,
                        isLocked: data?.isLocked ?? false,
                    }
                }),
            })))
        }
        return result
    }, [mode, effectiveBracket, gameSequence])

    // ── Build picks mode R64 matchups per region ──────────────────────────────
    const picksR64 = useMemo(() => {
        if (mode !== "picks") return new Map<Region, Array<{ topTeam: TeamLike | null; botTeam: TeamLike | null }>>()
        const result = new Map<Region, Array<{ topTeam: TeamLike | null; botTeam: TeamLike | null }>>()
        for (const region of REGIONS) {
            const regionTeams = teams.filter(t => t.region === region && !t.isPlayIn)
            result.set(region, R64_ORDER.map(([seedA, seedB]) => ({
                topTeam: regionTeams.find(t => t.seed === seedA) ?? null,
                botTeam: regionTeams.find(t => t.seed === seedB) ?? null,
            })))
        }
        return result
    }, [mode, teams])

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [zoom, setZoom] = useState(1.0)

    const ZoomControls = () => (
        <div className="flex items-center gap-1 mb-2 justify-end">
            <button
                className="h-6 w-6 rounded border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
            >
                <ZoomOut className="h-3 w-3" />
            </button>
            <span className="text-[10px] text-muted-foreground w-8 text-center">{Math.round(zoom * 100)}%</span>
            <button
                className="h-6 w-6 rounded border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                onClick={() => setZoom(z => Math.min(1.5, z + 0.25))}
            >
                <ZoomIn className="h-3 w-3" />
            </button>
            <button
                className="h-6 w-6 rounded border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                onClick={() => setZoom(1.0)}
            >
                <Maximize2 className="h-3 w-3" />
            </button>
        </div>
    )

    if (mode === "simulator") {
        return (
            <div>
                <ZoomControls />
                <div className="w-full overflow-x-auto">
                <div className="min-w-[900px] flex flex-col gap-3" style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
                    <div className="flex gap-1 justify-center items-start">
                        <div className="flex-1 min-w-0">
                            <SimRegionColumn
                                region="East"
                                rounds={simRegionRounds.get("East") ?? []}
                                gamePicks={props.gamePicks}
                                onPickGame={props.onPickGame}
                                reversed={false}
                                isPreTournament={isPreTournament}
                            />
                        </div>
                        <div className="shrink-0">
                            <SimCenterColumn
                                effectiveBracket={effectiveBracket}
                                gameSequence={gameSequence}
                                gamePicks={props.gamePicks}
                                onPickGame={props.onPickGame}
                                isPreTournament={isPreTournament}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <SimRegionColumn
                                region="West"
                                rounds={simRegionRounds.get("West") ?? []}
                                gamePicks={props.gamePicks}
                                onPickGame={props.onPickGame}
                                reversed={true}
                                isPreTournament={isPreTournament}
                            />
                        </div>
                    </div>
                    <div className="border-t border-border/12" />
                    <div className="flex gap-1 justify-center items-start">
                        <div className="flex-1 min-w-0">
                            <SimRegionColumn
                                region="South"
                                rounds={simRegionRounds.get("South") ?? []}
                                gamePicks={props.gamePicks}
                                onPickGame={props.onPickGame}
                                reversed={false}
                                isPreTournament={isPreTournament}
                            />
                        </div>
                        <div className="shrink-0 min-w-[150px] px-3" />
                        <div className="flex-1 min-w-0">
                            <SimRegionColumn
                                region="Midwest"
                                rounds={simRegionRounds.get("Midwest") ?? []}
                                gamePicks={props.gamePicks}
                                onPickGame={props.onPickGame}
                                reversed={true}
                                isPreTournament={isPreTournament}
                            />
                        </div>
                    </div>
                </div>
            </div>
            </div>
        )
    }

    // Picks mode
    return (
        <div>
            <ZoomControls />
            <div className="w-full overflow-x-auto">
            <div className="min-w-[600px] grid grid-cols-2 gap-4" style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
                {REGIONS.map(region => (
                    <PicksRegionColumn
                        key={region}
                        region={region}
                        round={{ round: 1, matchups: picksR64.get(region) ?? [] }}
                        selectedTeamIds={props.selectedTeamIds}
                        onToggle={props.onToggleTeam}
                        disabled={props.disabled}
                        reversed={false}
                        isPreTournament={isPreTournament}
                    />
                ))}
            </div>
            </div>
        </div>
    )
}
