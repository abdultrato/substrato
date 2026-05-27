import { createRequire } from "module"

import { describe, expect, it } from "vitest"

const require = createRequire(import.meta.url)
const createNextConfig = require("../next.config.js")

describe("retired generated routes", () => {
  it("redirects generated pages that have no OpenAPI contract to active resource hubs", async () => {
    const config = createNextConfig("phase-production-build")
    const redirects = await config.redirects()
    const bySource = new Map(
      redirects.map((route: { source: string; destination: string; permanent: boolean }) => [
        route.source,
        route,
      ])
    )

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
})
