import { apiFetch } from "./index"

export type VerifyTransactionResponse = {
  transaction: Record<string, any>
  gateway_payload: Record<string, any> | null
}

export type ReconcileTransactionResponse = {
  transaction: Record<string, any>
  reconciliation: Record<string, any> | null
}

export async function confirmarPagamento(id: number) {
  return apiFetch(`/payments/payment/${id}/confirmar/`, { method: "POST" })
}

export async function estornarPagamento(id: number) {
  return apiFetch(`/payments/payment/${id}/estornar/`, { method: "POST" })
}

export async function verificarTransacao(id: number, gatewayName?: string) {
  const payload = gatewayName ? { gateway_name: gatewayName } : {}
  return apiFetch<VerifyTransactionResponse>(
    `/payments/transaction/${id}/verificar/`,
    { method: "POST", body: JSON.stringify(payload) }
  )
}

export async function reconciliarTransacao(id: number, confirmWhenPaid = true, gatewayName?: string) {
  const payload: Record<string, any> = { confirm_when_paid: confirmWhenPaid }
  if (gatewayName) payload.gateway_name = gatewayName
  return apiFetch<ReconcileTransactionResponse>(
    `/payments/transaction/${id}/reconciliar/`,
    { method: "POST", body: JSON.stringify(payload) }
  )
}

export async function confirmarReconciliacao(id: number) {
  return apiFetch(`/payments/reconciliation/${id}/confirmar/`, { method: "POST" })
}

