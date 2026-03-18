"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
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
  conference?: string | null
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

const GENDER_COLORS: Record<string, string> = {
  Male: "#3b82f6",           // blue
  Female: "#ec4899",         // pink
  Other: "#8b5cf6",          // purple
  "Prefer not to say": "#6b7280", // grey
}

// Conference name → ESPN CDN logo slug
const CONF_LOGO_SLUGS: Record<string, string> = {
  "ACC": "acc",
  "SEC": "sec",
  "Big Ten": "big_ten",
  "Big 12": "big_12",
  "Big East": "big_east",
  "American Athletic": "american",
  "America East": "america_east",
  "ASUN": "atlantic_sun",
  "Atlantic 10": "atlantic_10",
  "Big Sky": "big_sky",
  "Big South": "big_south",
  "Big West": "big_west",
  "CAA": "caa",
  "Conference USA": "conference_usa",
  "Horizon League": "horizon",
  "Ivy League": "ivy",
  "MAAC": "maac",
  "MAC": "mac",
  "MEAC": "meac",
  "Missouri Valley": "missouri_valley",
  "Mountain West": "mountain_west",
  "NEC": "nec",
  "Ohio Valley": "ohio_valley",
  "Patriot League": "patriot",
  "Southern Conference": "southern",
  "Southland": "southland",
  "Summit League": "summit",
  "Sun Belt": "sun_belt",
  "SWAC": "swac",
  "WAC": "wac",
  "West Coast Conference": "west_coast",
}

function getConfLogoUrl(confName: string): string | null {
  const slug = CONF_LOGO_SLUGS[confName]
  return slug ? `https://a.espncdn.com/i/teamlogos/ncaa_conf/500/${slug}.png` : null
}

// Conference colors for the nested treemap
const CONF_COLOR_MAP: Record<string, string> = {
  "SEC": "#f59e0b",
  "Big Ten": "#3b82f6",
  "ACC": "#10b981",
  "Big 12": "#ef4444",
  "Big East": "#8b5cf6",
  "American Athletic": "#06b6d4",
  "West Coast Conference": "#ec4899",
  "Mountain West": "#14b8a6",
  "Atlantic 10": "#6366f1",
  "Missouri Valley": "#84cc16",
  "CAA": "#e11d48",
  "Sun Belt": "#0ea5e9",
  "Conference USA": "#a855f7",
  "MAAC": "#22c55e",
  "MAC": "#f97316",
  "Ivy League": "#059669",
  "ASUN": "#7c3aed",
  "Big Sky": "#0891b2",
  "Big South": "#dc2626",
  "Big West": "#16a34a",
  "Horizon League": "#2563eb",
  "MEAC": "#9333ea",
  "NEC": "#0d9488",
  "Ohio Valley": "#ca8a04",
  "Patriot League": "#4f46e5",
  "Southern Conference": "#c026d3",
  "Southland": "#ea580c",
  "Summit League": "#0284c7",
  "SWAC": "#65a30d",
  "WAC": "#b91c1c",
  "America East": "#7c2d12",
}

const DEFAULT_CONF_COLOR = "#6b7280"

// Country name mapping (topojson uses specific names)
const COUNTRY_NAME_MAP: Record<string, string> = {
  "United States of America": "United States",
  "United Kingdom": "United Kingdom",
  "South Korea": "South Korea",
}

// ── Tooltip style (always legible) ─────────────────────────────────────────

const TOOLTIP_STYLE = {
  background: "#1f2937",
  border: "1px solid #374151",
  borderRadius: "8px",
  color: "#f9fafb",
}

// ── Mouse-tracking tooltip hook ────────────────────────────────────────────

function useMouseTooltip() {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent, text: string) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setTooltip({
      text,
      x: e.clientX - rect.left + 12,
      y: e.clientY - rect.top - 8,
    })
  }, [])

  const hideTooltip = useCallback(() => setTooltip(null), [])

  return { tooltip, containerRef, handleMouseMove, hideTooltip }
}

