/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backend =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "http://127.0.0.1:8000"

    return [
      // API proxy (Django)
      { source: "/api/:path*", destination: `${backend}/api/:path*` },

      // Admin + static/media proxy (useful for links in the UI)
      { source: "/admin/:path*", destination: `${backend}/admin/:path*` },
      { source: "/static/:path*", destination: `${backend}/static/:path*` },
      { source: "/media/:path*", destination: `${backend}/media/:path*` },
    ]
  },
}

module.exports = nextConfig

