import { ImageResponse } from "@vercel/og"
import { NextRequest } from "next/server"

export const runtime = "edge"

// ── Font loading ────────────────────────────────────────────────────────────
// Fetch Geist font weights from Fontsource CDN (TTF format, latin subset).
// Satori (used by @vercel/og) only supports TTF/OTF/WOFF — NOT WOFF2.
// We cache the raw Uint8Array so we can .slice() a fresh copy per request
// (ArrayBuffers can be detached after Satori consumes them).

const FONT_URLS = {
  400: "https://cdn.jsdelivr.net/fontsource/fonts/geist@latest/latin-400-normal.ttf",
  600: "https://cdn.jsdelivr.net/fontsource/fonts/geist@latest/latin-600-normal.ttf",
  700: "https://cdn.jsdelivr.net/fontsource/fonts/geist@latest/latin-700-normal.ttf",
  900: "https://cdn.jsdelivr.net/fontsource/fonts/geist@latest/latin-900-normal.ttf",
} as const

const fontCache: Promise<Record<number, Uint8Array>> = Promise.all(
  Object.entries(FONT_URLS).map(async ([weight, url]) => {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    return [Number(weight), new Uint8Array(buf)] as const
  }),
).then((entries) => Object.fromEntries(entries) as Record<number, Uint8Array>)

/** Return fresh ArrayBuffer copies of each font weight for ImageResponse */
async function getFonts() {
  const cache = await fontCache
  return [
    { name: "Geist", data: cache[400].slice().buffer, style: "normal" as const, weight: 400 as const },
    { name: "Geist", data: cache[600].slice().buffer, style: "normal" as const, weight: 600 as const },
    { name: "Geist", data: cache[700].slice().buffer, style: "normal" as const, weight: 700 as const },
    { name: "Geist", data: cache[900].slice().buffer, style: "normal" as const, weight: 900 as const },
  ]
}

