"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { apiFetch } from "@/lib/api"

type FaturaRow = Record<string, any>

function money(v: any): string {
  if (v === null || v === undefined || v === "") return "-"
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function FaturasPage() {
  const { loading } = useAuthGuard()
  const [faturas, setFaturas] = useState<FaturaRow[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [acaoId, setAcaoId] = useState<number | null>(null)

  async function carregar() {
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
  }

  useEffect(() => {
    carregar()
  }, [])

  async function emitir(id: number) {
    try {
      setAcaoId(id)
      await apiFetch(`/faturas/${id}/emitir/`, { method: "POST" })
      await carregar()
    } catch (e: any) {
      setErro(e?.message || "Falha ao emitir fatura.")
    } finally {
      setAcaoId(null)
    }
  }

  async function anular(id: number) {
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
  }

  async function baixarPdf(id: number) {
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
  }

  const columns = useMemo(
    () => [
      { header: "Código", render: (f: FaturaRow) => f.id_custom || f.id },
      { header: "Origem", render: (f: FaturaRow) => f.origem || "-" },
      { header: "Estado", render: (f: FaturaRow) => f.estado || "-" },
      { header: "Total", render: (f: FaturaRow) => `${money(f.total)} MZN` },
      {
        header: "Ações",
        render: (f: FaturaRow) => (
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              disabled={acaoId === f.id}
              onClick={() => emitir(f.id)}
            >
              Emitir
            </button>
            <button
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              disabled={acaoId === f.id}
              onClick={() => baixarPdf(f.id)}
            >
              PDF
            </button>
            <button
              className="inline-flex items-center rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              disabled={acaoId === f.id}
              onClick={() => anular(f.id)}
            >
              Anular
            </button>
          </div>
        ),
      },
    ],
    [acaoId]
  )

  if (loading) return null

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Faturas"
          subtitle="Emissão, anulação e PDF via API (admin permanece como backoffice completo)."
          actions={
            <Link
              href="/admin/faturamento/fatura/"
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Abrir no admin
            </Link>
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
      </div>
    </AppLayout>
  )
}

