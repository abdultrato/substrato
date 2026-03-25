const path = require("path")
const { PHASE_DEVELOPMENT_SERVER } = require("next/constants")

/** @type {(phase: string) => import('next').NextConfig} */
module.exports = (phase) => ({
  // Django endpoints (admin/docs/schema) depend on trailing slashes.
  // Without this, Next.js canonicalizes `/foo/` -> `/foo` and Django redirects
  // back to `/foo/`, creating an infinite redirect loop through the proxy.
  trailingSlash: true,

  // Disable the Next.js DevTools indicator ("N" badge) in development.
  devIndicators: false,

  // Keep dev and production build artifacts separate so running `next build`
  // doesn't break an active `next dev` (common when using Docker bind mounts).
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",

  // Pin the tracing root to this app to avoid monorepo lockfile inference warnings.
  outputFileTracingRoot: path.resolve(__dirname),

  async rewrites() {
    const backend =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "http://127.0.0.1:8000"

    return [
      // API proxy (Django)
      // Note: `:path*` does not preserve trailing slashes, so we normalize here
      // to avoid Django <-> Next redirect loops on endpoints that require `/`.
      { source: "/api", destination: `${backend}/api/` },
      { source: "/api/", destination: `${backend}/api/` },
      { source: "/api/:path*", destination: `${backend}/api/:path*/` },

      // Admin + static/media proxy (useful for links in the UI)
      { source: "/admin", destination: `${backend}/admin/` },
      { source: "/admin/", destination: `${backend}/admin/` },
      { source: "/admin/:path*", destination: `${backend}/admin/:path*/` },

      // PDFs (Django views, e.g. /pdf/resultado/<id_custom>/)
      { source: "/pdf", destination: `${backend}/pdf/` },
      { source: "/pdf/", destination: `${backend}/pdf/` },
      { source: "/pdf/:path*", destination: `${backend}/pdf/:path*/` },

      { source: "/static/:path*", destination: `${backend}/static/:path*` },
      { source: "/media/:path*", destination: `${backend}/media/:path*` },
    ]
  },
})
