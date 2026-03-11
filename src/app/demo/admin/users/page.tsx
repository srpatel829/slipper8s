"use client"

/**
 * Demo Admin Users — reuses real UserTable with demo user data.
 */

import { UserTable } from "@/components/admin/user-table"
import { useDemoContext } from "@/lib/demo-context"

export default function DemoAdminUsersPage() {
  const { demoUsers, updateDemoUser, currentPersona } = useDemoContext()

  // Build shape UserTable expects
  const tableUsers = demoUsers.map(u => ({
    id: u.id,
    name: u.name,
    firstName: null as string | null,
    lastName: null as string | null,
    email: u.email,
    role: (u.role ?? "USER") as "USER" | "ADMIN" | "SUPERADMIN",
    country: null as string | null,
    state: null as string | null,
    gender: null as string | null,
    dateOfBirth: null as Date | null,
    phone: null as string | null,
    favoriteTeamName: null as string | null,
    _count: { picks: u.picks.length },
    createdAt: new Date(),
  }))

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Manage Users</h2>
      <UserTable
        users={tableUsers}
        currentUserRole={currentPersona.role}
        demoMode
        onDemoPatch={(userId, patch) => updateDemoUser(userId, patch)}
      />
    </div>
  )
}
