import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { UserTable } from "@/components/admin/user-table"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
  const session = await auth()
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      isPaid: true,
      registrationComplete: true,
      createdAt: true,
      _count: { select: { picks: true, entries: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {users.length} registered users · Mark paid status and manage roles
        </p>
      </div>
      <UserTable users={users} currentUserRole={session!.user.role} />
    </div>
  )
}
