import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { apiFetch, apiFetchList, extractListMeta, extractResults, extractTotalCount } from "@/lib/api"
import { logout } from "@/lib/session"

vi.mock("@/lib/session", () => ({
  logout: vi.fn(),
}))

describe("API facade contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("reescreve aliases amigaveis para os endpoints canonicamente usados pelo frontend", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    await apiFetch("/faturas/")

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/faturamento/fatura/")
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

    const response = await apiFetch("/pacientes/1/")

    expect(response).toEqual({ id: 1, nome: "Paciente" })
    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/clinico/paciente/1/")
    expect((global.fetch as any).mock.calls[1][0]).toBe("/api/v1/auth/refresh/")
    expect((global.fetch as any).mock.calls[2][0]).toBe("/api/v1/clinico/paciente/1/")
    expect(logout).not.toHaveBeenCalled()
  })

  it("converte erros de validacao DRF em mensagens legiveis", async () => {
    ;(global.fetch as any).mockResolvedValueOnce(
      new Response(JSON.stringify({ nome: ["Campo obrigatorio."] }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    )

    await expect(apiFetch("/pacientes/", { method: "POST" })).rejects.toThrow("nome: Campo obrigatorio.")
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
          next: "/api/v1/clinico/exame/?page=3",
          previous: "/api/v1/clinico/exame/?page=1",
        },
      },
    }

    expect(extractResults(payload)).toEqual([{ id: 1 }, { id: 2 }])
    expect(extractListMeta(payload)).toEqual({
      total: 7,
      page: 2,
      perPage: 2,
      totalPages: 4,
      next: "/api/v1/clinico/exame/?page=3",
      previous: "/api/v1/clinico/exame/?page=1",
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

    const response = await apiFetchList("/pagamentos/pagamento/", {
      page: 3,
      pageSize: 50,
    })

    expect((global.fetch as any).mock.calls[0][0]).toBe("/api/v1/pagamentos/pagamento/?page=3&page_size=50")
    expect(response.items).toEqual([{ id: 9 }])
    expect(response.meta.total).toBe(1)
    expect(response.meta.totalPages).toBe(1)
  })
})
