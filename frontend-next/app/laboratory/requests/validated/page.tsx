"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Bell, FlaskConical, Printer, RotateCcw, Search, Shield } from "lucide-react"
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

async function openResultsPdf(requestId: number) {
  const blob = await apiFetch<Blob>(`/requests/${requestId}/results-pdf/`, {
    responseType: "blob",
  })
  const url = window.URL.createObjectURL(blob)
  window.open(url, "_blank", "noopener,noreferrer")
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
}

export default function ValidatedLaboratoryRequestsPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const canViewAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])

  const [search, setSearch] = useState("")
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null)
  const [pdfLoadingId, setPdfLoadingId] = useState<number | null>(null)
  const [notifyLoadingId, setNotifyLoadingId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const debouncedSearch = useDebounce(search, 300)
  const safeRefreshToken = useSafeDataRefreshSignal()

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set("type", "LAB")
    params.set("status", "validado")
    params.set("ordering", "-updated_at")
    const q = debouncedSearch.trim()
    if (q) params.set("search", q)
    return `/requests/?${params.toString()}`
  }, [debouncedSearch])

  useEffect(() => {
    setPage(1)
  }, [queryUrl, pageSize])

  const { data, isFetching, isError, error } = useQuery<RequestList>({
    queryKey: ["validated-lab-requests", queryUrl, page, pageSize, safeRefreshToken],
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

  const onPdf = useCallback(async (id: number) => {
    if (pdfLoadingId === id) return
    try {
      setPdfLoadingId(id)
      setPdfError(null)
      setNotificationMessage(null)
      await openResultsPdf(id)
    } catch (e: any) {
      setPdfError(e?.message || t("Falha ao gerar PDF de resultados.", "Failed to generate results PDF."))
    } finally {
      setPdfLoadingId(null)
    }
  }, [pdfLoadingId, t])

  const onNotify = useCallback(async (id: number) => {
    if (notifyLoadingId === id) return
    try {
      setNotifyLoadingId(id)
      setPdfError(null)
      setNotificationMessage(null)
      await apiFetch(`/requests/${id}/send-results-notification/`, {
        method: "POST",
        body: JSON.stringify({ channels: ["email", "whatsapp"] }),
      })
      setNotificationMessage(t(
        "Notificação de resultados processada para email e WhatsApp disponíveis.",
        "Results notification processed for available email and WhatsApp."
      ))
    } catch (e: any) {
      setPdfError(e?.message || t("Falha ao enviar notificação de resultados.", "Failed to send results notification."))
    } finally {
      setNotifyLoadingId(null)
    }
  }, [notifyLoadingId, t])

  const cleanFilters = useCallback(() => {
    setSearch("")
    setPageSize(50)
    setPage(1)
  }, [])

  const columns = useMemo(
    () => [
      { header: "Código", render: (r: RequestRow) => r.custom_id || r.id || "-" },
      { header: "Paciente", render: (r: RequestRow) => r.patient_name || r.patient || "-" },
      { header: "Estado", render: (r: RequestRow) => r.status || "-" },
      { header: "Prioridade", render: (r: RequestRow) => r.clinical_status || "-" },
      {
        header: "Ações",
        render: (r: RequestRow) => {
          const requestId = Number(r.id)
          const generatingPdf = pdfLoadingId === requestId
          const notifying = notifyLoadingId === requestId
          return (
            <div className="flex flex-wrap gap-2">
              {r.id ? (
                <Link
                  href={`/laboratory/requests/${r.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <FlaskConical size={14} />
                  Ver
                </Link>
              ) : null}

              <button
                type="button"
                onClick={() => onPdf(requestId)}
                disabled={!requestId || generatingPdf}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-50"
              >
                <Printer size={14} />
                {generatingPdf ? t("Gerando...", "Generating...") : t("Imprimir", "Print")}
              </button>

              <button
                type="button"
                onClick={() => onNotify(requestId)}
                disabled={!requestId || notifying}
                className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-900 transition hover:bg-sky-100 disabled:opacity-50"
              >
                <Bell size={14} />
                {notifying ? t("Notificando...", "Notifying...") : t("Notificar", "Notify")}
              </button>

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
            </div>
          )
        },
      },
    ],
    [canViewAdmin, notifyLoadingId, onNotify, onPdf, pdfLoadingId, t]
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="space-y-6">
        <PageHeader
          title={t("Requisições validadas", "Validated requests")}
          subtitle={t(
            "Lista final de requisições prontas para emissão do PDF de resultados.",
            "Final list of requests ready for results PDF printing."
          )}
          actions={
            <Link
              href="/laboratory/requests"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              <FlaskConical size={16} />
              {t("Voltar à fila", "Back to queue")}
            </Link>
          }
        />

        {isError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {(error as any)?.message || t("Falha ao carregar requisições validadas.", "Failed to load validated requests.")}
          </div>
        ) : null}

        {pdfError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {pdfError}
          </div>
        ) : null}

        {notificationMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notificationMessage}
          </div>
        ) : null}

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-600)]">
                {t("Pesquisar", "Search")}
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--gray-400)]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("Código, paciente ou documento", "Code, patient or document")}
                  className="w-full rounded-xl border border-[var(--border)] bg-white py-2 pl-8 pr-3 text-sm text-[var(--text)] shadow-sm"
                />
              </div>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-600)]">
                {t("Por página", "Per page")}
              </span>
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)] shadow-sm"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={cleanFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
              >
                <RotateCcw size={14} />
                {t("Limpar", "Clear")}
              </button>
            </div>
          </div>

          <div className="mt-3 text-xs text-[var(--gray-600)]">
            {t("Total validado:", "Validated total:")}{" "}
            <span className="font-semibold text-[var(--text)]">{totalItems}</span>
          </div>
        </div>

        {isFetching ? (
          <div className="text-sm text-gray-500">{t("Carregando...", "Loading...")}</div>
        ) : (
          <>
            <DataTable<RequestRow>
              columns={columns as any}
              data={rows}
              emptyMessage={t("Nenhuma requisição validada encontrada.", "No validated requests found.")}
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
