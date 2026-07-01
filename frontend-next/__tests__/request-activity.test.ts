import { describe, expect, it } from "vitest"

import {
  abortActiveRequests,
  beginRequestActivity,
  finishRequestActivity,
  registerRequestAbortHandler,
  subscribeRequestActivity,
} from "@/lib/requestActivity"

describe("request activity feedback", () => {
  it("gera mensagem inteligente para faturas", () => {
    const event = beginRequestActivity("/billing/invoice/", "GET")
    expect(event.title).toBe("A carregar faturas")
    expect(event.detail).toContain("totais")
    finishRequestActivity(event)
  })

  it("gera mensagem inteligente para materiais em processamento", () => {
    const event = beginRequestActivity("/pharmacy/material_requisition/", "POST")
    expect(event.title).toBe("A processar requisições de materiais")
    expect(event.detail).toContain("disponibilidade")
    finishRequestActivity(event)
  })

  it("publica eventos start e finish com o mesmo id", () => {
    const phases: string[] = []
    const ids: string[] = []
    const unsubscribe = subscribeRequestActivity((event) => {
      phases.push(event.phase)
      ids.push(event.id)
    })

    const started = beginRequestActivity("/clinical/patient/", "PATCH")
    finishRequestActivity(started)
    unsubscribe()

    expect(phases).toEqual(["start", "finish"])
    expect(ids[0]).toBe(ids[1])
  })

  it("aborta todas as requisições ativas registadas", () => {
    const first = beginRequestActivity("/billing/invoice/", "POST")
    const second = beginRequestActivity("/payments/payment/", "POST")
    let aborted = 0
    registerRequestAbortHandler(first.id, () => aborted += 1)
    registerRequestAbortHandler(second.id, () => aborted += 1)

    expect(abortActiveRequests()).toBe(2)
    expect(aborted).toBe(2)
    expect(abortActiveRequests()).toBe(0)

    finishRequestActivity(first)
    finishRequestActivity(second)
  })
})
