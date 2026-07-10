"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Bot, CheckCircle2, Clipboard, ExternalLink, FileDown, Loader2, Play, Wrench } from "lucide-react"

import { useLanguage } from "@/hooks/useLanguage"
import { apiFetch } from "@/lib/api"
import {
  getAvailableResourceActionsForEndpoint,
  type ResourceActionDefinition,
  type ResourceActionField,
} from "@/lib/resourceActions"
import { fieldLabel } from "@/lib/ui/fieldLabels"

type FieldValue = string | boolean | number
type FieldValues = Record<string, FieldValue>
type ExportJobPayload = {
  id?: string
  job_id?: string
  status?: string
  status_url?: string
  download_url?: string
  filename?: string | null
  error?: string | null
}

type ActionUiState = {
  loading?: boolean
  feedback?: string
  error?: string
  jobStatus?: string
  result?: unknown
}

function defaultFieldValue(field: ResourceActionField): FieldValue {
  if (field.defaultValue !== undefined) return field.defaultValue
  if (field.type === "checkbox") return false
  return ""
}

function fieldIsEmpty(value: FieldValue | undefined): boolean {
  if (typeof value === "boolean") return false
  return String(value ?? "").trim() === ""
}

function parseCsv(raw: FieldValue, kind: "number" | "date", label: string): number[] | string[] {
  const value = String(raw ?? "").trim()
  if (!value) return []
  const items = value.split(",").map((item) => item.trim()).filter(Boolean)
  if (kind === "number") {
    return items.map((item) => {
      const parsed = Number(item)
      if (!Number.isInteger(parsed) || parsed < 1) {
        throw new Error(`${label}: use IDs numéricos separados por vírgula.`)
      }
      return parsed
    })
  }

  for (const item of items) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item)) {
      throw new Error(`${label}: use datas YYYY-MM-DD separadas por vírgula.`)
    }
  }
  return items
}

function parseThemes(raw: FieldValue, label: string): Array<{ scheduled_date: string; title: string; description: string }> {
  const value = String(raw ?? "").trim()
  if (!value) return []
  return value
    .split("\n")
    .map((line, index) => {
      const clean = line.trim()
      if (!clean) return null
      const [scheduled_date, title, description = ""] = clean.split("|").map((part) => part.trim())
      if (!scheduled_date || !title || !/^\d{4}-\d{2}-\d{2}$/.test(scheduled_date)) {
        throw new Error(`${label}: linha ${index + 1} deve seguir data|título|descrição.`)
      }
      return { scheduled_date, title, description }
    })
    .filter(Boolean) as Array<{ scheduled_date: string; title: string; description: string }>
}

function toIsoDateTime(raw: FieldValue): string {
  const value = String(raw ?? "").trim()
  if (!value) return ""
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
}

function coerceFieldValue(field: ResourceActionField, raw: FieldValue): unknown {
  if (field.type === "checkbox") return Boolean(raw)
  if (field.type === "csv-number-list") return parseCsv(raw, "number", field.label)
  if (field.type === "csv-date-list") return parseCsv(raw, "date", field.label)
  if (field.type === "theme-lines") return parseThemes(raw, field.label)
  if (field.type === "datetime-local") return toIsoDateTime(raw)
  if (field.type === "number") {
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) throw new Error(`${field.label}: informe um número válido.`)
    if (field.min !== undefined && parsed < field.min) throw new Error(`${field.label}: mínimo ${field.min}.`)
    if (field.max !== undefined && parsed > field.max) throw new Error(`${field.label}: máximo ${field.max}.`)
    return parsed
  }
  return String(raw ?? "").trim()
}

function valueForQuery(value: unknown): string {
  if (Array.isArray(value)) return value.join(",")
  if (typeof value === "boolean") return value ? "true" : "false"
  return String(value)
}

