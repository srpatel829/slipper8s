import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
]

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", ".prisma"],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
  async rewrites() {
    return [
      {
        // Serve the OG image from a non-/api/ path so social-media crawlers
        // (especially Twitter) aren't blocked by robots.txt Disallow: /api/
        source: "/og-image",
        destination: "/api/og",
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  // Suppress source map upload warnings when SENTRY_AUTH_TOKEN is not set
  silent: !process.env.SENTRY_AUTH_TOKEN,

  // Upload source maps for better error stack traces in production
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Hide source maps from clients in production
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
})
