"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, CheckCircle2, ClipboardCheck, PlayCircle, RefreshCcw, ShieldAlert, XCircle } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { type AiOperationalTask } from "@/components/ai/AiTaskPanel"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import {
  humanizeAiToken,
  translateAiPriorityLabel,
  translateAiSourceTypeLabel,
  translateAiStatusLabel,
} from "@/lib/aiPresentation"
import { GROUPS } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"

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

const PRIORITIES = ["low", "normal", "high", "critical"]

function formatDate(value?: string | null) {
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

export default function AiTaskDetailPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const { t, language } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [task, setTask] = useState<AiOperationalTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState("")
  const [error, setError] = useState("")

  const loadTask = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError("")
    try {
      const result = await apiFetch<AiOperationalTask>(`/ai/assistant/tasks/${encodeURIComponent(id)}/`, {
        clientCache: false,
        timeoutMs: 30_000,
      })
      setTask(result || null)
    } catch (err: any) {
      setError(err?.message || t("Falha ao carregar tarefa da IA.", "Failed to load AI task."))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => {
    void loadTask()
  }, [loadTask, safeRefreshToken])

  async function updateTask(payload: { status?: string; priority?: string }) {
    if (!id || !task || saving) return
    setSaving(payload.status || payload.priority || "saving")
    setError("")
    try {
      const result = await apiFetch<AiOperationalTask>(`/ai/assistant/tasks/${encodeURIComponent(id)}/`, {
        method: "PATCH",
        clientCache: false,
        timeoutMs: 30_000,
        body: JSON.stringify(payload),
      })
      setTask(result || null)
    } catch (err: any) {
      setError(err?.message || t("Falha ao actualizar tarefa da IA.", "Failed to update AI task."))
    } finally {
      setSaving("")
    }
  }

  const history = useMemo(() => {
    const rows = task?.metadata?.lifecycle_history
    return Array.isArray(rows) ? rows.slice().reverse() : []
  }, [task?.metadata])

  return (
    <AppLayout requiredGroups={TASK_GROUPS}>
      <div className="space-y-5">
        <PageHeader
          title={task?.title || t("Tarefa da IA", "AI Task")}
          subtitle={t(
            "Detalhe operacional para acompanhar execução, prioridade, origem e histórico da tarefa criada pela IA.",
            "Operational detail to track execution, priority, origin and history of the AI-created task."
          )}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/ai/tasks"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
              >
                <ArrowLeft size={15} />
                {t("Tarefas", "Tasks")}
              </Link>
              <Button type="button" variant="secondary" loading={loading} onClick={() => void loadTask()}>
                <RefreshCcw size={15} />
                {t("Actualizar", "Refresh")}
              </Button>
            </div>
          }
        />

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            {t("A carregar tarefa...", "Loading task...")}
          </div>
        ) : null}

        {!loading && !task ? (
          <Card>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldAlert size={16} />
              {t("Tarefa não encontrada ou sem permissão de acesso.", "Task not found or access is not permitted.")}
            </div>
          </Card>
        ) : null}

        {task ? (
          <>
            <div className="overflow-hidden rounded-3xl border border-border bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_34%),linear-gradient(135deg,rgba(2,6,23,0.96),rgba(15,23,42,0.88))] p-4 text-white shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(task.status)}>{translateAiStatusLabel(task.status || "open", language)}</Badge>
                    <Badge variant={priorityVariant(task.priority)}>{translateAiPriorityLabel(task.priority || "normal", language)}</Badge>
                    <Badge variant="info">{task.assigned_group || t("Equipa", "Team")}</Badge>
                    {task.module_key ? <Badge variant="default">{humanizeAiToken(task.module_key)}</Badge> : null}
                  </div>
                  <h2 className="mt-4 flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">
                    <ClipboardCheck size={24} />
                    {task.title}
                  </h2>
                  <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-white/75">
                    {task.description || t("Sem descrição operacional.", "No operational description.")}
                  </p>
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[20rem] lg:grid-cols-1">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-white/55">{t("Prazo", "Due")}</div>
                    <div className="mt-1 font-semibold">{formatDate(task.due_at)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-white/55">{t("Origem", "Source")}</div>
                    <div className="mt-1 font-semibold">{translateAiSourceTypeLabel(task.source_type, language)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-white/55">{t("Criada por", "Created by")}</div>
                    <div className="mt-1 font-semibold">{task.created_by_name || "—"}</div>
                  </div>
                </div>
              </div>
            </div>

            <Card
              title={t("Ciclo de vida", "Lifecycle")}
              subtitle={t(
                "Actualize o estado sem perder a trilha operacional da tarefa.",
                "Update the status without losing the task operational trail."
              )}
            >
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={task.status === "open" ? "primary" : "secondary"}
                  loading={saving === "open"}
                  disabled={task.status === "open"}
                  onClick={() => void updateTask({ status: "open" })}
                >
                  <ClipboardCheck size={15} />
                  {t("Aberta", "Open")}
                </Button>
                <Button
                  type="button"
                  variant={task.status === "in_progress" ? "primary" : "secondary"}
                  loading={saving === "in_progress"}
                  disabled={task.status === "in_progress"}
                  onClick={() => void updateTask({ status: "in_progress" })}
                >
                  <PlayCircle size={15} />
                  {t("Em execução", "In progress")}
                </Button>
                <Button
                  type="button"
                  variant={task.status === "done" ? "primary" : "secondary"}
                  loading={saving === "done"}
                  disabled={task.status === "done"}
                  onClick={() => void updateTask({ status: "done" })}
                >
                  <CheckCircle2 size={15} />
                  {t("Concluída", "Done")}
                </Button>
                <Button
                  type="button"
                  variant={task.status === "cancelled" ? "primary" : "danger"}
                  loading={saving === "cancelled"}
                  disabled={task.status === "cancelled"}
                  onClick={() => void updateTask({ status: "cancelled" })}
                >
                  <XCircle size={15} />
                  {t("Cancelar", "Cancel")}
                </Button>
              </div>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <Card title={t("Prioridade", "Priority")}>
                <div className="flex flex-wrap gap-2">
                  {PRIORITIES.map((item) => (
                    <Button
                      key={item}
                      type="button"
                      variant={task.priority === item ? "primary" : "secondary"}
                      loading={saving === item}
                      disabled={task.priority === item}
                      onClick={() => void updateTask({ priority: item })}
                    >
                      {translateAiPriorityLabel(item, language)}
                    </Button>
                  ))}
                </div>
              </Card>

              <Card title={t("Referência operacional", "Operational reference")}>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-xl bg-muted/30 px-3 py-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ID</div>
                    <div className="mt-1 font-semibold text-foreground">{task.custom_id || `#${task.id}`}</div>
                  </div>
                  <div className="rounded-xl bg-muted/30 px-3 py-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Referência", "Reference")}</div>
                    <div className="mt-1 font-semibold text-foreground">{task.source_reference || "—"}</div>
                  </div>
                  <div className="rounded-xl bg-muted/30 px-3 py-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Criada", "Created")}</div>
                    <div className="mt-1 font-semibold text-foreground">{formatDate(task.created_at)}</div>
                  </div>
                  <div className="rounded-xl bg-muted/30 px-3 py-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Actualizada", "Updated")}</div>
                    <div className="mt-1 font-semibold text-foreground">{formatDate(task.updated_at)}</div>
                  </div>
                </div>
              </Card>
            </div>

            <Card title={t("Histórico de ciclo de vida", "Lifecycle history")}>
              <div className="space-y-2">
                {history.length ? history.map((item: any, index) => (
                  <div key={`${item.at}-${index}`} className="rounded-2xl border border-border bg-background p-3 text-sm shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-foreground">
                        {translateAiStatusLabel(item.from_status, language)} → {translateAiStatusLabel(item.to_status, language)}
                      </div>
                      <div className="text-xs text-muted-foreground">{formatDate(item.at)}</div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {translateAiPriorityLabel(item.from_priority, language)} → {translateAiPriorityLabel(item.to_priority, language)} · {item.by_username || `#${item.by_user_id || "—"}`}
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    {t("Sem alterações de ciclo registadas ainda.", "No lifecycle changes recorded yet.")}
                  </div>
                )}
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </AppLayout>
  )
}
