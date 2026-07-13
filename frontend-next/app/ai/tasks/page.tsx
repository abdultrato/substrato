"use client"

import Link from "next/link"
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  Loader2,
  RefreshCcw,
  Search,
  Sparkles,
  XCircle,
} from "lucide-react"

import { lucideToDataUrl } from "@/lib/icon-svg"

import AppLayout from "@/components/layout/AppLayout"
import AiTaskPanel, { type AiOperationalTask } from "@/components/ai/AiTaskPanel"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import TextInput from "@/components/ui/TextInput"
import useDebounce from "@/hooks/useDebounce"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { humanizeAiToken, translateAiPriorityLabel, translateAiStatusLabel } from "@/lib/aiPresentation"
import { GROUPS } from "@/lib/rbac"

const TASK_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.ENFERMAGEM,
  GROUPS.LABORATORIO,
  GROUPS.FARMACIA,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.CONTABILIDADE,
  GROUPS.RECEPCAO,
  GROUPS.PROFESSOR,
  GROUPS.DIRETOR_ESCOLA,
  GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO,
]

const STATUS_OPTIONS = ["", "open", "in_progress", "done", "cancelled"]
const PRIORITY_OPTIONS = ["", "low", "normal", "high", "critical"]

const STATUS_META = {
  open: {
    icon: ClipboardCheck,
    chip: "border-amber-300/50 bg-amber-100/30 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300",
    bar: "border-l-amber-500 dark:border-l-amber-400",
  },
  in_progress: {
    icon: Clock3,
    chip: "border-sky-300/50 bg-sky-100/30 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300",
    bar: "border-l-sky-500 dark:border-l-sky-400",
  },
  done: {
    icon: CheckCircle2,
    chip: "border-emerald-300/50 bg-emerald-100/30 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300",
    bar: "border-l-emerald-500 dark:border-l-emerald-400",
  },
  cancelled: {
    icon: XCircle,
    chip: "border-slate-300/50 bg-slate-100/30 text-slate-600 dark:border-slate-600/30 dark:bg-slate-800/30 dark:text-slate-300",
    bar: "border-l-slate-400 dark:border-l-slate-500",
  },
} as const

function formatDate(value?: string | null) {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  } catch {
    return value
  }
}

function toTimestamp(value?: string | null) {
  if (!value) return Number.POSITIVE_INFINITY
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY
}

function isClosedTask(task: AiOperationalTask) {
  return task.status === "done" || task.status === "cancelled"
}

function isOverdueTask(task: AiOperationalTask) {
  return !isClosedTask(task) && Number.isFinite(toTimestamp(task.due_at)) && toTimestamp(task.due_at) < Date.now()
}

function statusVariant(status?: string): "default" | "success" | "warning" | "danger" | "info" {
  if (status === "done") return "success"
  if (status === "cancelled") return "default"
  if (status === "in_progress") return "info"
  return "warning"
}

function priorityVariant(priority?: string): "default" | "success" | "warning" | "danger" | "info" {
  if (priority === "critical") return "danger"
  if (priority === "high") return "warning"
  if (priority === "low") return "default"
  return "info"
}

function priorityWeight(priority?: string) {
  if (priority === "critical") return 0
  if (priority === "high") return 1
  if (priority === "normal") return 2
  if (priority === "low") return 3
  return 4
}

function statusWeight(status?: string) {
  if (status === "in_progress") return 0
  if (status === "open") return 1
  if (status === "done") return 2
  if (status === "cancelled") return 3
  return 4
}