// ── SVG Checkmark component for Satori ──────────────────────────────────────
// Unicode ✓ doesn't render in Satori's default glyph set, so we use an SVG.
function CheckIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="12" fill="#00A9E0" opacity="0.15" />
      <path
        d="M7 12.5L10.5 16L17 9"
        stroke="#00A9E0"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * GET /api/og/share — Square share card (1080×1080) for social platforms.
 *
 * Pre-tournament:  /api/og/share?type=pre&name=Sumeet+Patel
 * During/Post:     /api/og/share?name=Sumeet+Patel&rank=14&score=87&percentile=6&alive=5&total=265
 *
 * Per spec: "one format (1080×1080 or 1080×1350) that works across all platforms"
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const name = searchParams.get("name") || "Player"
  const rank = searchParams.get("rank")
  const score = searchParams.get("score")
  const percentile = searchParams.get("percentile")
  const teamsAlive = searchParams.get("alive")
  const totalEntries = searchParams.get("total")
  const type = searchParams.get("type") || (rank ? "during" : "pre")
  const leagueName = searchParams.get("league")
  const leagueRank = searchParams.get("leagueRank")

  const fonts = await getFonts()

  if (type === "pre") {
    // ── Pre-tournament share card ─────────────────────────────────────────
    // Matches the homepage visual style: light background, Geist font,
    // checkmark pills, bold CTA
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(180deg, #e8f4f8 0%, #f0f9ff 30%, #ffffff 60%, #f0f9ff 100%)",
            fontFamily: "Geist",
            padding: "48px 60px",
          }}
        >
          {/* Decorative top accent */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 6,
              background: "linear-gradient(90deg, #003087, #00A9E0, #F47920, #00A9E0, #003087)",
            }}
          />

          {/* Basketball icon */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "20px",
              background: "#00A9E0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              boxShadow: "0 8px 30px rgba(0,169,224,0.3)",
            }}
          >
            <span style={{ fontSize: 44 }}>🏀</span>
          </div>

          {/* Brand — bold style matching homepage */}
          <div
            style={{
              fontSize: 100,
              fontWeight: 900,
              fontStyle: "italic",
              color: "#00A9E0",
              letterSpacing: "-3px",
              marginBottom: 20,
              textShadow: "2px 2px 0 rgba(0,48,135,0.1)",
            }}
          >
            Slipper8s
          </div>

          {/* Checkmark pills row — matches homepage */}
          <div style={{ display: "flex", gap: 32, marginBottom: 32 }}>
            {["Pick 8 teams", "Seed x Wins = Score", "Highest Score Wins"].map((text) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 26,
                  color: "#334155",
                  fontWeight: 600,
                }}
              >
                <CheckIcon />
                {text}
              </div>
            ))}
          </div>

          {/* Tagline */}
          <div style={{ fontSize: 30, color: "#64748b", marginBottom: 36, textAlign: "center", fontWeight: 400 }}>
            No bracket to bust. Just pick 8 sleepers and root for chaos!
          </div>

          {/* Sign Up CTA button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 48,
              fontWeight: 700,
              color: "white",
              background: "linear-gradient(135deg, #00A9E0, #0088cc)",
              padding: "24px 64px",
              borderRadius: 20,
              marginBottom: 40,
              boxShadow: "0 8px 30px rgba(0,169,224,0.35)",
            }}
          >
            Sign Up &amp; Play!
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M13 5l7 7-7 7"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Player invite card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              background: "rgba(0,169,224,0.06)",
              border: "2px solid rgba(0,169,224,0.15)",
              borderRadius: 24,
              padding: "28px 64px",
            }}
          >
            <div style={{ fontSize: 42, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
              {name}
            </div>
            <div
              style={{
                fontSize: 24,
                color: "#00A9E0",
                fontWeight: 600,
              }}
            >
              invited you to play!
            </div>
          </div>

          {/* Footer */}
          <div style={{ position: "absolute", bottom: 32, fontSize: 22, color: "#94a3b8", fontWeight: 400 }}>
            slipper8s.com
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1080,
        fonts,
      },
    )
  }

  // ── During / Post tournament share card ─────────────────────────────────
  const isPostTournament = type === "post"

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #001a4d 0%, #0a0a1a 40%, #001a4d 100%)",
          fontFamily: "Geist",
          padding: "60px",
        }}
      >
        {/* Top accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, #003087, #00A9E0, #F47920, #00A9E0, #003087)",
          }}
        />

        {/* Logo + brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "18px",
              background: "#00A9E0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 50px rgba(0,169,224,0.3)",
            }}
          >
            <span style={{ fontSize: 32 }}>🏀</span>
          </div>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#00A9E0", letterSpacing: "-1px" }}>
            Slipper8s
          </div>
          <div style={{ fontSize: 20, color: "#71717a", marginLeft: 8, fontWeight: 400 }}>2026</div>
        </div>

        {/* Player name */}
        <div style={{ fontSize: 44, fontWeight: 700, color: "white", marginBottom: 12 }}>
          {name}
        </div>

        {/* Status label */}
        <div
          style={{
            fontSize: 16,
            color: isPostTournament ? "#F47920" : "#00A9E0",
            textTransform: "uppercase",
            letterSpacing: "3px",
            fontWeight: 700,
            marginBottom: 40,
          }}
        >
          {isPostTournament ? "Final Results" : "Tournament in Progress"}
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: "flex",
            gap: 48,
            justifyContent: "center",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(0,169,224,0.15)",
            borderRadius: 24,
            padding: "36px 48px",
            marginBottom: 24,
          }}
        >
          {rank ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 140 }}>
              <div style={{ fontSize: 14, color: "#71717a", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8, fontWeight: 600 }}>
                {isPostTournament ? "Final Rank" : "Global Rank"}
              </div>
              <div style={{ fontSize: 56, fontWeight: 700, color: "#00A9E0" }}>
                #{rank}
              </div>
            </div>
          ) : null}
          {percentile ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 140 }}>
              <div style={{ fontSize: 14, color: "#71717a", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8, fontWeight: 600 }}>
                Percentile
              </div>
              <div style={{ fontSize: 56, fontWeight: 700, color: "#e4e4e7" }}>
                Top {percentile}%
              </div>
            </div>
          ) : null}
          {score ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 140 }}>
              <div style={{ fontSize: 14, color: "#71717a", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8, fontWeight: 600 }}>
                Score
              </div>
              <div style={{ fontSize: 56, fontWeight: 700, color: "#e4e4e7" }}>
                {score}
              </div>
            </div>
          ) : null}
          {teamsAlive && !isPostTournament ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 140 }}>
              <div style={{ fontSize: 14, color: "#71717a", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8, fontWeight: 600 }}>
                Teams Alive
              </div>
              <div style={{ fontSize: 56, fontWeight: 700, color: parseInt(teamsAlive) > 0 ? "#27AE60" : "#C0392B" }}>
                {teamsAlive}/8
              </div>
            </div>
          ) : null}
        </div>

        {/* League info */}
        {leagueName && leagueRank ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "rgba(244,121,32,0.08)",
              border: "1px solid rgba(244,121,32,0.2)",
              borderRadius: 12,
              padding: "12px 24px",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 16, color: "#F47920", fontWeight: 600 }}>
              {leagueName}: #{leagueRank}
            </div>
          </div>
        ) : null}

        {/* Total entries */}
        {totalEntries ? (
          <div style={{ fontSize: 18, color: "#52525b", fontWeight: 400 }}>
            Out of {totalEntries} entries
          </div>
        ) : null}

        {/* Footer */}
        <div style={{ position: "absolute", bottom: 36, fontSize: 18, color: "#3f3f46", fontWeight: 400 }}>
          slipper8s.com
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts,
    },
  )
}
