import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ProfileForm } from "@/components/profile/profile-form"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const [user, teams] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        country: true,
        state: true,
        gender: true,
        favoriteTeamId: true,
        notificationsEnabled: true,
        dateOfBirth: true,
        phone: true,
        role: true,
        isPaid: true,
        createdAt: true,
        favoriteTeam: { select: { id: true, name: true, seed: true, conference: true } },
      },
    }),
    prisma.team.findMany({
      where: { isPlayIn: false },
      select: { id: true, name: true, seed: true, conference: true },
      orderBy: [{ name: "asc" }],
    }),
  ])

  if (!user) redirect("/login")

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Profile & Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account and preferences
        </p>
      </div>
      <ProfileForm user={user} teams={teams} />
    </div>
  )
}
