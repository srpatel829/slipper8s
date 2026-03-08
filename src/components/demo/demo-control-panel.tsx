"use client"

/**
 * DemoControlPanel — fixed bottom bar for all demo pages.
 *
 * Visually distinct from app content: darker background, orange top border.
 *
 * Shows:
 * - Tournament year selector
 * - Persona picker
 * - Game-by-game timeline scrubber with play/pause
 * - Round jump buttons + speed selector
 * - Current game info
 */

import { useState } from "react"
import { usePathname } from "next/navigation"
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Play, Pause, Tv2, User, Calendar, Gauge, Info, Lightbulb,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useDemoContext } from "@/lib/demo-context"

const SPEEDS = [
  { label: "0.5×", ms: 2000 },
  { label: "1×", ms: 1000 },
  { label: "2×", ms: 500 },
  { label: "4×", ms: 250 },
]

export function DemoControlPanel() {
  const {
    selectedYear,
    setSelectedYear,
    availableTournaments,
    gameIndex,
    totalGames,
    checkpointIndex,
    totalCheckpoints,
    setCheckpointIndex,
    checkpoints,
    stepForward,
    stepBack,
    jumpToNextRound,
    jumpToPrevRound,
    isPlaying,
    togglePlay,
    playSpeed,
    setPlaySpeed,
    currentPersona,
    setPersona,
    availablePersonas,
    currentGameInfo,
  } = useDemoContext()

  const pathname = usePathname()
  const [expanded, setExpanded] = useState(true)

  const progress = totalCheckpoints > 1 ? (checkpointIndex / (totalCheckpoints - 1)) * 100 : 0

  // Current checkpoint label
  const currentRoundLabel = checkpoints[checkpointIndex]?.label ?? "Pre-Tournament"

  // Show picks hint when on picks page and tournament has started
  const showPicksHint = gameIndex >= 0 && pathname === "/demo/picks"

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCheckpointIndex(parseInt(e.target.value))
  }

  return (
    <TooltipProvider delayDuration={300}>
      {/* Outer wrapper: darker bg, orange top border, stronger shadow */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[oklch(0.07_0.012_264)] border-t-2 border-primary/50 shadow-xl shadow-black/60 ring-1 ring-inset ring-primary/10">

        {/* Collapse toggle — more prominent */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[oklch(0.07_0.012_264)] border border-primary/40 border-b-0 rounded-t-lg px-5 py-1.5 flex items-center gap-2 transition-colors hover:border-primary/70 glow-blue-sm"
        >
          <Tv2 className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary tracking-wide">DEMO MODE</span>
          <span className="text-muted-foreground/60 text-[10px]">{expanded ? "▼" : "▲"}</span>
        </button>

        {expanded && (
          <div className="px-4 py-3 space-y-2.5">
            {/* Picks hint */}
            {showPicksHint && (
              <div className="flex items-center gap-2 text-xs text-primary/70 bg-primary/5 border border-primary/20 rounded-md px-3 py-1.5">
                <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                <span>Set the timeline to <strong className="text-primary">Pre-Tournament</strong> to test the picks experience (scrub all the way left)</span>
              </div>
            )}

            {/* Row 1: Year + User Set + Persona + Round info */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Year selector */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <Select
                  value={String(selectedYear)}
                  onValueChange={v => setSelectedYear(Number(v))}
                >
                  <SelectTrigger className="h-7 w-32 text-xs border-border/40 bg-background/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTournaments.map(t => (
                      <SelectItem key={t.year} value={String(t.year)} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Persona selector */}
              <div className="flex items-center gap-1.5 shrink-0">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <Select
                  value={currentPersona.userId}
                  onValueChange={id => {
                    const p = availablePersonas.find(p => p.userId === id)
                    if (p) setPersona(p)
                  }}
                >
                  <SelectTrigger className="h-7 w-44 text-xs border-border/40 bg-background/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <p className="text-[10px] text-muted-foreground px-2 py-1 border-b border-border/40">
                      Participants
                    </p>
                    {availablePersonas
                      .filter(p => p.role === "USER")
                      .map(p => (
                        <SelectItem key={p.userId} value={p.userId} className="text-xs">
                          {p.name}
                        </SelectItem>
                      ))}
                    <p className="text-[10px] text-muted-foreground px-2 py-1 border-b border-t border-border/40 mt-1">
                      Admin
                    </p>
                    {availablePersonas
                      .filter(p => p.role !== "USER")
                      .map(p => (
                        <SelectItem key={p.userId} value={p.userId} className="text-xs">
                          {p.name}
                          <Badge className="ml-1.5 h-3.5 px-1 text-[9px] bg-primary/20 text-primary border-0">
                            {p.role === "SUPERADMIN" ? "super" : "admin"}
                          </Badge>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Current round badge */}
              <Badge
                variant="outline"
                className="text-xs border-primary/40 text-primary bg-primary/10 shrink-0"
              >
                {currentRoundLabel}
              </Badge>

              {/* Game info tooltip */}
              {currentGameInfo && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-default shrink-0">
                      <Info className="h-3 w-3" />
                      <span className="truncate max-w-[200px]">
                        #{currentGameInfo.winnerSeed} {currentGameInfo.winnerShortName}{" "}
                        def. #{currentGameInfo.loserSeed} {currentGameInfo.loserShortName}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-xs">
                    <p className="font-semibold">{currentGameInfo.roundLabel} · {currentGameInfo.region}</p>
                    <p>
                      #{currentGameInfo.winnerSeed} {currentGameInfo.winnerName}{" "}
                      {currentGameInfo.winnerScore} — {currentGameInfo.loserScore}{" "}
                      #{currentGameInfo.loserSeed} {currentGameInfo.loserName}
                    </p>
                    {currentGameInfo.isUpset && (
                      <p className="text-yellow-400 text-[10px] mt-0.5">⚡ Upset!</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Checkpoint counter */}
              <span className="ml-auto text-xs text-muted-foreground shrink-0">
                {checkpointIndex} / {totalCheckpoints - 1}
              </span>
            </div>

            {/* Row 2: Timeline scrubber + controls */}
            <div className="flex items-center gap-3">
              {/* Round jump back */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={jumpToPrevRound}
                    disabled={checkpointIndex <= 0}
                  >
                    <ChevronsLeft className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Previous round</TooltipContent>
              </Tooltip>

              {/* Step back */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={stepBack}
                disabled={checkpointIndex <= 0}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>

              {/* Play / Pause */}
              <Button
                variant={isPlaying ? "default" : "outline"}
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={togglePlay}
              >
                {isPlaying
                  ? <Pause className="h-3.5 w-3.5" />
                  : <Play className="h-3.5 w-3.5" />
                }
              </Button>

              {/* Step forward */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={stepForward}
                disabled={checkpointIndex >= totalCheckpoints - 1}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>

              {/* Round jump forward */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={jumpToNextRound}
                    disabled={checkpointIndex >= totalCheckpoints - 1}
                  >
                    <ChevronsRight className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Next round</TooltipContent>
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
                  max={totalCheckpoints - 1}
                  value={checkpointIndex}
                  onChange={handleSliderChange}
                  className="w-full h-1 appearance-none bg-white/10 rounded-full cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2
                    [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:cursor-grab
                    [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-primary/30
                    relative"
                />
              </div>

              {/* Speed selector */}
              <div className="flex items-center gap-1 shrink-0">
                <Gauge className="h-3 w-3 text-muted-foreground" />
                <Select
                  value={String(playSpeed)}
                  onValueChange={v => setPlaySpeed(Number(v))}
                >
                  <SelectTrigger className="h-7 w-16 text-xs border-border/40 bg-background/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPEEDS.map(s => (
                      <SelectItem key={s.ms} value={String(s.ms)} className="text-xs">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed: mini progress bar only */}
        {!expanded && (
          <div className="h-1 bg-white/5">
            <div
              className="h-full bg-primary/70 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
