"use client"

import Link from "next/link"
import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import {
  Archive,
  ArrowLeft,
  CircleDot,
  ExternalLink,
  Lightbulb,
  Loader2,
  Lock,
  RefreshCcw,
  Search,
  Sparkles,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { type AiInvestigation } from "@/components/ai/AiInvestigationPanel"
import Badge from "@/components/ui/Badge"
import useDebounce from "@/hooks/useDebounce"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { translateAiIntentLabel } from "@/lib/aiPresentation"
import { formatCount } from "@/lib/i18n/plural"

const INTENT_OPTIONS = [
  "",
  "data_exploration",
  "operational_health",
  "sample_collection",
  "nursing_flow",
  "financial_review",
  "pharmacy_stock",
  "education_review",
  "report_preparation",
  "task_preparation",
  "access_review",
]

const STATUS_META: Record<
  string,
  {
    pt: string
    en: string
    icon: typeof CircleDot
    variant: "default" | "success" | "warning" | "info"
    bar: string
    chip: string
  }
> = {
  ready: {
    pt: "Prontas",
    en: "Ready",
    icon: Sparkles,
    variant: "success",
    bar: "border-l-emerald-500 dark:border-l-emerald-400",
    chip: "border-emerald-200/50 bg-emerald-100/30 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300",
  },
  open: {
    pt: "Abertas",
    en: "Open",
    icon: CircleDot,
    variant: "info",
    bar: "border-l-blue-500 dark:border-l-blue-400",
    chip: "border-blue-200/50 bg-blue-100/30 text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300",
  },
  blocked: {
    pt: "Bloqueadas",
    en: "Blocked",
    icon: Lock,
    variant: "warning",
    bar: "border-l-amber-500 dark:border-l-amber-400",
    chip: "border-amber-200/50 bg-amber-100/30 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300",
  },
  archived: {
    pt: "Arquivadas",
    en: "Archived",
    icon: Archive,
    variant: "default",
    bar: "border-l-slate-400 dark:border-l-slate-500",
    chip: "border-slate-200/50 bg-slate-100/30 text-slate-600 dark:border-slate-600/30 dark:bg-slate-800/30 dark:text-slate-300",
  },
}

function formatDate(value?: string) {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  } catch {
    return value
  }
}

function confidenceTone(score: number) {
  if (score >= 70) return "bg-emerald-500"
  if (score >= 40) return "bg-amber-500"
  return "bg-rose-500"
}

