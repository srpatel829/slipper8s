"use client"

/**
 * TimelineFooter — Global time controller shown as a persistent footer.
 *
 * Per spec:
 * - Two controls only: Scrubber + LIVE button
 * - 10 fixed checkpoint markers on the scrubber
 * - LIVE button: grayed out at current state, active when scrubbed back
 * - Does NOT auto-advance when new results arrive while scrubbed back
 * - Timeline only goes up to current moment — cannot scrub into future
 */

import { useState, useCallback, useEffect } from "react"
import { Radio } from "lucide-react"
import { cn } from "@/lib/utils"

// ── 10 spec-defined checkpoints ──────────────────────────────────────────────

export interface TimelineCheckpoint {
  index: number
  label: string
  shortLabel: string
  completed: boolean
  gameCount?: number
}

const CHECKPOINT_LABELS = [
  { label: "Round of 64 Day 1", short: "R64 D1" },
  { label: "Round of 64 Day 2", short: "R64 D2" },
  { label: "Round of 32 Day 1", short: "R32 D1" },
  { label: "Round of 32 Day 2", short: "R32 D2" },
  { label: "Sweet 16 Day 1", short: "S16 D1" },
  { label: "Sweet 16 Day 2", short: "S16 D2" },
  { label: "Elite 8 Day 1", short: "E8 D1" },
  { label: "Elite 8 Day 2", short: "E8 D2" },
  { label: "Final Four", short: "F4" },
  { label: "National Championship", short: "Champ" },
]

export interface TimelineFooterProps {
  /** Index of the latest completed checkpoint (0-9), or -1 if none */
  latestCheckpoint: number
  /** Currently viewed checkpoint index */
  currentCheckpoint: number
  /** Callback when user scrubs to a checkpoint */
  onCheckpointChange: (index: number) => void
  /** Whether the user is viewing the live/latest state */
  isLive: boolean
  /** Callback for LIVE button */
  onGoLive: () => void
  /** Checkpoint details with game counts */
  checkpoints?: TimelineCheckpoint[]
  /** Additional class for the footer container */
  className?: string
}

export function TimelineFooter({
  latestCheckpoint,
  currentCheckpoint,
  onCheckpointChange,
  isLive,
  onGoLive,
  checkpoints,
  className,
}: TimelineFooterProps) {
  const [isDragging, setIsDragging] = useState(false)

  // Build checkpoint data
  const cpData = CHECKPOINT_LABELS.map((cp, i) => ({
    ...cp,
    index: i,
    completed: i <= latestCheckpoint,
    gameCount: checkpoints?.find(c => c.index === i)?.gameCount,
  }))

  const canScrubTo = (index: number) => index <= latestCheckpoint && index >= 0

  const handleCheckpointClick = useCallback((index: number) => {
    if (canScrubTo(index)) {
      onCheckpointChange(index)
    }
  }, [latestCheckpoint, onCheckpointChange])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === "ArrowLeft" && currentCheckpoint > 0) {
        onCheckpointChange(Math.max(0, currentCheckpoint - 1))
      } else if (e.key === "ArrowRight" && currentCheckpoint < latestCheckpoint) {
        onCheckpointChange(Math.min(latestCheckpoint, currentCheckpoint + 1))
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [currentCheckpoint, latestCheckpoint, onCheckpointChange])

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-40 bg-[oklch(0.08_0.015_245)] border-t-2 border-primary/40 backdrop-blur-sm",
      className
    )}>
      <div className="max-w-5xl mx-auto px-4 py-2.5">
        <div className="flex items-center gap-3">
          {/* LIVE button */}
          <button
            onClick={onGoLive}
            disabled={isLive}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0",
              isLive
                ? "bg-muted/30 text-muted-foreground cursor-default"
                : "bg-red-500/90 text-white hover:bg-red-500 shadow-sm shadow-red-500/30 animate-pulse"
            )}
          >
            <Radio className={cn("h-3 w-3", isLive && "text-red-500")} />
            LIVE
            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
          </button>

          {/* Checkpoint scrubber */}
          <div className="flex-1 relative">
            {/* Track line */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[3px] bg-border/40 rounded-full">
              {/* Filled portion */}
              <div
                className="absolute top-0 left-0 h-full bg-primary/60 rounded-full transition-all duration-200"
                style={{
                  width: latestCheckpoint >= 0
                    ? `${((currentCheckpoint + 0.5) / 10) * 100}%`
                    : "0%"
                }}
              />
            </div>

            {/* Checkpoint dots */}
            <div className="relative flex items-center justify-between px-1">
              {cpData.map((cp) => {
                const isCurrent = cp.index === currentCheckpoint
                const isActive = cp.completed
                const isFuture = cp.index > latestCheckpoint

                return (
                  <button
                    key={cp.index}
                    onClick={() => handleCheckpointClick(cp.index)}
                    disabled={!isActive}
                    className={cn(
                      "relative group flex flex-col items-center",
                      !isActive && "cursor-default"
                    )}
                    title={cp.label}
                  >
                    {/* Dot */}
                    <div className={cn(
                      "w-3 h-3 rounded-full border-2 transition-all",
                      isCurrent
                        ? "bg-primary border-primary scale-125 shadow-sm shadow-primary/40"
                        : isActive
                          ? "bg-primary/50 border-primary/60 hover:scale-110"
                          : "bg-muted/30 border-border/40"
                    )} />

                    {/* Label — show on hover for desktop, always for session checkpoints */}
                    <span className={cn(
                      "absolute top-full mt-1 text-[8px] font-medium whitespace-nowrap transition-opacity",
                      isCurrent
                        ? "text-primary opacity-100"
                        : isActive
                          ? "text-muted-foreground opacity-0 group-hover:opacity-100"
                          : "text-muted-foreground/40 opacity-0 group-hover:opacity-60"
                    )}>
                      {cp.short}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Current checkpoint label (desktop only) */}
          <div className="hidden sm:block text-right shrink-0 min-w-[5rem]">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {currentCheckpoint >= 0 ? "Viewing" : "Pre-tournament"}
            </p>
            <p className="text-xs font-semibold text-foreground truncate">
              {currentCheckpoint >= 0 ? cpData[currentCheckpoint]?.short ?? "" : "Start"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