export default function AiOperationalTasksPage() {
  const { t, isPortuguese, language } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [tasks, setTasks] = useState<AiOperationalTask[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const [priority, setPriority] = useState("")
  const hasLoadedRef = useRef(false)

  const deferredQuery = useDeferredValue(query)
  const debouncedQuery = useDebounce(deferredQuery, 260)

  const highlightedTaskId = useMemo(() => {
    if (typeof window === "undefined") return ""
    return new URLSearchParams(window.location.search).get("task") || ""
  }, [])

  const loadTasks = useCallback(async (manual = false) => {
    const shouldRefreshOnly = manual || hasLoadedRef.current
    if (shouldRefreshOnly) setRefreshing(true)
    else setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim())
      if (status) params.set("status", status)
      if (priority) params.set("priority", priority)
      params.set("limit", "150")
      const suffix = params.toString()
      const result = await apiFetch<AiOperationalTask[]>(`/ai/assistant/tasks/${suffix ? `?${suffix}` : ""}`, {
        clientCache: false,
        timeoutMs: 30_000,
      })
      setTasks(result || [])
    } catch (err: any) {
      setError(err?.message || t("Falha ao carregar tarefas da IA.", "Failed to load AI tasks."))
    } finally {
      hasLoadedRef.current = true
      setLoading(false)
      setRefreshing(false)
    }
  }, [debouncedQuery, priority, status, t])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks, safeRefreshToken])

  const sortedTasks = useMemo(() => {
    return tasks.slice().sort((left, right) => {
      const leftHighlighted = String(left.id) === highlightedTaskId ? 0 : 1
      const rightHighlighted = String(right.id) === highlightedTaskId ? 0 : 1
      if (leftHighlighted !== rightHighlighted) return leftHighlighted - rightHighlighted

      const leftOverdue = isOverdueTask(left) ? 0 : 1
      const rightOverdue = isOverdueTask(right) ? 0 : 1
      if (leftOverdue !== rightOverdue) return leftOverdue - rightOverdue

      const byStatus = statusWeight(left.status) - statusWeight(right.status)
      if (byStatus !== 0) return byStatus

      const byPriority = priorityWeight(left.priority) - priorityWeight(right.priority)
      if (byPriority !== 0) return byPriority

      const byDueDate = toTimestamp(left.due_at) - toTimestamp(right.due_at)
      if (byDueDate !== 0) return byDueDate

      return toTimestamp(right.created_at) - toTimestamp(left.created_at)
    })
  }, [highlightedTaskId, tasks])

  const stats = useMemo(() => {
    return tasks.reduce(
      (acc, task) => {
        acc.total += 1
        if (task.status === "open") acc.open += 1
        if (task.status === "in_progress") acc.inProgress += 1
        if (task.priority === "critical") acc.critical += 1
        if (isOverdueTask(task)) acc.overdue += 1
        return acc
      },
      { total: 0, open: 0, inProgress: 0, critical: 0, overdue: 0 }
    )
  }, [tasks])

  const statPill =
    "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[10px] font-semibold backdrop-blur-xl"
  const hasFilters = Boolean(query.trim() || status || priority)

  return (
    <AppLayout requiredGroups={TASK_GROUPS}>
      <div className="space-y-1.5">
        <section className="relative overflow-hidden rounded-2xl border border-cyan-200/25 bg-gradient-to-br from-cyan-100/[0.05] via-white/[0.015] to-sky-100/[0.03] shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-cyan-800/20 dark:from-cyan-950/[0.05] dark:via-white/[0.01] dark:to-sky-950/[0.03]">
          <div className="pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 top-0 h-24 w-24 rounded-full bg-sky-400/10 blur-3xl" />

          <div className="relative flex flex-wrap items-center gap-2.5 px-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-md shadow-cyan-500/25">
                <ClipboardCheck size={15} />
              </span>
              <div className="min-w-0">
                <h1 className="text-base font-bold leading-tight text-foreground">
                  {t("Tarefas da IA", "AI Tasks")}
                </h1>
                <p className="text-[10px] text-muted-foreground">
                  {loading
                    ? t("A carregar…", "Loading…")
                    : refreshing
                      ? t("A actualizar fila operacional…", "Refreshing operational queue…")
                      : isPortuguese
                        ? `${stats.total} tarefa${stats.total === 1 ? "" : "s"} registada${stats.total === 1 ? "" : "s"}`
                        : `${stats.total} recorded task${stats.total === 1 ? "" : "s"}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`${statPill} border-cyan-200/50 bg-cyan-100/30 text-cyan-700 dark:border-cyan-700/30 dark:bg-cyan-900/20 dark:text-cyan-300`}
              >
                <Sparkles size={11} /> {t("Total", "Total")} <strong className="text-[11px]">{stats.total}</strong>
              </span>
              <span
                className={`${statPill} border-amber-200/50 bg-amber-100/30 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300`}
              >
                <ClipboardCheck size={11} /> {t("Abertas", "Open")} <strong className="text-[11px]">{stats.open}</strong>
              </span>
              <span
                className={`${statPill} border-sky-200/50 bg-sky-100/30 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300`}
              >
                <Clock3 size={11} /> {t("Em curso", "In progress")} <strong className="text-[11px]">{stats.inProgress}</strong>
              </span>
              <span
                className={`${statPill} border-rose-200/50 bg-rose-100/30 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300`}
              >
                <AlertTriangle size={11} /> {t("Críticas", "Critical")} <strong className="text-[11px]">{stats.critical}</strong>
              </span>
              <span
                className={`${statPill} border-orange-200/50 bg-orange-100/30 text-orange-700 dark:border-orange-700/30 dark:bg-orange-900/20 dark:text-orange-300`}
              >
                <AlertTriangle size={11} /> {t("Atrasadas", "Overdue")} <strong className="text-[11px]">{stats.overdue}</strong>
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
                onClick={() => void loadTasks(true)}
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
            <div className="relative w-full sm:w-72">
              <TextInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("Pesquisar por título, módulo, equipa ou referência", "Search by title, module, team or reference")}
                leftIcon={<Search size={15} />}
                className="h-8 border-white/25 bg-white/[0.05] text-xs backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]"
              />
              {refreshing ? (
                <Loader2 size={11} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {STATUS_OPTIONS.map((item) => {
                if (!item) {
                  return (
                    <button
                      key="all-status"
                      type="button"
                      onClick={() => setStatus("")}
                      className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[10px] font-semibold transition ${
                        status === ""
                          ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
                          : "border-white/25 bg-white/[0.05] text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/[0.03]"
                      }`}
                    >
                      {t("Todos", "All")}
                    </button>
                  )
                }
                const meta = STATUS_META[item as keyof typeof STATUS_META]
                const Icon = meta.icon
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setStatus(status === item ? "" : item)}
                    className={`inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[10px] font-semibold transition ${
                      status === item
                        ? meta.chip
                        : "border-white/25 bg-white/[0.05] text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/[0.03]"
                    }`}
                  >
                    <Icon size={10} />
                    {translateAiStatusLabel(item, language)}
                  </button>
                )
              })}
            </div>

            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="h-8 rounded-lg border border-white/25 bg-white/[0.05] px-2 text-xs text-foreground backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/40 dark:border-white/10 dark:bg-white/[0.03] [&>option]:bg-background"
            >
              {PRIORITY_OPTIONS.map((item) => (
                <option key={item || "all"} value={item}>
                  {item ? translateAiPriorityLabel(item, language) : t("Todas as prioridades", "All priorities")}
                </option>
              ))}
            </select>

            {hasFilters ? (
              <Button
                type="button"
                variant="secondary"
                className="h-8 rounded-lg px-3 text-xs"
                onClick={() => {
                  setQuery("")
                  setStatus("")
                  setPriority("")
                }}
              >
                {t("Limpar", "Clear")}
              </Button>
            ) : null}
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
            {error}
          </div>
        ) : null}

        {loading && !tasks.length ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-xs text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            {t("A carregar tarefas operacionais...", "Loading operational tasks...")}
          </div>
        ) : !sortedTasks.length ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
            {hasFilters
              ? t("Nenhuma tarefa corresponde aos filtros activos.", "No task matches the active filters.")
              : t("Ainda não há tarefas operacionais criadas pela IA.", "There are no operational tasks created by AI yet.")}
          </div>
        ) : (
          <div className="grid gap-1.5 xl:grid-cols-2">
            {sortedTasks.map((task) => {
              const highlighted = String(task.id) === highlightedTaskId
              const overdue = isOverdueTask(task)
              const meta = STATUS_META[(task.status || "open") as keyof typeof STATUS_META] || STATUS_META.open
              return (
                <Link
                  key={task.id}
                  href={`/ai/tasks/${task.id}`}
                  className={`group flex min-w-0 flex-col rounded-xl border border-l-4 border-white/20 bg-white/25 p-2 shadow-sm backdrop-blur-sm transition hover:border-[var(--primary-300)] hover:bg-white/40 dark:border-white/10 dark:bg-white/5 dark:hover:border-[var(--primary-600)] dark:hover:bg-white/[0.08] ${
                    highlighted
                      ? "border-cyan-400/50 bg-cyan-500/[0.08] ring-1 ring-cyan-400/25 dark:bg-cyan-500/[0.10]"
                      : ""
                  } ${overdue ? "border-l-rose-500 dark:border-l-rose-400" : meta.bar}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400">
                        <span
                          aria-hidden
                          className="block h-3.5 w-3.5"
                          style={{
                            background: "currentColor",
                            WebkitMaskImage: `url("${lucideToDataUrl(ClipboardCheck)}")`,
                            WebkitMaskRepeat: "no-repeat",
                            WebkitMaskSize: "contain",
                            WebkitMaskPosition: "center",
                            maskImage: `url("${lucideToDataUrl(ClipboardCheck)}")`,
                            maskRepeat: "no-repeat",
                            maskSize: "contain",
                            maskPosition: "center",
                          }}
                        />
                      </span>
                      <div className="min-w-0">
                        <div className="line-clamp-1 text-xs font-semibold text-foreground">
                          {task.title || t("Tarefa operacional", "Operational task")}
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {task.custom_id || `#${task.id}`}
                        </div>
                      </div>
                    </div>
                    <ExternalLink size={13} className="mt-0.5 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                  </div>

                  <p className="mt-1 line-clamp-2 min-h-[1.9rem] text-[11px] leading-snug text-muted-foreground">
                    {task.description || t("Sem descrição operacional.", "No operational description.")}
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <Badge variant={statusVariant(task.status)}>{translateAiStatusLabel(task.status || "open", language)}</Badge>
                    <Badge variant={priorityVariant(task.priority)}>{translateAiPriorityLabel(task.priority || "normal", language)}</Badge>
                    <Badge variant="info">{task.assigned_group || t("Equipa", "Team")}</Badge>
                    {task.module_key ? <Badge variant="default">{humanizeAiToken(task.module_key)}</Badge> : null}
                    {overdue ? <Badge variant="danger">{t("Atrasada", "Overdue")}</Badge> : null}
                  </div>

                  <div className="mt-1.5 grid gap-1 text-[10px] text-muted-foreground sm:grid-cols-2">
                    <div className="truncate">
                      <span className="font-semibold text-foreground-2">{t("Prazo", "Due")}:</span> {formatDate(task.due_at)}
                    </div>
                    <div className="truncate">
                      <span className="font-semibold text-foreground-2">{t("Origem", "Source")}:</span> {task.source_reference || "—"}
                    </div>
                  </div>

                  {highlighted ? <AiTaskPanel task={task} /> : null}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
