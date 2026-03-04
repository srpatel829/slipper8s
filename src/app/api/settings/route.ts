import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/settings — Public endpoint for client components
 * Returns non-sensitive app settings (deadline, charities)
 */
export async function GET() {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "main" },
    select: {
      picksDeadline: true,
      defaultCharities: true,
    },
  })

  return NextResponse.json({
    picksDeadline: settings?.picksDeadline?.toISOString() ?? null,
    defaultCharities: settings?.defaultCharities ?? [],
  })
}
