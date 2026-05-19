import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { __clearApiClientCacheForTests } from "@/lib/api"
import {
  confirmarPagamento,
  confirmarReconciliacao,
  estornarPagamento,
  reconciliarTransacao,
  verificarTransacao,
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

  it("chama confirmar pagamento no endpoint canonico", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 10, estado: "CON" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await confirmarPagamento(10)

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/payments/payment/10/confirmar/")
    expect((global.fetch as any).mock.calls[0][1]).toEqual(
      expect.objectContaining({ method: "POST" })
    )
  })

  it("chama estorno de pagamento no endpoint canonico", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 12, estado: "EST" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await estornarPagamento(12)

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/payments/payment/12/estornar/")
    expect((global.fetch as any).mock.calls[0][1]).toEqual(
      expect.objectContaining({ method: "POST" })
    )
  })

  it("chama verificacao de transacao no endpoint canonico", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ transaction: { id: 7 }, gateway_payload: { status: "processing" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await verificarTransacao(7, "stripe")

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/payments/transaction/7/verificar/")
    expect((global.fetch as any).mock.calls[0][1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ gateway_name: "stripe" }),
      })
    )
  })

  it("chama reconciliacao de transacao no endpoint canonico", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ transaction: { id: 8 }, reconciliation: { confirmed: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await reconciliarTransacao(8, true)

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/payments/transaction/8/reconciliar/")
    expect((global.fetch as any).mock.calls[0][1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ confirm_when_paid: true }),
      })
    )
  })

  it("chama confirmacao de reconciliacao no endpoint canonico", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 3, confirmado: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await confirmarReconciliacao(3)

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/payments/reconciliation/3/confirmar/")
    expect((global.fetch as any).mock.calls[0][1]).toEqual(
      expect.objectContaining({ method: "POST" })
    )
  })
})

