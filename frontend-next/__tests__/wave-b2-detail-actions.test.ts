import { describe, expect, it } from "vitest"

import { hasOpenApiMethod } from "@/lib/openapi/writeContract"
import { getAvailableDetailActions } from "@/lib/resources/detailActions"

// Onda B (2/2): medicina dentária, terapias, saúde pública.
// Deferidas (FK/array): dental registar-odontograma; therapy vincular.
// public_health: painel inserido em PublicHealthDetailPage; therapy aflora
// via a página genérica /resources (painel ligado em Fase 0).
const EXPECTED: Record<string, string[]> = {
  "/dental/appointment/": ["confirmar", "iniciar-atendimento", "finalizar", "faltou", "cancelar"],
  "/dental/consultation/": ["finalizar"],
  "/dental/procedure_execution/": ["estornar"],
  "/dental/quotation/": ["aprovar", "rejeitar"],
  "/dental/treatment_item/": ["executar"],
  "/dental/treatment_plan/": ["apresentar", "gerar-orcamento", "concluir", "cancelar"],
  "/therapy/resource/": ["ativar", "inativar", "marcar-manutencao"],
  "/therapy/evaluation/": ["finalizar", "cancelar"],
  "/therapy/treatment_plan/": ["aprovar", "agendar-sessao", "suspender", "retomar", "alta", "cancelar"],
  "/therapy/goal/": ["atualizar-progresso", "marcar-alcancado", "suspender"],
  "/therapy/session/": ["iniciar", "finalizar", "faltou", "cancelar"],
  "/therapy/prescription_link/": ["encerrar"],
  "/public_health/vaccine/": ["ativar", "inativar"],
  "/public_health/lot/": ["ativar", "liberar", "bloquear", "recolher"],
  "/public_health/campaign/": ["ativar", "suspender", "encerrar", "cancelar"],
  "/public_health/immunization/": ["cancelar"],
  "/public_health/adverse_event/": ["classificar", "gerar-notificacao", "encerrar", "descartar"],
  "/public_health/notification/": ["enviar", "responder", "reprocessar"],
}

describe("wave B2 detail actions (dental, therapy, public health)", () => {
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
