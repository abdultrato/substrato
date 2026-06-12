"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type Row = Record<string, any>
type ResultItem = Record<string, any>

async function abrirResultadoPdf(requestId: number, customId?: string, patientName?: string) {
  const blob = await apiFetch<Blob>(`/clinical/labrequest/${requestId}/results-pdf/`, { responseType: "blob" })
  const url = URL.createObjectURL(blob)
  const surname = String(patientName || "").trim().split(/\s+/).pop() || "paciente"
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${customId || requestId}_${surname}.pdf`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.open(url, "_blank", "noopener")
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export default function LabWorklistPage() {
  useAuthGuard()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)
  const [itemsByRequest, setItemsByRequest] = useState<Record<number, ResultItem[]>>({})
  const [values, setValues] = useState<Record<number, string>>({})
  const [busyItem, setBusyItem] = useState<number | null>(null)
  const [checked, setChecked] = useState<Record<number, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await apiFetchList<Row>("/clinical/labrequest/?fase=trabalho&type=LAB", {
        page: 1,
        pageSize: 50,
        clientCache: false,
      })
      setRows(items)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar listas de trabalho.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, safeRefreshToken])

  const loadItems = useCallback(async (requestId: number) => {
    const payload = await apiFetch<{ items: ResultItem[] }>(`/clinical/labrequest/${requestId}/result-items/`, {
      clientCache: false,
    })
    const items = payload?.items || []
    setItemsByRequest((prev) => ({ ...prev, [requestId]: items }))
    setValues((prev) => {
      const next = { ...prev }
      for (const item of items) {
        if (next[item.id] === undefined) next[item.id] = item.result_value ?? ""
      }
      return next
    })
  }, [])

  async function toggle(requestId: number) {
    if (openId === requestId) {
      setOpenId(null)
      return
    }
    setOpenId(requestId)
    if (!itemsByRequest[requestId]) {
      try {
        await loadItems(requestId)
      } catch (e: any) {
        setError(e?.message || "Falha ao carregar itens de resultado.")
      }
    }
  }

  async function gravar(requestId: number, item: ResultItem) {
    setBusyItem(item.id)
    setError(null)
    try {
      await apiFetch(`/clinical/resultitem/${item.id}/save-result/`, {
        method: "POST",
        body: JSON.stringify({ result_value: values[item.id] ?? "" }),
      })
      await loadItems(requestId)
    } catch (e: any) {
      setError(e?.message || "Falha ao gravar o resultado.")
    } finally {
      setBusyItem(null)
    }
  }

  async function gravarTodos(requestId: number) {
    const items = (itemsByRequest[requestId] || []).filter(
      (item) =>
        item.status !== "validado" &&
        item.status !== "desconsiderado" &&
        String(values[item.id] ?? "").trim() !== ""
    )
    if (!items.length) {
      setError("Preencha pelo menos um resultado para gravar.")
      return
    }
    setBusyItem(-requestId)
    setError(null)
    try {
      for (const item of items) {
        await apiFetch(`/clinical/resultitem/${item.id}/save-result/`, {
          method: "POST",
          body: JSON.stringify({ result_value: values[item.id] ?? "" }),
        })
      }
      await loadItems(requestId)
    } catch (e: any) {
      setError(e?.message || "Falha ao gravar os resultados.")
      await loadItems(requestId).catch(() => {})
    } finally {
      setBusyItem(null)
    }
  }

  async function validarLote(requestId: number, items: ResultItem[]) {
    if (!items.length) {
      setError("Não há resultados gravados para validar.")
      return
    }
    setBusyItem(-requestId)
    setError(null)
    try {
      for (const item of items) {
        await apiFetch(`/clinical/resultitem/${item.id}/validate-result/`, { method: "POST" })
      }
      setChecked({})
      await loadItems(requestId)
    } catch (e: any) {
      setError(e?.message || "Falha ao validar os resultados.")
      await loadItems(requestId).catch(() => {})
    } finally {
      setBusyItem(null)
    }
  }

  async function desconsiderar(requestId: number, item: ResultItem) {
    const reason = window.prompt(
      `Desconsiderar "${item.exam_field_name}" — indique o motivo (opcional):`
    )
    if (reason === null) return
    setBusyItem(item.id)
    setError(null)
    try {
      await apiFetch(`/clinical/resultitem/${item.id}/disregard-result/`, {
        method: "POST",
        body: JSON.stringify({ reason: reason || "" }),
      })
      await loadItems(requestId)
    } catch (e: any) {
      setError(e?.message || "Falha ao desconsiderar o campo.")
    } finally {
      setBusyItem(null)
    }
  }

  async function validar(requestId: number, item: ResultItem) {
    setBusyItem(item.id)
    setError(null)
    try {
      await apiFetch(`/clinical/resultitem/${item.id}/validate-result/`, { method: "POST" })
      await loadItems(requestId)
    } catch (e: any) {
      setError(e?.message || "Falha ao validar o resultado.")
    } finally {
      setBusyItem(null)
    }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <PageHeader
          title="Listas de trabalho"
          subtitle="Insira, grave e valide os resultados das requisições em processamento."
          actions={
            <Link
              href="/laboratory/pedidos"
              className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
            >
              Pedidos
            </Link>
          }
        />

        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
        ) : null}

        {loading ? (
          <div className="text-sm text-[var(--gray-500)]">Carregando...</div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-6 text-center text-sm text-[var(--gray-500)]">
            Sem requisições em processamento.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const items = itemsByRequest[row.id] || []
              const allValidated = items.length > 0 && items.every((item) => item.status === "validado" || item.status === "desconsiderado")
              return (
                <div key={row.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-sm">
                  <button
                    type="button"
                    onClick={() => toggle(row.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-[var(--gray-50)]"
                  >
                    <div>
                      <div className="font-semibold text-[var(--primary-700)]">{row.custom_id}</div>
                      <div className="text-sm text-[var(--text)]">{row.patient_name}</div>
                    </div>
                    <span className="text-xs text-[var(--gray-500)]">{openId === row.id ? "Fechar" : "Abrir"}</span>
                  </button>

                  {openId === row.id ? (
                    <div className="space-y-2 border-t border-[var(--border)] px-4 py-3">
                      {items.length > 0 && !allValidated ? (() => {
                        const porGravar = items.filter(
                          (item) =>
                            item.status !== "validado" &&
                            item.status !== "desconsiderado" &&
                            item.status !== "aguardando_validacao"
                        )
                        const validaveis = items.filter((item) => item.status === "aguardando_validacao")
                        const marcados = validaveis.filter((item) => checked[item.id])
                        const todosMarcados = validaveis.length > 0 && marcados.length === validaveis.length
                        return (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {validaveis.length ? (
                              <label className="mr-auto flex items-center gap-2 text-xs font-medium text-[var(--gray-700)]">
                                <input
                                  type="checkbox"
                                  checked={todosMarcados}
                                  onChange={(e) =>
                                    setChecked((prev) => {
                                      const next = { ...prev }
                                      for (const item of validaveis) next[item.id] = e.target.checked
                                      return next
                                    })
                                  }
                                />
                                Marcar todos ({marcados.length}/{validaveis.length})
                              </label>
                            ) : null}
                            {porGravar.length ? (
                              <button
                                type="button"
                                onClick={() => gravarTodos(row.id)}
                                disabled={busyItem !== null}
                                className="inline-flex h-9 items-center rounded-md border border-[var(--primary-300)] bg-[var(--primary-600)]/10 px-3 text-xs font-semibold text-[var(--primary-700)] transition hover:bg-[var(--primary-600)]/20 disabled:opacity-60"
                              >
                                Gravar todos os resultados
                              </button>
                            ) : null}
                            {validaveis.length ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => validarLote(row.id, validaveis)}
                                  disabled={busyItem !== null}
                                  className="inline-flex h-9 items-center rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                                >
                                  Validar todos
                                </button>
                                <button
                                  type="button"
                                  onClick={() => validarLote(row.id, marcados)}
                                  disabled={busyItem !== null || marcados.length === 0}
                                  className="inline-flex h-9 items-center rounded-md border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                                >
                                  Validar marcados ({marcados.length})
                                </button>
                              </>
                            ) : null}
                          </div>
                        )
                      })() : null}
                      {items.length === 0 ? (
                        <div className="text-sm text-[var(--gray-500)]">Carregando itens...</div>
                      ) : (
                        items.map((item) => {
                          const saved = item.status === "aguardando_validacao"
                          const validated = item.status === "validado"
                          const disregarded = item.status === "desconsiderado"
                          return (
                            <div
                              key={item.id}
                              className="flex flex-col gap-2 rounded-md border border-[var(--border)] bg-[var(--gray-50)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-[var(--text)]">
                                  {item.exam_name} · {item.exam_field_name}
                                  {item.exam_field_unit ? (
                                    <span className="text-[var(--gray-500)]"> ({item.exam_field_unit})</span>
                                  ) : null}
                                </div>
                                {item.exam_field_reference ? (
                                  <div className="text-xs text-[var(--gray-500)]">Referência: {item.exam_field_reference}</div>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <input
                                  type="text"
                                  value={disregarded ? "" : values[item.id] ?? ""}
                                  onChange={(e) => setValues((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                  disabled={validated || disregarded}
                                  placeholder={disregarded ? "—" : "Resultado"}
                                  className="h-9 w-36 rounded-md border border-[var(--border)] bg-[var(--card)] px-2 text-sm disabled:bg-[var(--gray-100)]"
                                />
                                {disregarded ? (
                                  <span
                                    className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700"
                                    title={item.disregard_reason || undefined}
                                  >
                                    Desconsiderado
                                  </span>
                                ) : validated ? (
                                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                                    Validado
                                  </span>
                                ) : saved ? (
                                  <>
                                    <input
                                      type="checkbox"
                                      aria-label="Marcar para validação"
                                      checked={!!checked[item.id]}
                                      onChange={(e) =>
                                        setChecked((prev) => ({ ...prev, [item.id]: e.target.checked }))
                                      }
                                      className="h-4 w-4"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => validar(row.id, item)}
                                      disabled={busyItem === item.id}
                                      className="inline-flex h-9 items-center rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                                    >
                                      Validar
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => gravar(row.id, item)}
                                      disabled={busyItem === item.id}
                                      className="inline-flex h-9 items-center rounded-md bg-[var(--primary-600)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--primary-700)] disabled:opacity-60"
                                    >
                                      Gravar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => desconsiderar(row.id, item)}
                                      disabled={busyItem === item.id}
                                      title="Campo sem valor gravado deixa de contar e não consta no PDF"
                                      className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                                    >
                                      Desconsiderar
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}

                      {allValidated ? (
                        <div className="flex items-center gap-2 pt-1">
                          <Link
                            href="/laboratory/laudos"
                            className="inline-flex h-9 items-center rounded-md border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            Ver em Laudos
                          </Link>
                          <button
                            type="button"
                            onClick={() => abrirResultadoPdf(row.id, row.custom_id, row.patient_name).catch(() => setError("Falha ao gerar o PDF de resultados."))}
                            className="inline-flex h-9 items-center rounded-md bg-sky-600 px-3 text-xs font-semibold text-white transition hover:bg-sky-500"
                          >
                            Gerar resultado PDF
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
