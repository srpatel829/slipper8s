import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { fetchESPNScoreboard, transformESPNEvents } from "@/lib/espn"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

export async function GET(req: NextRequest) {
  const rateLimitResponse = rateLimit(getClientIp(req))
  if (rateLimitResponse) return rateLimitResponse

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const data = await fetchESPNScoreboard()
    const games = transformESPNEvents(data.events)
    return NextResponse.json(games)
  } catch {
    return NextResponse.json({ error: "Failed to fetch scores from ESPN" }, { status: 502 })
  }
}
