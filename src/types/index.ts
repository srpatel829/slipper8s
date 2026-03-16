import type { Role } from "@/generated/prisma"
import "next-auth"

// ─── NextAuth Module Augmentation ─────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role
      isPaid: boolean
      email: string
      name?: string | null
      image?: string | null
      username?: string | null
      firstName?: string | null
      lastName?: string | null
      registrationComplete: boolean
    }
  }
  interface User {
    role: Role
    isPaid: boolean
    username?: string | null
    firstName?: string | null
    lastName?: string | null
    registrationComplete: boolean
  }
}

// ─── ESPN API Types ────────────────────────────────────────────────────────────

export interface ESPNTeam {
  id: string
  displayName: string
  abbreviation: string
  logo: string
  color?: string
}

export interface ESPNCompetitor {
  id: string
  homeAway: "home" | "away"
  winner: boolean
  score: string
  team: ESPNTeam
  curatedRank?: { current: number }
}

export interface ESPNStatusType {
  id: string
  name: string
  state: "pre" | "in" | "post"
  completed: boolean
  description: string
  detail: string
  shortDetail: string
}

export interface ESPNCompetition {
  id: string
  date: string
  notes: Array<{ type: string; headline: string }>
  competitors: ESPNCompetitor[]
}

export interface ESPNEvent {
  id: string
  date: string
  name: string
  status: {
    clock: number
    displayClock: string
    period: number
    type: ESPNStatusType
  }
  competitions: ESPNCompetition[]
}

export interface ESPNScoreboardResponse {
  events: ESPNEvent[]
}

// ─── App Types ─────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  entryId: string
  userId: string
  rank: number
  percentile: number
  name: string
  username?: string | null
  email: string
  isPaid: boolean
  entryNumber: number
  nickname?: string | null
  currentScore: number
  ppr: number
  tps: number
  teamsRemaining: number
  maxPossibleScore?: number | null
  expectedScore?: number | null
  maxRank?: number | null
  floorRank?: number | null
  rankChange?: number | null
  tierName?: string | null
  charity?: string | null
  country?: string | null
  state?: string | null
  gender?: string | null
  favoriteTeam?: string | null
  conference?: string | null
  leagueIds?: string[]
  archetypes?: string[]
  isMultiEntry?: boolean
  picks: ResolvedPickSummary[]
}

export interface ResolvedPickSummary {
  teamId: string
  name: string
  shortName: string
  seed: number
  region?: string
  wins: number
  eliminated: boolean
  logoUrl: string | null
  espnId?: string | null
  conference?: string | null
  isPlayIn: boolean
  playInSlotId?: string | null
}

export interface LiveGameData {
  id: string
  startTime: string
  round: number
  status: {
    state: "pre" | "in" | "post"
    detail: string
    completed: boolean
  }
  teams: Array<{
    name: string
    abbreviation: string
    score: string
    winner: boolean
    logo: string
    seed?: number
  }>
}

export interface PayoutEntry {
  place: number
  label: string
  amount: number | string
  description?: string
}

export interface CharityEntry {
  name: string
  url?: string
}

export interface AppSettingsData {
  picksDeadline: string | null
  payoutStructure: PayoutEntry[]
  defaultCharities: CharityEntry[]
}

export interface ContentPageData {
  id: string
  slug: string
  title: string
  content: string
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

export interface SyncResult {
  gamesUpdated: number
  teamsUpdated: number
  playInResolved: number
  entriesRecalculated?: number
  errors: string[]
}

// ─── Play-In Slot Display Type ────────────────────────────────────────────────

/** Lightweight play-in slot info for display in the bracket */
export interface PlayInSlotDisplay {
  id: string
  seed: number
  region: string
  team1ShortName: string
  team2ShortName: string
  team1LogoUrl: string | null
  team2LogoUrl: string | null
  winnerId: string | null
}

// ─── History / Timeline Types ────────────────────────────────────────────────

export interface HistorySnapshot {
  gameIndex: number
  gameLabel: string
  roundLabel: string
  entries: LeaderboardEntry[]
}
