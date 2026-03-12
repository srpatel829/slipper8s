import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * Escape a value for CSV output.
 * Wraps in double quotes if it contains commas, quotes, or newlines.
 * Doubles any embedded double quotes per RFC 4180.
 */
function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * GET /api/admin/export/players
 *
 * Exports all player (user) data as CSV.
 * Admin/SuperAdmin only.
 */
export async function GET() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // ── Query all users ───────────────────────────────────────────────────────
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      email: true,
      country: true,
      state: true,
      gender: true,
      dateOfBirth: true,
      phone: true,
      favoriteTeamName: true,
      favoriteTeam: {
        select: { name: true },
      },
      registrationComplete: true,
      createdAt: true,
    },
    orderBy: [
      { lastName: "asc" },
      { firstName: "asc" },
    ],
  })

  // ── Build CSV ─────────────────────────────────────────────────────────────
  const header = [
    "User ID",
    "First Name",
    "Last Name",
    "Username",
    "Email",
    "Country",
    "State",
    "Gender",
    "Date of Birth",
    "Phone",
    "Favorite Team",
    "Registration Complete",
    "Created At",
  ]

  const rows: string[] = [header.map(csvEscape).join(",")]

  for (const user of users) {
    const rowParts: (string | number | boolean | null)[] = [
      user.id,
      user.firstName,
      user.lastName,
      user.username,
      user.email,
      user.country,
      user.state,
      user.gender,
      user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
      user.phone,
      user.favoriteTeam?.name ?? user.favoriteTeamName ?? null,
      user.registrationComplete,
      user.createdAt.toISOString(),
    ]

    rows.push(rowParts.map(csvEscape).join(","))
  }

  const csv = rows.join("\n")
  const timestamp = new Date().toISOString().slice(0, 10)
  const filename = `slipper8s-players-${timestamp}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
