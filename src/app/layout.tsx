import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { SessionProvider } from "@/components/layout/session-provider"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Slipper8s — College Basketball Tournament Pool",
    template: "%s | Slipper8s",
  },
  description: "Pick 8 teams, score seed x wins. Where sleeper picks become glass slippers.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://slipper8s.com"),
  openGraph: {
    type: "website",
    siteName: "Slipper8s",
    title: "Slipper8s — College Basketball Tournament Pool",
    description: "Pick 8 teams, score seed x wins. Where sleeper picks become glass slippers.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Slipper8s — College Basketball Tournament Pool",
    description: "Pick 8 teams, score seed x wins. Where sleeper picks become glass slippers.",
  },
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <SessionProvider>
          <ThemeProvider>
            {children}
            <Toaster richColors position="bottom-right" />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
