import { describe, expect, it } from "vitest"

import { hasOpenApiMethod } from "@/lib/openapi/writeContract"
import { getAvailableDetailActions } from "@/lib/resources/detailActions"

// Onda A (restante): radiologia, diagnósticos especializados, anatomia
// patológica, enfermagem e cirurgia (pedido cirúrgico).
// Ações de payload complexo (FK/array) ficam deferidas para formulário
// dedicado e NÃO constam aqui: atribuir-radiologista, atribuir-especialista,
// registar-medicoes, ward_admission/transferir, surgery/create-invoice.
const EXPECTED: Record<string, string[]> = {
  "/radiology/equipment/": ["marcar-disponivel", "marcar-manutencao"],
  "/radiology/study/": ["agendar", "iniciar", "marcar-adquirido", "cancelar"],
  "/radiology/report/": ["assinar", "liberar", "comunicar-critico", "retificar"],
  "/radiology/pacs_event/": ["reprocessar"],
  "/specialty_diagnostics/equipment/": ["marcar-disponivel", "marcar-manutencao"],
  "/specialty_diagnostics/order/": ["agendar", "iniciar", "finalizar-execucao", "cancelar"],
  "/specialty_diagnostics/report/": ["assinar", "liberar", "comunicar-critico", "retificar"],
  "/specialty_diagnostics/integration_event/": ["reprocessar"],
  "/pathology/pedidos/": ["cancelar", "rejeitar"],
  "/pathology/recepcao_amostras/": ["aceitar", "rejeitar", "acessionar"],
  "/pathology/macroscopia/": ["finalizar"],
  "/pathology/processamento/": ["iniciar", "concluir", "falhar"],
  "/pathology/inclusao/": ["incluir"],
  "/pathology/microtomia/": ["cortar", "produzir-lamina"],
  "/pathology/histologia/": ["pronta", "perdida"],
  "/pathology/coloracoes/": ["concluir", "repetir"],
  "/pathology/diagnosticos/": ["finalizar"],
  "/pathology/laudos/": ["assinar", "liberar", "retificar"],
  "/pathology/faturacao/": ["faturar"],
  "/pathology/arquivamento/": ["emprestar", "devolver"],
  "/nursing/procedure_item/": ["execute", "complete", "mark-not-completed", "mark-billed"],
  "/nursing/ward/": ["ativar", "inativar"],
  "/nursing/ward_admission/": ["alta", "registrar-obito"],
  "/nursing/ward_bed/": ["marcar-disponivel", "bloquear"],
  "/surgery/pedido_cirurgico/": ["submeter", "aprovar", "rejeitar", "cancelar"],
}

describe("wave A detail actions (radiology, specialty diagnostics, pathology, nursing, surgery)", () => {
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
