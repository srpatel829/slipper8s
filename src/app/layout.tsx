import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Script from "next/script"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { SessionProvider } from "@/components/layout/session-provider"
import { FeedbackButton } from "@/components/layout/feedback-button"
import "./globals.css"

const GA_ID = "G-1ZTLMZ5058"
const META_PIXEL_ID = "2896182347247122"

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
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
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
      {/* Google Analytics 4 */}
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
      {/* Meta Pixel */}
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
          document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
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
