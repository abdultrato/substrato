import { describe, expect, it } from "vitest"

import { hasOpenApiMethod } from "@/lib/openapi/writeContract"
import { getAvailableDetailActions } from "@/lib/resources/detailActions"

// Onda C (2/2): Armazém/WMS migrado do mecanismo antigo (WAREHOUSE_DETAIL_ACTIONS
// inline em /resources) para o registry partilhado. Agora aflora tanto nas
// páginas bespoke (GeneratedResourceDetailPage) como na página genérica
// /resources (Fase 0), sem duplicação.
const EXPECTED: Record<string, string[]> = {
  "/warehouse/sales_order/": ["confirm", "allocate", "create-pick-list", "ship", "cancel"],
  "/warehouse/warehouse/": ["activate", "deactivate"],
  "/warehouse/lot/": ["release", "quarantine", "block", "mark-expired"],
  "/warehouse/goods_receipt/": ["post"],
  "/warehouse/stock_reservation/": ["release"],
  "/warehouse/pick_list/": ["complete"],
  "/warehouse/shipment/": ["ship", "post"],
  "/warehouse/replenishment_plan/": ["generate", "create-purchase-order"],
  "/warehouse/purchase_order/": ["post", "cancel"],
  "/warehouse/stock_transfer/": ["post"],
  "/warehouse/cycle_count/": ["post"],
}

describe("wave C2 warehouse detail actions", () => {
  it("declares every warehouse action behind a real OpenAPI POST contract", () => {
    for (const [endpoint, actions] of Object.entries(EXPECTED)) {
      for (const action of actions) {
        expect(hasOpenApiMethod(`${endpoint}{id}/${action}/`, "post"), `${endpoint}${action}`).toBe(true)
      }
    }
  })

  it("surfaces exactly the expected available actions per resource", () => {
    for (const [endpoint, actions] of Object.entries(EXPECTED)) {
      const available = getAvailableDetailActions(endpoint).map((definition) => definition.action)
      expect(available, endpoint).toEqual(actions)
    }
  })
})
