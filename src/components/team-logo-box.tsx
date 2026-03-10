"use client"

/**
 * TeamLogoBox — Reusable logo box with region badge (top-left),
 * seed badge (bottom-right), and status border color.
 *
 * Used across: leaderboard pick strips, "Your Picks" summary,
 * bracket views, and anywhere a compact team identity is needed.
 *
 * Wraps in TeamCallout for hover/press-hold details.
 */

import { cn } from "@/lib/utils"
import { getSeedColor, REGION_COLORS, REGION_ABBREV, STATUS_COLORS } from "@/lib/colors"

export interface TeamLogoBoxProps {
  seed: number
  region: string
  logoUrl?: string | null
  shortName: string
  wins: number
  eliminated: boolean
  /** "sm" = 32px (leaderboard), "md" = 40px (picks summary) */
  size?: "sm" | "md"
  className?: string
}

function getStatusColor(wins: number, eliminated: boolean): string {
  if (eliminated) return STATUS_COLORS.red
  if (wins > 0) return STATUS_COLORS.green
  return STATUS_COLORS.yellow
}

export function TeamLogoBox({
  seed,
  region,
  logoUrl,
  shortName,
  wins,
  eliminated,
  size = "sm",
  className,
}: TeamLogoBoxProps) {
  const seedColor = getSeedColor(seed)
  const regionColor = REGION_COLORS[region] ?? "#888"
  const regionAbbrev = REGION_ABBREV[region] ?? region.substring(0, 2)
  const statusColor = getStatusColor(wins, eliminated)

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
      {/* Logo box with status border */}
      <div
        className={cn(
          "relative rounded-md overflow-hidden flex items-center justify-center p-0.5 font-bold shadow-sm",
          boxSize,
          eliminated && "grayscale"
        )}
        style={{ border: `2.5px solid ${statusColor}`, backgroundColor: "var(--background)" }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="w-full h-full object-contain" />
        ) : (
          <span className={cn("font-bold text-muted-foreground leading-none text-center break-all", logoFallbackSize)}>
            {shortName.substring(0, 3)}
          </span>
        )}
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
