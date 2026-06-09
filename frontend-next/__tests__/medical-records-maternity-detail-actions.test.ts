import { describe, expect, it } from "vitest"

import { hasOpenApiMethod } from "@/lib/openapi/writeContract"
import { getAvailableDetailActions } from "@/lib/resources/detailActions"

// Onda A — módulos pequenos: Prontuário (record) e Maternidade (gestação).
const EXPECTED: Record<string, string[]> = {
  "/medical_records/record/": ["finalizar", "cancelar"],
  "/maternity/gestacao/": ["registar-parto", "encerrar", "cancelar"],
}

describe("medical records & maternity detail actions", () => {
  it("declares every action behind a real OpenAPI POST contract", () => {
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
