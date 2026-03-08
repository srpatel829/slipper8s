"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function getTimeLeft(deadline: Date): TimeLeft | null {
  const now = new Date()
  const diff = deadline.getTime() - now.getTime()
  if (diff <= 0) return null

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

interface CountdownTimerProps {
  /** ISO string for the deadline. If not provided, fetches from /api/settings. */
  deadline?: string | null
  /** Compact mode for inline display (e.g. picks page) */
  compact?: boolean
}

// Fallback deadline: March 19, 2026 at 12:00pm ET (UTC-4 during EDT)
const FALLBACK_DEADLINE = "2026-03-19T16:00:00.000Z"

export function CountdownTimer({ deadline: deadlineProp, compact }: CountdownTimerProps) {
  const [deadlineStr, setDeadlineStr] = useState<string | null>(deadlineProp ?? null)
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)
  const [mounted, setMounted] = useState(false)

  // If no deadline prop, fetch from API; use fallback if API fails or returns nothing
  useEffect(() => {
    if (deadlineProp !== undefined && deadlineProp !== null) {
      setDeadlineStr(deadlineProp)
      return
    }
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setDeadlineStr(data.picksDeadline ?? FALLBACK_DEADLINE)
      })
      .catch(() => {
        setDeadlineStr(FALLBACK_DEADLINE)
      })
  }, [deadlineProp])

  useEffect(() => {
    setMounted(true)
    if (!deadlineStr) return
    const deadline = new Date(deadlineStr)
    setTimeLeft(getTimeLeft(deadline))
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(deadline))
    }, 1000)
    return () => clearInterval(interval)
  }, [deadlineStr])

  if (!mounted || !deadlineStr) {
    if (compact) return null
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
        <Clock className="h-4 w-4 text-primary" />
        <span className="text-sm">Loading...</span>
      </div>
    )
  }

  const deadline = new Date(deadlineStr)

  // Format as "Thursday, March 19 · 12:00pm ET" per UI feedback
  const dayOfWeek = deadline.toLocaleString("en-US", { weekday: "long", timeZone: "America/New_York" })
  const monthDay = deadline.toLocaleString("en-US", { month: "long", day: "numeric", timeZone: "America/New_York" })
  const timePart = deadline.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).toLowerCase()
  const deadlineLabel = `${dayOfWeek}, ${monthDay} · ${timePart} ET`

  if (!timeLeft) {
    if (compact) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <Clock className="h-3 w-3" />
          Entries closed
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
        <Clock className="h-4 w-4 text-red-500" />
        <span className="text-sm font-medium text-red-400">Entries are closed</span>
      </div>
    )
  }

  // Compact mode — single line
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Clock className="h-3 w-3 text-primary shrink-0" />
        <span className="text-muted-foreground">
          <span className="font-mono font-semibold text-foreground">
            {timeLeft.days}d {String(timeLeft.hours).padStart(2, "0")}h{" "}
            {String(timeLeft.minutes).padStart(2, "0")}m
          </span>
          {" "}until deadline
        </span>
      </div>
    )
  }

  // Full mode — landing page
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-3">
        {[
          { value: timeLeft.days, label: "days" },
          { value: timeLeft.hours, label: "hrs" },
          { value: timeLeft.minutes, label: "min" },
          { value: timeLeft.seconds, label: "sec" },
        ].map(({ value, label }) => (
          <div key={label} className="flex flex-col items-center">
            <div className="bg-card border border-border rounded-lg w-14 h-14 flex items-center justify-center">
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {String(value).padStart(2, "0")}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Clock className="h-3.5 w-3.5 text-primary" />
        Entry deadline: {deadlineLabel}
      </div>
    </div>
  )
}
