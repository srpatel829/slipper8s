import NextAuth from "next-auth"
import Resend from "next-auth/providers/resend"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { authConfig } from "@/lib/auth.config"
import type { Role } from "@/generated/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "database" },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any) as any,
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.RESEND_FROM_EMAIL ?? "Slipper8s <noreply@example.com>",
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        const dbUser = user as {
          id: string
          role: Role
          isPaid: boolean
          username?: string | null
          firstName?: string | null
          lastName?: string | null
          registrationComplete: boolean
        }
        session.user.id = dbUser.id
        session.user.role = dbUser.role
        session.user.isPaid = dbUser.isPaid
        session.user.username = dbUser.username ?? null
        session.user.firstName = dbUser.firstName ?? null
        session.user.lastName = dbUser.lastName ?? null
        session.user.registrationComplete = dbUser.registrationComplete ?? false
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      // First registered user becomes SUPERADMIN
      const count = await prisma.user.count()
      if (count === 1) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "SUPERADMIN" },
        })
      }
    },
  },
})
