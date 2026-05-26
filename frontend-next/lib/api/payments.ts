import { apiFetch } from "./index"

export type VerifyTransactionResponse = {
  transaction: Record<string, any>
  gateway_payload: Record<string, any> | null
}

export type ReconcileTransactionResponse = {
  transaction: Record<string, any>
  reconciliation: Record<string, any> | null
}

export async function confirmPayment(id: number) {
  return apiFetch(`/payments/payment/${id}/confirm/`, { method: "POST" })
}

export async function refundPayment(id: number) {
  return apiFetch(`/payments/payment/${id}/refund/`, { method: "POST" })
}

export async function verifyTransaction(id: number, gatewayName?: string) {
  const payload = gatewayName ? { gateway_name: gatewayName } : {}
  return apiFetch<VerifyTransactionResponse>(
    `/payments/transaction/${id}/verify/`,
    { method: "POST", body: JSON.stringify(payload) }
  )
}

export async function reconcileTransaction(id: number, confirmWhenPaid = true, gatewayName?: string) {
  const payload: Record<string, any> = { confirm_when_paid: confirmWhenPaid }
  if (gatewayName) payload.gateway_name = gatewayName
  return apiFetch<ReconcileTransactionResponse>(
    `/payments/transaction/${id}/reconcile/`,
    { method: "POST", body: JSON.stringify(payload) }
  )
}

export async function confirmReconciliation(id: number) {
  return apiFetch(`/payments/reconciliation/${id}/confirm/`, { method: "POST" })
}
