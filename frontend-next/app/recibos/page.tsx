"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import MoneyValue from "@/components/ui/MoneyValue"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type ReciboRow = Record<string, any>

async function abrirPdfRecibo(reciboId: number) {
  const blob = await apiFetch<Blob>(`/payments/receipt/${reciboId}/pdf/`, {
    responseType: "blob",
  })
  const url = window.URL.createObjectURL(blob)
  window.open(url, "_blank", "noopener,noreferrer")
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
}

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

export default function RecibosPage() {
  const { loading } = useAuthGuard()

  const [recibos, setRecibos] = useState<ReciboRow[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [acaoId, setAcaoId] = useState<number | null>(null)

  const onPdf = useCallback(async (id: number) => {
    try {
      setAcaoId(id)
      await abrirPdfRecibo(id)
    } catch (e: any) {
      setErro(e?.message || "Falha ao gerar PDF do recibo.")
    } finally {
      setAcaoId(null)
    }
  }, [])

  async function carregar() {
    try {
      setCarregando(true)
      setErro(null)
      const res = await apiFetch<any>("/payments/receipt/")
      const items = res && (res as any).results ? (res as any).results : res
      setRecibos(Array.isArray(items) ? items : [])
    } catch (e: any) {
      setErro(e?.message || "Falha ao carregar recibos.")
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const columns = useMemo(
    () => [
      { header: "Número", render: (r: ReciboRow) => r.numero || r.id_custom || r.id || "-" },
      { header: "Paciente", render: (r: ReciboRow) => r.paciente_nome || "-" },
      { header: "Fatura", render: (r: ReciboRow) => r.fatura_codigo || r.fatura || "-" },
      { header: "Valor", render: (r: ReciboRow) => <MoneyValue value={r.valor} /> },
      { header: "Criado em", render: (r: ReciboRow) => fmtDate(r.criado_em) },
      {
        header: "PDF",
        render: (r: ReciboRow) => (
          <button
            type="button"
            onClick={() => onPdf(Number(r.id))}
            disabled={acaoId === r.id}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            PDF
          </button>
        ),
      },
    ],
    [acaoId, onPdf]
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
          title="Recibos"
          subtitle="Consultas e auditoria de pagamentos."
          actions={null}
        />

        {erro && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        )}

        {carregando ? (
          <div className="text-sm text-gray-500">Carregando recibos...</div>
        ) : (
          <DataTable<ReciboRow> columns={columns as any} data={recibos} />
        )}
      </div>
    </AppLayout>
  )
}

