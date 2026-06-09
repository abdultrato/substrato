import { describe, expect, it } from "vitest"

import { hasOpenApiMethod } from "@/lib/openapi/writeContract"
import { getAvailableDetailActions } from "@/lib/resources/detailActions"

// Exposição das @actions de Consultas. As páginas usavam endpoints obsoletos
// (medical-consultations / consultation-specialties) que já não existem no
// schema; foram realinhadas aos canónicos (consultation / specialty), que são
// os que carregam as @actions.
const EXPECTED: Record<string, string[]> = {
  "/consultations/consultation/": ["complete", "reschedule", "create-invoice", "cancel"],
  "/consultations/specialty/": ["ativar", "inativar"],
}

describe("consultations detail actions", () => {
  it("declares every consultation action behind a real OpenAPI POST contract", () => {
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

  it("requires a new datetime to reschedule", () => {
    const reschedule = getAvailableDetailActions("/consultations/consultation/").find(
      (definition) => definition.action === "reschedule"
    )
    expect(reschedule?.fields?.[0]).toMatchObject({ name: "scheduled_for", type: "datetime-local", required: true })
  })
})
