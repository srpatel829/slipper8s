import type { Team } from "@/generated/prisma"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { getSeedColor, REGION_COLORS, REGION_ABBREV } from "@/lib/colors"
import { TeamCallout } from "@/components/team-callout"
import { buildTeamCalloutData } from "@/lib/team-callout-helpers"

interface TeamCardProps {
  team: Team
  selected: boolean
  onToggle: () => void
  disabled: boolean
  matchupInfo?: string  // e.g. "vs #16 American · Max 96pts" — shown pre-tournament in demo
  isPreTournament?: boolean
}

export function TeamCard({ team, selected, onToggle, disabled, matchupInfo, isPreTournament = false }: TeamCardProps) {
  const seedColor = getSeedColor(team.seed)
  const regionAbbrev = team.region ? REGION_ABBREV[team.region] ?? team.region.substring(0, 2) : ""
  const regionColor = team.region ? REGION_COLORS[team.region] ?? "#888" : "#888"

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "relative rounded-xl border p-3 text-left transition-all duration-150",
        selected
          ? "border-primary bg-primary/10 shadow-sm shadow-primary/20"
          : disabled
          ? "border-border/40 opacity-40 cursor-not-allowed"
          : "border-border bg-card hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
      )}
    >
      {/* Selected check */}
      {selected && (
        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}

      {/* Logo + details */}
      <div className="flex items-start gap-2.5">
        {/* Logo box with region badge and seed badge — wrapped in TeamCallout */}
        <TeamCallout
          team={buildTeamCalloutData(
            { id: team.id, name: team.name, shortName: team.shortName ?? "", seed: team.seed, region: team.region ?? "", wins: team.wins, eliminated: team.eliminated, logoUrl: team.logoUrl },
            isPreTournament,
          )}
          interactiveChild
        >
          <div className="relative shrink-0">
            {team.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={team.logoUrl}
                alt={team.name}
                className={cn("h-9 w-9 object-contain", team.eliminated && "opacity-40 grayscale")}
              />
            ) : (
              <div className={cn("h-9 w-9 rounded-md bg-muted flex items-center justify-center text-xs font-bold", team.eliminated && "opacity-40")}>
                {team.shortName?.[0] ?? "?"}
              </div>
            )}

            {/* Region badge — top-left */}
            {regionAbbrev && (
              <div
                className="absolute -top-1.5 -left-1.5 h-[14px] min-w-[14px] px-0.5 rounded-sm flex items-center justify-center text-[7px] font-black text-white shadow-sm"
                style={{ backgroundColor: regionColor }}
              >
                {regionAbbrev}
              </div>
            )}
          </div>
        </TeamCallout>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 mb-0.5">
            {/* Seed badge with spec color */}
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
              style={{ backgroundColor: seedColor }}
            >
              #{team.seed}
            </span>
            {team.isPlayIn && (
              <span className="text-[9px] text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded">PI</span>
            )}
          </div>
          <p className={cn("text-xs font-semibold leading-tight truncate", team.eliminated && "line-through text-muted-foreground")}>
            {team.name}
          </p>
          {team.eliminated && (
            <p className="text-[9px] text-red-400 mt-0.5">Eliminated</p>
          )}
          {!team.eliminated && team.wins > 0 && (
            <p className="text-[9px] text-primary mt-0.5">{team.wins}W · {team.seed * team.wins}pts</p>
          )}
          {!team.eliminated && team.wins === 0 && matchupInfo && (
            <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{matchupInfo}</p>
          )}
        </div>
      </div>
    </button>
  )
}
