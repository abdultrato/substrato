"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import Pagination from "@/components/ui/Pagination"
import PageHeader from "@/components/ui/PageHeader"
import useDebounce from "@/hooks/useDebounce"
import { apiFetchList } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type RequestRow = Record<string, any>

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "pendente", label: "Pendente" },
  { value: "em_analise", label: "Em análise" },
  { value: "aguardando_validacao", label: "Aguardando validação" },
  { value: "validado", label: "Validado" },
  { value: "rejeitado", label: "Rejeitado" },
]

export default function NursingRequestsPage() {
  const [status, setStatus] = useState<string>("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<RequestRow[]>([])
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status, pageSize])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErrorMessage(null)
        const params = new URLSearchParams()
        params.set("type", "LAB")
        if (status) params.set("status", status)
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim())
        const url = `/requests/?${params.toString()}`
        const res = await apiFetchList<RequestRow>(url, { page, pageSize })
        const items = res?.items ?? []
        if (!mounted) return
        const total = res?.meta?.total ?? items.length
        const computedTotalPages =
          res?.meta?.totalPages ??
          (total && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1)
        setData(Array.isArray(items) ? items : [])
        setTotalItems(total || 0)
        setTotalPages(computedTotalPages)
        if (page > computedTotalPages) setPage(computedTotalPages)
      } catch (e: any) {
        if (!mounted) return
        setErrorMessage(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar requisições."))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [debouncedSearch, status, page, pageSize])

  const columns = useMemo(
    () => [
      { header: "Código", render: (r: RequestRow) => r.custom_id || r.id || "-" },
      { header: "Paciente", render: (r: RequestRow) => r.patient_name || r.patient || "-" },
      { header: "Prioridade", render: (r: RequestRow) => r.clinical_status || "-" },
      { header: "Crítico", render: (r: RequestRow) => (r.has_critical_result ? "SIM" : "—") },
      {
        header: "Guia de coleta",
        render: (r: RequestRow) => {
          const guidance = (r.collection_guidance || []) as Array<any>
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
              <label className="text-sm text-slate-700">Pesquisar</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Código, paciente, prioridade"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              />
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
              <label className="text-sm text-slate-700">Por página</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
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
          <>
            <DataTable<RequestRow>
              columns={columns as any}
              data={data}
              emptyMessage="Nenhuma requisição encontrada."
              searchable={false}
            />
            <div className="text-xs text-slate-600">
              Total: {totalItems} · Página {page} de {totalPages}
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </AppLayout>
  )
}


