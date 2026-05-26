import { describe, expect, it } from "vitest"

import {
  beginRequestActivity,
  finishRequestActivity,
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
})

