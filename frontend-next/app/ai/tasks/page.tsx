"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, ClipboardCheck, ExternalLink, RefreshCcw, Search } from "lucide-react"

import { lucideToDataUrl } from "@/lib/icon-svg"

import AppLayout from "@/components/layout/AppLayout"
import AiTaskPanel, { type AiOperationalTask } from "@/components/ai/AiTaskPanel"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import TextInput from "@/components/ui/TextInput"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
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

function humanize(value?: string | null) {
  return String(value || "—").replace(/_/g, " ")
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

export default function AiOperationalTasksPage() {
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [tasks, setTasks] = useState<AiOperationalTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const [priority, setPriority] = useState("")

  const highlightedTaskId = useMemo(() => {
    if (typeof window === "undefined") return ""
    return new URLSearchParams(window.location.search).get("task") || ""
  }, [])

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set("q", query.trim())
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
      setLoading(false)
    }
  }, [priority, query, status, t])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks, safeRefreshToken])

  const openTasks = tasks.filter((task) => task.status === "open").length
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress").length
  const criticalTasks = tasks.filter((task) => task.priority === "critical").length

  return (
    <AppLayout requiredGroups={TASK_GROUPS}>
      <div className="space-y-5">
        <PageHeader
          title={t("Tarefas da IA", "AI Tasks")}
          subtitle={t(
            "Tarefas operacionais criadas pela IA apenas depois de confirmação humana e validação de permissões.",
            "Operational tasks created by AI only after human confirmation and permission validation."
          )}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/ai"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
              >
                <ArrowLeft size={15} />
                {t("Voltar à IA", "Back to AI")}
              </Link>
              <Button type="button" variant="secondary" loading={loading} onClick={() => void loadTasks()}>
                <RefreshCcw size={15} />
                {t("Actualizar", "Refresh")}
              </Button>
            </div>
          }
        />

        <div className="grid gap-3 sm:grid-cols-4">
          <Card>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("Total", "Total")}
            </div>
            <div className="mt-1 font-display text-3xl font-semibold text-foreground">{tasks.length}</div>
          </Card>
          <Card>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("Abertas", "Open")}
            </div>
            <div className="mt-1 font-display text-3xl font-semibold text-foreground">{openTasks}</div>
          </Card>
          <Card>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("Em execução", "In progress")}
            </div>
            <div className="mt-1 font-display text-3xl font-semibold text-foreground">{inProgressTasks}</div>
          </Card>
          <Card>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("Críticas", "Critical")}
            </div>
            <div className="mt-1 font-display text-3xl font-semibold text-foreground">{criticalTasks}</div>
          </Card>
        </div>

        <Card title={t("Filtros da fila", "Queue filters")}>
          <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Pesquisar por título, módulo, equipa ou referência", "Search by title, module, team or reference")}
              leftIcon={<Search size={16} />}
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item || "all"} value={item}>
                  {item ? humanize(item) : t("Todos os estados", "All statuses")}
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
            >
              {PRIORITY_OPTIONS.map((item) => (
                <option key={item || "all"} value={item}>
                  {item ? humanize(item) : t("Todas as prioridades", "All priorities")}
                </option>
              ))}
            </select>
            <Button type="button" loading={loading} onClick={() => void loadTasks()}>
              <Search size={15} />
              {t("Pesquisar", "Search")}
            </Button>
          </div>
        </Card>

        <Card title={t("Fila operacional", "Operational queue")}>
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              {t("A carregar tarefas confirmadas...", "Loading confirmed tasks...")}
            </div>
          ) : null}

          {!loading && !tasks.length ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
              {t("Ainda não há tarefas operacionais criadas pela IA.", "There are no operational tasks created by AI yet.")}
            </div>
          ) : null}

          <div className="space-y-3">
            {tasks.map((task) => {
              const highlighted = String(task.id) === highlightedTaskId
              return (
                <Link
                  key={task.id}
                  href={`/ai/tasks/${task.id}`}
                  className={`rounded-2xl border p-3 transition ${
                    highlighted ? "block border-primary bg-primary/5 shadow-sm" : "block border-border bg-background hover:border-primary/40 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-slate-800">
                          <span
                            aria-hidden
                            className="block h-4 w-4"
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
                        {task.title}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant={statusVariant(task.status)}>{humanize(task.status || "open")}</Badge>
                        <Badge variant="info">{task.assigned_group || "—"}</Badge>
                        <Badge variant={priorityVariant(task.priority)}>
                          {humanize(task.priority || "normal")}
                        </Badge>
                        {task.module_key ? <Badge variant="default">{task.module_key}</Badge> : null}
                      </div>
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground md:text-right">
                      <div>{task.custom_id || `#${task.id}`}</div>
                      <div>{t("Prazo", "Due")}: {formatDate(task.due_at)}</div>
                      {task.source_reference ? <div>{task.source_reference}</div> : null}
                      <div className="mt-2 inline-flex items-center gap-1 text-primary">
                        <ExternalLink size={13} />
                        {t("Abrir", "Open")}
                      </div>
                    </div>
                  </div>
                  {highlighted ? <AiTaskPanel task={task} /> : null}
                </Link>
              )
            })}
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
