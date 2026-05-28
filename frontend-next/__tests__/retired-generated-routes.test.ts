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

  it("redirects misspelled public resource routes to readable active routes", async () => {
    const bySource = await redirectsBySource()

    expect(bySource.get("/consultations/holidaies/:path*")).toMatchObject({
      destination: "/consultations/holidays/:path*",
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

  it("redirects generated pages that have no OpenAPI contract to active resource hubs", async () => {
    const bySource = await redirectsBySource()

    const expected: Record<string, string> = {
      "/accounting/account-balances/:path*": "/resources/accounting/",
      "/accounting/ledger-lines/:path*": "/resources/accounting/",
      "/ai_assistant/ai-knowledge-entries/:path*": "/resources/ai_assistant/",
      "/ai_assistant/ai-messages/:path*": "/resources/ai_assistant/",
      "/ai_assistant/ai-policy-events/:path*": "/resources/ai_assistant/",
      "/ai_assistant/ai-suggested-actions/:path*": "/resources/ai_assistant/",
      "/ai_assistant/ai-tool-calls/:path*": "/resources/ai_assistant/",
      "/clinical/clinical-events/:path*": "/resources/clinical/",
      "/clinical/clinical-histories/:path*": "/resources/clinical/",
      "/clinical/clinical-references/:path*": "/resources/clinical/",
      "/monitoring/transactional-outbox-events/:path*": "/resources/monitoring/",
      "/payments/payment-histories/:path*": "/resources/payments/",
      "/pharmacy/parent-categories/:path*": "/resources/pharmacy/",
      "/pharmacy/product-categories/:path*": "/resources/pharmacy/",
      "/tenants/tenant-subscriptions/:path*": "/resources/tenants/",
    }

    for (const [source, destination] of Object.entries(expected)) {
      expect(bySource.get(source)).toMatchObject({
        destination,
        permanent: false,
      })
    }
  })

  it("does not expose retired route sources in the legacy CRUD menu", async () => {
    const bySource = await redirectsBySource()
    const menu = readFileSync(resolve(process.cwd(), "app/components/CrudModelsMenu.tsx"), "utf-8")
    const hits = Array.from(bySource.keys())
      .map((source) => source.replace("/:path*", ""))
      .filter((source) => menu.includes(`href: "${source}`))

    expect(hits).toEqual([])
  })
})
