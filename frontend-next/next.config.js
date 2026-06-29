const path = require("path")
const { PHASE_DEVELOPMENT_SERVER } = require("next/constants")

function buildCsp(isDevelopment) {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "connect-src 'self' https: http: wss: ws:",
  ]

  if (!isDevelopment) {
    directives.push("upgrade-insecure-requests")
  }

  return directives.join("; ")
}

/** @type {(phase: string) => import('next').NextConfig} */
module.exports = (phase) => {
  const isDevelopment = phase === PHASE_DEVELOPMENT_SERVER
  const csp = buildCsp(isDevelopment)
  const retiredGeneratedRoutes = [
    { source: "/accounting/account-balances/:path*", destination: "/accounting/accounts/" },
    { source: "/accounting/ledger-lines/:path*", destination: "/accounting/movements/" },
    { source: "/accounting/ledger-entries/:path*", destination: "/accounting/entries/" },
    { source: "/accounting/legacy-entries/:path*", destination: "/accounting/entries/" },
    { source: "/accounting/legacy-movements/:path*", destination: "/accounting/movements/" },
    { source: "/accounting/financial-reconciliations/:path*", destination: "/accounting/reconciliations/" },
    { source: "/ai_assistant/ai-knowledge-entries/:path*", destination: "/ai/" },
    { source: "/ai_assistant/ai-messages/:path*", destination: "/ai/" },
    { source: "/ai_assistant/ai-policy-events/:path*", destination: "/ai/" },
    { source: "/ai_assistant/ai-suggested-actions/:path*", destination: "/ai/" },
    { source: "/ai_assistant/ai-tool-calls/:path*", destination: "/ai/" },
    { source: "/clinical/clinical-events/:path*", destination: "/healthcare/" },
    { source: "/clinical/clinical-histories/:path*", destination: "/clinical/patients/" },
    { source: "/clinical/clinical-references/:path*", destination: "/healthcare/" },
    { source: "/monitoring/transactional-outbox-events/:path*", destination: "/monitoring/errors/" },
    { source: "/payments/payment-histories/:path*", destination: "/payments/payments/" },
    { source: "/pharmacy/parent-categories/:path*", destination: "/pharmacy/products/" },
    { source: "/pharmacy/product-categories/:path*", destination: "/pharmacy/products/" },
    { source: "/tenants/tenant-subscriptions/:path*", destination: "/tenants/tenants/" },
  ]
  const legacyRouteAliases = [
    { source: "/modules", destination: "/workspaces" },
    { source: "/modules/:path*", destination: "/workspaces" },
  ]
  const collectionOnlyGeneratedRoutes = [
    { source: "/ai_assistant/ai-investigations/new", destination: "/ai_assistant/ai-investigations/" },
    { source: "/ai_assistant/ai-operational-tasks/new", destination: "/ai_assistant/ai-operational-tasks/" },
    { source: "/ai_assistant/ai-sessions/new", destination: "/ai_assistant/ai-sessions/" },
    { source: "/ai_assistant/ai-sessions/:id/edit", destination: "/ai_assistant/ai-sessions/" },
  ]

  return {
    // Django endpoints (admin/docs/schema) depend on trailing slashes.
    // Without this, Next.js canonicalizes `/foo/` -> `/foo` and Django redirects
    // back to `/foo/`, creating an infinite redirect loop through the proxy.
    trailingSlash: true,

    // Segurança e previsibilidade de runtime.
    reactStrictMode: true,
    poweredByHeader: false,
    output: "standalone",

    // Disable the Next.js DevTools indicator ("N" badge) in development.
    devIndicators: false,

    // The dev server is started on 0.0.0.0, and Next validates the Origin
    // header by hostname only when loading /_next assets from another host.
    ...(isDevelopment
      ? { allowedDevOrigins: ["127.0.0.1", "0.0.0.0"] }
      : {}),

    // Keep dev and production build artifacts separate so running `next build`
    // doesn't break an active `next dev` (common when using Docker bind mounts).
    distDir: isDevelopment ? ".next-dev" : ".next",

    // Pin the tracing root to this app to avoid monorepo lockfile inference warnings.
    outputFileTracingRoot: path.resolve(__dirname),

    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            { key: "Content-Security-Policy", value: csp },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "X-Frame-Options", value: "DENY" },
            { key: "X-DNS-Prefetch-Control", value: "off" },
            { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
            { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          ],
        },
      ]
    },

    async redirects() {
      return [...legacyRouteAliases, ...collectionOnlyGeneratedRoutes, ...retiredGeneratedRoutes].map((route) => ({
        ...route,
        permanent: false,
      }))
    },

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

        // Healthchecks (used by Replit autoscale and external monitors)
        { source: "/health/live", destination: `${backend}/health/live/` },
        { source: "/health/live/", destination: `${backend}/health/live/` },
        { source: "/health/ready", destination: `${backend}/health/ready/` },
        { source: "/health/ready/", destination: `${backend}/health/ready/` },
      ]
    },
  }
}
