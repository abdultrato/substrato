"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Shield, FileDown, FlaskConical, Search, RotateCcw } from "lucide-react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import Pagination from "@/components/ui/Pagination"
import PageHeader from "@/components/ui/PageHeader"
import { useAuth } from "@/hooks/useAuth"
import useDebounce from "@/hooks/useDebounce"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { ApiListMeta, apiFetch, apiFetchList } from "@/lib/api"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

type RequestRow = Record<string, any>
type RequestList = { items: RequestRow[]; meta: ApiListMeta; raw: any }
type CriticalFilter = "all" | "critical" | "non_critical"
type FilterOption = { value: string; labelPt: string; labelEn: string }

async function openResultsPdf(requestId: number) {
  const blob = await apiFetch<Blob>(`/requests/${requestId}/results-pdf/`, {
    responseType: "blob",
  })
  const url = window.URL.createObjectURL(blob)
  window.open(url, "_blank", "noopener,noreferrer")
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
}

const STATUS_OPTIONS: FilterOption[] = [
  { value: "", labelPt: "Todos os estados", labelEn: "All statuses" },
  { value: "pendente", labelPt: "Pendente", labelEn: "Pending" },
  { value: "em_analise", labelPt: "Em análise", labelEn: "In analysis" },
  { value: "aguardando_validacao", labelPt: "Aguardando validação", labelEn: "Awaiting validation" },
  { value: "validado", labelPt: "Validado", labelEn: "Validated" },
  { value: "rejeitado", labelPt: "Rejeitado", labelEn: "Rejected" },
]

const PRIORITY_OPTIONS: FilterOption[] = [
  { value: "", labelPt: "Todas as prioridades", labelEn: "All priorities" },
  { value: "NAO_URGENTE", labelPt: "Não urgente", labelEn: "Non-urgent" },
  { value: "NORMAL", labelPt: "Normal", labelEn: "Normal" },
  { value: "ROTINA", labelPt: "Rotina", labelEn: "Routine" },
  { value: "POUCO_URGENTE", labelPt: "Pouco urgente", labelEn: "Low urgency" },
  { value: "PRIORITARIO", labelPt: "Prioritário", labelEn: "Priority" },
  { value: "URGENTE", labelPt: "Urgente", labelEn: "Urgent" },
  { value: "MUITO_URGENTE", labelPt: "Muito urgente", labelEn: "Very urgent" },
  { value: "URGENTISSIMO", labelPt: "Urgentíssimo", labelEn: "Extremely urgent" },
  { value: "EMERGENCIA", labelPt: "Emergência", labelEn: "Emergency" },
]

const ORDERING_OPTIONS: FilterOption[] = [
  { value: "-created_at", labelPt: "Mais recentes", labelEn: "Newest first" },
  { value: "created_at", labelPt: "Mais antigos", labelEn: "Oldest first" },
  { value: "custom_id", labelPt: "Código (A-Z)", labelEn: "Code (A-Z)" },
  { value: "-custom_id", labelPt: "Código (Z-A)", labelEn: "Code (Z-A)" },
  { value: "-clinical_status", labelPt: "Prioridade (alta primeiro)", labelEn: "Priority (high first)" },
]

function optionLabel(option: FilterOption | undefined, isPortuguese: boolean, fallback: string): string {
  if (!option) return fallback
  return isPortuguese ? option.labelPt : option.labelEn
}

