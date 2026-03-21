"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useAuth } from "@/hooks/useAuth"
import { apiFetch } from "@/lib/api"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import MoneyValue from "@/components/ui/MoneyValue"
import Card from "@/components/ui/Card"

type FaturaRow = Record<string, any>
type FaturaItem = {
  id: number
  descricao?: string
  quantidade?: string | number
  preco_unitario?: string | number
  aplica_iva?: boolean
  iva_percentual?: string | number
  total_com_iva?: string | number
}

function money(v: any): string {
  if (v === null || v === undefined || v === "") return "-"
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function FaturasPage() {
  const { loading } = useAuthGuard()
  const { user } = useAuth()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
  const podeCriar = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.RECEPCAO])
  const [faturas, setFaturas] = useState<FaturaRow[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [acaoId, setAcaoId] = useState<number | null>(null)
  const [itens, setItens] = useState<FaturaItem[]>([])
  const [itensFaturaId, setItensFaturaId] = useState<number | null>(null)
  const [carregandoItens, setCarregandoItens] = useState(false)
  const [selectedFatura, setSelectedFatura] = useState<FaturaRow | null>(null)
  const [temPagamentoPendente, setTemPagamentoPendente] = useState(false)

  const podeAlterar = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.RECEPCAO])
  const rascunhos = useMemo(() => faturas.filter((f) => f.estado === "RASC"), [faturas])

  const carregar = useCallback(async () => {
    try {
      setCarregando(true)
      setErro(null)
      const res = await apiFetch<any>("/faturas/")
      const items = res && (res as any).results ? (res as any).results : res
      setFaturas(Array.isArray(items) ? items : [])
    } catch (e: any) {
      setErro(e?.message || "Falha ao carregar faturas.")
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const emitir = useCallback(async (id: number) => {
    if (!podeAlterar) {
      setErro("Sem permissão para emitir fatura.")
      return
    }
    try {
      setAcaoId(id)
      await apiFetch(`/faturas/${id}/emitir/`, { method: "POST" })
      await carregar()
    } catch (e: any) {
      setErro(e?.message || "Falha ao emitir fatura.")
    } finally {
      setAcaoId(null)
    }
  }, [carregar, podeAlterar])

  const anular = useCallback(async (id: number) => {
    if (!podeAlterar) {
      setErro("Sem permissão para anular fatura.")
      return
    }
    if (!confirm("Anular esta fatura?")) return
    try {
      setAcaoId(id)
      await apiFetch(`/faturas/${id}/anular/`, { method: "POST" })
      await carregar()
    } catch (e: any) {
      setErro(e?.message || "Falha ao anular fatura.")
    } finally {
      setAcaoId(null)
    }
  }, [carregar, podeAlterar])

  const baixarPdf = useCallback(async (id: number) => {
    try {
      setAcaoId(id)
      const blob = await apiFetch<Blob>(`/faturas/${id}/pdf/`, {
        method: "GET",
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `fatura_${id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      setErro(e?.message || "Falha ao gerar PDF.")
    } finally {
      setAcaoId(null)
    }
  }, [])

  const carregarItens = useCallback(async (faturaId: number) => {
    setCarregandoItens(true)
    try {
      const res = await apiFetch<any>(`/faturamento/faturaitem/?fatura=${faturaId}`)
      const lista = res && res.results ? res.results : res
      setItens(Array.isArray(lista) ? lista : [])
      setItensFaturaId(faturaId)
    } catch (e: any) {
      setErro(e?.message || "Falha ao carregar itens da fatura.")
      setItens([])
      setItensFaturaId(null)
    } finally {
      setCarregandoItens(false)
    }
  }, [])

  const carregarPagamentosPendentes = useCallback(async (faturaId: number) => {
    try {
      const res = await apiFetch<any>(`/pagamentos/?fatura=${faturaId}&status=PEN`)
      const lista = res && res.results ? res.results : res
      const pendentes = Array.isArray(lista) ? lista : []
      setTemPagamentoPendente(pendentes.length > 0)
    } catch {
      setTemPagamentoPendente(false)
    }
  }, [])

  const detalhar = useCallback(
    (fatura: FaturaRow) => {
      setSelectedFatura(fatura)
      carregarItens(fatura.id)
      carregarPagamentosPendentes(fatura.id)
    },
    [carregarItens, carregarPagamentosPendentes]
  )

  useEffect(() => {
    if (!selectedFatura) return
    const atual = faturas.find((f) => f.id === selectedFatura.id)
    if (atual && atual !== selectedFatura) {
      setSelectedFatura(atual)
    }
  }, [faturas, selectedFatura])

  useEffect(() => {
    if (!selectedFatura) {
      setTemPagamentoPendente(false)
    }
  }, [selectedFatura])

  const confirmarPagamento = useCallback(
    async (id: number) => {
      if (!podeAlterar) {
        setErro("Sem permissão para confirmar pagamentos.")
        return
      }
      try {
        setAcaoId(id)
        await apiFetch(`/faturas/${id}/confirmar_pagamento/`, { method: "POST" })
        await carregar()
        if (selectedFatura?.id === id) {
          const atual = faturas.find((f) => f.id === id)
          if (atual) setSelectedFatura(atual)
        }
        await carregarPagamentosPendentes(id)
      } catch (e: any) {
        setErro(e?.message || "Falha ao confirmar pagamento.")
      } finally {
        setAcaoId(null)
      }
    },
    [carregar, faturas, podeAlterar, selectedFatura, carregarPagamentosPendentes]
  )

  const toggleIva = useCallback(
    async (item: FaturaItem) => {
      if (!item?.id) return
      if (!podeAlterar) {
        setErro("Sem permissão para alterar IVA.")
        return
      }
      try {
        await apiFetch(`/faturamento/faturaitem/${item.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ aplica_iva: !item.aplica_iva }),
        })
        if (itensFaturaId) await carregarItens(itensFaturaId)
      } catch (e: any) {
        setErro(e?.message || "Falha ao atualizar IVA do item.")
      }
    },
    [carregarItens, itensFaturaId, podeAlterar]
  )

  const columns = useMemo(
    () => [
      { header: "Código", render: (f: FaturaRow) => f.id_custom || f.id },
      { header: "Origem", render: (f: FaturaRow) => f.origem || "-" },
      { header: "Estado", render: (f: FaturaRow) => f.estado || "-" },
      { header: "Total", render: (f: FaturaRow) => <MoneyValue value={f.total} /> },
      {
        header: "Ações",
        render: (f: FaturaRow) => (
          <div className="flex flex-wrap gap-2">
            {f.estado === "RASC" ? (
              <Link
                href={`/faturas/rascunho/${f.id}`}
                className="inline-flex items-center rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
              >
                {podeAlterar ? "Editar rascunho" : "Ver rascunho"}
              </Link>
            ) : null}
            <button
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              onClick={() => detalhar(f)}
            >
              Detalhes
            </button>
            {podeAlterar ? (
              <button
                className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                disabled={acaoId === f.id}
                onClick={() => emitir(f.id)}
              >
                Emitir
              </button>
            ) : null}
            <button
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              disabled={acaoId === f.id}
              onClick={() => baixarPdf(f.id)}
            >
              PDF
            </button>
            <button
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              disabled={carregandoItens && itensFaturaId === f.id}
              onClick={() => carregarItens(f.id)}
            >
              Itens/IVA
            </button>
            {podeAlterar ? (
              <button
                className="inline-flex items-center rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                disabled={acaoId === f.id}
                onClick={() => anular(f.id)}
              >
                Anular
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [acaoId, anular, baixarPdf, emitir, podeAlterar, carregarItens, carregandoItens, itensFaturaId, detalhar]
  )

  if (loading) return null

  return (
    <AppLayout
      requiredGroups={[
        GROUPS.ADMIN,
        GROUPS.RECEPCAO,
        GROUPS.CONTABILIDADE,
      ]}
    >
      <div className="space-y-6">
        <PageHeader
          title="Faturas"
          subtitle="Emissão, anulação e PDF via API (admin permanece como backoffice completo)."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {podeCriar ? (
                <Link
                  href="/faturas/nova"
                  className="inline-flex items-center rounded-lg bg-[var(--primary-600)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-700)]"
                >
                  Nova fatura
                </Link>
              ) : null}
              {podeVerAdmin ? (
                <Link
                  href="/admin/faturamento/fatura/"
                  className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Abrir no admin
                </Link>
              ) : null}
            </div>
          }
        />

        {erro && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        )}

        {carregando ? (
          <div className="text-sm text-gray-500">Carregando faturas...</div>
        ) : (
          <div className="space-y-4">
            <Card
              title="Faturas por criar"
              subtitle="Rascunhos aguardando emissão."
            >
              {rascunhos.length === 0 ? (
                <div className="text-sm text-gray-500">Nenhum rascunho encontrado.</div>
              ) : (
                <div className="space-y-2">
                  {rascunhos.map((f) => (
                    <div
                      key={f.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm"
                    >
                      <div className="text-gray-700">
                        <div className="font-semibold">{f.id_custom || `Fatura ${f.id}`}</div>
                        <div className="text-xs text-gray-500">Paciente: {f.paciente || "-"}</div>
                      </div>
                      <Link
                        href={`/faturas/rascunho/${f.id}`}
                        className="inline-flex items-center rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                      >
                        {podeAlterar ? "Editar" : "Ver"}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <DataTable<FaturaRow> columns={columns as any} data={faturas} />
          </div>
        )}

        {selectedFatura ? (
          <Card
            title={`Detalhes da fatura ${selectedFatura.id_custom || selectedFatura.id}`}
            subtitle="Revisão e confirmação de pagamento"
            actions={
              temPagamentoPendente && selectedFatura.estado !== "PAGA" && podeAlterar ? (
                <button
                  className="inline-flex items-center rounded-lg border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                  disabled={acaoId === selectedFatura.id}
                  onClick={() => confirmarPagamento(selectedFatura.id)}
                >
                  Confirmar pagamento
                </button>
              ) : null
            }
          >
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Estado</div>
                <div className="text-foreground">{selectedFatura.estado || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Origem</div>
                <div className="text-foreground">{selectedFatura.origem || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Total</div>
                <div className="text-foreground">
                  <MoneyValue value={selectedFatura.total} />
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Valor paciente</div>
                <div className="text-foreground">
                  <MoneyValue value={selectedFatura.valor_paciente} />
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Valor seguro</div>
                <div className="text-foreground">
                  <MoneyValue value={selectedFatura.valor_seguro} />
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Subtotal</div>
                <div className="text-foreground">
                  <MoneyValue value={selectedFatura.subtotal} />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Itens</h3>
              {carregandoItens && itensFaturaId === selectedFatura.id ? (
                <div className="py-2 text-sm text-gray-500">Carregando itens...</div>
              ) : itensFaturaId === selectedFatura.id && itens.length ? (
                <div className="mt-2 overflow-x-auto rounded-lg border border-border">
                  <table className="min-w-full text-xs text-left">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1">Descrição</th>
                        <th className="px-2 py-1 text-right">Qtd</th>
                        <th className="px-2 py-1 text-right">Preço</th>
                        <th className="px-2 py-1 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-foreground">
                      {itens.map((item) => (
                        <tr key={item.id}>
                          <td className="px-2 py-1 font-semibold">{item.descricao || `Item ${item.id}`}</td>
                          <td className="px-2 py-1 text-right">{item.quantidade || "-"}</td>
                          <td className="px-2 py-1 text-right">{money(item.preco_unitario)}</td>
                          <td className="px-2 py-1 text-right">{money(item.total_com_iva)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-2 text-sm text-gray-500">
                  Clique em “Detalhes” para carregar os itens da fatura.
                </div>
              )}
            </div>
            {!temPagamentoPendente && (
              <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                Nenhum pagamento pendente encontrado para esta fatura.
              </div>
            )}
          </Card>
        ) : null}
      </div>
    </AppLayout>
  )
}
