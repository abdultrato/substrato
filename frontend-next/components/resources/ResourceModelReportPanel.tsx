"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CalendarRange, FileDown, FileText, Loader2, Sparkles } from "lucide-react"

import { useLanguage } from "@/hooks/useLanguage"
import { apiFetch } from "@/lib/api"
import { canonicalCollectionPath } from "@/lib/openapi/endpointResolver"

type ReportMode = "summary" | "operational" | "complete"

type ExportJobPayload = {
  id?: string
  job_id?: string
  status?: string
  status_url?: string
  download_url?: string
  filename?: string | null
  error?: string | null
}

function toIsoDate(value: Date): string {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function shiftDays(base: Date, deltaDays: number): Date {
  const copy = new Date(base)
  copy.setDate(copy.getDate() + deltaDays)
  return copy
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.URL.revokeObjectURL(url)
}

function toClientApiPath(urlOrPath: string | null | undefined): string {
  const raw = String(urlOrPath || "").trim()
  if (!raw) return ""

  let path = raw
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const parsed = new URL(raw)
      path = `${parsed.pathname}${parsed.search || ""}`
    } catch {
      path = raw
    }
  }

  if (!path.startsWith("/")) path = `/${path}`
  if (path.startsWith("/api/v1/")) {
    return path.slice("/api/v1".length)
  }
  if (path === "/api/v1") return "/"
  return path
}

