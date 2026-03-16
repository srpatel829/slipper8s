import type { Team, PlayInSlot } from "@/generated/prisma"
import { Badge } from "@/components/ui/badge"
import { Check, Shuffle } from "lucide-react"
import { TeamCallout } from "@/components/team-callout"
import { buildTeamCalloutData } from "@/lib/team-callout-helpers"

type PlayInSlotWithTeams = PlayInSlot & {
  team1: Team
  team2: Team
  winner: Team | null
}

interface PlayInSlotCardProps {
  slot: PlayInSlotWithTeams
  selected: boolean
  onToggle: () => void
  disabled: boolean
  isPreTournament?: boolean
}

export function PlayInSlotCard({ slot, selected, onToggle, disabled, isPreTournament = false }: PlayInSlotCardProps) {
  const isResolved = !!slot.winner

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative rounded-lg border p-3 text-left w-full transition-all ${
        selected
          ? "border-primary bg-primary/10 shadow-sm shadow-primary/10"
          : disabled
          ? "border-border opacity-40 cursor-not-allowed"
          : "border-border hover:border-primary/40 hover:bg-accent/50 cursor-pointer"
      }`}
    >
      {selected && (
        <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-2.5 w-2.5 text-white" />
        </div>
      )}

      <div className="flex items-center gap-2 mb-1.5">
        <Shuffle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <Badge variant="outline" className="text-xs px-1 py-0 h-4">
          #{slot.seed} {slot.region}
        </Badge>
        {isResolved && (
          <Badge variant="secondary" className="text-xs px-1 py-0 h-4 text-green-400">
            Resolved
          </Badge>
        )}
      </div>

      {isResolved ? (
        <TeamCallout
          team={buildTeamCalloutData(
            { id: slot.winner!.id, name: slot.winner!.name, shortName: slot.winner!.shortName ?? "", seed: slot.winner!.seed, region: slot.winner!.region ?? "", wins: slot.winner!.wins, eliminated: slot.winner!.eliminated, logoUrl: slot.winner!.logoUrl, espnId: slot.winner!.espnId, conference: slot.winner!.conference },
            isPreTournament,
          )}
          interactiveChild
        >
          <div className="flex items-center gap-2">
            {slot.winner!.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slot.winner!.logoUrl}
                alt={slot.winner!.name}
                className="h-6 w-6 object-contain"
              />
            )}
            <p className="text-sm font-semibold">{slot.winner!.name}</p>
            <span className="text-xs text-muted-foreground">(advanced)</span>
          </div>
        </TeamCallout>
      ) : (
        <div>
          <div className="flex items-center gap-2">
            <TeamCallout
              team={buildTeamCalloutData(
                { id: slot.team1.id, name: slot.team1.name, shortName: slot.team1.shortName ?? "", seed: slot.team1.seed, region: slot.team1.region ?? "", wins: slot.team1.wins, eliminated: slot.team1.eliminated, logoUrl: slot.team1.logoUrl, espnId: slot.team1.espnId, conference: slot.team1.conference },
                isPreTournament,
              )}
              interactiveChild
            >
              {slot.team1.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slot.team1.logoUrl} alt={slot.team1.name} className="h-7 w-7 object-contain" />
              ) : (
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-[10px] font-bold">
                  {slot.team1.shortName?.[0] ?? "?"}
                </div>
              )}
            </TeamCallout>
            <span className="text-xs text-muted-foreground font-medium">vs</span>
            <TeamCallout
              team={buildTeamCalloutData(
                { id: slot.team2.id, name: slot.team2.name, shortName: slot.team2.shortName ?? "", seed: slot.team2.seed, region: slot.team2.region ?? "", wins: slot.team2.wins, eliminated: slot.team2.eliminated, logoUrl: slot.team2.logoUrl, espnId: slot.team2.espnId, conference: slot.team2.conference },
                isPreTournament,
              )}
              interactiveChild
            >
              {slot.team2.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slot.team2.logoUrl} alt={slot.team2.name} className="h-7 w-7 object-contain" />
              ) : (
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-[10px] font-bold">
                  {slot.team2.shortName?.[0] ?? "?"}
                </div>
              )}
            </TeamCallout>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {slot.team1.shortName} vs {slot.team2.shortName} — winner advances
          </p>
        </div>
      )}
    </button>
  )
}
