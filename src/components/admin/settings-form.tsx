"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, AlertTriangle, Database, Loader2 } from "lucide-react"

interface Payout {
  place: number
  label: string
  amount: string
}

interface Charity {
  name: string
  url?: string
}

interface SettingsFormProps {
  initialDeadline: string | null
  initialPayouts: Payout[]
  initialCharities: Charity[]
  initialMaintenanceMode?: boolean
  demoMode?: boolean
  onDemoSave?: (deadline: string | null, payouts: Payout[], charities: Charity[]) => void
}

export function SettingsForm({ initialDeadline, initialPayouts, initialCharities, initialMaintenanceMode, demoMode, onDemoSave }: SettingsFormProps) {
  const [deadline, setDeadline] = useState(() => {
    if (!initialDeadline) return ""
    // Convert ISO/UTC date to local datetime-local format (YYYY-MM-DDTHH:mm)
    // Must use local time methods so the input shows the correct local time
    // and re-saving doesn't shift the value by the UTC offset
    const d = new Date(initialDeadline)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })
  const [payouts, setPayouts] = useState<Payout[]>(
    initialPayouts.length > 0
      ? initialPayouts
      : [
          { place: 1, label: "1st Place", amount: "" },
          { place: 2, label: "2nd Place", amount: "" },
          { place: 3, label: "3rd Place", amount: "" },
          { place: 4, label: "4th Place", amount: "" },
        ]
  )
  const [charities, setCharities] = useState<Charity[]>(
    initialCharities.length > 0 ? initialCharities : [{ name: "", url: "" }]
  )
  const [maintenanceMode, setMaintenanceMode] = useState(initialMaintenanceMode ?? false)
  const [togglingMaintenance, setTogglingMaintenance] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clearingCache, setClearingCache] = useState(false)

  async function handleSave() {
    if (demoMode && onDemoSave) {
      onDemoSave(
        deadline ? new Date(deadline).toISOString() : null,
        payouts.filter((p) => p.label),
        charities.filter((c) => c.name)
      )
      toast.success("Settings saved (demo)")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          picksDeadline: deadline ? new Date(deadline).toISOString() : null,
          payoutStructure: payouts.filter((p) => p.label),
          defaultCharities: charities.filter((c) => c.name),
        }),
      })
      if (!res.ok) {
        toast.error("Failed to save settings")
        return
      }
      toast.success("Settings saved")
    } finally {
      setSaving(false)
    }
  }

  async function handleMaintenanceToggle(enabled: boolean) {
    if (demoMode) {
      setMaintenanceMode(enabled)
      toast.success(enabled ? "Maintenance mode enabled (demo)" : "Maintenance mode disabled (demo)")
      return
    }
    setTogglingMaintenance(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          picksDeadline: deadline ? new Date(deadline).toISOString() : null,
          payoutStructure: payouts.filter((p) => p.label),
          defaultCharities: charities.filter((c) => c.name),
          maintenanceMode: enabled,
        }),
      })
      if (!res.ok) {
        toast.error("Failed to toggle maintenance mode")
        return
      }
      setMaintenanceMode(enabled)
      toast.success(enabled ? "Maintenance mode ON — users see maintenance page" : "Maintenance mode OFF — site is live")
    } finally {
      setTogglingMaintenance(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Maintenance Mode */}
      <Card className={maintenanceMode ? "border-amber-500/50" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${maintenanceMode ? "text-amber-400" : "text-muted-foreground"}`} />
            Maintenance Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm">
                {maintenanceMode ? (
                  <span className="text-amber-400 font-medium">Site is in maintenance mode</span>
                ) : (
                  <span className="text-muted-foreground">Site is live and accessible</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                When enabled, all non-admin users are redirected to the maintenance page. Admin panel remains accessible.
              </p>
            </div>
            <Switch
              checked={maintenanceMode}
              onCheckedChange={handleMaintenanceToggle}
              disabled={togglingMaintenance}
            />
          </div>
        </CardContent>
      </Card>

      {/* Deadline */}
      <Card>
        <CardHeader><CardTitle className="text-base">Picks Deadline</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="deadline">Deadline (local time)</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              After this time, users cannot submit or edit picks.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payouts */}
      <Card>
        <CardHeader><CardTitle className="text-base">Payout Structure</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {payouts.map((payout, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                className="w-16 text-center"
                value={payout.place}
                type="number"
                onChange={(e) => {
                  const v = [...payouts]
                  v[i] = { ...v[i], place: parseInt(e.target.value) || i + 1 }
                  setPayouts(v)
                }}
              />
              <Input
                placeholder="Label (e.g. 1st Place)"
                value={payout.label}
                onChange={(e) => {
                  const v = [...payouts]
                  v[i] = { ...v[i], label: e.target.value }
                  setPayouts(v)
                }}
              />
              <Input
                placeholder="Amount or description"
                value={payout.amount}
                onChange={(e) => {
                  const v = [...payouts]
                  v[i] = { ...v[i], amount: e.target.value }
                  setPayouts(v)
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPayouts((p) => p.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPayouts((p) => [...p, { place: p.length + 1, label: "", amount: "" }])}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add tier
          </Button>
        </CardContent>
      </Card>

      {/* Default Charities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default Charities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Shown to users who don&apos;t specify a charity preference when submitting picks.
          </p>
          {charities.map((charity, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="Charity name"
                value={charity.name}
                onChange={(e) => {
                  const v = [...charities]
                  v[i] = { ...v[i], name: e.target.value }
                  setCharities(v)
                }}
              />
              <Input
                placeholder="URL (optional)"
                value={charity.url ?? ""}
                onChange={(e) => {
                  const v = [...charities]
                  v[i] = { ...v[i], url: e.target.value }
                  setCharities(v)
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCharities((c) => c.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCharities((c) => [...c, { name: "", url: "" }])}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add charity
          </Button>
        </CardContent>
      </Card>

      {/* Cache Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            Leaderboard Cache
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Force clear leaderboard cache for the current season. Use if leaderboard data appears stale.
              </p>
              <p className="text-xs text-muted-foreground/60">
                Cache automatically refreshes when game results update scores.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              disabled={clearingCache || demoMode}
              onClick={async () => {
                setClearingCache(true)
                try {
                  const res = await fetch("/api/admin/cache", { method: "POST" })
                  if (res.ok) {
                    toast.success("Leaderboard cache cleared")
                  } else {
                    const data = await res.json()
                    toast.error(data.error ?? "Failed to clear cache")
                  }
                } catch {
                  toast.error("Something went wrong")
                } finally {
                  setClearingCache(false)
                }
              }}
            >
              {clearingCache ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Database className="h-3.5 w-3.5" />
              )}
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving ? "Saving..." : "Save settings"}
      </Button>
    </div>
  )
}