export default function ResourceModelReportPanel({
  endpoint,
  groupLabel,
  resourceLabel,
  searchTerm,
  statusFilter,
}: {
  endpoint: string
  groupLabel: string
  resourceLabel: string
  searchTerm?: string
  statusFilter?: string
}) {
  const { t } = useLanguage()
  const mountedRef = useRef(false)
  const [mode, setMode] = useState<ReportMode>("complete")
  const [limit, setLimit] = useState<number>(200)
  const [dateFrom, setDateFrom] = useState<string>(() => toIsoDate(shiftDays(new Date(), -29)))
  const [dateTo, setDateTo] = useState<string>(() => toIsoDate(new Date()))
  const [running, setRunning] = useState(false)
  const [jobStatus, setJobStatus] = useState<string>("")
  const [feedback, setFeedback] = useState<string>("")
  const [error, setError] = useState<string>("")

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const canonicalEndpoint = useMemo(() => canonicalCollectionPath(endpoint), [endpoint])

  const modeOptions: Array<{ value: ReportMode; labelPt: string; labelEn: string }> = [
    { value: "summary", labelPt: "Resumo executivo", labelEn: "Executive summary" },
    { value: "operational", labelPt: "Operacional", labelEn: "Operational" },
    { value: "complete", labelPt: "Completo", labelEn: "Complete" },
  ]

  function applyQuickWindow(days: number) {
    const today = new Date()
    const from = shiftDays(today, -(days - 1))
    setDateFrom(toIsoDate(from))
    setDateTo(toIsoDate(today))
  }

  async function waitForCompletion(statusPath: string): Promise<ExportJobPayload> {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (!mountedRef.current) throw new Error("Operação cancelada.")
      const state = await apiFetch<ExportJobPayload>(statusPath, {
        clientCache: false,
        timeoutMs: 30000,
      })
      const status = String(state?.status || "").toLowerCase()
      setJobStatus(status || "processing")
      if (status === "ready") return state
      if (status === "failed") {
        throw new Error(state?.error || t("Falha ao gerar relatório.", "Failed to generate report."))
      }
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
    throw new Error(t("Tempo de processamento excedido.", "Processing timeout exceeded."))
  }

  async function handleGenerate() {
    if (!dateFrom || !dateTo) {
      setError(t("Defina o intervalo de datas.", "Set the date range first."))
      return
    }
    if (dateFrom > dateTo) {
      setError(t("A data inicial não pode ser maior que a data final.", "Start date cannot be after end date."))
      return
    }

    setRunning(true)
    setError("")
    setFeedback("")
    setJobStatus("queued")

    try {
      const params = new URLSearchParams()
      params.set("endpoint", canonicalEndpoint)
      params.set("group_label", groupLabel)
      params.set("resource_label", resourceLabel)
      params.set("date_from", dateFrom)
      params.set("date_to", dateTo)
      params.set("mode", mode)
      params.set("limit", String(limit))

      if ((searchTerm || "").trim()) params.set("search", (searchTerm || "").trim())
      if ((statusFilter || "").trim()) params.set("status", (statusFilter || "").trim())

      const queued = await apiFetch<ExportJobPayload>(`/audit/modelo/relatorio/pdf/?${params.toString()}`, {
        clientCache: false,
        timeoutMs: 60000,
      })

      const statusPath = toClientApiPath(queued?.status_url)
      const initialDownloadPath = toClientApiPath(queued?.download_url)
      if (!statusPath) {
        throw new Error(t("Resposta sem status_url.", "Response missing status_url."))
      }

      setFeedback(t("Relatório em processamento...", "Report is processing..."))
      const finalState = await waitForCompletion(statusPath)
      const downloadPath = toClientApiPath(finalState?.download_url || initialDownloadPath)
      if (!downloadPath) {
        throw new Error(t("Resposta sem download_url.", "Response missing download_url."))
      }

      const blob = await apiFetch<Blob>(downloadPath, {
        responseType: "blob",
        timeoutMs: 120000,
        clientCache: false,
      })
      const filename =
        (finalState?.filename || queued?.filename || `${resourceLabel.toLowerCase().replace(/\s+/g, "_")}_report.pdf`).trim()

      downloadBlob(blob, filename)
      setJobStatus("ready")
      setFeedback(t("Relatório gerado e transferido.", "Report generated and downloaded."))
    } catch (err: any) {
      if (!mountedRef.current) return
      setJobStatus("failed")
      setFeedback("")
      setError(err?.message || t("Falha ao gerar relatório.", "Failed to generate report."))
    } finally {
      if (mountedRef.current) setRunning(false)
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary-100)] text-[var(--primary-700)]">
            <FileText size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">{t("Relatório corporativo", "Corporate report")}</p>
            <p className="text-xs text-[var(--gray-600)]">
              {groupLabel} / {resourceLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => applyQuickWindow(7)}
            className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)]"
          >
            7d
          </button>
          <button
            type="button"
            onClick={() => applyQuickWindow(30)}
            className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)]"
          >
            30d
          </button>
          <button
            type="button"
            onClick={() => applyQuickWindow(90)}
            className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)]"
          >
            90d
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gray-600)]">{t("De", "From")}</span>
          <div className="relative">
            <CalendarRange className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-[var(--gray-400)]" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-white py-1.5 pl-8 pr-2 text-sm text-[var(--text)] shadow-sm transition-colors duration-150 hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
            />
          </div>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gray-600)]">{t("Até", "To")}</span>
          <div className="relative">
            <CalendarRange className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-[var(--gray-400)]" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-white py-1.5 pl-8 pr-2 text-sm text-[var(--text)] shadow-sm transition-colors duration-150 hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
            />
          </div>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gray-600)]">{t("Modo", "Mode")}</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ReportMode)}
            className="w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm text-[var(--text)] shadow-sm transition-colors duration-150 hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          >
            {modeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelPt, option.labelEn)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gray-600)]">{t("Linhas", "Rows")}</span>
          <input
            type="number"
            min={20}
            max={1000}
            step={10}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value || 200))}
            className="w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm text-[var(--text)] shadow-sm transition-colors duration-150 hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)]"
          />
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={running}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[var(--primary-600)] px-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[var(--primary-700)] hover:shadow-md disabled:opacity-70"
          >
            {running ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
            {running ? t("Gerando...", "Generating...") : t("Gerar PDF", "Generate PDF")}
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {(searchTerm || "").trim() ? (
          <span className="rounded-md border border-[var(--border)] bg-white px-2 py-0.5 text-[var(--gray-700)]">
            {t("Pesquisa:", "Search:")} {(searchTerm || "").trim()}
          </span>
        ) : null}
        {(statusFilter || "").trim() ? (
          <span className="rounded-md border border-[var(--border)] bg-white px-2 py-0.5 text-[var(--gray-700)]">
            {t("Estado:", "Status:")} {(statusFilter || "").trim()}
          </span>
        ) : null}
      </div>

      {jobStatus ? (
        <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-[var(--gray-100)] px-2 py-1 text-xs font-medium text-[var(--gray-700)]">
          <Sparkles size={12} />
          {t("Estado do job:", "Job status:")} {jobStatus}
        </div>
      ) : null}

      {feedback ? (
        <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800">
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-800">
          {error}
        </div>
      ) : null}
    </section>
  )
}
