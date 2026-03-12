"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react"
import type { SyncResult } from "@/types"

export function SyncButton() {
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch("/api/admin/sync", { method: "POST" })
      if (!res.ok) {
        toast.error("Sync failed")
        return
      }
      const result: SyncResult = await res.json()
      setLastResult(result)
      if (result.errors.length > 0) {
        toast.warning(`Sync completed with ${result.errors.length} errors`)
      } else {
        toast.success("Sync completed successfully")
      }
    } catch {
      toast.error("Network error during sync")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Sync from ESPN</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This fetches the current NCAA Tournament scoreboard from ESPN and updates:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>Team win counts and elimination status</li>
            <li>Tournament game results and scores</li>
            <li>Play-in slot resolution (winner advances)</li>
            <li>Recalculate all entry slip scores and teams alive</li>
          </ul>
          <Button onClick={handleSync} disabled={syncing} className="w-full">
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing from ESPN..." : "Sync now"}
          </Button>
        </CardContent>
      </Card>

      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {lastResult.errors.length === 0 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              Last Sync Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{lastResult.gamesUpdated}</p>
                <p className="text-xs text-muted-foreground">Games updated</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{lastResult.teamsUpdated}</p>
                <p className="text-xs text-muted-foreground">Teams upserted</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{lastResult.playInResolved}</p>
                <p className="text-xs text-muted-foreground">Play-ins resolved</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{lastResult.entriesRecalculated ?? 0}</p>
                <p className="text-xs text-muted-foreground">Entry slips scored</p>
              </div>
            </div>
            {lastResult.errors.length > 0 && (
              <div className="mt-3">
                <p className="font-medium text-destructive mb-1">Errors:</p>
                <ul className="space-y-1">
                  {lastResult.errors.map((e, i) => (
                    <li key={i} className="text-xs text-destructive font-mono">
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
