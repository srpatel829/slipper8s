import { prisma } from "@/lib/prisma"
import { saveScoreSnapshots, checkAndCreateCheckpoint } from "@/lib/snapshots"
import { invalidateLeaderboardCache } from "@/lib/cache"
import { computeMaxPossibleScore } from "@/lib/max-possible-score"
import { sendPlayInResolvedEmail } from "@/lib/email"
import type { TeamBracketInfo } from "@/lib/bracket-ppr"
import type { ESPNScoreboardResponse, ESPNCompetition, ESPNEvent, SyncResult, LiveGameData } from "@/types"

const ESPN_BASE_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100&limit=500"

// Build ESPN URL with a rolling date range so we get completed, live, AND upcoming games.
// Without dates param, ESPN only returns the last day with finished games.
function getESPNUrl(): string {
  const now = new Date()
  // Go back 2 days to capture recently completed games
  const start = new Date(now)
  start.setDate(start.getDate() - 2)
  // Go forward 3 days to capture upcoming scheduled games
  const end = new Date(now)
  end.setDate(end.getDate() + 3)
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "")
  return `${ESPN_BASE_URL}&dates=${fmt(start)}-${fmt(end)}`
}

// Fetch from ESPN with 60s Next.js Data Cache
export async function fetchESPNScoreboard(): Promise<ESPNScoreboardResponse> {
  const res = await fetch(getESPNUrl(), {
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`ESPN fetch failed: ${res.status}`)
  return res.json()
}

// Transform ESPN events to our LiveGameData shape
export function transformESPNEvents(events: ESPNEvent[]): LiveGameData[] {
  return events.map((event) => {
    const comp = event.competitions[0]
    const [c1, c2] = comp?.competitors ?? []
    return {
      id: event.id,
      startTime: event.date,
      round: detectRound(comp),
      status: {
        state: event.status.type.state,
        detail: event.status.type.shortDetail,
        completed: event.status.type.completed,
      },
      teams: [c1, c2].filter(Boolean).map((c) => ({
        name: c.team.displayName,
        abbreviation: c.team.abbreviation,
        score: c.score,
        winner: c.winner,
        logo: c.team.logo,
        seed: c.curatedRank?.current,
      })),
    }
  })
}

// Full ESPN sync: upsert teams, games, update wins/eliminated, resolve play-in slots
export async function syncTournamentData(): Promise<SyncResult> {
  const result: SyncResult = { gamesUpdated: 0, teamsUpdated: 0, playInResolved: 0, errors: [] }

  // Track newly completed games for snapshot/checkpoint pipeline
  const newlyCompletedGameIds: string[] = []

  let data: ESPNScoreboardResponse
  try {
    // Bypass cache for sync operations
    const res = await fetch(getESPNUrl(), { cache: "no-store" })
    if (!res.ok) throw new Error(`ESPN fetch failed: ${res.status}`)
    data = await res.json()
  } catch (err) {
    result.errors.push(String(err))
    return result
  }

  for (const event of data.events) {
    try {
      const comp = event.competitions[0]
      if (!comp) continue
      const [c1, c2] = comp.competitors
      if (!c1 || !c2) continue

      // Skip ESPN placeholder events with TBD teams (negative IDs like -1, -2)
      const espnId1 = parseInt(c1.team?.id ?? "0", 10)
      const espnId2 = parseInt(c2.team?.id ?? "0", 10)
      if (espnId1 <= 0 || espnId2 <= 0) continue

      const round = detectRound(comp)
      const region = extractRegion(comp)

      const isCompleted = event.status.type.completed
      const isInProgress = event.status.type.state === "in"
      const status = isCompleted ? "FINAL" : isInProgress ? "IN_PROGRESS" : "SCHEDULED"

      const score1 = parseInt(c1.score ?? "0", 10)
      const score2 = parseInt(c2.score ?? "0", 10)
      const seed1 = c1.curatedRank?.current ?? 0
      const seed2 = c2.curatedRank?.current ?? 0

      // Check if this game was already marked complete (to avoid double-counting wins)
      const existingGame = await prisma.tournamentGame.findUnique({
        where: { espnGameId: event.id },
        select: { status: true, isComplete: true },
      })
      const wasAlreadyComplete = existingGame?.isComplete === true

      // Upsert both teams
      const [team1, team2] = await Promise.all([
        prisma.team.upsert({
          where: { espnId: c1.team.id },
          create: {
            espnId: c1.team.id,
            name: c1.team.displayName,
            shortName: c1.team.abbreviation,
            seed: seed1,
            region,
            isPlayIn: round === 0,
            logoUrl: c1.team.logo,
          },
          update: {
            name: c1.team.displayName,
            shortName: c1.team.abbreviation,
            logoUrl: c1.team.logo,
          },
        }),
        prisma.team.upsert({
          where: { espnId: c2.team.id },
          create: {
            espnId: c2.team.id,
            name: c2.team.displayName,
            shortName: c2.team.abbreviation,
            seed: seed2,
            region,
            isPlayIn: round === 0,
            logoUrl: c2.team.logo,
          },
          update: {
            name: c2.team.displayName,
            shortName: c2.team.abbreviation,
            logoUrl: c2.team.logo,
          },
        }),
      ])
      result.teamsUpdated += 2

      // Determine winner
      const winnerTeam = isCompleted ? (c1.winner ? team1 : team2) : null
      const loserTeam = isCompleted ? (c1.winner ? team2 : team1) : null

      // Upsert tournament game
      const upsertedGame = await prisma.tournamentGame.upsert({
        where: { espnGameId: event.id },
        create: {
          espnGameId: event.id,
          round,
          region,
          team1Id: team1.id,
          team2Id: team2.id,
          winnerId: winnerTeam?.id ?? null,
          team1Score: score1,
          team2Score: score2,
          status,
          isComplete: isCompleted,
          startTime: new Date(event.date),
        },
        update: {
          round,
          region: region ?? undefined,
          winnerId: winnerTeam?.id ?? null,
          team1Score: score1,
          team2Score: score2,
          status,
          isComplete: isCompleted,
          startTime: new Date(event.date),
        },
      })
      result.gamesUpdated++

      // Update wins / eliminated ONLY when game JUST completed (not already processed)
      // This prevents double-counting wins on repeated syncs
      if (isCompleted && winnerTeam && loserTeam && !wasAlreadyComplete) {
        // Track this game as newly completed for snapshot pipeline
        newlyCompletedGameIds.push(upsertedGame.id)

        // Only count wins for round > 0 (play-in wins don't count per spec)
        if (round > 0) {
          await prisma.team.update({
            where: { id: winnerTeam.id },
            data: { wins: { increment: 1 } },
          })
        }
        await prisma.team.update({
          where: { id: loserTeam.id },
          data: { eliminated: true },
        })

        // Resolve play-in slots
        if (round === 0) {
          const updated = await prisma.playInSlot.updateMany({
            where: {
              OR: [
                { team1Id: team1.id, team2Id: team2.id },
                { team1Id: team2.id, team2Id: team1.id },
              ],
              winnerId: null,
            },
            data: { winnerId: winnerTeam.id },
          })
          result.playInResolved += updated.count

          // Create play-in slot if it doesn't exist yet
          const seed = Math.min(seed1, seed2)
          if (seed > 0) {
            await prisma.playInSlot.upsert({
              where: { seed_region: { seed, region } },
              create: {
                seed,
                region,
                team1Id: team1.id,
                team2Id: team2.id,
                winnerId: winnerTeam.id,
              },
              update: { winnerId: winnerTeam.id },
            })
          }

          // ── Send play-in resolved emails (optional — respects notificationsEnabled) ──
          if (updated.count > 0) {
            try {
              // Find the resolved play-in slot to get its ID
              const resolvedSlot = await prisma.playInSlot.findFirst({
                where: {
                  OR: [
                    { team1Id: team1.id, team2Id: team2.id },
                    { team1Id: team2.id, team2Id: team1.id },
                  ],
                  winnerId: winnerTeam.id,
                },
                select: { id: true, seed: true, region: true },
              })

              if (resolvedSlot) {
                // Find all entries that picked this play-in slot
                const affectedPicks = await prisma.entryPick.findMany({
                  where: { playInSlotId: resolvedSlot.id },
                  select: {
                    entry: {
                      select: {
                        user: {
                          select: {
                            email: true,
                            firstName: true,
                            notificationsEnabled: true,
                          },
                        },
                      },
                    },
                  },
                })

                // Dedupe by email (user may have multiple entries with same play-in pick)
                const notifiedEmails = new Set<string>()
                for (const pick of affectedPicks) {
                  const user = pick.entry.user
                  if (!user.notificationsEnabled || !user.email || !user.firstName) continue
                  if (notifiedEmails.has(user.email)) continue
                  notifiedEmails.add(user.email)

                  await sendPlayInResolvedEmail(
                    user.email,
                    user.firstName,
                    winnerTeam.name,
                    resolvedSlot.seed,
                    resolvedSlot.region,
                  )
                }
                console.log(`[espn] Sent play-in resolved emails to ${notifiedEmails.size} users for ${winnerTeam.name}`)
              }
            } catch (emailErr) {
              // Don't fail the sync for email errors
              console.error("[espn] Play-in resolved email error:", emailErr)
            }
          }
        }
      } else if (round === 0 && !isCompleted) {
        // Create play-in slot for upcoming play-in games
        const seed = Math.min(seed1, seed2)
        if (seed > 0) {
          await prisma.playInSlot.upsert({
            where: { seed_region: { seed, region } },
            create: {
              seed,
              region,
              team1Id: team1.id,
              team2Id: team2.id,
            },
            update: {},
          })
        }
      }
    } catch (err) {
      result.errors.push(`Event ${event.id}: ${String(err)}`)
    }
  }

  // ── Recalculate all entry scores after sync ─────────────────────────────────
  if (newlyCompletedGameIds.length > 0) {
    try {
      const recalcResult = await recalculateAllEntryScores()
      result.entriesRecalculated = recalcResult.updated
    } catch (err) {
      result.errors.push(`Score recalc failed: ${String(err)}`)
    }

    // ── Save score snapshots for newly completed games (spec step 8) ──────
    try {
      for (const gameId of newlyCompletedGameIds) {
        await saveScoreSnapshots(gameId)
        await checkAndCreateCheckpoint(gameId)
      }
    } catch (err) {
      result.errors.push(`Snapshot save failed: ${String(err)}`)
    }

    // ── Invalidate leaderboard cache (spec step 9) ──────────────────────
    try {
      const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
      if (settings?.currentSeasonId) {
        await invalidateLeaderboardCache(settings.currentSeasonId)
      }
    } catch (err) {
      result.errors.push(`Cache invalidation failed: ${String(err)}`)
    }
  }

  return result
}

/**
 * Recalculate scores for all entries in the current season.
 * Each entry's score = sum of (seed x wins) for their 8 teams.
 * teamsAlive = count of non-eliminated teams in the entry.
 * maxPossibleScore = collision-aware max score (spec step 4).
 */
export async function recalculateAllEntryScores(): Promise<{ updated: number }> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  const seasonId = settings?.currentSeasonId
  if (!seasonId) return { updated: 0 }

  // Get all entries with their picks and related teams
  const entries = await prisma.entry.findMany({
    where: {
      seasonId,
      draftInProgress: false,
      entryPicks: { some: {} },
    },
    include: {
      entryPicks: {
        include: {
          team: { select: { id: true, seed: true, wins: true, eliminated: true, region: true } },
          playInSlot: {
            include: {
              winner: { select: { id: true, seed: true, wins: true, eliminated: true, region: true } },
            },
          },
        },
      },
    },
  })

  // Build a team info map for max possible score calculation
  const teamInfoMap = new Map<string, TeamBracketInfo>()
  for (const entry of entries) {
    for (const pick of entry.entryPicks) {
      const team = pick.team ?? pick.playInSlot?.winner ?? null
      if (!team || teamInfoMap.has(team.id)) continue
      teamInfoMap.set(team.id, {
        seed: team.seed,
        region: team.region,
        wins: team.wins,
        eliminated: team.eliminated,
      })
    }
  }

  let updated = 0

  // Batch update entries in chunks of 50
  for (let i = 0; i < entries.length; i += 50) {
    const chunk = entries.slice(i, i + 50)
    const updates = chunk.map((entry) => {
      let score = 0
      let teamsAlive = 0
      const pickTeamIds: string[] = []

      for (const pick of entry.entryPicks) {
        // Resolve effective team (direct pick or play-in winner)
        const team = pick.team ?? pick.playInSlot?.winner ?? null
        if (!team) continue

        score += team.seed * team.wins
        if (!team.eliminated) teamsAlive++
        pickTeamIds.push(team.id)
      }

      // Compute collision-aware max possible score
      const maxResult = computeMaxPossibleScore(pickTeamIds, teamInfoMap)

      return prisma.entry.update({
        where: { id: entry.id },
        data: {
          score,
          teamsAlive,
          maxPossibleScore: maxResult.maxPossibleScore,
        },
      })
    })

    await prisma.$transaction(updates)
    updated += chunk.length
  }

  return { updated }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectRound(competition: ESPNCompetition | undefined): number {
  if (!competition) return 1
  const headline = competition.notes?.[0]?.headline?.toLowerCase() ?? ""
  // ESPN headlines look like "NCAA Men's Basketball Championship - East Region - 1st Round"
  // so we must check specific round identifiers before the generic "championship" word
  if (headline.includes("first four") || headline.includes("play-in")) return 0
  if (headline.includes("1st round") || headline.includes("first round") || headline.includes("round of 64")) return 1
  if (headline.includes("2nd round") || headline.includes("second round") || headline.includes("round of 32")) return 2
  if (headline.includes("sweet 16") || headline.includes("sweet sixteen")) return 3
  if (headline.includes("elite 8") || headline.includes("elite eight")) return 4
  if (headline.includes("final four") || headline.includes("semifinals")) return 5
  if (headline.includes("national championship") || headline.endsWith("championship game")) return 6
  return 1
}

function extractRegion(competition: ESPNCompetition | undefined): string {
  if (!competition) return "Unknown"
  const headline = competition.notes?.[0]?.headline ?? ""
  for (const region of ["East", "West", "South", "Midwest"]) {
    if (headline.includes(region)) return region
  }
  return "Unknown"
}

export const ROUND_NAMES: Record<number, string> = {
  0: "First Four",
  1: "First Round",
  2: "Second Round",
  3: "Sweet 16",
  4: "Elite 8",
  5: "Final Four",
  6: "Championship",
}
