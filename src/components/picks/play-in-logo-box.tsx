"use client"

/**
 * PlayInLogoBox — Alternating logo box for unresolved play-in slot picks.
 *
 * Shows the same region badge + seed badge as TeamLogoBox, but the logo
 * alternates between team1 and team2 every 2 seconds with a crossfade.
 * Once the play-in winner is determined, callers should switch to a
 * regular TeamLogoBox instead.
 */

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { getSeedColor, REGION_COLORS, REGION_ABBREV, STATUS_COLORS } from "@/lib/colors"

interface PlayInLogoBoxProps {
  seed: number
  region: string
  team1LogoUrl: string | null
  team2LogoUrl: string | null
  team1ShortName: string
  team2ShortName: string
  /** "sm" = 32px (leaderboard), "md" = 40px (picks summary) */
  size?: "sm" | "md"
  className?: string
}

export function PlayInLogoBox({
  seed,
  region,
  team1LogoUrl,
  team2LogoUrl,
  team1ShortName,
  team2ShortName,
  size = "sm",
  className,
}: PlayInLogoBoxProps) {
  const [showTeam1, setShowTeam1] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setShowTeam1(prev => !prev)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const seedColor = getSeedColor(seed)
  const regionColor = REGION_COLORS[region] ?? "#888"
  const regionAbbrev = REGION_ABBREV[region] ?? region.substring(0, 2)
  const statusColor = STATUS_COLORS.yellow // Unresolved = pending

  const isMd = size === "md"
  const boxSize = isMd ? "w-10 h-10" : "w-8 h-8"
  const regionBadgeSize = isMd
    ? "h-[15px] min-w-[15px] text-[7px] -top-1.5 -left-1.5"
    : "h-[13px] min-w-[13px] text-[6.5px] -top-1.5 -left-1.5"
  const seedBadgeSize = isMd
    ? "w-[17px] h-[17px] text-[9px] -bottom-1.5 -right-1.5"
    : "w-[15px] h-[15px] text-[8px] -bottom-1.5 -right-1.5"
  const logoFallbackSize = isMd ? "text-[10px]" : "text-[8px]"

  return (
    <div className={cn("relative shrink-0", boxSize, className)}>
      {/* Logo box with yellow status border (pending/unresolved) */}
      <div
        className={cn(
          "relative rounded-md overflow-hidden flex items-center justify-center p-0.5 font-bold shadow-sm",
          boxSize,
        )}
        style={{ border: `2.5px solid ${statusColor}`, backgroundColor: "var(--background)" }}
      >
        <div className="relative w-full h-full">
          {/* Team 1 logo — crossfade */}
          <div className={cn(
            "absolute inset-0 flex items-center justify-center transition-opacity duration-500",
            showTeam1 ? "opacity-100" : "opacity-0"
          )}>
            {team1LogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={team1LogoUrl} alt="" className="w-full h-full object-contain" />
            ) : (
              <span className={cn("font-bold text-muted-foreground leading-none text-center break-all", logoFallbackSize)}>
                {team1ShortName.substring(0, 3)}
              </span>
            )}
          </div>
          {/* Team 2 logo — crossfade */}
          <div className={cn(
            "absolute inset-0 flex items-center justify-center transition-opacity duration-500",
            showTeam1 ? "opacity-0" : "opacity-100"
          )}>
            {team2LogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={team2LogoUrl} alt="" className="w-full h-full object-contain" />
            ) : (
              <span className={cn("font-bold text-muted-foreground leading-none text-center break-all", logoFallbackSize)}>
                {team2ShortName.substring(0, 3)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Region badge — top-left */}
      <div
        className={cn(
          "absolute px-0.5 rounded-sm flex items-center justify-center font-black text-white shadow-sm border border-background",
          regionBadgeSize
        )}
        style={{ backgroundColor: regionColor }}
      >
        {regionAbbrev}
      </div>

      {/* Seed badge — bottom-right */}
      <div
        className={cn(
          "absolute rounded-sm flex items-center justify-center font-black text-white shadow-sm border border-background",
          seedBadgeSize
        )}
        style={{ backgroundColor: seedColor }}
      >
        {seed}
      </div>
    </div>
  )
}