export default function LaboratoryRequestsPage() {
  const { user } = useAuth()
  const { t, isPortuguese } = useLanguage()
  const canViewAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string>("")
  const [clinicalPriority, setClinicalPriority] = useState<string>("")
  const [criticalFilter, setCriticalFilter] = useState<CriticalFilter>("all")
  const [ordering, setOrdering] = useState<string>("-created_at")
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [pdfLoadingId, setPdfLoadingId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const debouncedSearch = useDebounce(search, 300)
  const safeRefreshToken = useSafeDataRefreshSignal()

  const looksLikeRequestCode = useMemo(() => {
    const q = debouncedSearch.trim().toUpperCase()
    return /^REQ[-A-Z0-9]+$/.test(q)
  }, [debouncedSearch])

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set("type", "LAB")
    if (status) params.set("status", status)
    if (clinicalPriority) params.set("clinical_status", clinicalPriority)
    if (criticalFilter === "critical") params.set("has_critical_result", "true")
    if (criticalFilter === "non_critical") params.set("has_critical_result", "false")
    if (ordering) params.set("ordering", ordering)
    const q = debouncedSearch.trim()
    if (q) {
      params.set("search", q)
      if (looksLikeRequestCode) {
        params.set("custom_id", q.toUpperCase())
      }
    }
    return `/requests/?${params.toString()}`
  }, [clinicalPriority, criticalFilter, debouncedSearch, looksLikeRequestCode, ordering, status])

  useEffect(() => {
    setPage(1)
  }, [queryUrl, pageSize])

  const { data, isFetching, isError, error } = useQuery<RequestList>({
    queryKey: ["lab-requests", queryUrl, page, pageSize, safeRefreshToken],
    queryFn: () => apiFetchList<RequestRow>(queryUrl, { page, pageSize, clientCache: safeRefreshToken === 0 }),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
  })

  const rows = data?.items ?? []
  const totalItems = data?.meta.total ?? rows.length
  const totalPages =
    data?.meta.totalPages ??
    (totalItems && pageSize ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1)

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const activeFilters = useMemo(() => {
    let count = 0
    if (debouncedSearch.trim()) count += 1
    if (status) count += 1
    if (clinicalPriority) count += 1
    if (criticalFilter !== "all") count += 1
    return count
  }, [clinicalPriority, criticalFilter, debouncedSearch, status])

  const onPdf = useCallback(async (id: number) => {
    if (pdfLoadingId === id) return
    try {
      setPdfLoadingId(id)
      setPdfError(null)
      await openResultsPdf(id)
    } catch (e: any) {
      setPdfError(e?.message || t("Falha ao gerar PDF de resultados.", "Failed to generate results PDF."))
    } finally {
      setPdfLoadingId(null)
    }
  }, [pdfLoadingId, t])

  const cleanFilters = useCallback(() => {
    setSearch("")
    setStatus("")
    setClinicalPriority("")
    setCriticalFilter("all")
    setOrdering("-created_at")
    setPageSize(50)
    setPage(1)
  }, [])

  const columns = useMemo(
    () => [
      { header: "Código", render: (r: RequestRow) => r.custom_id || r.id || "-" },
      { header: "Paciente", render: (r: RequestRow) => r.patient_name || r.patient || "-" },
      {
        header: "Prioridade",
        render: (r: RequestRow) =>
          optionLabel(
            PRIORITY_OPTIONS.find((item) => item.value === String(r.clinical_status || "").toUpperCase()),
            isPortuguese,
            r.clinical_status || "-"
          ),
      },
      { header: "Crítico", render: (r: RequestRow) => (r.has_critical_result ? "SIM" : "—") },
      {
        header: "Ações",
        render: (r: RequestRow) => {
          const requestId = Number(r.id)
          const generatingPdf = pdfLoadingId === requestId

          return (
            <div className="flex flex-wrap gap-2">
            {r.id && String(r.status || "").toLowerCase() !== "validado" ? (
              <Link
                href={`/laboratory/requests/${r.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <FlaskConical size={14} />
                Lançar
              </Link>
            ) : r.id ? (
              <Link
                href={`/laboratory/requests/${r.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <FlaskConical size={14} />
                Ver
              </Link>
            ) : null}

            {canViewAdmin ? (
              <Link
                href={`/admin/clinical/labrequest/${r.id}/change/`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <Shield size={14} />
                Admin
              </Link>
            ) : null}

            {r.custom_id ? (
              <button
                type="button"
                onClick={() => onPdf(requestId)}
                disabled={generatingPdf}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                <FileDown size={14} />
                {generatingPdf ? t("Gerando...", "Generating...") : t("Gerar PDF", "Generate PDF")}
              </button>
            ) : null}
          </div>
          )
        },
      },
    ],
    [canViewAdmin, isPortuguese, onPdf, pdfLoadingId, t]
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="space-y-6">
        <PageHeader
          title={t("Requisições (Laboratório)", "Requests (Laboratory)")}
          subtitle={t(
            "Triagem de requisições com filtros para busca rápida em grande volume.",
            "Request triage with fast filters for high-volume data.",
          )}
        />

        {isError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {(error as any)?.message || t("Falha ao carregar requisições.", "Failed to load requests.")}
          </div>
        ) : null}

        {pdfError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {pdfError}
          </div>
        ) : null}

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-600)]">
                {t("Pesquisar", "Search")}
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--gray-400)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("Código, paciente ou documento", "Code, patient or document")}
                  className="w-full rounded-xl border border-[var(--border)] bg-white py-2 pl-8 pr-3 text-sm text-[var(--text)] shadow-sm"
                />
              </div>
              {looksLikeRequestCode ? (
                <div className="text-[11px] text-[var(--gray-500)]">
                  {t(
                    "Modo código: a busca também aplica filtro exato por requisição.",
                    "Code mode: search also applies exact request code filter.",
                  )}
                </div>
              ) : null}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-600)]">
                {t("Estado", "Status")}
              </span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)] shadow-sm"
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value || "all"} value={item.value}>
                    {optionLabel(item, isPortuguese, item.value)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-600)]">
                {t("Prioridade clínica", "Clinical priority")}
              </span>
              <select
                value={clinicalPriority}
                onChange={(e) => setClinicalPriority(e.target.value)}
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)] shadow-sm"
              >
                {PRIORITY_OPTIONS.map((item) => (
                  <option key={item.value || "all"} value={item.value}>
                    {optionLabel(item, isPortuguese, item.value)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-600)]">
                {t("Crítico", "Critical")}
              </span>
              <select
                value={criticalFilter}
                onChange={(e) => setCriticalFilter(e.target.value as CriticalFilter)}
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)] shadow-sm"
              >
                <option value="all">{t("Todos", "All")}</option>
                <option value="critical">{t("Somente críticos", "Critical only")}</option>
                <option value="non_critical">{t("Somente não críticos", "Non-critical only")}</option>
              </select>
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-600)]">
                {t("Ordenação", "Ordering")}
              </span>
              <select
                value={ordering}
                onChange={(e) => setOrdering(e.target.value)}
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)] shadow-sm"
              >
                {ORDERING_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {optionLabel(item, isPortuguese, item.value)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-600)]">
                {t("Por página", "Per page")}
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)] shadow-sm"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </label>

            <div className="md:col-span-2 xl:col-span-2 flex items-end justify-between gap-3">
              <div className="text-xs text-[var(--gray-600)]">
                {t("Filtros ativos:", "Active filters:")}{" "}
                <span className="font-semibold text-[var(--text)]">{activeFilters}</span>
                {" · "}
                {t("Total encontrado:", "Total found:")}{" "}
                <span className="font-semibold text-[var(--text)]">{totalItems}</span>
              </div>
              <button
                type="button"
                onClick={cleanFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-semibold text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
              >
                <RotateCcw size={14} />
                {t("Limpar filtros", "Clear filters")}
              </button>
            </div>
          </div>
        </div>

        {isFetching ? (
          <div className="text-sm text-gray-500">{t("Carregando...", "Loading...")}</div>
        ) : (
          <>
            <DataTable<RequestRow>
              columns={columns as any}
              data={rows}
              emptyMessage={t("Nenhuma requisição encontrada.", "No requests found.")}
              searchable={false}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--gray-600)]">
              <span>
                {t("Página", "Page")} {page} {t("de", "of")} {totalPages}
              </span>
              <span>
                {t("Registros nesta página:", "Rows in this page:")} {rows.length}
              </span>
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </AppLayout>
  )
}
