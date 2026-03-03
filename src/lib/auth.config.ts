import type { NextAuthConfig } from "next-auth"

// Edge-safe auth config — no Prisma imports here.
// Used by middleware.ts which runs on the Edge runtime.
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-request",
    error: "/error",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const pathname = nextUrl.pathname

      const isAdminRoute = pathname.startsWith("/admin")
      const isRegisterRoute = pathname.startsWith("/register")
      const isProtectedRoute =
        pathname.startsWith("/picks") ||
        pathname.startsWith("/leaderboard") ||
        pathname.startsWith("/scores") ||
        pathname.startsWith("/simulator") ||
        pathname.startsWith("/teams") ||
        isAdminRoute

      if (isAdminRoute) {
        const role = (auth?.user as { role?: string } | undefined)?.role
        return role === "ADMIN" || role === "SUPERADMIN"
      }

      // Allow register page for logged-in users who haven't completed registration
      if (isRegisterRoute) {
        return isLoggedIn
      }

      if (isProtectedRoute) {
        return isLoggedIn
      }

      return true
    },
  },
  providers: [],
}
