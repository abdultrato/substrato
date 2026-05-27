import { describe, expect, it } from "vitest"

import schema from "@/schema.generated.json"
import {
  EXTERNALLY_EXPOSED_ACTION_ENDPOINTS,
  RESOURCE_ACTIONS,
  getResourceActionsForEndpoint,
  listExposedActionEndpoints,
  normalizeActionEndpoint,
} from "@/lib/resourceActions"

const PRIORITY_ACTION_ENDPOINTS = [
  "/ai/assistant/chat/",
  "/audit/atividade/relatorio/pdf/",
  "/audit/modelo/relatorio/pdf/",
  "/billing/invoice/billing-history/",
  "/billing/invoice/billing-history/pdf/",
  "/clinical/patient/clinical-history/",
  "/consultations/consultation/price/",
  "/consultations/consultation/schedule/",
  "/dashboard/analytics/export/",
  "/education/attendance/roll_call/",
  "/education/discipline_schedule/create_full_plan/",
  "/education/random_test/schedule_for_classroom/",
  "/maintenance/maintenance/pending-requests/",
  "/monitoring/telemetry/command_center/",
  "/pharmacy/inventory_movement/history/pdf/",
  "/pharmacy/lot/available/",
  "/pharmacy/lot/stock/pdf/",
  "/pharmacy/material_requisition/movement-history/pdf/",
  "/pharmacy/material_requisition/requester-context/",
  "/pharmacy/product/consumption/pdf/",
  "/pharmacy/product/least-requested/pdf/",
  "/pharmacy/product/most-requested/pdf/",
  "/pharmacy/product/request-sectors/pdf/",
]

describe("resource action exposure", () => {
  it("accounts for every priority non-CRUD endpoint in the frontend", () => {
    const exposed = listExposedActionEndpoints()
    const missing = PRIORITY_ACTION_ENDPOINTS.filter((endpoint) => !exposed.includes(endpoint))

    expect(missing).toEqual([])
  })

  it("keeps mapped actions reachable from their parent resource page", () => {
    const external = new Set(EXTERNALLY_EXPOSED_ACTION_ENDPOINTS.map(normalizeActionEndpoint))

    const missing = RESOURCE_ACTIONS
      .filter((action) => !external.has(normalizeActionEndpoint(action.endpoint)))
      .filter((action) => {
        const actions = getResourceActionsForEndpoint(action.parentEndpoint)
        return !actions.some((candidate) => candidate.endpoint === action.endpoint)
      })
      .map((action) => action.endpoint)

    expect(missing).toEqual([])
  })

  it("keeps exposed action endpoints aligned with the generated OpenAPI schema", () => {
    const schemaPaths = new Set(
      Object.keys((schema as any).paths || {}).map((path) => normalizeActionEndpoint(path))
    )

    const missingFromSchema = PRIORITY_ACTION_ENDPOINTS.filter((endpoint) => !schemaPaths.has(endpoint))

    expect(missingFromSchema).toEqual([])
  })

  it("does not duplicate action keys or endpoint coverage entries", () => {
    const keys = RESOURCE_ACTIONS.map((action) => action.key)
    const exposed = listExposedActionEndpoints()

    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(exposed).size).toBe(exposed.length)
  })
})
