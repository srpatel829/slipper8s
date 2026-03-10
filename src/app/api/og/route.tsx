import { ImageResponse } from "@vercel/og"
import { NextRequest } from "next/server"

export const runtime = "edge"

// ── Font loading ────────────────────────────────────────────────────────────
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

async function getFonts() {
  const cache = await fontCache
  return [
    { name: "Geist", data: cache[400].slice().buffer, style: "normal" as const, weight: 400 as const },
    { name: "Geist", data: cache[600].slice().buffer, style: "normal" as const, weight: 600 as const },
    { name: "Geist", data: cache[700].slice().buffer, style: "normal" as const, weight: 700 as const },
    { name: "Geist", data: cache[900].slice().buffer, style: "normal" as const, weight: 900 as const },
  ]
}

// ── SVG Checkmark for Satori ────────────────────────────────────────────────
function CheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="12" fill="#00A9E0" opacity="0.15" />
      <path d="M7 12.5L10.5 16L17 9" stroke="#00A9E0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * GET /api/og — Default Open Graph image (1200×630) for the site.
 * This is what social platforms scrape from the og:image meta tag.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const name = searchParams.get("name")
  const fonts = await getFonts()

  // ── Default / Pre-tournament card ───────────────────────────────────────
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
          padding: "40px 60px",
        }}
      >
        {/* Decorative top accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 5,
            background: "linear-gradient(90deg, #003087, #00A9E0, #F47920, #00A9E0, #003087)",
          }}
        />

        {/* Basketball icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "16px",
            background: "#00A9E0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
            boxShadow: "0 8px 30px rgba(0,169,224,0.3)",
          }}
        >
          <span style={{ fontSize: 34 }}>🏀</span>
        </div>

        {/* Brand — bold italic style */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            fontStyle: "italic",
            color: "#00A9E0",
            letterSpacing: "-2px",
            marginBottom: 12,
            textShadow: "2px 2px 0 rgba(0,48,135,0.1)",
          }}
        >
          Slipper8s
        </div>

        {/* Checkmark pills row */}
        <div style={{ display: "flex", gap: 28, marginBottom: 20 }}>
          {["Pick 8 teams", "Seed x Wins = Score", "Highest Score Wins"].map((text) => (
            <div
              key={text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 20,
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
        <div style={{ fontSize: 22, color: "#64748b", marginBottom: 24, textAlign: "center", fontWeight: 400 }}>
          No bracket to bust. Just pick 8 sleepers and root for chaos!
        </div>

        {/* Sign Up CTA button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 36,
            fontWeight: 700,
            color: "white",
            background: "linear-gradient(135deg, #00A9E0, #0088cc)",
            padding: "16px 48px",
            borderRadius: 16,
            boxShadow: "0 8px 30px rgba(0,169,224,0.35)",
          }}
        >
          Sign Up &amp; Play!
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 5l7 7-7 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Player invite if name provided */}
        {name ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 20,
              fontSize: 18,
              color: "#1e293b",
              fontWeight: 600,
            }}
          >
            {name}
            <span style={{ color: "#00A9E0", fontWeight: 600 }}>invited you to play!</span>
          </div>
        ) : null}

        {/* Footer */}
        <div style={{ position: "absolute", bottom: 24, fontSize: 16, color: "#94a3b8", fontWeight: 400 }}>
          slipper8s.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
    },
  )
}
