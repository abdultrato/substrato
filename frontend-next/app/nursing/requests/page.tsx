"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type RequisicaoRow = Record<string, any>

const ESTADOS = [
  { value: "pendente", label: "Pendente" },
  { value: "em_analise", label: "Em análise" },
  { value: "aguardando_validacao", label: "Aguardando validação" },
  { value: "validado", label: "Validado" },
  { value: "rejeitado", label: "Rejeitado" },
]

export default function EnfermagemRequisicoesPage() {
  const [estado, setEstado] = useState<string>("pendente")
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<RequisicaoRow[]>([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)
        const res = await apiFetch<any>(
          `/requests/?tipo=LAB&estado=${encodeURIComponent(estado)}`
        )
        const items = res && (res as any).results ? (res as any).results : res
        if (!mounted) return
        setData(Array.isArray(items) ? items : [])
      } catch (e: any) {
        if (!mounted) return
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar requisições."))
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
      { header: "Código", render: (r: RequisicaoRow) => r.id_custom || r.id || "-" },
      { header: "Paciente", render: (r: RequisicaoRow) => r.paciente_nome || r.paciente || "-" },
      { header: "Prioridade", render: (r: RequisicaoRow) => r.status_clinico || "-" },
      { header: "Crítico", render: (r: RequisicaoRow) => (r.possui_resultado_critico ? "SIM" : "—") },
      {
        header: "Guia de coleta",
        render: (r: RequisicaoRow) => {
          const guidance = (r.guia_colheita || r.guia_coleta || r.collection_guidance || []) as Array<any>
          if (!Array.isArray(guidance) || guidance.length === 0) {
            return <span className="text-xs text-slate-500">Sem orientação disponível.</span>
          }

          return (
            <div className="space-y-2">
              {guidance.map((entry, idx) => {
                const samples = Array.isArray(entry?.sample_options) ? entry.sample_options : []
                return (
                  <div key={`${entry?.item_id || idx}`} className="rounded-lg bg-slate-50 px-2 py-1.5">
                    <div className="text-xs font-semibold text-slate-800">
                      {entry?.exam_name || "Exame sem nome"}
                    </div>
                    {samples.length ? (
                      <div className="mt-1 space-y-1">
                        {samples.map((sample: any, sampleIdx: number) => (
                          <div key={`${sample?.id || sampleIdx}`} className="text-[11px] text-slate-700">
                            {(sample?.sample_name || "Amostra")} • {(sample?.bottle_type_label || sample?.bottle_type || "Frasco não definido")} •
                            {" "}mínimo {(sample?.minimum_volume_ml || "0")} ml
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500">Sem amostras configuradas.</div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        },
      },
    ],
    []
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-6">
        <PageHeader
          title="Requisições (Enfermagem)"
          subtitle="Consulta operacional das requisições laboratoriais."
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
          <DataTable<RequisicaoRow>
            columns={columns as any}
            data={data}
            emptyMessage="Nenhuma requisição encontrada."
          />
        )}
      </div>
    </AppLayout>
  )
}


