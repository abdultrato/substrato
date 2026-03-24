"use client"

import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type ResultadoItemRow = Record<string, any>

const ESTADOS = [
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

export default function LaboratorioResultadosPage() {
  const [estado, setEstado] = useState<string>("pendente")
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ResultadoItemRow[]>([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)
        const res = await apiFetch<any>(
          `/clinico/resultadoitem/?estado=${encodeURIComponent(estado)}`
        )
        const items = res && (res as any).results ? (res as any).results : res
        if (!mounted) return
        setData(Array.isArray(items) ? items : [])
      } catch (e: any) {
        if (!mounted) return
        setErro(e?.message || "Falha ao carregar resultados.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [estado])

  const columns = useMemo(
    () => [
      { header: "Código", render: (r: ResultadoItemRow) => r.id_custom || r.id || "-" },
      { header: "Resultado", render: (r: ResultadoItemRow) => r.resultado || "-" },
      { header: "Campo", render: (r: ResultadoItemRow) => r.exame_campo || "-" },
      { header: "Valor", render: (r: ResultadoItemRow) => (r.resultado_valor ?? "-") },
      { header: "Crítico", render: (r: ResultadoItemRow) => (r.alerta_critico ? "SIM" : "—") },
      { header: "Validação", render: (r: ResultadoItemRow) => fmtDate(r.data_validacao) },
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
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              >
                {ESTADOS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
          }
        />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <DataTable<ResultadoItemRow>
            columns={columns as any}
            data={data}
            emptyMessage="Nenhum item encontrado."
          />
        )}
      </div>
    </AppLayout>
  )
}

