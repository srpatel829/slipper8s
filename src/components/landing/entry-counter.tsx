"use client"

import { useState, useEffect } from "react"
import { Users } from "lucide-react"

/**
 * Live entry counter for the landing page.
 * Polls /api/stats/entries every 30 seconds during registration.
 * Animates the count change.
 */
export function EntryCounter() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/stats/entries")
        if (res.ok) {
          const data = await res.json()
          setCount(data.count)
        }
      } catch {
        // Silently fail — counter is a nice-to-have
      }
    }

    fetchCount()
    const interval = setInterval(fetchCount, 30_000)
    return () => clearInterval(interval)
  }, [])

  if (count === null || count === 0) return null

  return (
    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <Users className="h-4 w-4 text-primary" />
      <span>
        <span className="text-foreground font-semibold tabular-nums">{count.toLocaleString()}</span>
        {" "}
        {count === 1 ? "entry slip" : "entry slips"} submitted so far
      </span>
    </div>
  )
}
