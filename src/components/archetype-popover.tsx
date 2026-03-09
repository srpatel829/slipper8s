"use client"

/**
 * Reusable archetype popover component.
 * Desktop: shows on hover. Mobile/tablet: shows on press & hold.
 * Used in both the archetype legend and next to player names on the leaderboard.
 */

import { useState, useRef, useCallback, type ReactNode } from "react"

interface ArchetypePopoverProps {
  emoji: string
  label: string
  description: string
  /** Content to render as the trigger. Defaults to just the emoji. */
  children?: ReactNode
  className?: string
}

export function ArchetypePopover({ emoji, label, description, children, className }: ArchetypePopoverProps) {
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Desktop: hover with slight delay
  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setOpen(true), 200)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setOpen(false), 150)
  }, [])

  // Mobile: press & hold (500ms threshold)
  const handleTouchStart = useCallback(() => {
    longPressRef.current = setTimeout(() => setOpen(true), 500)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (longPressRef.current) clearTimeout(longPressRef.current)
    // Dismiss after a short delay so user can read
    if (open) {
      setTimeout(() => setOpen(false), 2000)
    }
  }, [open])

  const handleTouchMove = useCallback(() => {
    // Cancel if finger moves (not a press & hold)
    if (longPressRef.current) clearTimeout(longPressRef.current)
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex ${className ?? ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      <span className="cursor-pointer">
        {children ?? <span>{emoji}</span>}
      </span>

      {open && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5"
          style={{ minWidth: 220 }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="bg-popover border border-border/60 rounded-lg shadow-lg text-xs overflow-hidden">
            <div className="px-3 py-2.5">
              <div className="flex items-center gap-1.5 font-semibold mb-1">
                <span className="text-sm">{emoji}</span>
                <span>{label}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">{description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
