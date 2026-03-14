/** @type {import('next').NextConfig} */
const nextConfig = {
  // Django endpoints (admin/docs/schema) depend on trailing slashes.
  // Without this, Next.js canonicalizes `/foo/` -> `/foo` and Django redirects
  // back to `/foo/`, creating an infinite redirect loop through the proxy.
  trailingSlash: true,
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
}

module.exports = nextConfig
