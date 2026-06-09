import { describe, expect, it } from "vitest"

import { hasOpenApiMethod } from "@/lib/openapi/writeContract"
import { getAvailableDetailActions } from "@/lib/resources/detailActions"

// Onda D (admin/suporte): RH, receção, clínico (core), educação, identidade,
// entidades externas, notificações.
// Aliases EN activate/deactivate omitidos a favor de ativar/desativar PT
// (human_resources/employee, identity/user). Deferidas: reception
// register-payment/link-request/link-invoice (FK/valor); clinical/labrequest
// send-results-notification (já tratado em GeneratedResourceDetailPage).
const EXPECTED: Record<string, string[]> = {
  "/human_resources/employee/": ["ativar", "desativar"],
  "/human_resources/falta/": ["justificar", "aprovar-justificativa", "rejeitar-justificativa"],
  "/human_resources/ferias/": ["approve", "reject"],
  "/human_resources/horaextra/": ["approve", "reject"],
  "/human_resources/licenca/": ["approve", "reject"],
  "/human_resources/folha_run/": ["calculate", "approve", "mark-paid"],
  "/reception/checkin/": ["start-care", "create-request", "create-invoice", "complete", "cancel"],
  "/clinical/labrequest/": ["validate-results", "disregard-empty-results"],
  "/clinical/resultitem/": ["start-analysis", "save-result", "validate-result", "disregard-result"],
  "/education/course/": ["activate", "archive"],
  "/education/enrollment/": ["activate", "complete", "cancel"],
  "/identity/user/": ["ativar", "desativar"],
  "/external_entities/empresa/": ["ativar", "inativar"],
  "/notifications/notification/": ["marcar-enviada", "marcar-falha"],
}

describe("wave D detail actions (admin & support)", () => {
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
