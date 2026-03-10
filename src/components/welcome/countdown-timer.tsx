"use client"

import { useState, useEffect } from "react"

interface CountdownTimerProps {
  /** Target date in ISO format */
  targetDate: string
  /** Label shown above the countdown */
  label?: string
  /** Subtitle shown below the countdown */
  subtitle?: string
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeLeft(target: Date): TimeLeft | null {
  const now = new Date()
  const diff = target.getTime() - now.getTime()

  if (diff <= 0) return null

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export function CountdownTimer({ targetDate, label, subtitle }: CountdownTimerProps) {
  const target = new Date(targetDate)
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(calculateTimeLeft(target))

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(target))
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  // Countdown expired
  if (!timeLeft) return null

  const segments = [
    { value: timeLeft.days, label: "Days" },
    { value: timeLeft.hours, label: "Hours" },
    { value: timeLeft.minutes, label: "Minutes" },
    { value: timeLeft.seconds, label: "Seconds" },
  ]

  return (
    <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl px-6 py-6 text-center">
      {label && (
        <p className="text-sm font-semibold text-foreground mb-3">{label}</p>
      )}
      <div className="flex justify-center gap-4">
        {segments.map((seg, i) => (
          <div key={seg.label} className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold text-primary">
                {seg.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {seg.label}
              </div>
            </div>
            {i < segments.length - 1 && (
              <div className="text-2xl text-muted-foreground/50">:</div>
            )}
          </div>
        ))}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-4">{subtitle}</p>
      )}
    </div>
  )
}
