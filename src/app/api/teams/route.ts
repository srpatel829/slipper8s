import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

// GET /api/teams — public list of teams for selectors (registration, profile)
export async function GET(req: NextRequest) {
  const rateLimitResponse = rateLimit(getClientIp(req))
  if (rateLimitResponse) return rateLimitResponse

  const teams = await prisma.team.findMany({
    where: { isPlayIn: false },
    select: {
      id: true,
      name: true,
      seed: true,
      conference: true,
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(teams)
}
