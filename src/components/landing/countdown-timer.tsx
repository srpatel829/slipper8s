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

export function CountdownTimer() {
  // Default deadline: March 19, 2026 12:00pm ET (16:00 UTC)
  const deadline = new Date("2026-03-19T16:00:00Z")
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTimeLeft(getTimeLeft(deadline))
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(deadline))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
        <Clock className="h-4 w-4 text-primary" />
        <span className="text-sm">Loading...</span>
      </div>
    )
  }

  if (!timeLeft) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
        <Clock className="h-4 w-4 text-red-500" />
        <span className="text-sm font-medium text-red-400">Entries are closed</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Countdown boxes */}
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

      {/* Label below */}
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Clock className="h-3.5 w-3.5 text-primary" />
        Entry deadline: March 19 · 12:00pm ET
      </div>
    </div>
  )
}
