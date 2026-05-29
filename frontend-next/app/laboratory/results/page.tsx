"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type ResultItemRow = Record<string, any>

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "em_analise", label: "Em análise" },
  { value: "aguardando_validacao", label: "Aguardando validação" },
  { value: "validado", label: "Validado" },
  { value: "rejeitado", label: "Rejeitado" },
]

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

export default function LaboratoryResultsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [status, setStatus] = useState<string>("pendente")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ResultItemRow[]>([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErrorMessage(null)
        const res = await apiFetch<any>(
          `/clinical/resultitem/?status=${encodeURIComponent(status)}`,
          { clientCache: safeRefreshToken === 0 }
        )
        const items = res && (res as any).results ? (res as any).results : res
        if (!mounted) return
        setData(Array.isArray(items) ? items : [])
      } catch (e: any) {
        if (!mounted) return
        setErrorMessage(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar resultados."))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [safeRefreshToken, status])

  const columns = useMemo(
    () => [
      { header: "Código", render: (r: ResultItemRow) => r.custom_id || r.id || "-" },
      { header: "Resultado", render: (r: ResultItemRow) => r.result || "-" },
      { header: "Campo", render: (r: ResultItemRow) => r.exam_field || "-" },
      { header: "Valor", render: (r: ResultItemRow) => (r.result_value ?? "-") },
      { header: "Crítico", render: (r: ResultItemRow) => (r.critical_alert ? "SIM" : "—") },
      { header: "Validação", render: (r: ResultItemRow) => fmtDate(r.validation_date) },
    ],
    []
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="space-y-6">
        <PageHeader
          title="Itens de resultado"
          subtitle="Lista técnica (API) para monitorar pendências e validações."
          actions={
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-700">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              >
                {STATUS_OPTIONS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
          }
        />

        {errorMessage ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <DataTable<ResultItemRow>
            columns={columns as any}
            data={data}
            emptyMessage="Nenhum item encontrado."
          />
        )}
      </div>
    </AppLayout>
  )
}