function buildRequest(action: ResourceActionDefinition, values: FieldValues): { url: string; body?: string } {
  const fields = action.fields || []
  const query = new URLSearchParams()
  const body: Record<string, unknown> = {}

  for (const field of fields) {
    const raw = values[field.name] ?? defaultFieldValue(field)
    if (field.required && fieldIsEmpty(raw)) {
      throw new Error(`${field.label}: campo obrigatório.`)
    }
    if (!field.required && fieldIsEmpty(raw)) continue

    const coerced = coerceFieldValue(field, raw)
    if (field.omitValues?.includes(String(coerced))) continue
    if (Array.isArray(coerced) && coerced.length === 0) continue
    if (coerced === false && !field.includeWhenFalse) continue
    if (coerced === "") continue

    if (action.requestMode === "query") {
      query.set(field.name, valueForQuery(coerced))
    } else {
      body[field.name] = coerced
    }
  }

  const qs = query.toString()
  return {
    url: `${action.endpoint}${qs ? `?${qs}` : ""}`,
    body: action.requestMode === "json" ? JSON.stringify(body) : undefined,
  }
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
  if (path.startsWith("/api/v1/")) return path.slice("/api/v1".length)
  if (path === "/api/v1") return "/"
  return path
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.URL.revokeObjectURL(url)
}

function filenameForAction(action: ResourceActionDefinition, values: FieldValues, queued?: ExportJobPayload): string {
  if (queued?.filename) return queued.filename
  const base = action.filename || `${action.key.replace(/[^a-z0-9]+/gi, "_")}.json`
  if (!action.filenameParam) return base
  const rawFormat = String(values[action.filenameParam] || "").toLowerCase()
  const ext = rawFormat === "csv" ? "csv" : rawFormat === "word" ? "docx" : rawFormat === "pdf" ? "pdf" : ""
  if (!ext) return base
  return base.replace(/\.[^.]+$/, `.${ext}`)
}

function summarizeResult(result: unknown): string {
  if (Array.isArray(result)) return `${result.length} registos recebidos.`
  if (result && typeof result === "object") {
    const obj = result as Record<string, any>
    if (Array.isArray(obj.results)) return `${obj.results.length} registos em results.`
    if (typeof obj.count === "number") return `${obj.count} registos informados pela API.`
    return `${Object.keys(obj).length} campos recebidos.`
  }
  return "Resposta recebida."
}

function readableResultValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-"
  if (typeof value === "boolean") return value ? "Sim" : "Não"
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (Array.isArray(value)) return value.length ? `${value.length} itens` : "-"

  if (typeof value === "object") {
    const obj = value as Record<string, any>
    const primary =
      obj.name ??
      obj.nome ??
      obj.title ??
      obj.titulo ??
      obj.description ??
      obj.descricao ??
      obj.id_custom ??
      obj.custom_id ??
      obj.codigo ??
      obj.code ??
      obj.id

    return primary !== null && primary !== undefined && String(primary).trim()
      ? String(primary)
      : `${Object.keys(obj).length} campos`
  }

  return String(value)
}

function resultRows(result: unknown): Array<{ label: string; value: string }> {
  if (Array.isArray(result)) {
    return [
      { label: "Total", value: `${result.length} registos` },
      ...result.slice(0, 5).map((item, index) => ({
        label: `Registo ${index + 1}`,
        value: readableResultValue(item),
      })),
    ]
  }

  if (result && typeof result === "object") {
    return Object.entries(result as Record<string, unknown>)
      .slice(0, 8)
      .map(([key, value]) => ({
        label: fieldLabel({ name: key }),
        value: readableResultValue(value),
      }))
  }

  return [{ label: "Resposta", value: readableResultValue(result) }]
}

