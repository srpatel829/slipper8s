import { ImageResponse } from "@vercel/og"
import { NextRequest } from "next/server"

export const runtime = "edge"

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

  if (type === "pre") {
    // ── Pre-tournament share card ─────────────────────────────────────────
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
            background: "linear-gradient(180deg, #001a4d 0%, #0a0a1a 50%, #001a4d 100%)",
            fontFamily: "sans-serif",
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

          {/* Logo + Brand row */}
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 20 }}>
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: "22px",
                background: "#00A9E0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 60px rgba(0,169,224,0.4)",
              }}
            >
              <span style={{ fontSize: 48 }}>🏀</span>
            </div>
            <div
              style={{
                fontSize: 88,
                fontWeight: 800,
                color: "#00A9E0",
                letterSpacing: "-3px",
              }}
            >
              Slipper8s
            </div>
          </div>

          {/* Subtitle */}
          <div style={{ fontSize: 28, color: "#71717a", marginBottom: 24 }}>
            College Basketball Tournament Pool · 2026
          </div>

          {/* Sign Up CTA */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: "#F47920",
              marginBottom: 36,
              textAlign: "center",
              lineHeight: 1.1,
            }}
          >
            Sign Up &amp; Play!
          </div>

          {/* Player card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              background: "rgba(255,255,255,0.05)",
              border: "2px solid rgba(0,169,224,0.25)",
              borderRadius: 28,
              padding: "32px 72px",
              marginBottom: 40,
            }}
          >
            <div style={{ fontSize: 48, fontWeight: 700, color: "white", marginBottom: 12 }}>
              {name}
            </div>
            <div
              style={{
                fontSize: 26,
                color: "#00A9E0",
                background: "rgba(0,169,224,0.12)",
                padding: "10px 28px",
                borderRadius: 14,
                fontWeight: 600,
              }}
            >
              I&apos;m in for 2026 — join me!
            </div>
          </div>

          {/* How it works — larger pills */}
          <div style={{ display: "flex", gap: 20 }}>
            {["Pick 8 Teams", "Seed x Wins = Score", "Highest Score Wins"].map((text) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 24,
                  color: "#d4d4d8",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 99,
                  padding: "14px 28px",
                  fontWeight: 500,
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#00A9E0" }} />
                {text}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ position: "absolute", bottom: 32, fontSize: 22, color: "#52525b", fontWeight: 500 }}>
            slipper8s.com
          </div>
        </div>
      ),
      { width: 1080, height: 1080 },
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
          fontFamily: "sans-serif",
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
          <div style={{ fontSize: 48, fontWeight: 800, color: "#00A9E0", letterSpacing: "-1px" }}>
            Slipper8s
          </div>
          <div style={{ fontSize: 20, color: "#71717a", marginLeft: 8 }}>2026</div>
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
            flexWrap: "wrap",
            gap: 24,
            justifyContent: "center",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(0,169,224,0.15)",
            borderRadius: 24,
            padding: "36px 48px",
            marginBottom: 24,
            maxWidth: 900,
          }}
        >
          {rank && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 140 }}>
              <div style={{ fontSize: 14, color: "#71717a", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8 }}>
                {isPostTournament ? "Final Rank" : "Global Rank"}
              </div>
              <div style={{ fontSize: 56, fontWeight: 800, color: "#00A9E0" }}>
                #{rank}
              </div>
            </div>
          )}
          {percentile && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 140 }}>
              <div style={{ fontSize: 14, color: "#71717a", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8 }}>
                Percentile
              </div>
              <div style={{ fontSize: 56, fontWeight: 800, color: "#e4e4e7" }}>
                Top {percentile}%
              </div>
            </div>
          )}
          {score && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 140 }}>
              <div style={{ fontSize: 14, color: "#71717a", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8 }}>
                Score
              </div>
              <div style={{ fontSize: 56, fontWeight: 800, color: "#e4e4e7" }}>
                {score}
              </div>
            </div>
          )}
          {teamsAlive && !isPostTournament && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 140 }}>
              <div style={{ fontSize: 14, color: "#71717a", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8 }}>
                Teams Alive
              </div>
              <div style={{ fontSize: 56, fontWeight: 800, color: parseInt(teamsAlive) > 0 ? "#27AE60" : "#C0392B" }}>
                {teamsAlive}/8
              </div>
            </div>
          )}
        </div>

        {/* League info */}
        {leagueName && leagueRank && (
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
        )}

        {/* Total entries */}
        {totalEntries && (
          <div style={{ fontSize: 18, color: "#52525b" }}>
            Out of {totalEntries} entries
          </div>
        )}

        {/* Footer */}
        <div style={{ position: "absolute", bottom: 36, fontSize: 18, color: "#3f3f46" }}>
          slipper8s.com
        </div>
      </div>
    ),
    { width: 1080, height: 1080 },
  )
}
