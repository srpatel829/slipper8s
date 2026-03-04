"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface HealthCheck {
  name: string
  status: "ok" | "warning" | "error"
  message: string
  lastChecked?: string
}

interface HealthData {
  checks: HealthCheck[]
  overallStatus: "ok" | "warning" | "error"
  checkedAt: string
}

const STATUS_ICON = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
}

const STATUS_COLOR = {
  ok: "text-green-400",
  warning: "text-amber-400",
  error: "text-red-400",
}

const STATUS_BG = {
  ok: "bg-green-500/10 border-green-500/20",
  warning: "bg-amber-500/10 border-amber-500/20",
  error: "bg-red-500/10 border-red-500/20",
}

const OVERALL_LABEL = {
  ok: "All Systems Operational",
  warning: "Some Items Need Attention",
  error: "Issues Detected",
}

export function HealthBoard() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchHealth = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await fetch("/api/admin/health")
      if (res.ok) {
        setData(await res.json())
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="h-4 w-4 animate-pulse" />
          <span className="text-sm">Checking system health...</span>
        </div>
      </div>
    )
  }

  if (!data) return null

  const OverallIcon = STATUS_ICON[data.overallStatus]

  return (
    <div className={`border rounded-xl p-5 ${STATUS_BG[data.overallStatus]}`}>
      {/* Overall status header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <OverallIcon className={`h-5 w-5 ${STATUS_COLOR[data.overallStatus]}`} />
          <h2 className="text-base font-semibold">{OVERALL_LABEL[data.overallStatus]}</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => fetchHealth(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Individual checks grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {data.checks.map((check) => {
          const Icon = STATUS_ICON[check.status]
          return (
            <div
              key={check.name}
              className="flex items-start gap-2.5 bg-background/50 rounded-lg px-3 py-2.5 border border-border/50"
            >
              <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${STATUS_COLOR[check.status]}`} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{check.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{check.message}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Timestamp */}
      <p className="text-[10px] text-muted-foreground/60 mt-3 text-right">
        Last checked: {new Date(data.checkedAt).toLocaleTimeString()}
      </p>
    </div>
  )
}
