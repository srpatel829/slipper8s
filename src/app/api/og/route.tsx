import { ImageResponse } from "@vercel/og"
import { NextRequest } from "next/server"

export const runtime = "edge"

/**
 * GET /api/og — Default Open Graph image for the site
 *
 * Also supports ?name=X&rank=Y&score=Z&percentile=P for personalized cards.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const name = searchParams.get("name")
  const rank = searchParams.get("rank")
  const score = searchParams.get("score")
  const percentile = searchParams.get("percentile")
  const teamsAlive = searchParams.get("alive")
  const totalEntries = searchParams.get("total")
  const type = searchParams.get("type") // "pre" | "during" | "post"

  // Pre-tournament card
  if (type === "pre" || (!name && !rank)) {
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
            background: "linear-gradient(135deg, #003087 0%, #0a0a1a 50%, #003087 100%)",
            fontFamily: "sans-serif",
          }}
        >
          {/* Logo circle */}
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: "24px",
              background: "#00A9E0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
              boxShadow: "0 0 60px rgba(0,169,224,0.4)",
            }}
          >
            <span style={{ fontSize: 48, color: "white" }}>🏀</span>
          </div>

          {/* Brand */}
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#00A9E0",
              letterSpacing: "-2px",
              marginBottom: 12,
            }}
          >
            Slipper8s
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 24,
              color: "#a1a1aa",
              marginBottom: 40,
            }}
          >
            College Basketball Tournament Pool · 2026
          </div>

          {/* Player name if present */}
          {name && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16,
                padding: "24px 48px",
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 32, fontWeight: 700, color: "white", marginBottom: 8 }}>
                {name}
              </div>
              <div style={{ fontSize: 18, color: "#00A9E0" }}>
                I&apos;m in for 2026 — join me!
              </div>
            </div>
          )}

          {/* How it works */}
          <div
            style={{
              display: "flex",
              gap: 32,
              marginTop: 16,
            }}
          >
            {["Pick 8 teams", "Seed × Wins", "Highest score wins"].map((text) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 18,
                  color: "#e4e4e7",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#00A9E0",
                  }}
                />
                {text}
              </div>
            ))}
          </div>

          {/* URL footer */}
          <div
            style={{
              position: "absolute",
              bottom: 32,
              fontSize: 16,
              color: "#52525b",
            }}
          >
            slipper8s.com
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    )
  }

  // During/post tournament card with stats
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
          background: "linear-gradient(135deg, #003087 0%, #0a0a1a 50%, #003087 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo + brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "16px",
              background: "#00A9E0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 40px rgba(0,169,224,0.3)",
            }}
          >
            <span style={{ fontSize: 28, color: "white" }}>🏀</span>
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, color: "#00A9E0", letterSpacing: "-1px" }}>
            Slipper8s
          </div>
          <div style={{ fontSize: 18, color: "#71717a", marginLeft: 8 }}>2026</div>
        </div>

        {/* Player name */}
        {name && (
          <div style={{ fontSize: 36, fontWeight: 700, color: "white", marginBottom: 32 }}>
            {name}
          </div>
        )}

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 48,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            padding: "32px 56px",
            marginBottom: 24,
          }}
        >
          {rank && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 14, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8 }}>
                Rank
              </div>
              <div style={{ fontSize: 48, fontWeight: 800, color: "#00A9E0" }}>
                #{rank}
              </div>
            </div>
          )}
          {percentile && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 14, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8 }}>
                Percentile
              </div>
              <div style={{ fontSize: 48, fontWeight: 800, color: "#e4e4e7" }}>
                Top {percentile}%
              </div>
            </div>
          )}
          {score && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 14, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8 }}>
                Score
              </div>
              <div style={{ fontSize: 48, fontWeight: 800, color: "#e4e4e7" }}>
                {score}
              </div>
            </div>
          )}
          {teamsAlive && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 14, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8 }}>
                Alive
              </div>
              <div style={{ fontSize: 48, fontWeight: 800, color: parseInt(teamsAlive) > 0 ? "#27AE60" : "#C0392B" }}>
                {teamsAlive}/8
              </div>
            </div>
          )}
        </div>

        {/* Total entries */}
        {totalEntries && (
          <div style={{ fontSize: 16, color: "#71717a" }}>
            Out of {totalEntries} entries
          </div>
        )}

        {/* URL footer */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            fontSize: 16,
            color: "#52525b",
          }}
        >
          slipper8s.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
