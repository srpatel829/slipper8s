import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { UserTable } from "@/components/admin/user-table"
import { Download } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
  const session = await auth()
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      email: true,
      username: true,
      role: true,
      registrationComplete: true,
      country: true,
      state: true,
      gender: true,
      dateOfBirth: true,
      phone: true,
      favoriteTeamName: true,
      createdAt: true,
      _count: { select: { picks: true, entries: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {users.length} registered users · Manage roles and view registration data
          </p>
        </div>
        <a
          href="/api/admin/export/players"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </div>
      <UserTable users={users} currentUserRole={session!.user.role} />
    </div>
  )
}