function matchesSearch(item: AiInvestigation, query: string) {
  const haystack = [
    item.title,
    item.question,
    item.result_summary,
    item.intent,
    item.custom_id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase()

  return haystack.includes(query.toLocaleLowerCase())
}

export default function AiInvestigationsPage() {
  const { t, isPortuguese, language } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<AiInvestigation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const [intent, setIntent] = useState("")
  const cacheRef = useRef<Map<string, AiInvestigation[]>>(new Map())
  const abortRef = useRef<AbortController | null>(null)
  const previousRefreshTokenRef = useRef(safeRefreshToken)
  const deferredQuery = useDeferredValue(query.trim())
  const debouncedQuery = useDebounce(deferredQuery, 260)
  const requestKey = useMemo(
    () => JSON.stringify({ q: debouncedQuery, status, intent }),
    [debouncedQuery, intent, status]
  )
  const baseKey = useMemo(() => JSON.stringify({ q: "", status, intent }), [intent, status])

  const loadInvestigations = useCallback(async (force = false) => {
    const queryValue = debouncedQuery
    const cachedRows = cacheRef.current.get(requestKey)
    if (!force && cachedRows) {
      setError("")
      setLoading(false)
      setRefreshing(false)
      startTransition(() => setRows(cachedRows))
      return
    }

    if (!force && queryValue && queryValue.length < 2) {
      const baseRows = cacheRef.current.get(baseKey)
      if (baseRows) {
        setError("")
        setLoading(false)
        setRefreshing(false)
        startTransition(() => setRows(baseRows.filter((item) => matchesSearch(item, queryValue))))
        return
      }
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setError("")
    if (rows.length) setRefreshing(true)
    else setLoading(true)

    try {
      const params = new URLSearchParams()
      if (queryValue) params.set("q", queryValue)
      if (status) params.set("status", status)
      if (intent) params.set("intent", intent)
      params.set("limit", "150")
      const suffix = params.toString()
      const result = await apiFetch<AiInvestigation[]>(`/ai/assistant/investigations/${suffix ? `?${suffix}` : ""}`, {
        clientCache: false,
        timeoutMs: 30_000,
        signal: controller.signal,
      })
      const nextRows = Array.isArray(result) ? result : []
      cacheRef.current.set(requestKey, nextRows)
      if (!queryValue) cacheRef.current.set(baseKey, nextRows)
      startTransition(() => setRows(nextRows))
    } catch (err: any) {
      if (err?.name === "AbortError") return
      setError(err?.message || t("Falha ao carregar investigações da IA.", "Failed to load AI investigations."))
    } finally {
      setLoading(false)
      setRefreshing(false)
      if (abortRef.current === controller) abortRef.current = null
    }
  }, [baseKey, debouncedQuery, intent, requestKey, rows.length, status, t])

  useEffect(() => {
    const refreshChanged = previousRefreshTokenRef.current !== safeRefreshToken
    if (refreshChanged) {
      previousRefreshTokenRef.current = safeRefreshToken
      cacheRef.current.clear()
    }
    void loadInvestigations(refreshChanged)
  }, [loadInvestigations, safeRefreshToken])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const stats = useMemo(() => {
    return rows.reduce(
      (acc, item) => {
        acc.total += 1
        if (item.status === "blocked") acc.blocked += 1
        else if (item.status === "archived") acc.archived += 1
        else acc.active += 1
        return acc
      },
      { total: 0, active: 0, blocked: 0, archived: 0 }
    )
  }, [rows])

  const statPill =
    "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[10px] font-semibold backdrop-blur-xl"

  return (
    <AppLayout>
      <div className="space-y-1.5">
        {/* Cabeçalho fundido: banner + pílulas + pesquisa + filtros num só bloco translúcido */}
        <section className="relative overflow-hidden rounded-2xl border border-violet-200/25 bg-gradient-to-br from-violet-100/[0.05] via-white/[0.015] to-indigo-100/[0.03] shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-violet-800/20 dark:from-violet-950/[0.05] dark:via-white/[0.01] dark:to-indigo-950/[0.03]">
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-violet-400/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-2.5 px-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/25">
                <Lightbulb size={15} />
              </span>
              <div className="min-w-0">
                <h1 className="text-base font-bold leading-tight text-foreground">
                  {t("Investigações da IA", "AI Investigations")}
                </h1>
                <p className="text-[10px] text-muted-foreground">
                  {loading
                    ? t("A carregar…", "Loading…")
                    : refreshing
                      ? t("A actualizar resultados…", "Refreshing results…")
                    : isPortuguese
                      ? formatCount(stats.total, { one: "investigação registada", other: "investigações registadas" })
                      : `${stats.total} recorded investigation${stats.total === 1 ? "" : "s"}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`${statPill} border-violet-200/50 bg-violet-100/30 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300`}
              >
                <Lightbulb size={11} /> {t("Total", "Total")} <strong className="text-[11px]">{stats.total}</strong>
              </span>
              <span
                className={`${statPill} border-emerald-200/50 bg-emerald-100/30 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300`}
              >
                <Sparkles size={11} /> {t("Activas", "Active")} <strong className="text-[11px]">{stats.active}</strong>
              </span>
              <span
                className={`${statPill} border-amber-200/50 bg-amber-100/30 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300`}
              >
                <Lock size={11} /> {t("Bloqueadas", "Blocked")} <strong className="text-[11px]">{stats.blocked}</strong>
              </span>
              <span
                className={`${statPill} border-slate-200/50 bg-slate-100/30 text-slate-600 dark:border-slate-600/30 dark:bg-slate-800/30 dark:text-slate-300`}
              >
                <Archive size={11} /> {t("Arquivadas", "Archived")} <strong className="text-[11px]">{stats.archived}</strong>
              </span>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <Link
                href="/ai"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/25 bg-white/[0.05] px-2.5 text-xs font-medium text-foreground backdrop-blur-xl transition hover:bg-white/20 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.08]"
              >
                <ArrowLeft size={13} />
                {t("Voltar à IA", "Back to AI")}
              </Link>
              <button
                type="button"
                onClick={() => {
                  cacheRef.current.clear()
                  void loadInvestigations(true)
                }}
                disabled={loading || refreshing}
                aria-label={t("Actualizar", "Refresh")}
                title={t("Actualizar", "Refresh")}
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/25 bg-white/[0.05] text-foreground backdrop-blur-xl transition hover:bg-white/20 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.08]"
              >
                {loading || refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCcw size={13} />}
              </button>
            </div>
          </div>

          <div className="relative flex flex-wrap items-center gap-1.5 border-t border-white/15 px-3 py-1.5 dark:border-white/[0.06]">
            <div className="relative w-full sm:w-64">
              <Search
                size={12}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("Pergunta, título ou resumo…", "Question, title or summary…")}
                className="w-full rounded-lg border border-white/25 bg-white/[0.05] py-1.5 pl-7 pr-3 text-xs text-foreground placeholder:text-muted-foreground backdrop-blur-xl transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/40 sm:focus:w-80 dark:border-white/10 dark:bg-white/[0.03]"
              />
              {refreshing ? (
                <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setStatus("")}
                className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[10px] font-semibold transition ${
                  status === ""
                    ? "border-violet-400/60 bg-violet-500/15 text-violet-700 dark:text-violet-300"
                    : "border-white/25 bg-white/[0.05] text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/[0.03]"
                }`}
              >
                {t("Todos", "All")}
              </button>
              {Object.entries(STATUS_META).map(([value, meta]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatus(status === value ? "" : value)}
                  className={`inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[10px] font-semibold transition ${
                    status === value
                      ? meta.chip
                      : "border-white/25 bg-white/[0.05] text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/[0.03]"
                  }`}
                >
                  <meta.icon size={10} />
                  {isPortuguese ? meta.pt : meta.en}
                </button>
              ))}
            </div>

            <select
              value={intent}
              onChange={(event) => setIntent(event.target.value)}
              className="h-8 rounded-lg border border-white/25 bg-white/[0.05] px-2 text-xs text-foreground backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-violet-500/40 dark:border-white/10 dark:bg-white/[0.03] [&>option]:bg-background"
            >
              {INTENT_OPTIONS.map((item) => (
                <option key={item || "all"} value={item}>
                  {item ? translateAiIntentLabel(item, language) : t("Todas as intenções", "All intents")}
                </option>
              ))}
            </select>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
            {error}
          </div>
        ) : null}

        {loading && !rows.length ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-xs text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            {t("A carregar investigações...", "Loading investigations...")}
          </div>
        ) : !rows.length ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
            {t("Ainda não há investigações para estes filtros.", "There are no investigations for these filters yet.")}
          </div>
        ) : (
          <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((item) => {
              const meta = STATUS_META[item.status || ""] || STATUS_META.ready
              const score = Math.max(0, Math.min(100, item.confidence_score ?? 0))
              return (
                <Link
                  key={item.id || item.custom_id}
                  href={`/ai/investigations/${item.id}`}
                  className={`group flex min-w-0 flex-col rounded-xl border border-l-4 border-white/20 bg-white/25 p-2 shadow-sm backdrop-blur-sm transition hover:border-[var(--primary-300)] hover:bg-white/40 dark:border-white/10 dark:bg-white/5 dark:hover:border-[var(--primary-600)] dark:hover:bg-white/[0.08] ${meta.bar}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
                        <Lightbulb size={12} />
                      </span>
                      <span className="line-clamp-1 text-xs font-semibold text-foreground">
                        {item.title || t("Investigação da IA", "AI investigation")}
                      </span>
                    </div>
                    <ExternalLink
                      size={13}
                      className="mt-0.5 shrink-0 text-muted-foreground transition group-hover:text-primary"
                    />
                  </div>

                  <p className="mt-1 line-clamp-2 min-h-[1.9rem] text-[11px] leading-snug text-muted-foreground">
                    {item.question || item.result_summary || t("Sem pergunta registada.", "No question recorded.")}
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <Badge variant={meta.variant}>{isPortuguese ? meta.pt : meta.en}</Badge>
                    <Badge variant="info">{translateAiIntentLabel(item.intent, language)}</Badge>
                  </div>

                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${confidenceTone(score)}`} style={{ width: `${score}%` }} />
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold text-foreground-2">{score}%</span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                    <span className="truncate">{item.custom_id || `#${item.id}`}</span>
                    <span className="shrink-0">{formatDate(item.created_at)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
