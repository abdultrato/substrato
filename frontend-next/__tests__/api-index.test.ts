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

  it("reescreve aliases de entidades para external_entities/empresa", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await apiFetch("/entities/")

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/external_entities/empresa/")
  })

  it("reescreve alias companies para external_entities/empresa", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await apiFetch("/companies/")

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/external_entities/empresa/")
  })

  it("reescreve alias legado de recibos para o endpoint atual", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await apiFetch("/receipts/")

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/payments/receipt/")
  })

  it("preserva o endpoint de auditoria sem reescrever para /auditoria", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await apiFetch("/audit/atividade/relatorio/pdf/?period=daily")

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/audit/atividade/relatorio/pdf/?period=daily")
  })

  it("aceita URL já prefixada com /api/v1 e evita duplicação de prefixo", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await apiFetch("/api/v1/clinical/exam/")

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/clinical/exam/")
  })

  it("normaliza alias gerado de lab-exams para o endpoint canónico exam", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await apiFetch("/clinical/lab-exams/")

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/clinical/exam/")
  })

  it("mantém planos de cobertura no endpoint canónico em inglês", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await apiFetch("/insurer/coverage_plan/")

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/insurer/coverage_plan/")
  })

  it("mantém ações de consultas e recepção em inglês", async () => {
    ;(global.fetch as any)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 7 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )

    await apiFetch("/consultations/42/cancel/", { method: "POST", body: JSON.stringify({}) })
    await apiFetch("/reception/care/7/")

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/consultations/consultation/42/cancel/")
    expect((global.fetch as any).mock.calls[1][0]).toBe("/api/v1/reception/care/7/")
  })

  it("reescreve alias legado de reconciliacao para o endpoint atual", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await apiFetch("/reconciliations/")

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/payments/reconciliation/")
  })

  it("reescreve alias de prontuario registro para medical_records/record", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await apiFetch("/medical-records/registro/")

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/medical_records/record/")
  })

  it("reescreve detalhe de prontuario registro sem quebrar o path do recurso", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 42 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await apiFetch("/medical-records/registro/42/")

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/medical_records/record/42/")
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

  it("serve cache stale e revalida em background sem bloquear a resposta", async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))

      ;(global.fetch as any)
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ results: [{ id: 1 }] }), {
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

      const first = await apiFetch("/patients/", {
        clientCacheTtlMs: 10,
        staleWhileRevalidateMs: 5000,
      })
      expect(first).toEqual({ results: [{ id: 1 }] })
      expect((global.fetch as any).mock.calls.length).toBe(1)

      vi.setSystemTime(new Date("2026-01-01T00:00:01.200Z"))
      const stale = await apiFetch("/patients/", {
        clientCacheTtlMs: 10,
        staleWhileRevalidateMs: 5000,
      })
      expect(stale).toEqual({ results: [{ id: 1 }] })
      expect((global.fetch as any).mock.calls.length).toBe(2)

      await Promise.resolve()
      await Promise.resolve()

      const refreshed = await apiFetch("/patients/", {
        clientCacheTtlMs: 10,
        staleWhileRevalidateMs: 5000,
        staleWhileRevalidate: false,
      })
      expect(refreshed).toEqual({ results: [{ id: 1 }, { id: 2 }] })
    } finally {
      vi.useRealTimers()
    }
  })
})
