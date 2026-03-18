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

const GENDER_COLORS: Record<string, string> = {
  Male: "#3b82f6",           // blue
  Female: "#ec4899",         // pink
  Other: "#8b5cf6",          // purple
  "Prefer not to say": "#6b7280", // grey
}

// Conference bar chart colors (rotating palette)
const CONF_COLORS = [
  "#3b82f6", "#f97316", "#10b981", "#8b5cf6", "#ef4444",
  "#06b6d4", "#f59e0b", "#ec4899", "#14b8a6", "#6366f1",
  "#84cc16", "#e11d48", "#0ea5e9", "#a855f7", "#22c55e",
]

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

// Country name mapping (topojson uses specific names)
const COUNTRY_NAME_MAP: Record<string, string> = {
  "United States of America": "United States",
  "United Kingdom": "United Kingdom",
  "South Korea": "South Korea",
}

// Team primary colors for the fan bases treemap
const TEAM_COLORS: Record<string, string> = {
  // ACC
  "Duke": "#003087", "North Carolina": "#7BAFD4", "Louisville": "#AD0000",
  "Virginia": "#232D4B", "Syracuse": "#F76900", "Clemson": "#F56600",
  "Florida State": "#782F40", "Wake Forest": "#9E7E38", "NC State": "#CC0000",
  "Pitt": "#003594", "Georgia Tech": "#B3A369", "Miami (FL)": "#F47321",
  "Notre Dame": "#0C2340", "Virginia Tech": "#630031", "Boston College": "#98002E",
  "Stanford": "#8C1515", "California": "#003262", "SMU": "#0033A0",
  // SEC
  "Alabama": "#9E1B32", "Auburn": "#0C2340", "Florida": "#0021A5",
  "Georgia": "#BA0C2F", "Kentucky": "#0033A0", "LSU": "#461D7C",
  "Mississippi State": "#660000", "Ole Miss": "#CE1126", "Tennessee": "#FF8200",
  "Texas A&M": "#500000", "Vanderbilt": "#866D4B", "Arkansas": "#9D2235",
  "Missouri": "#F1B82D", "South Carolina": "#73000A", "Oklahoma": "#841617",
  "Texas": "#BF5700",
  // Big Ten
  "Michigan": "#00274C", "Michigan State": "#18453B", "Ohio State": "#BB0000",
  "Purdue": "#CEB888", "Indiana": "#990000", "Iowa": "#FFCD00",
  "Illinois": "#E84A27", "Wisconsin": "#C5050C", "Minnesota": "#7A0019",
  "Northwestern": "#4E2A84", "Maryland": "#E03A3E", "Nebraska": "#D00000",
  "Penn State": "#041E42", "Rutgers": "#CC0033", "Oregon": "#154733",
  "UCLA": "#2D68C4", "USC": "#990000", "Washington": "#4B2E83",
  // Big 12
  "Kansas": "#0051BA", "Baylor": "#003015", "Texas Tech": "#CC0000",
  "Iowa State": "#C8102E", "TCU": "#4D1979", "West Virginia": "#002855",
  "Oklahoma State": "#FF7300", "Kansas State": "#512888", "Cincinnati": "#E00122",
  "Houston": "#C8102E", "UCF": "#BA9B37", "BYU": "#002E5D",
  "Arizona": "#CC0033", "Arizona State": "#8C1D40", "Colorado": "#CFB87C",
  "Utah": "#CC0000",
  // Big East
  "UConn": "#000E2F", "Villanova": "#003366", "Creighton": "#005CA9",
  "Marquette": "#003366", "Xavier": "#0C2340", "St. John's": "#D41B2C",
  "Seton Hall": "#004B8D", "Providence": "#000000", "Butler": "#13294B",
  "Georgetown": "#041E42", "DePaul": "#005EB8",
  // Other notable
  "Gonzaga": "#002967", "San Diego State": "#A6192E", "Memphis": "#003087",
  "Saint Mary's": "#D22630", "Dayton": "#CE1141", "VCU": "#F8B800",
  "Drake": "#004477", "Loyola Chicago": "#6C1D45", "Davidson": "#CC0000",
  "Wichita State": "#FFC217", "Nevada": "#003366", "Boise State": "#0033A0",
  "New Mexico": "#BA0C2F", "UNLV": "#CF0A2C", "Colorado State": "#1E4D2B",
  "Wyoming": "#492F24", "Fresno State": "#DB0032",
  // Mid-majors often in tournament
  "St. Peter's": "#003DA5", "Fairleigh Dickinson": "#003DA5",
  "Furman": "#582C83", "Princeton": "#FF6000", "Oral Roberts": "#002855",
  "Vermont": "#154734", "Colgate": "#821019", "Iona": "#6B2737",
  "Montana State": "#003875", "Chattanooga": "#00386B",
}

