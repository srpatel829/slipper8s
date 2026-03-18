"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Treemap,
  ResponsiveContainer,
} from "recharts"
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Trophy, Shield } from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────

interface StatItem {
  value: string
  count: number
}

interface CommunityStats {
  uniquePlayers: number
  totalEntries: number
  privateLeagues: number
  gender: StatItem[]
  countries: StatItem[]
  states: StatItem[]
  conferences: StatItem[]
  fanBases: StatItem[]
}

// ── Constants ──────────────────────────────────────────────────────────────

const WORLD_GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
const US_GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"

const GENDER_LABELS: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  NO_RESPONSE: "Prefer not to say",
}

const PIE_COLORS = ["#f97316", "#3b82f6", "#8b5cf6", "#6b7280"]
const BAR_COLOR = "#f97316"

// Country name mapping (topojson uses specific names)
const COUNTRY_NAME_MAP: Record<string, string> = {
  "United States of America": "United States",
  "United Kingdom": "United Kingdom",
  "South Korea": "South Korea",
}

// ── Component ──────────────────────────────────────────────────────────────

export function StatsDashboard() {
  const [stats, setStats] = useState<CommunityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [tooltipContent, setTooltipContent] = useState("")

  useEffect(() => {
    fetch("/api/stats/community")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setStats(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Community Stats</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-8 bg-muted rounded w-16 mb-2" />
              <div className="h-4 bg-muted rounded w-24" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 animate-pulse h-64" />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Unable to load community stats. Please try again later.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Community Stats</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live demographics and participation data for the Slipper8s community
        </p>
      </div>

      {/* Hero stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Users className="h-5 w-5 text-orange-500" />} value={stats.uniquePlayers} label="Registered Players" />
        <StatCard icon={<Trophy className="h-5 w-5 text-blue-500" />} value={stats.totalEntries} label="Entry Slips" />
        <StatCard icon={<Shield className="h-5 w-5 text-purple-500" />} value={stats.privateLeagues} label="Private Leagues" />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gender pie chart */}
        <GenderPieChart data={stats.gender} />

        {/* Conferences bar chart */}
        <ConferencesBarChart data={stats.conferences} />
      </div>

      {/* World map */}
      <WorldMap countries={stats.countries} tooltipContent={tooltipContent} setTooltipContent={setTooltipContent} />

      {/* US states map */}
      <USMap states={stats.states} tooltipContent={tooltipContent} setTooltipContent={setTooltipContent} />

      {/* Fan bases */}
      <FanBasesChart data={stats.fanBases} />
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="text-3xl font-bold tabular-nums">{value.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </div>
    </Card>
  )
}

function GenderPieChart({ data }: { data: StatItem[] }) {
  const chartData = data.map((d) => ({
    name: GENDER_LABELS[d.value] ?? d.value,
    value: d.count,
  }))

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Players by Gender</h2>
      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`}
              labelLine={false}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip
              formatter={(value: unknown) => [Number(value).toLocaleString(), "Players"]}
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

function ConferencesBarChart({ data }: { data: StatItem[] }) {
  const chartData = data.slice(0, 15).map((d) => ({
    name: d.value,
    players: d.count,
  }))

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Conferences Represented</h2>
      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={55} />
            <RechartsTooltip
              formatter={(value: unknown) => [Number(value).toLocaleString(), "Players"]}
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
            />
            <Bar dataKey="players" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

function WorldMap({
  countries,
  tooltipContent,
  setTooltipContent,
}: {
  countries: StatItem[]
  tooltipContent: string
  setTooltipContent: (s: string) => void
}) {
  const countryMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of countries) m.set(c.value, c.count)
    return m
  }, [countries])

  const maxCount = useMemo(() => Math.max(...countries.map((c) => c.count), 1), [countries])

  const getColor = useCallback(
    (count: number) => {
      if (count === 0) return "hsl(var(--muted))"
      const intensity = Math.max(0.15, count / maxCount)
      return `rgba(249, 115, 22, ${intensity})`
    },
    [maxCount]
  )

  const getCountryCount = useCallback(
    (geoName: string) => {
      // Try direct match first, then mapped name
      return countryMap.get(geoName) ?? countryMap.get(COUNTRY_NAME_MAP[geoName] ?? "") ?? 0
    },
    [countryMap]
  )

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Global Reach</h2>
        <Badge variant="secondary">{countries.length} countries</Badge>
      </div>
      <div className="relative">
        {tooltipContent && (
          <div className="absolute top-2 right-2 z-10 bg-card border border-border rounded-lg px-3 py-1.5 text-sm shadow-lg">
            {tooltipContent}
          </div>
        )}
        <ComposableMap
          projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }}
          className="w-full"
          height={400}
        >
          <ZoomableGroup>
            <Geographies geography={WORLD_GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const name = geo.properties.name
                  const count = getCountryCount(name)
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={getColor(count)}
                      stroke="hsl(var(--border))"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none", fill: "#f97316", opacity: 0.8 },
                        pressed: { outline: "none" },
                      }}
                      onMouseEnter={() => {
                        setTooltipContent(count > 0 ? `${name}: ${count} player${count !== 1 ? "s" : ""}` : name)
                      }}
                      onMouseLeave={() => setTooltipContent("")}
                    />
                  )
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>
    </Card>
  )
}

function USMap({
  states,
  tooltipContent,
  setTooltipContent,
}: {
  states: StatItem[]
  tooltipContent: string
  setTooltipContent: (s: string) => void
}) {
  const stateMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of states) m.set(s.value, s.count)
    return m
  }, [states])

  const maxCount = useMemo(() => Math.max(...states.map((s) => s.count), 1), [states])

  const getColor = useCallback(
    (count: number) => {
      if (count === 0) return "hsl(var(--muted))"
      const intensity = Math.max(0.15, count / maxCount)
      return `rgba(59, 130, 246, ${intensity})`
    },
    [maxCount]
  )

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">United States</h2>
        <Badge variant="secondary">{states.length} states</Badge>
      </div>
      <div className="relative">
        {tooltipContent && (
          <div className="absolute top-2 right-2 z-10 bg-card border border-border rounded-lg px-3 py-1.5 text-sm shadow-lg">
            {tooltipContent}
          </div>
        )}
        <ComposableMap
          projection="geoAlbersUsa"
          className="w-full"
          height={400}
        >
          <Geographies geography={US_GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name = geo.properties.name
                const count = stateMap.get(name) ?? 0
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getColor(count)}
                    stroke="hsl(var(--border))"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "#3b82f6", opacity: 0.8 },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={() => {
                      setTooltipContent(count > 0 ? `${name}: ${count} player${count !== 1 ? "s" : ""}` : name)
                    }}
                    onMouseLeave={() => setTooltipContent("")}
                  />
                )
              })
            }
          </Geographies>
        </ComposableMap>
      </div>
    </Card>
  )
}

// Custom Treemap content renderer
function TreemapContent(props: {
  x: number
  y: number
  width: number
  height: number
  name: string
  value: number
  index: number
}) {
  const { x, y, width, height, name, value, index } = props
  const colors = ["#f97316", "#fb923c", "#fdba74", "#fed7aa", "#ffedd5", "#ea580c", "#c2410c", "#9a3412"]
  const color = colors[index % colors.length]
  const showLabel = width > 40 && height > 30

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        stroke="hsl(var(--background))"
        strokeWidth={2}
        rx={4}
      />
      {showLabel && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="#fff"
            fontSize={width > 80 ? 12 : 10}
            fontWeight="600"
          >
            {name.length > (width > 80 ? 15 : 8) ? name.slice(0, width > 80 ? 15 : 8) + "…" : name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="rgba(255,255,255,0.8)"
            fontSize={10}
          >
            {value}
          </text>
        </>
      )}
    </g>
  )
}

function FanBasesChart({ data }: { data: StatItem[] }) {
  const treeData = data.slice(0, 30).map((d) => ({
    name: d.value,
    size: d.count,
  }))

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Fan Bases</h2>
        <Badge variant="secondary">{data.length} teams</Badge>
      </div>
      {treeData.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <Treemap
            data={treeData}
            dataKey="size"
            nameKey="name"
            content={<TreemapContent x={0} y={0} width={0} height={0} name="" value={0} index={0} />}
          >
            <RechartsTooltip
              formatter={(value: unknown, _name: unknown, props: unknown) => {
                const v = Number(value)
                const p = props as { payload?: { name?: string } } | undefined
                return [`${v.toLocaleString()} player${v !== 1 ? "s" : ""}`, p?.payload?.name ?? ""]
              }}
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
            />
          </Treemap>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
