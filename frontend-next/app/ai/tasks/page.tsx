"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, ClipboardCheck, RefreshCcw } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import AiTaskPanel, { type AiOperationalTask } from "@/components/ai/AiTaskPanel"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import { useLanguage } from "@/hooks/useLanguage"
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

export default function AiOperationalTasksPage() {
  const { t } = useLanguage()
  const [tasks, setTasks] = useState<AiOperationalTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const highlightedTaskId = useMemo(() => {
    if (typeof window === "undefined") return ""
    return new URLSearchParams(window.location.search).get("task") || ""
  }, [])

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const result = await apiFetch<AiOperationalTask[]>("/ai/assistant/tasks/", {
        clientCache: false,
        timeoutMs: 30_000,
      })
      setTasks(result || [])
    } catch (err: any) {
      setError(err?.message || t("Falha ao carregar tarefas da IA.", "Failed to load AI tasks."))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  const openTasks = tasks.filter((task) => task.status === "open").length
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

        <div className="grid gap-3 sm:grid-cols-3">
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
              {t("Críticas", "Critical")}
            </div>
            <div className="mt-1 font-display text-3xl font-semibold text-foreground">{criticalTasks}</div>
          </Card>
        </div>

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
                <div
                  key={task.id}
                  className={`rounded-2xl border p-3 transition ${
                    highlighted ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-background"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <ClipboardCheck size={17} />
                        {task.title}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="success">{task.status || "open"}</Badge>
                        <Badge variant="info">{task.assigned_group || "—"}</Badge>
                        <Badge variant={task.priority === "critical" ? "danger" : task.priority === "high" ? "warning" : "default"}>
                          {task.priority || "normal"}
                        </Badge>
                        {task.module_key ? <Badge variant="default">{task.module_key}</Badge> : null}
                      </div>
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground md:text-right">
                      <div>{task.custom_id || `#${task.id}`}</div>
                      <div>{t("Prazo", "Due")}: {formatDate(task.due_at)}</div>
                      {task.source_reference ? <div>{task.source_reference}</div> : null}
                    </div>
                  </div>
                  {highlighted ? <AiTaskPanel task={task} /> : null}
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
