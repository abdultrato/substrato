import { describe, expect, it } from "vitest"

import { hasOpenApiMethod } from "@/lib/openapi/writeContract"
import { getAvailableDetailActions } from "@/lib/resources/detailActions"

// Onda B (1/2): telemedicina, veterinária, fisioterapia, farmácia clínica.
// Deferidas (FK/array, exigem formulário dedicado): clinical_pharmacy
// adicionar-ingrediente; physiotherapy registar-uso-aparelho; e as @action
// detail=False de criação (cadastrar/registar/criar/internar/verificar).
const EXPECTED: Record<string, string[]> = {
  "/telemedicine/waiting_room/": ["iniciar-triagem", "marcar-pronto", "iniciar-chamada", "concluir", "faltou", "cancelar"],
  "/telemedicine/device/": ["ativar", "pausar", "marcar-perdido", "retirar"],
  "/telemedicine/async_case/": ["triar", "iniciar-revisao", "pedir-informacao", "concluir", "cancelar"],
  "/telemedicine/program/": ["ativar", "pausar", "registar-revisao", "concluir", "cancelar"],
  "/telemedicine/alert/": ["reconhecer", "escalar", "resolver", "descartar"],
  "/telemedicine/vital_reading/": ["gerar-alerta"],
  "/veterinary/appointment/": ["confirmar", "iniciar-atendimento", "finalizar", "faltou", "cancelar"],
  "/veterinary/vaccination/": ["aplicar", "reacao-adversa", "cancelar"],
  "/veterinary/lab_request/": ["colher-amostra", "processar", "cancelar"],
  "/veterinary/lab_request_item/": ["registrar-resultado"],
  "/veterinary/prescription/": ["emitir", "concluir", "cancelar"],
  "/veterinary/admission/": ["alta", "registrar-evolucao", "transferir", "registrar-obito"],
  "/physiotherapy/device/": ["marcar-disponivel", "marcar-manutencao"],
  "/physiotherapy/assessment/": ["finalizar", "cancelar"],
  "/physiotherapy/treatment_plan/": ["aprovar", "agendar-sessao", "suspender", "retomar", "alta", "concluir", "cancelar"],
  "/physiotherapy/session/": ["iniciar", "finalizar", "faltou", "cancelar"],
  "/clinical_pharmacy/preparation/": ["validar", "preparar", "liberar", "administrar", "cancelar", "descartar"],
  "/clinical_pharmacy/interaction_check/": ["resolver", "aceitar-com-justificativa"],
  "/clinical_pharmacy/controlled_movement/": ["estornar"],
  "/clinical_pharmacy/antibiotic_review/": ["emitir-recomendacao", "implementar"],
}

describe("wave B1 detail actions (telemedicine, veterinary, physiotherapy, clinical pharmacy)", () => {
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
