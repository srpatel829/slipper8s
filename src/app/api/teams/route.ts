import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/teams — public list of teams for selectors (registration, profile)
export async function GET() {
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
