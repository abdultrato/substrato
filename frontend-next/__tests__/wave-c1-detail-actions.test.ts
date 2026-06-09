import { describe, expect, it } from "vitest"

import { hasOpenApiMethod } from "@/lib/openapi/writeContract"
import { getAvailableDetailActions } from "@/lib/resources/detailActions"

// Onda C (1/2): faturação, pagamentos, contabilidade, seguradora, manutenção,
// equipamentos, integrações, créditos/financiamento, transportes, farmácia.
// Aliases EN omitidos (payments reconcile/verify → reconciliar/verificar).
// Deferidas: pharmacy fulfill (array), transportation rastrear (telemetria),
// billing send-notification (já tratado em GeneratedResourceDetailPage).
const EXPECTED: Record<string, string[]> = {
  "/billing/invoice/": ["issue", "confirm-payment", "void"],
  "/payments/payment/": ["confirm", "refund", "cancel", "fail"],
  "/payments/reconciliation/": ["confirm", "reopen"],
  "/payments/transaction/": ["verificar", "reconciliar", "unreconcile"],
  "/accounting/entry/": ["confirm", "reopen"],
  "/insurer/procedure_authorization/": ["aprovar", "negar"],
  "/maintenance/maintenance/": ["realizar"],
  "/equipment/equipment/": ["ativar", "inativar"],
  "/equipment/incident/": ["resolver", "reabrir", "perform-maintenance"],
  "/equipment_integrations/equipment/": ["ativar", "inativar"],
  "/equipment_integrations/order/": ["enviar", "cancelar"],
  "/credit_financing/consortium/": ["ativar", "contemplar", "encerrar", "cancelar"],
  "/credit_financing/procedure_financing/": ["analisar", "aprovar", "rejeitar", "cancelar"],
  "/credit_financing/installment/": ["pagar", "aplicar-multa", "perdoar", "estornar"],
  "/credit_financing/reimbursement_claim/": ["aprovar", "rejeitar", "registrar-reembolso"],
  "/credit_financing/student_funding/": ["aprovar", "suspender", "revogar"],
  "/transportation/vehicle/": ["marcar-disponivel", "marcar-avariado", "inativar"],
  "/transportation/driver/": ["ativar", "suspender"],
  "/transportation/route/": ["ativar", "optimize", "cancelar"],
  "/transportation/trip/": ["aprovar", "iniciar", "finalizar", "cancelar"],
  "/transportation/maintenance_order/": ["iniciar", "concluir", "cancelar"],
  "/pharmacy/material_requisition/": ["archive"],
}

describe("wave C1 detail actions (ops & finance)", () => {
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
