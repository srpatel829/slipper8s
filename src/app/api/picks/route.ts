import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEntryConfirmationEmail } from "@/lib/email"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const picks = await prisma.pick.findMany({
    where: { userId: session.user.id },
    include: {
      team: true,
      playInSlot: { include: { team1: true, team2: true, winner: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(picks)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Check deadline
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  if (settings?.picksDeadline && new Date() > new Date(settings.picksDeadline)) {
    return NextResponse.json({ error: "Picks deadline has passed" }, { status: 400 })
  }

  // One entry per user
  const existingCount = await prisma.pick.count({ where: { userId: session.user.id } })
  if (existingCount > 0) {
    return NextResponse.json({ error: "Picks already submitted. Use PUT to edit." }, { status: 400 })
  }

  const body = await req.json()
  const { picks, charityPreference } = body

  const validation = validatePicks(picks)
  if (validation) return NextResponse.json({ error: validation }, { status: 400 })

  await prisma.pick.createMany({
    data: picks.map((p: { teamId?: string; playInSlotId?: string }) => ({
      userId: session.user.id,
      teamId: p.teamId ?? null,
      playInSlotId: p.playInSlotId ?? null,
      charityPreference: charityPreference ?? null,
    })),
  })

  // Send entry confirmation email (mandatory — fire and forget)
  sendPickConfirmationEmail(session.user.id).catch((err) =>
    console.error("[picks] Confirmation email failed:", err)
  )

  return NextResponse.json({ success: true })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Check deadline
  const settings = await prisma.appSettings.findUnique({ where: { id: "main" } })
  if (settings?.picksDeadline && new Date() > new Date(settings.picksDeadline)) {
    return NextResponse.json({ error: "Picks deadline has passed" }, { status: 400 })
  }

  const body = await req.json()
  const { picks, charityPreference } = body

  const validation = validatePicks(picks)
  if (validation) return NextResponse.json({ error: validation }, { status: 400 })

  await prisma.$transaction([
    prisma.pick.deleteMany({ where: { userId: session.user.id } }),
    prisma.pick.createMany({
      data: picks.map((p: { teamId?: string; playInSlotId?: string }) => ({
        userId: session.user.id,
        teamId: p.teamId ?? null,
        playInSlotId: p.playInSlotId ?? null,
        charityPreference: charityPreference ?? null,
      })),
    }),
  ])

  // Send entry confirmation email (mandatory — fire and forget)
  sendPickConfirmationEmail(session.user.id).catch((err) =>
    console.error("[picks] Confirmation email failed:", err)
  )

  return NextResponse.json({ success: true })
}

async function sendPickConfirmationEmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, firstName: true },
  })
  if (!user?.email || !user?.firstName) return

  const savedPicks = await prisma.pick.findMany({
    where: { userId },
    include: { team: { select: { name: true, seed: true, region: true } } },
  })

  const pickDetails = savedPicks
    .filter((p) => p.team)
    .map((p) => ({
      name: p.team!.name,
      seed: p.team!.seed,
      region: p.team!.region ?? "",
    }))

  if (pickDetails.length > 0) {
    await sendEntryConfirmationEmail(user.email, user.firstName, pickDetails)
  }
}

function validatePicks(picks: unknown): string | null {
  if (!Array.isArray(picks) || picks.length !== 8) {
    return "Exactly 8 picks required"
  }
  for (const p of picks) {
    if (!p.teamId && !p.playInSlotId) {
      return "Each pick requires teamId or playInSlotId"
    }
    if (p.teamId && p.playInSlotId) {
      return "Each pick can only have one of teamId or playInSlotId"
    }
  }
  return null
}
