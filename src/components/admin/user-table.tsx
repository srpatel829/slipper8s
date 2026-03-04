"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Role } from "@/generated/prisma"

interface UserRow {
  id: string
  name: string | null
  email: string
  username?: string | null
  role: Role
  isPaid: boolean
  registrationComplete?: boolean
  createdAt: Date
  _count: { picks: number; entries?: number }
}

interface UserTableProps {
  users: UserRow[]
  currentUserRole: Role
  demoMode?: boolean
  onDemoPatch?: (userId: string, data: { isPaid?: boolean; role?: Role }) => void
}

export function UserTable({ users: initialUsers, currentUserRole, demoMode, onDemoPatch }: UserTableProps) {
  const [users, setUsers] = useState(initialUsers)
  const [updating, setUpdating] = useState<string | null>(null)

  // Sync initialUsers when they change in demo mode
  useEffect(() => {
    if (demoMode) setUsers(initialUsers)
  }, [demoMode, initialUsers])

  async function patch(userId: string, data: { isPaid?: boolean; role?: Role }) {
    if (demoMode && onDemoPatch) {
      onDemoPatch(userId, data)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u))
      toast.success("Updated (demo)")
      return
    }
    setUpdating(userId)
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...data }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Update failed")
        return
      }
      const updated = await res.json()
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)))
      toast.success("Updated")
    } finally {
      setUpdating(null)
    }
  }

  const canChangeRoles = currentUserRole === "SUPERADMIN"

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name / Username</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-center">Entries</TableHead>
            <TableHead className="text-center">Paid</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isSuperAdmin = user.role === "SUPERADMIN"
            const isUpdating = updating === user.id

            return (
              <TableRow key={user.id} className={isUpdating ? "opacity-60" : ""}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{user.name ?? "—"}</p>
                    <div className="flex items-center gap-2">
                      {user.username && (
                        <span className="text-xs text-primary">@{user.username}</span>
                      )}
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {canChangeRoles && !isSuperAdmin ? (
                    <Select
                      value={user.role}
                      onValueChange={(val) => patch(user.id, { role: val as Role })}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">User</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge
                      variant={isSuperAdmin ? "default" : user.role === "ADMIN" ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {user.role}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-xs">
                    {user._count.entries ?? user._count.picks}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={user.isPaid}
                    onCheckedChange={(val) => patch(user.id, { isPaid: val })}
                    disabled={isUpdating}
                  />
                </TableCell>
                <TableCell className="text-center">
                  {user.registrationComplete !== false ? (
                    <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">
                      Complete
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                      Incomplete
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