function MapTooltip({ tooltip }: { tooltip: { text: string; x: number; y: number } | null }) {
  if (!tooltip) return null
  return (
    <div
      className="absolute z-10 pointer-events-none bg-gray-800 text-gray-100 border border-gray-600 rounded-lg px-3 py-1.5 text-sm shadow-lg whitespace-nowrap"
      style={{ left: tooltip.x, top: tooltip.y }}
    >
      {tooltip.text}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export function StatsDashboard() {
  const [stats, setStats] = useState<CommunityStats | null>(null)
  const [loading, setLoading] = useState(true)

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

      {/* Gender chart */}
      <GenderPieChart data={stats.gender} />

      {/* World map */}
      <WorldMap countries={stats.countries} />

      {/* US states map */}
      <USMap states={stats.states} />

      {/* Combined conference + fan bases nested treemap */}
      <ConferenceFanBasesTreemap conferences={stats.conferences} fanBases={stats.fanBases} />
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
              {chartData.map((entry, i) => (
                <Cell key={i} fill={GENDER_COLORS[entry.name] ?? "#6b7280"} />
              ))}
            </Pie>
            <RechartsTooltip
              formatter={(value: unknown) => [Number(value).toLocaleString(), "Players"]}
              contentStyle={TOOLTIP_STYLE}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

function WorldMap({ countries }: { countries: StatItem[] }) {
  const { tooltip, containerRef, handleMouseMove, hideTooltip } = useMouseTooltip()

  const countryMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of countries) m.set(c.value, c.count)
    return m
  }, [countries])

  const maxCount = useMemo(() => Math.max(...countries.map((c) => c.count), 1), [countries])

  const getColor = useCallback(
    (count: number) => {
      if (count === 0) return "#374151"
      const intensity = Math.max(0.2, count / maxCount)
      return `rgba(249, 115, 22, ${intensity})`
    },
    [maxCount]
  )

  const getCountryCount = useCallback(
    (geoName: string) => {
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
      <div className="relative overflow-hidden" ref={containerRef}>
        <MapTooltip tooltip={tooltip} />
        <ComposableMap
          projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }}
          width={800}
          height={450}
          style={{ width: "100%", height: "auto" }}
        >
          <ZoomableGroup>
            <Geographies geography={WORLD_GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const name = geo.properties.name
                  const count = getCountryCount(name)
                  const tooltipText = count > 0 ? `${name}: ${count} player${count !== 1 ? "s" : ""}` : name
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={getColor(count)}
                      stroke="#1f2937"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none", fill: "#f97316", opacity: 0.8 },
                        pressed: { outline: "none" },
                      }}
                      onMouseMove={(e: unknown) => handleMouseMove(e as React.MouseEvent, tooltipText)}
                      onMouseLeave={hideTooltip}
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

function USMap({ states }: { states: StatItem[] }) {
  const { tooltip, containerRef, handleMouseMove, hideTooltip } = useMouseTooltip()

  const stateMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of states) m.set(s.value, s.count)
    return m
  }, [states])

  const maxCount = useMemo(() => Math.max(...states.map((s) => s.count), 1), [states])

  const getColor = useCallback(
    (count: number) => {
      if (count === 0) return "#374151"
      const intensity = Math.max(0.2, count / maxCount)
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
      <div className="relative overflow-hidden" ref={containerRef}>
        <MapTooltip tooltip={tooltip} />
        <ComposableMap
          projection="geoAlbersUsa"
          width={800}
          height={500}
          style={{ width: "100%", height: "auto" }}
        >
          <Geographies geography={US_GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name = geo.properties.name
                const count = stateMap.get(name) ?? 0
                const tooltipText = count > 0 ? `${name}: ${count} player${count !== 1 ? "s" : ""}` : name
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getColor(count)}
                    stroke="#1f2937"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "#3b82f6", opacity: 0.8 },
                      pressed: { outline: "none" },
                    }}
                    onMouseMove={(e: unknown) => handleMouseMove(e as React.MouseEvent, tooltipText)}
                    onMouseLeave={hideTooltip}
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

// ── Nested Conference → Team Treemap ──────────────────────────────────────

interface NestedTreeNode {
  name: string
  size?: number
  children?: NestedTreeNode[]
  conference?: string
  confColor?: string
}

/**
 * Custom content renderer for the nested treemap.
 * - Conference parent nodes: show conference logo + name (count)
 * - Team leaf nodes: show team name + count, using a lighter shade of the conference color
 */
