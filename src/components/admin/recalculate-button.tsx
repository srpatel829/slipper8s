"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Calculator, CheckCircle } from "lucide-react"

interface RecalcResult {
  success: boolean
  gamesProcessed: number
  teamsWithWins: number
  teamsEliminated: number
  entriesRecalculated: number
  duration: number
}

export function RecalculateButton() {
  const [running, setRunning] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [lastResult, setLastResult] = useState<RecalcResult | null>(null)

  async function handleRecalculate() {
    if (!confirmed) {
      setConfirmed(true)
      return
    }

    setRunning(true)
    setConfirmed(false)
    try {
      const res = await fetch("/api/admin/recalculate", { method: "POST" })
      if (!res.ok) {
        toast.error("Recalculation failed")
        return
      }
      const result: RecalcResult = await res.json()
      setLastResult(result)
      toast.success("Recalculation complete")
    } catch {
      toast.error("Network error during recalculation")
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4 text-amber-500" />
          Recalculate All Scores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Resets all team wins and re-counts from completed game results. Then recalculates
          all entry scores. Use if data looks wrong (e.g. wins were double-counted).
        </p>

        {confirmed && !running && (
          <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Are you sure?</p>
              <p className="text-xs mt-1 text-muted-foreground">
                This will reset ALL team wins to 0 and recount from game records.
                Click again to confirm.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleRecalculate}
            disabled={running}
            variant={confirmed ? "destructive" : "outline"}
            className="flex-1"
          >
            <Calculator className={`h-4 w-4 mr-2 ${running ? "animate-pulse" : ""}`} />
            {running
              ? "Recalculating..."
              : confirmed
                ? "Confirm recalculate"
                : "Recalculate wins & scores"}
          </Button>
          {confirmed && !running && (
            <Button variant="ghost" onClick={() => setConfirmed(false)}>
              Cancel
            </Button>
          )}
        </div>

        {lastResult && (
          <div className="border border-border rounded-lg p-3 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Recalculation complete</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {lastResult.duration}ms
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-muted rounded-lg p-2">
                <p className="text-lg font-bold">{lastResult.gamesProcessed}</p>
                <p className="text-xs text-muted-foreground">Games processed</p>
              </div>
              <div className="bg-muted rounded-lg p-2">
                <p className="text-lg font-bold">{lastResult.teamsWithWins}</p>
                <p className="text-xs text-muted-foreground">Teams with wins</p>
              </div>
              <div className="bg-muted rounded-lg p-2">
                <p className="text-lg font-bold">{lastResult.teamsEliminated}</p>
                <p className="text-xs text-muted-foreground">Teams eliminated</p>
              </div>
              <div className="bg-muted rounded-lg p-2">
                <p className="text-lg font-bold">{lastResult.entriesRecalculated}</p>
                <p className="text-xs text-muted-foreground">Entries scored</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
