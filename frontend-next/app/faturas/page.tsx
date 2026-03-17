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
  const [faturas, setFaturas] = useState<FaturaRow[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [acaoId, setAcaoId] = useState<number | null>(null)
  const [itens, setItens] = useState<FaturaItem[]>([])
  const [itensFaturaId, setItensFaturaId] = useState<number | null>(null)
  const [carregandoItens, setCarregandoItens] = useState(false)

  const podeAlterar = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.RECEPCAO])

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
      const res = await apiFetch<any>(`/faturaitem/?fatura=${faturaId}`)
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

  const toggleIva = useCallback(
    async (item: FaturaItem) => {
      if (!item?.id) return
      try {
        await apiFetch(`/faturaitem/${item.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ aplica_iva: !item.aplica_iva }),
        })
        if (itensFaturaId) await carregarItens(itensFaturaId)
      } catch (e: any) {
        setErro(e?.message || "Falha ao atualizar IVA do item.")
      }
    },
    [carregarItens, itensFaturaId]
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
    [acaoId, anular, baixarPdf, emitir, podeAlterar, carregarItens, carregandoItens, itensFaturaId]
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
            podeVerAdmin ? (
              <Link
                href="/admin/faturamento/fatura/"
                className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Abrir no admin
              </Link>
            ) : null
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
          <DataTable<FaturaRow> columns={columns as any} data={faturas} />
        )}

        {itensFaturaId ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 text-sm font-semibold text-gray-800">Itens da fatura {itensFaturaId}</div>
            {carregandoItens ? (
              <div className="text-sm text-gray-500">Carregando itens...</div>
            ) : itens.length === 0 ? (
              <div className="text-sm text-gray-500">Sem itens.</div>
            ) : (
              <div className="space-y-2">
                {itens.map((it) => (
                  <div key={it.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{it.descricao || `Item ${it.id}`}</div>
                      <div className="text-xs text-gray-500">
                        Qtd: {it.quantidade || 1} · Preço: {it.preco_unitario}
                        {it.total_com_iva ? ` · Total c/ IVA: ${it.total_com_iva}` : ""}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!it.aplica_iva}
                        onChange={() => toggleIva(it)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-2 focus:ring-slate-400"
                      />
                      Aplicar IVA ({it.iva_percentual ?? "-"}%)
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </AppLayout>
  )
}
