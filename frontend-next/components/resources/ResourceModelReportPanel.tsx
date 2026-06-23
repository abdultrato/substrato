"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CalendarRange, FileDown, Loader2, Sparkles } from "lucide-react"

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
    <section className="rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 p-3">
        <div className="relative">
          <CalendarRange className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-border bg-background py-1.5 pl-8 pr-2 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
          />
        </div>
        <span className="text-[11px] text-muted-foreground">→</span>
        <div className="relative">
          <CalendarRange className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-border bg-background py-1.5 pl-8 pr-2 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
          />
        </div>

        <div className="flex items-center gap-1">
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" onClick={() => applyQuickWindow(d)}
              className="rounded-lg border border-border bg-card px-2 py-1.5 text-[11px] font-semibold text-foreground transition hover:border-violet-400 hover:bg-muted">
              {d}d
            </button>
          ))}
        </div>

        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as ReportMode)}
          className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
        >
          {modeOptions.map((option) => (
            <option key={option.value} value={option.value}>{t(option.labelPt, option.labelEn)}</option>
          ))}
        </select>

        <input
          type="number"
          min={20}
          max={1000}
          step={10}
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value || 200))}
          className="w-20 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
        />

        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={running}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
        >
          {running ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
          {running ? t("Gerando...", "Generating...") : t("Gerar PDF", "Generate PDF")}
        </button>

        {(searchTerm || "").trim() ? (
          <span className="rounded-lg border border-border bg-muted px-2 py-1 text-[11px] text-foreground">
            {t("Pesquisa:", "Search:")} {(searchTerm || "").trim()}
          </span>
        ) : null}
        {(statusFilter || "").trim() ? (
          <span className="rounded-lg border border-border bg-muted px-2 py-1 text-[11px] text-foreground">
            {t("Estado:", "Status:")} {(statusFilter || "").trim()}
          </span>
        ) : null}
      </div>

      {/* Status / feedback */}
      {(jobStatus || feedback || error) ? (
        <div className="border-t border-border/60 px-4 py-3 space-y-2">
          {jobStatus && !feedback && !error ? (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
              <Sparkles size={12} className="text-violet-500" />
              {t("Estado:", "Status:")} {jobStatus}
            </div>
          ) : null}
          {feedback ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-700/30 dark:bg-emerald-900/15 dark:text-emerald-400">
              {feedback}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 dark:border-red-700/30 dark:bg-red-900/15 dark:text-red-400">
              {error}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