function NestedTreemapContent(props: {
  x: number
  y: number
  width: number
  height: number
  name: string
  depth: number
  root?: NestedTreeNode
  conference?: string
  confColor?: string
  value?: number
  size?: number
}) {
  const { x, y, width, height, name, depth, conference, confColor, size } = props

  if (depth === 0) return null // root node

  if (depth === 1) {
    // Conference parent block
    const color = confColor ?? CONF_COLOR_MAP[name] ?? DEFAULT_CONF_COLOR
    const logoUrl = getConfLogoUrl(name)
    const showLabel = width > 50 && height > 28
    // Sum children to get total count
    const total = size ?? 0

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={color}
          fillOpacity={0.25}
          stroke={color}
          strokeWidth={2}
          rx={4}
        />
        {showLabel && (
          <>
            {logoUrl && width > 60 && (
              <image
                href={logoUrl}
                x={x + 6}
                y={y + 4}
                width={20}
                height={20}
                preserveAspectRatio="xMidYMid meet"
              />
            )}
            <text
              x={logoUrl && width > 60 ? x + 30 : x + 6}
              y={y + 18}
              fontSize={11}
              fontWeight="700"
              fill="hsl(var(--foreground))"
            >
              {name.length > (width > 120 ? 18 : 10) ? name.slice(0, width > 120 ? 18 : 10) + "…" : name}
              {width > 80 ? ` (${total})` : ""}
            </text>
          </>
        )}
      </g>
    )
  }

  // depth === 2: Team leaf node
  const parentConf = conference ?? ""
  const parentColor = confColor ?? CONF_COLOR_MAP[parentConf] ?? DEFAULT_CONF_COLOR
  const showLabel = width > 35 && height > 24

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={parentColor}
        fillOpacity={0.7}
        stroke="hsl(var(--background))"
        strokeWidth={1.5}
        rx={3}
      />
      {showLabel && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - (height > 32 ? 5 : 0)}
            textAnchor="middle"
            fill="#fff"
            fontSize={width > 70 ? 11 : 9}
            fontWeight="600"
          >
            {name.length > (width > 70 ? 14 : 7) ? name.slice(0, width > 70 ? 14 : 7) + "…" : name}
          </text>
          {height > 32 && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 10}
              textAnchor="middle"
              fill="rgba(255,255,255,0.8)"
              fontSize={9}
            >
              {size}
            </text>
          )}
        </>
      )}
    </g>
  )
}

function ConferenceFanBasesTreemap({
  conferences,
  fanBases,
}: {
  conferences: StatItem[]
  fanBases: StatItem[]
}) {
  // Build nested data: conferences → teams
  const treeData = useMemo(() => {
    // Group fan bases by conference
    const confTeams = new Map<string, { name: string; size: number }[]>()
    for (const fb of fanBases) {
      const conf = fb.conference ?? "Other"
      if (!confTeams.has(conf)) confTeams.set(conf, [])
      confTeams.get(conf)!.push({ name: fb.value, size: fb.count })
    }

    // Sort conferences by total count (descending), use conference stats order
    const confOrder = conferences.map((c) => c.value)

    const result: NestedTreeNode[] = []
    for (const confName of confOrder) {
      const teams = confTeams.get(confName)
      if (!teams || teams.length === 0) continue
      const color = CONF_COLOR_MAP[confName] ?? DEFAULT_CONF_COLOR
      result.push({
        name: confName,
        confColor: color,
        children: teams
          .sort((a, b) => b.size - a.size)
          .map((t) => ({
            name: t.name,
            size: t.size,
            conference: confName,
            confColor: color,
          })),
      })
    }

    // Add "Other" for teams without a conference
    const otherTeams = confTeams.get("Other")
    if (otherTeams && otherTeams.length > 0) {
      result.push({
        name: "Other",
        confColor: DEFAULT_CONF_COLOR,
        children: otherTeams
          .sort((a, b) => b.size - a.size)
          .map((t) => ({
            name: t.name,
            size: t.size,
            conference: "Other",
            confColor: DEFAULT_CONF_COLOR,
          })),
      })
    }

    return result
  }, [conferences, fanBases])

  const totalTeams = fanBases.length
  const totalConferences = conferences.length

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Conferences &amp; Fan Bases</h2>
        <div className="flex gap-2">
          <Badge variant="secondary">{totalConferences} conferences</Badge>
          <Badge variant="secondary">{totalTeams} teams</Badge>
        </div>
      </div>
      {treeData.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={450}>
          <Treemap
            data={treeData as unknown as Array<Record<string, unknown>>}
            dataKey="size"
            nameKey="name"
            content={
              <NestedTreemapContent
                x={0} y={0} width={0} height={0}
                name="" depth={0}
              />
            }
          >
            <RechartsTooltip
              formatter={(value: unknown, _name: unknown, props: unknown) => {
                const v = Number(value)
                const p = props as { payload?: { name?: string; conference?: string } } | undefined
                const teamName = p?.payload?.name ?? ""
                const conf = p?.payload?.conference
                const label = conf ? `${teamName} (${conf})` : teamName
                return [`${v.toLocaleString()} player${v !== 1 ? "s" : ""}`, label]
              }}
              contentStyle={TOOLTIP_STYLE}
            />
          </Treemap>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
