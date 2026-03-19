"use client"

/**
 * TimelineFooter — Global time controller shown as a persistent footer.
 *
 * Matches the demo's DemoControlPanel layout:
 * - ⏪ (double left) = jump to previous checkpoint
 * - ◀ (single left) = step back 1 game
 * - LIVE button = snap to current state
 * - ▶ (single right) = step forward 1 game
 * - ⏩ (double right) = jump to next checkpoint
 * - Range scrubber (0 to latestCheckpoint)
 * - Current checkpoint label badge
 * - "Games: X/63" counter
 *
 * 11 checkpoint positions: Pre-Tournament + 10 session checkpoints
 */

import { useCallback, useEffect } from "react"
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Radio,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// ── 11 spec-defined checkpoints ──────────────────────────────────────────────

export const CHECKPOINT_LABELS = [
  { label: "Pre-Tournament", short: "Pre" },          // 0
  { label: "Round of 64 Day 1", short: "R64 D1" },    // 1
  { label: "Round of 64 Day 2", short: "R64 D2" },    // 2
  { label: "Round of 32 Day 1", short: "R32 D1" },    // 3
  { label: "Round of 32 Day 2", short: "R32 D2" },    // 4
  { label: "Sweet 16 Day 1", short: "S16 D1" },       // 5
  { label: "Sweet 16 Day 2", short: "S16 D2" },       // 6
  { label: "Elite 8 Day 1", short: "E8 D1" },         // 7
  { label: "Elite 8 Day 2", short: "E8 D2" },         // 8
  { label: "Final Four", short: "F4" },                // 9
  { label: "National Championship", short: "Champ" },  // 10
]

export const TOTAL_TOURNAMENT_GAMES = 63

export interface TimelineFooterProps {
  /** Index of the latest completed checkpoint (0-10), or -1 if none */
  latestCheckpoint: number
  /** Currently viewed checkpoint index */
  currentCheckpoint: number
  /** Callback when user scrubs to a checkpoint */
  onCheckpointChange: (index: number) => void
  /** Whether the user is viewing the live/latest state */
  isLive: boolean
  /** Callback for LIVE button */
  onGoLive: () => void
  /** Current game index being viewed (0-based, or -1 for pre-tournament) */
  currentGameIndex: number
  /** Latest completed game index */
  latestGameIndex: number
  /** Step forward/back one game */
  onGameStep: (direction: 1 | -1) => void
  /** Total completed games for the counter */
  totalCompletedGames: number
  /** Additional class for the footer container */
  className?: string
}

export function TimelineFooter({
  latestCheckpoint,
  currentCheckpoint,
  onCheckpointChange,
  isLive,
  onGoLive,
  currentGameIndex,
  latestGameIndex,
  onGameStep,
  totalCompletedGames,
  className,
}: TimelineFooterProps) {
  const progress = latestCheckpoint >= 0 && CHECKPOINT_LABELS.length > 1
    ? (currentCheckpoint / (CHECKPOINT_LABELS.length - 1)) * 100
    : 0

  const currentLabel = CHECKPOINT_LABELS[currentCheckpoint]?.short ?? "Pre"

  const canStepBack = currentGameIndex >= 0
  const canStepForward = currentGameIndex < latestGameIndex
  const canJumpBack = currentCheckpoint > 0
  const canJumpForward = currentCheckpoint < latestCheckpoint

  // Find previous/next checkpoint boundaries
  const jumpToPrevCheckpoint = useCallback(() => {
    if (currentCheckpoint > 0) {
      onCheckpointChange(currentCheckpoint - 1)
    }
  }, [currentCheckpoint, onCheckpointChange])

  const jumpToNextCheckpoint = useCallback(() => {
    if (currentCheckpoint < latestCheckpoint) {
      onCheckpointChange(currentCheckpoint + 1)
    }
  }, [currentCheckpoint, latestCheckpoint, onCheckpointChange])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === "ArrowLeft") {
        if (e.shiftKey) jumpToPrevCheckpoint()
        else if (canStepBack) onGameStep(-1)
      } else if (e.key === "ArrowRight") {
        if (e.shiftKey) jumpToNextCheckpoint()
        else if (canStepForward) onGameStep(1)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [canStepBack, canStepForward, onGameStep, jumpToPrevCheckpoint, jumpToNextCheckpoint])

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value)
    if (val <= latestCheckpoint) {
      onCheckpointChange(val)
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-40 bg-card/95 border-t-2 border-primary/40 backdrop-blur-sm",
        className
      )}>
        <div className="max-w-5xl mx-auto px-4 py-2.5">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Checkpoint jump back */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={jumpToPrevCheckpoint}
                  disabled={!canJumpBack}
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Previous checkpoint (Shift+←)</TooltipContent>
            </Tooltip>

            {/* Step back one game */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => onGameStep(-1)}
                  disabled={!canStepBack}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Previous game (←)</TooltipContent>
            </Tooltip>

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

            {/* Step forward one game */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => onGameStep(1)}
                  disabled={!canStepForward}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Next game (→)</TooltipContent>
            </Tooltip>

            {/* Checkpoint jump forward */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={jumpToNextCheckpoint}
                  disabled={!canJumpForward}
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Next checkpoint (Shift+→)</TooltipContent>
            </Tooltip>

            {/* Scrubber */}
            <div className="flex-1 relative group">
              {/* Progress fill */}
              <div
                className="absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-primary/70 rounded-full pointer-events-none transition-all"
                style={{ width: `${progress}%` }}
              />
              <input
                type="range"
                min={0}
                max={CHECKPOINT_LABELS.length - 1}
                value={currentCheckpoint}
                onChange={handleSliderChange}
                className="w-full h-1 appearance-none bg-foreground/10 rounded-full cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2
                  [&::-webkit-slider-thumb]:border-muted [&::-webkit-slider-thumb]:cursor-grab
                  [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-primary/30
                  relative"
              />
            </div>

            {/* Current checkpoint label */}
            <Badge
              variant="outline"
              className="text-xs border-primary/40 text-primary bg-primary/10 shrink-0"
            >
              {currentLabel}
            </Badge>

            {/* Games counter */}
            <div className="hidden sm:flex items-center gap-3 shrink-0">
              <span className="text-xs text-muted-foreground">
                Games: <strong className="text-foreground font-mono">{totalCompletedGames}</strong>/{TOTAL_TOURNAMENT_GAMES}
              </span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
