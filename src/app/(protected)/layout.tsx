import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { MobileTabBar } from "@/components/layout/mobile-tab-bar"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.registrationComplete) redirect("/register")

  return (
    <div className="min-h-screen flex flex-col bg-background bg-court">
      <Navbar session={session} />
      <main className="flex-1 container mx-auto px-4 py-6 pb-20 md:pb-6 max-w-5xl">
        {children}
      </main>
      <MobileTabBar />
    </div>
  )
}
