import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"

const { auth } = NextAuth(authConfig)

export default auth

export const config = {
  // Auth is handled server-side by (protected)/layout.tsx.
  // The proxy uses an edge-safe config without a database adapter,
  // so it cannot validate database sessions and must not gate routes.
  matcher: [],
}
