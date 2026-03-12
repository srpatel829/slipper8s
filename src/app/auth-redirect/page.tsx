import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

/**
 * Lightweight server-side route that checks registration status
 * after sign-in and redirects accordingly — avoids the flash of
 * /leaderboard before the (protected) layout redirects to /register.
 */
export default async function AuthRedirectPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.registrationComplete) redirect("/register")
  redirect("/leaderboard")
}
