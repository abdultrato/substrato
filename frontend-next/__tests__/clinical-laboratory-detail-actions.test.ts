import { describe, expect, it } from "vitest"

import { hasOpenApiMethod } from "@/lib/openapi/writeContract"
import {
  getAvailableDetailActions,
  getDeclaredDetailActions,
} from "@/lib/resources/detailActions"

// Exposição das @actions de workflow do LIS (Laboratório Clínico) ao frontend.
// Cada ação declarada deve resolver um contrato POST real no schema OpenAPI,
// caso contrário o botão não apareceria (gating por hasOpenApiMethod).

const EXPECTED: Record<string, string[]> = {
  "/clinical_laboratory/sector/": ["ativar", "inativar"],
  "/clinical_laboratory/test/": ["ativar", "inativar"],
  "/clinical_laboratory/panel/": ["ativar", "inativar"],
  "/clinical_laboratory/order/": ["autorizar", "cancelar"],
  "/clinical_laboratory/sample/": ["receber", "aceitar", "rejeitar"],
  "/clinical_laboratory/result/": ["inserir-resultado", "validar"],
  "/clinical_laboratory/validation/": ["aprovar"],
  "/clinical_laboratory/report/": ["assinar", "entregar"],
  "/clinical_laboratory/quality_document/": ["aprovar"],
  "/clinical_laboratory/nonconformity/": ["encerrar"],
  "/clinical_laboratory/corrective_action/": ["concluir", "verificar", "fechar"],
}

describe("clinical laboratory detail actions", () => {
  it("declares every LIS workflow action behind a real OpenAPI POST contract", () => {
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

  it("keeps every declared action available (no orphan registry entries)", () => {
    for (const endpoint of Object.keys(EXPECTED)) {
      expect(getDeclaredDetailActions(endpoint).length, endpoint).toBe(getAvailableDetailActions(endpoint).length)
    }
  })

  it("requires a result value before entering a lab result", () => {
    const enterResult = getAvailableDetailActions("/clinical_laboratory/result/").find(
      (definition) => definition.action === "inserir-resultado"
    )
    expect(enterResult?.fields?.[0]).toMatchObject({ name: "value", required: true })
  })
})