const DEFAULT_TEAM_COLOR = "#f97316"

// ── Tooltip style (always legible) ─────────────────────────────────────────

const TOOLTIP_STYLE = {
  background: "#1f2937",
  border: "1px solid #374151",
  borderRadius: "8px",
  color: "#f9fafb",
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
        <GenderPieChart data={stats.gender} />
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

// Custom Y-axis tick that renders conference logo + abbreviated name
function ConferenceYAxisTick(props: { x: number; y: number; payload: { value: string } }) {
  const { x, y, payload } = props
  const name = payload.value
  const logoUrl = getConfLogoUrl(name)

  return (
    <g transform={`translate(${x},${y})`}>
      {logoUrl ? (
        <>
          <image
            href={logoUrl}
            x={-70}
            y={-12}
            width={24}
            height={24}
            preserveAspectRatio="xMidYMid meet"
          />
          <text
            x={-40}
            y={4}
            textAnchor="start"
            fontSize={11}
            fill="hsl(var(--muted-foreground))"
          >
            {name.length > 12 ? name.slice(0, 12) + "…" : name}
          </text>
        </>
      ) : (
        <text
          x={-5}
          y={4}
          textAnchor="end"
          fontSize={11}
          fill="hsl(var(--muted-foreground))"
        >
          {name}
        </text>
      )}
    </g>
  )
}

function ConferencesBarChart({ data }: { data: StatItem[] }) {
  const chartData = data.slice(0, 15).map((d, i) => ({
    name: d.value,
    players: d.count,
    fill: CONF_COLORS[i % CONF_COLORS.length],
  }))

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Conferences Represented</h2>
      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(280, chartData.length * 32)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis
              type="category"
              dataKey="name"
              width={75}
              tick={ConferenceYAxisTick as unknown as Record<string, unknown>}
            />
            <RechartsTooltip
              formatter={(value: unknown) => [Number(value).toLocaleString(), "Players"]}
              contentStyle={TOOLTIP_STYLE}
            />
            <Bar dataKey="players" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
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
      if (count === 0) return "#374151" // dark grey for unrepresented
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
      <div className="relative">
        {tooltipContent && (
          <div className="absolute top-2 right-2 z-10 bg-gray-800 text-gray-100 border border-gray-600 rounded-lg px-3 py-1.5 text-sm shadow-lg">
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
                      stroke="#1f2937"
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
      if (count === 0) return "#374151" // dark grey for unrepresented
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
      <div className="relative">
        {tooltipContent && (
          <div className="absolute top-2 right-2 z-10 bg-gray-800 text-gray-100 border border-gray-600 rounded-lg px-3 py-1.5 text-sm shadow-lg">
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
                    stroke="#1f2937"
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

// Custom Treemap content renderer — uses team colors
function TreemapContent(props: {
  x: number
  y: number
  width: number
  height: number
  name: string
  value: number
}) {
  const { x, y, width, height, name, value } = props
  const color = TEAM_COLORS[name] ?? DEFAULT_TEAM_COLOR
  const showLabel = width > 40 && height > 30

  // Determine text color based on background brightness
  const textColor = "#fff"

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
            fill={textColor}
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
            content={<TreemapContent x={0} y={0} width={0} height={0} name="" value={0} />}
          >
            <RechartsTooltip
              formatter={(value: unknown, _name: unknown, props: unknown) => {
                const v = Number(value)
                const p = props as { payload?: { name?: string } } | undefined
                return [`${v.toLocaleString()} player${v !== 1 ? "s" : ""}`, p?.payload?.name ?? ""]
              }}
              contentStyle={TOOLTIP_STYLE}
            />
          </Treemap>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
