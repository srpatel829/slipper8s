import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { SessionProvider } from "@/components/layout/session-provider"
import { FeedbackButton } from "@/components/layout/feedback-button"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export const metadata: Metadata = {
  title: {
    default: "Slipper8s — College Basketball Tournament Pool",
    template: "%s | Slipper8s",
  },
  description: "Pick 8 teams, score seed x wins. Where sleeper picks become glass slippers.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://www.slipper8s.com"),
  openGraph: {
    type: "website",
    siteName: "Slipper8s",
    title: "Slipper8s — College Basketball Tournament Pool",
    description: "Pick 8 teams, score seed x wins. Where sleeper picks become glass slippers.",
    locale: "en_US",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Slipper8s — College Basketball Tournament Pool" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Slipper8s — College Basketball Tournament Pool",
    description: "Pick 8 teams, score seed x wins. Where sleeper picks become glass slippers.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <SessionProvider>
          <ThemeProvider>
            {children}
            <FeedbackButton />
            <Toaster richColors position="bottom-right" />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
