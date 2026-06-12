"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import Pagination from "@/components/ui/Pagination"
import PageHeader from "@/components/ui/PageHeader"
import useDebounce from "@/hooks/useDebounce"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type RequestRow = Record<string, any>

async function abrirEtiqueta(id: number) {
  const blob = await apiFetch<Blob>(`/clinical/labrequest/${id}/etiqueta/`, { responseType: "blob" })
  const url = URL.createObjectURL(blob)
  window.open(url, "_blank", "noopener")
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
}

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "pendente", label: "Pendente" },
  { value: "em_analise", label: "Em análise" },
  { value: "aguardando_validacao", label: "Aguardando validação" },
  { value: "validado", label: "Validado" },
  { value: "rejeitado", label: "Rejeitado" },
]

export default function NursingRequestsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [status, setStatus] = useState<string>("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<RequestRow[]>([])
  const [busyId, setBusyId] = useState<number | null>(null)
  const [reloadTick, setReloadTick] = useState(0)
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
        const res = await apiFetchList<RequestRow>(url, {
          page,
          pageSize,
          clientPaginate: true,
          clientCache: safeRefreshToken === 0,
        })
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
  }, [debouncedSearch, status, page, pageSize, safeRefreshToken, reloadTick])

  async function fazerColheita(row: RequestRow) {
    setBusyId(row.id)
    setErrorMessage(null)
    try {
      await apiFetch(`/clinical/labrequest/${row.id}/registar-colheita/`, { method: "POST" })
      await abrirEtiqueta(row.id)
      setReloadTick((tick) => tick + 1)
    } catch (e: any) {
      setErrorMessage(e?.message || "Falha ao registar a colheita.")
    } finally {
      setBusyId(null)
    }
  }

  const columns = useMemo(
    () => [
      { header: "Código", render: (r: RequestRow) => r.custom_id || r.id || "-" },
      { header: "Paciente", render: (r: RequestRow) => r.patient_name || r.patient || "-" },
      { header: "Prioridade", render: (r: RequestRow) => r.clinical_status || "-" },
      { header: "Crítico", render: (r: RequestRow) => (r.has_critical_result ? "SIM" : "—") },
      {
        header: "Colheita",
        render: (r: RequestRow) => {
          if (r.collected_at) {
            return (
              <div className="space-y-1">
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                  Colhida
                </span>
                <button
                  type="button"
                  onClick={() => abrirEtiqueta(r.id).catch(() => setErrorMessage("Falha ao gerar a etiqueta."))}
                  className="block rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Reimprimir etiqueta
                </button>
              </div>
            )
          }
          if (!r.validated_at) {
            return (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                Aguarda validação
              </span>
            )
          }
          return (
            <button
              type="button"
              onClick={() => fazerColheita(r)}
              disabled={busyId === r.id}
              className="inline-flex items-center rounded-md bg-[var(--primary-600)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)] disabled:opacity-60"
            >
              {busyId === r.id ? "Registando..." : "Fazer colheita"}
            </button>
          )
        },
      },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyId]
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


