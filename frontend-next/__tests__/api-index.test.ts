import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { __clearApiClientCacheForTests, apiFetch, apiFetchList, extractListMeta, extractResults, extractTotalCount } from "@/lib/api"
import { subscribeRequestActivity } from "@/lib/requestActivity"
import { logout } from "@/lib/session"

vi.mock("@/lib/session", () => ({
  logout: vi.fn(),
}))

describe("API facade contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn())
    __clearApiClientCacheForTests()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("reescreve aliases amigaveis para os endpoints canonicos em ingles", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await apiFetch("/invoices/")

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/billing/invoice/")
  })

  it("reescreve alias legado de recibos para o endpoint atual", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await apiFetch("/recibos/")

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/payments/receipt/")
  })

  it("reescreve alias legado de seguradora para insurer", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await apiFetch("/seguradora/planocobertura/")

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/insurer/planocobertura/")
  })

  it("reescreve alias legado de reconciliacao para o endpoint atual", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await apiFetch("/reconciliacoes/")

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/payments/reconciliation/")
  })

  it("renova a sessao em 401 e repete o request original", async () => {
    ;(global.fetch as any)
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ session_id: "sess-1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1, nome: "Paciente" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )

    const response = await apiFetch("/patients/1/")

    expect(response).toEqual({ id: 1, nome: "Paciente" })
    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/clinical/patient/1/")
    expect((global.fetch as any).mock.calls[1][0]).toBe("/api/v1/auth/refresh/")
    expect((global.fetch as any).mock.calls[2][0]).toBe("/api/v1/clinical/patient/1/")
    expect(logout).not.toHaveBeenCalled()
  })

  it("converte erros de validacao DRF em mensagens legiveis", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ nome: ["Campo obrigatorio."] }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    )

    await expect(apiFetch("/patients/", { method: "POST" })).rejects.toThrow("nome: Campo obrigatorio.")
  })

  it("extrai resultados e metadata de payloads paginados com wrapper data/meta", () => {
    const payload = {
      data: {
        results: [{ id: 1 }, { id: 2 }],
        meta: {
          total: 7,
          page: 2,
          per_page: 2,
          total_pages: 4,
        },
        links: {
          next: "/api/v1/clinical/exam/?page=3",
          previous: "/api/v1/clinical/exam/?page=1",
        },
      },
    }

    expect(extractResults(payload)).toEqual([{ id: 1 }, { id: 2 }])
    expect(extractListMeta(payload)).toEqual({
      total: 7,
      page: 2,
      perPage: 2,
      totalPages: 4,
      next: "/api/v1/clinical/exam/?page=3",
      previous: "/api/v1/clinical/exam/?page=1",
    })
    expect(extractTotalCount(payload)).toBe(7)
  })

  it("monta paginacao na query string quando usa apiFetchList", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ count: 1, page: 3, per_page: 50, results: [{ id: 9 }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    const response = await apiFetchList("/payments/payment/", {
      page: 3,
      pageSize: 50,
    })

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/payments/payment/?page=3&page_size=50")
    expect(response.items).toEqual([{ id: 9 }])
    expect(response.meta.total).toBe(1)
    expect(response.meta.totalPages).toBe(1)
  })

  it("emite eventos de atividade durante a requisicao", async () => {
    const events: string[] = []
    const unsubscribe = subscribeRequestActivity((event) => {
      events.push(event.phase)
    })

    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await apiFetch("/patients/")
    unsubscribe()

    expect(events).toEqual(["start", "finish"])
  })

  it("reutiliza cache client-side em GETs consecutivos", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [{ id: 1 }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    const a = await apiFetch("/patients/")
    const b = await apiFetch("/patients/")

    expect(a).toEqual({ results: [{ id: 1 }] })
    expect(b).toEqual({ results: [{ id: 1 }] })
    expect((global.fetch as any).mock.calls.length).toBe(1)
  })

  it("invalida cache do recurso após mutação", async () => {
    ;(global.fetch as any)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ results: [{ id: 1 }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ results: [{ id: 1 }, { id: 2 }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )

    await apiFetch("/patients/")
    await apiFetch("/patients/1/", { method: "PUT", body: JSON.stringify({ nome: "Novo nome" }) })
    const refreshed = await apiFetch("/patients/")

    expect(refreshed).toEqual({ results: [{ id: 1 }, { id: 2 }] })
    expect((global.fetch as any).mock.calls.length).toBe(3)
  })

  it("deduplica GETs em voo para a mesma rota", async () => {
    let resolver: ((res: Response) => void) | null = null
    const pending = new Promise<Response>((resolve) => {
      resolver = resolve
    })

    ;(global.fetch as any).mockImplementation(() => pending)

    const p1 = apiFetch("/invoices/")
    const p2 = apiFetch("/invoices/")

    resolver?.(
      new Response(JSON.stringify({ results: [{ id: 7 }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    const [r1, r2] = await Promise.all([p1, p2])
    expect(r1).toEqual({ results: [{ id: 7 }] })
    expect(r2).toEqual({ results: [{ id: 7 }] })
    expect((global.fetch as any).mock.calls.length).toBe(1)
  })
})
