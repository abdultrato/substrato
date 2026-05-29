import { createRequire } from "module"
import { readFileSync } from "fs"
import { resolve } from "path"

import { describe, expect, it } from "vitest"

const require = createRequire(import.meta.url)
const createNextConfig = require("../next.config.js")

type RedirectRoute = { source: string; destination: string; permanent: boolean }

describe("retired generated routes", () => {
  async function redirectsBySource(): Promise<Map<string, RedirectRoute>> {
    const config = createNextConfig("phase-production-build")
    const redirects = await config.redirects()
    return new Map(
      redirects.map((route: RedirectRoute) => [
        route.source,
        route,
      ])
    )
  }

  it("does not keep redirects for misspelled public resource routes", async () => {
    const bySource = await redirectsBySource()

    expect(bySource.has("/consultations/holidaies/:path*")).toBe(false)
  })

  it("redirects legacy modules routes to the workspace selector", async () => {
    const bySource = await redirectsBySource()

    expect(bySource.get("/modules")).toMatchObject({
      destination: "/workspaces",
      permanent: false,
    })
    expect(bySource.get("/modules/:path*")).toMatchObject({
      destination: "/workspaces",
      permanent: false,
    })
  })

  it("redirects generated create pages for collection-only AI resources", async () => {
    const bySource = await redirectsBySource()

    const expected: Record<string, string> = {
      "/ai_assistant/ai-investigations/new": "/ai_assistant/ai-investigations/",
      "/ai_assistant/ai-operational-tasks/new": "/ai_assistant/ai-operational-tasks/",
      "/ai_assistant/ai-sessions/new": "/ai_assistant/ai-sessions/",
      "/ai_assistant/ai-sessions/:id/edit": "/ai_assistant/ai-sessions/",
    }

    for (const [source, destination] of Object.entries(expected)) {
      expect(bySource.get(source)).toMatchObject({
        destination,
        permanent: false,
      })
    }
  })

  it("redirects generated pages that have no OpenAPI contract to active module pages", async () => {
    const bySource = await redirectsBySource()

    const expected: Record<string, string> = {
      "/accounting/account-balances/:path*": "/accounting/accounts/",
      "/accounting/ledger-lines/:path*": "/accounting/ledger-entries/",
      "/ai_assistant/ai-knowledge-entries/:path*": "/ai/",
      "/ai_assistant/ai-messages/:path*": "/ai/",
      "/ai_assistant/ai-policy-events/:path*": "/ai/",
      "/ai_assistant/ai-suggested-actions/:path*": "/ai/",
      "/ai_assistant/ai-tool-calls/:path*": "/ai/",
      "/clinical/clinical-events/:path*": "/healthcare/",
      "/clinical/clinical-histories/:path*": "/clinical/patients/",
      "/clinical/clinical-references/:path*": "/healthcare/",
      "/monitoring/transactional-outbox-events/:path*": "/monitoring/errors/",
      "/payments/payment-histories/:path*": "/payments/payments/",
      "/pharmacy/parent-categories/:path*": "/pharmacy/products/",
      "/pharmacy/product-categories/:path*": "/pharmacy/products/",
      "/tenants/tenant-subscriptions/:path*": "/tenants/tenants/",
    }

    for (const [source, destination] of Object.entries(expected)) {
      expect(bySource.get(source)).toMatchObject({
        destination,
        permanent: false,
      })
    }
  })

  it("does not redirect retired module routes back to /resources", async () => {
    const bySource = await redirectsBySource()
    const offenders = Array.from(bySource.values())
      .filter((route) => route.destination === "/resources" || route.destination.startsWith("/resources/"))
      .map((route) => `${route.source} -> ${route.destination}`)

    expect(offenders).toEqual([])
  })

  it("does not expose retired route sources in the legacy CRUD menu", async () => {
    const bySource = await redirectsBySource()
    const menu = readFileSync(resolve(process.cwd(), "app/components/CrudModelsMenu.tsx"), "utf-8")
    const hits = Array.from(bySource.keys())
      .map((source) => source.replace("/:path*", ""))
      .filter((source) => menu.includes(`href: "${source}`))

    expect(hits).toEqual([])
  })

  it("does not link the main sidebar to legacy modules routes", () => {
    const sidebar = readFileSync(resolve(process.cwd(), "components/layout/Sidebar.tsx"), "utf-8")

    expect(sidebar).not.toContain('href: "/modules')
  })
})
