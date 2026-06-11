import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createRequire } from "node:module"
import { describe, expect, it } from "vitest"

import { DENTAL_RESOURCE_ROUTES } from "@/app/dental/resourceRegistry"
import { MODULES } from "@/lib/modules"

const require = createRequire(import.meta.url)
const createNextConfig = require("../next.config.js")

const reportDentalEndpoints = [
  "/dental/approval/",
  "/dental/audit_event/",
  "/dental/billing_item/",
  "/dental/clinical_evolution/",
  "/dental/consultation/",
  "/dental/diagnosis/",
  "/dental/document/",
  "/dental/followup/",
  "/dental/imaging_order/",
  "/dental/material_consumption/",
  "/dental/odontogram_chart/",
  "/dental/patient_plan_summary/",
  "/dental/payment/",
  "/dental/prescription/",
  "/dental/procedure_execution/",
  "/dental/quotation/",
  "/dental/treatment_phase/",
] as const

const publicHealthRoutes = [
  { segment: "vaccines", key: "vaccine", endpoint: "/public_health/vaccine/" },
  { segment: "lots", key: "lot", endpoint: "/public_health/lot/" },
  { segment: "campaigns", key: "campaign", endpoint: "/public_health/campaign/" },
  { segment: "targets", key: "target", endpoint: "/public_health/target/" },
  { segment: "immunizations", key: "immunization", endpoint: "/public_health/immunization/" },
  { segment: "adverse-events", key: "adverse_event", endpoint: "/public_health/adverse_event/" },
  { segment: "notifications", key: "notification", endpoint: "/public_health/notification/" },
] as const

const warehouseRoutes = [
  { segment: "cycle-counts", endpoint: "/warehouse/cycle_count/" },
  { segment: "cycle-count-lines", endpoint: "/warehouse/cycle_count_line/" },
  { segment: "goods-receipt-lines", endpoint: "/warehouse/goods_receipt_line/" },
  { segment: "items", endpoint: "/warehouse/item/" },
  { segment: "item-categories", endpoint: "/warehouse/item_category/" },
  { segment: "lots", endpoint: "/warehouse/lot/" },
  { segment: "pick-list-lines", endpoint: "/warehouse/pick_list_line/" },
  { segment: "purchase-order-lines", endpoint: "/warehouse/purchase_order_line/" },
  { segment: "replenishment-suggestions", endpoint: "/warehouse/replenishment_suggestion/" },
  { segment: "sales-order-lines", endpoint: "/warehouse/sales_order_line/" },
  { segment: "shipment-lines", endpoint: "/warehouse/shipment_line/" },
  { segment: "stock-movements", endpoint: "/warehouse/stock_movement/" },
  { segment: "stock-transfer-lines", endpoint: "/warehouse/stock_transfer_line/" },
  { segment: "storage-locations", endpoint: "/warehouse/storage_location/" },
  { segment: "warehouses", endpoint: "/warehouse/warehouse/" },
] as const

const retiredNoBackendRouteRedirects: Record<string, string> = {
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

function filePath(relativePath: string) {
  return resolve(process.cwd(), relativePath)
}

function readRoute(relativePath: string) {
  return readFileSync(filePath(relativePath), "utf-8")
}

function expectRoute(relativePath: string, expectedSource: string) {
  expect(existsSync(filePath(relativePath)), relativePath).toBe(true)
  expect(readRoute(relativePath), relativePath).toContain(expectedSource)
}

describe("frontend coverage report regressions", () => {
  it("keeps every dental gap from FRONTEND_COVERAGE_REPORT exposed through the dynamic registry", () => {
    const dynamicRoutes = [
      ["app/dental/[resourceSlug]/page.tsx", "GeneratedResourceListPage"],
      ["app/dental/[resourceSlug]/new/page.tsx", "GeneratedResourceCreatePage"],
      ["app/dental/[resourceSlug]/[id]/page.tsx", "GeneratedResourceDetailPage"],
      ["app/dental/[resourceSlug]/[id]/edit/page.tsx", "GeneratedResourceEditPage"],
    ] as const
    const registeredEndpoints = new Set(Object.values(DENTAL_RESOURCE_ROUTES))

    for (const endpoint of reportDentalEndpoints) {
      expect(registeredEndpoints.has(endpoint), endpoint).toBe(true)
    }

    for (const [route, component] of dynamicRoutes) {
      expectRoute(route, component)
    }
  })

  it("keeps all public health endpoints exposed, including the aggregate dashboard", () => {
    const catalogEndpoints = new Set(MODULES.flatMap((group) => group.resources.map((resource) => resource.endpoint)))

    for (const resource of publicHealthRoutes) {
      expect(catalogEndpoints.has(resource.endpoint), resource.endpoint).toBe(true)
      expectRoute(`app/public-health/${resource.segment}/page.tsx`, "PublicHealthListPage")
      expect(readRoute(`app/public-health/${resource.segment}/page.tsx`)).toContain(`resourceKey="${resource.key}"`)
      expectRoute(`app/public-health/${resource.segment}/new/page.tsx`, "PublicHealthCreatePage")
      expectRoute(`app/public-health/${resource.segment}/[id]/page.tsx`, "PublicHealthDetailPage")
      expectRoute(`app/public-health/${resource.segment}/[id]/edit/page.tsx`, "PublicHealthEditPage")
    }

    expect(catalogEndpoints.has("/public_health/dashboard/")).toBe(true)
    expectRoute("app/public-health/dashboard/page.tsx", 'endpoint="/public_health/dashboard/"')
  })

  it("keeps the warehouse report gaps covered by full generated CRUD routes", () => {
    for (const resource of warehouseRoutes) {
      expectRoute(`app/warehouse/${resource.segment}/page.tsx`, `endpoint="${resource.endpoint}"`)
      expectRoute(`app/warehouse/${resource.segment}/new/page.tsx`, "GeneratedResourceCreatePage")
      expectRoute(`app/warehouse/${resource.segment}/[id]/page.tsx`, "GeneratedResourceDetailPage")
      expectRoute(`app/warehouse/${resource.segment}/[id]/edit/page.tsx`, "GeneratedResourceEditPage")
    }
  })

  it("keeps generated pages with no backend contract redirected to active frontend surfaces", async () => {
    const config = createNextConfig("phase-production-build")
    const redirects = await config.redirects()
    const bySource = new Map(redirects.map((route: { source: string }) => [route.source, route]))

    for (const [source, destination] of Object.entries(retiredNoBackendRouteRedirects)) {
      expect(bySource.get(source), source).toMatchObject({
        destination,
        permanent: false,
      })
    }
  })
})