function renderField(
  action: ResourceActionDefinition,
  field: ResourceActionField,
  value: FieldValue,
  onChange: (value: FieldValue) => void
) {
  const baseClass =
    "w-full rounded-md border border-white/30 bg-white/55 px-2.5 py-2 text-sm text-[var(--text)] shadow-sm backdrop-blur-sm transition-colors duration-150 placeholder:text-[var(--gray-400)] hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-100)] dark:border-white/15 dark:bg-slate-900/45 dark:text-slate-100 dark:placeholder:text-slate-400 dark:hover:border-emerald-500/60 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/20"
  // O título de cada campo vive no placeholder (ver ResourceActionPanel).
  const placeholder = `${field.placeholder || field.label}${field.required ? " *" : ""}`

  if (field.type === "select") {
    return (
      <select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} aria-label={field.label} className={baseClass}>
        {fieldIsEmpty(value) ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {(field.options || []).map((option) => (
          <option key={`${action.key}-${field.name}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }

  if (field.type === "textarea" || field.type === "theme-lines") {
    return (
      <textarea
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={field.label}
        className={`${baseClass} min-h-[78px] resize-y`}
      />
    )
  }

  if (field.type === "checkbox") {
    return (
      <label className="inline-flex h-9 items-center gap-2 rounded-md border border-white/30 bg-white/55 px-2.5 text-sm text-[var(--gray-700)] shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-slate-900/45 dark:text-slate-100">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary-600)] focus:ring-[var(--primary-200)] dark:border-slate-600 dark:bg-slate-950"
        />
        <span>{field.label}</span>
      </label>
    )
  }

  const inputType =
    field.type === "number" || field.type === "date" || field.type === "datetime-local"
      ? field.type
      : "text"

  return (
    <input
      type={inputType}
      value={String(value ?? "")}
      min={field.min}
      max={field.max}
      step={field.step}
      onChange={(event) => onChange(field.type === "number" ? event.target.value : event.target.value)}
      placeholder={placeholder}
      aria-label={field.label}
      title={field.label}
      className={baseClass}
    />
  )
}

export default function ResourceActionPanel({
  endpoint,
  resourceLabel,
}: {
  endpoint: string
  resourceLabel: string
  searchTerm?: string
  statusFilter?: string
}) {
  const { t } = useLanguage()
  const actions = useMemo(() => getAvailableResourceActionsForEndpoint(endpoint), [endpoint])
  const isBillingInvoice = endpoint === "/billing/invoice/"
  const [valuesByAction, setValuesByAction] = useState<Record<string, FieldValues>>({})
  const [stateByAction, setStateByAction] = useState<Record<string, ActionUiState>>({})

  if (!actions.length) return null

  function getValue(action: ResourceActionDefinition, field: ResourceActionField): FieldValue {
    const existing = valuesByAction[action.key]?.[field.name]
    return existing ?? defaultFieldValue(field)
  }

  function updateValue(action: ResourceActionDefinition, field: ResourceActionField, value: FieldValue) {
    setValuesByAction((current) => ({
      ...current,
      [action.key]: {
        ...(current[action.key] || {}),
        [field.name]: value,
      },
    }))
  }

  function updateActionState(action: ResourceActionDefinition, next: ActionUiState) {
    setStateByAction((current) => ({
      ...current,
      [action.key]: {
        ...(current[action.key] || {}),
        ...next,
      },
    }))
  }

  async function waitForJob(action: ResourceActionDefinition, queued: ExportJobPayload): Promise<ExportJobPayload> {
    const statusPath = toClientApiPath(queued?.status_url)
    if (!statusPath) throw new Error("Resposta sem status_url.")

    for (let attempt = 0; attempt < 120; attempt += 1) {
      const state = await apiFetch<ExportJobPayload>(statusPath, {
        clientCache: false,
        timeoutMs: 30000,
      })
      const status = String(state?.status || "").toLowerCase()
      updateActionState(action, { jobStatus: status || "processing" })
      if (status === "ready") return state
      if (status === "failed") throw new Error(state?.error || "Falha ao gerar relatório.")
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }

    throw new Error("Tempo de processamento excedido.")
  }

  async function runAction(action: ResourceActionDefinition) {
    const values = valuesByAction[action.key] || {}
    updateActionState(action, { loading: true, error: "", feedback: "", result: undefined, jobStatus: "" })

    try {
      const request = buildRequest(action, values)
      const fetchOptions = {
        method: action.method,
        ...(request.body ? { body: request.body } : {}),
        clientCache: false,
        timeoutMs: action.responseMode === "blob" ? 120000 : 60000,
      }

      if (action.responseMode === "blob") {
        const blob = await apiFetch<Blob>(request.url, {
          ...fetchOptions,
          responseType: "blob",
        })
        downloadBlob(blob, filenameForAction(action, values))
        updateActionState(action, { loading: false, feedback: "Arquivo baixado.", result: undefined })
        return
      }

      if (action.responseMode === "jobPdf") {
        const queued = await apiFetch<ExportJobPayload>(request.url, fetchOptions)
        updateActionState(action, { jobStatus: String(queued?.status || "queued") })
        const finalState = await waitForJob(action, queued)
        const downloadPath = toClientApiPath(finalState?.download_url || queued?.download_url)
        if (!downloadPath) throw new Error("Resposta sem download_url.")
        const blob = await apiFetch<Blob>(downloadPath, {
          responseType: "blob",
          timeoutMs: 120000,
          clientCache: false,
        })
        downloadBlob(blob, filenameForAction(action, values, finalState))
        updateActionState(action, { loading: false, feedback: "Relatório gerado e baixado.", jobStatus: "ready" })
        return
      }

      const result = await apiFetch<unknown>(request.url, fetchOptions)
      updateActionState(action, { loading: false, feedback: summarizeResult(result), result })
    } catch (error: any) {
      updateActionState(action, {
        loading: false,
        error: error?.message || "Falha ao executar ação.",
      })
    }
  }

  async function copyResult(action: ResourceActionDefinition) {
    const result = stateByAction[action.key]?.result
    if (result === undefined) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2))
      updateActionState(action, { feedback: "Resposta copiada." })
    } catch {
      updateActionState(action, { error: "Não foi possível copiar a resposta." })
    }
  }

  return (
    <section className={`rounded-xl border border-white/20 bg-white/20 p-2.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/35 ${isBillingInvoice ? "mx-auto" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/25 bg-white/45 text-[var(--primary-700)] shadow-sm dark:border-white/10 dark:bg-white/10">
            <Wrench size={16} />
          </div>
          <div>
            <p className="whitespace-nowrap text-sm font-semibold text-[var(--text)]">
              {isBillingInvoice ? t("Ações de faturamento", "Billing actions") : t("Ações do recurso", "Resource actions")}
            </p>
            <p className="text-xs text-[var(--gray-600)]">
              {isBillingInvoice ? t("Histórico e relatórios operacionais", "Operational history and reports") : resourceLabel}
            </p>
          </div>
        </div>
        <span className="rounded-md border border-white/30 bg-white/45 px-2 py-1 text-xs font-medium text-[var(--gray-700)] shadow-sm dark:border-white/15 dark:bg-slate-900/45 dark:text-slate-200">
          {actions.length} {t("ação(ões)", "action(s)")}
        </span>
      </div>

      <div className={`mt-3 grid gap-3 ${isBillingInvoice ? "mx-auto max-w-5xl grid-cols-2" : "xl:grid-cols-2"}`}>
        {actions.map((action) => {
          const state = stateByAction[action.key] || {}
          const isAiAction = action.key.startsWith("ai.")
          const hasResult = state.result !== undefined
          const isBillingHistoryAction = isBillingInvoice && action.key.startsWith("billing.invoice.history")

          return (
            <div
              key={action.key}
              className={`relative flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-white/20 bg-white/30 p-2.5 pl-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/40 ${isBillingHistoryAction ? "w-full" : ""}`}
            >
              <span className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[var(--primary-500)] to-[var(--primary-400)]" />
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/25 bg-white/45 text-[var(--primary-700)] shadow-sm dark:border-white/10 dark:bg-white/10">
                      {isAiAction ? <Bot size={14} /> : action.responseMode === "json" ? <Play size={14} /> : <FileDown size={14} />}
                    </span>
                    <p className="whitespace-nowrap text-sm font-bold text-[var(--text)]">{action.label}</p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--gray-600)]">{action.description}</p>
                </div>

                {action.dedicatedHref ? (
                  <Link
                    href={action.dedicatedHref}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-white/30 bg-white/45 px-2 text-xs font-semibold text-[var(--gray-700)] shadow-sm backdrop-blur-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-white/60 hover:text-[var(--text)] dark:border-white/15 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-900/55"
                  >
                    <ExternalLink size={12} />
                    {t("Fluxo dedicado", "Dedicated flow")}
                  </Link>
                ) : null}
              </div>

              {action.fields?.length ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {action.fields.map((field) => {
                    const value = getValue(action, field)
                    if (field.type === "checkbox") {
                      return (
                        <div key={`${action.key}-${field.name}`} className="space-y-1">
                          {renderField(action, field, value, (nextValue) => updateValue(action, field, nextValue))}
                          {field.helper ? <p className="text-[11px] text-[var(--gray-500)] dark:text-slate-400">{field.helper}</p> : null}
                        </div>
                      )
                    }

                    const needsCaption =
                      !isBillingHistoryAction && (field.type === "select" || field.type === "date" || field.type === "datetime-local")

                    return (
                      <label key={`${action.key}-${field.name}`} className="space-y-1">
                        {needsCaption ? (
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gray-600)]">
                            {field.label}{field.required ? " *" : ""}
                          </span>
                        ) : null}
                        {renderField(action, field, value, (nextValue) => updateValue(action, field, nextValue))}
                        {field.helper ? <p className="text-[11px] text-[var(--gray-500)] dark:text-slate-400">{field.helper}</p> : null}
                      </label>
                    )
                  })}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void runAction(action)}
                  disabled={state.loading}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[var(--primary-600)] px-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[var(--primary-700)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {state.loading ? <Loader2 size={15} className="animate-spin" /> : action.responseMode === "json" ? <Play size={15} /> : <FileDown size={15} />}
                  {state.loading ? t("Executando...", "Running...") : action.responseMode === "json" ? t("Executar", "Run") : t("Baixar", "Download")}
                </button>

                {hasResult ? (
                  <button
                    type="button"
                    onClick={() => void copyResult(action)}
                    className="inline-flex h-9 items-center gap-1 rounded-md border border-white/30 bg-white/55 px-2.5 text-xs font-semibold text-[var(--gray-700)] shadow-sm backdrop-blur-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-white/70 dark:border-white/15 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-900/55"
                  >
                    <Clipboard size={13} />
                    {t("Copiar resposta", "Copy response")}
                  </button>
                ) : null}

                {state.jobStatus ? (
                  <span className="inline-flex h-8 items-center rounded-md border border-white/25 bg-white/45 px-2 text-xs font-medium text-[var(--gray-700)] shadow-sm dark:border-white/15 dark:bg-slate-900/40 dark:text-slate-200">
                    {t("Job:", "Job:")} {state.jobStatus}
                  </span>
                ) : null}
              </div>

              {state.feedback ? (
                <div className="mt-2 inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                  <CheckCircle2 size={13} />
                  {state.feedback}
                </div>
              ) : null}

              {state.error ? (
                <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/45 dark:text-rose-200">
                  {state.error}
                </div>
              ) : null}

              {hasResult ? (
                <div className="mt-2 max-h-64 overflow-auto rounded-md border border-white/20 bg-white/40 text-[11px] leading-relaxed text-[var(--gray-800)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100">
                  {resultRows(state.result).map((row) => (
                    <div key={row.label} className="grid grid-cols-3 gap-2 border-b border-white/20 px-2 py-1.5 last:border-b-0 dark:border-white/10">
                      <span className="font-semibold uppercase tracking-wide text-[var(--gray-500)] dark:text-slate-400">{row.label}</span>
                      <span className="col-span-2 whitespace-pre-wrap text-[var(--gray-800)] dark:text-slate-100">{row.value}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
