import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { __clearApiClientCacheForTests } from "@/lib/api"
import {
  confirmPayment,
  confirmReconciliation,
  refundPayment,
  reconcileTransaction,
  verifyTransaction,
} from "@/lib/api/payments"

describe("payments api actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn())
    __clearApiClientCacheForTests()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("chama confirmar pagamento no endpoint canonico em ingles", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 10, estado: "CON" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await confirmPayment(10)

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/payments/payment/10/confirm/")
    expect((global.fetch as any).mock.calls[0][1]).toEqual(
      expect.objectContaining({ method: "POST" })
    )
  })

  it("chama estorno de pagamento no endpoint canonico em ingles", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 12, estado: "EST" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await refundPayment(12)

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/payments/payment/12/refund/")
    expect((global.fetch as any).mock.calls[0][1]).toEqual(
      expect.objectContaining({ method: "POST" })
    )
  })

  it("chama verificacao de transacao no endpoint canonico em ingles", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ transaction: { id: 7 }, gateway_payload: { status: "processing" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await verifyTransaction(7, "stripe")

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/payments/transaction/7/verify/")
    expect((global.fetch as any).mock.calls[0][1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ gateway_name: "stripe" }),
      })
    )
  })

  it("chama reconciliacao de transacao no endpoint canonico em ingles", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ transaction: { id: 8 }, reconciliation: { confirmed: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await reconcileTransaction(8, true)

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/payments/transaction/8/reconcile/")
    expect((global.fetch as any).mock.calls[0][1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ confirm_when_paid: true }),
      })
    )
  })

  it("chama confirmacao de reconciliacao no endpoint canonico em ingles", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 3, confirmado: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await confirmReconciliation(3)

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/payments/reconciliation/3/confirm/")
    expect((global.fetch as any).mock.calls[0][1]).toEqual(
      expect.objectContaining({ method: "POST" })
    )
  })
})
