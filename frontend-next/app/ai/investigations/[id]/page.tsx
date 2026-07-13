"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Lightbulb,
  Loader2,
  Lock,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  TerminalSquare,
  Wrench,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import AiActionPanel, { type AiSuggestedAction } from "@/components/ai/AiActionPanel"
import { type AiInvestigation, type AiInvestigationFinding, type AiInvestigationStep } from "@/components/ai/AiInvestigationPanel"
import Badge from "@/components/ui/Badge"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"

const GLASS =
  "rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5"

const STATUS_META: Record<
  string,
  { pt: string; en: string; icon: typeof CircleDot; chip: string; bar: string }
> = {
  ready: {
    pt: "Pronta",
    en: "Ready",
    icon: Sparkles,
    chip: "border-emerald-200/50 bg-emerald-100/30 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300",
    bar: "border-l-emerald-500 dark:border-l-emerald-400",
  },
  open: {
    pt: "Aberta",
    en: "Open",
    icon: CircleDot,
    chip: "border-blue-200/50 bg-blue-100/30 text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300",
    bar: "border-l-blue-500 dark:border-l-blue-400",
  },
  blocked: {
    pt: "Bloqueada",
    en: "Blocked",
    icon: Lock,
    chip: "border-amber-200/50 bg-amber-100/30 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300",
    bar: "border-l-amber-500 dark:border-l-amber-400",
  },
  archived: {
    pt: "Arquivada",
    en: "Archived",
    icon: Archive,
    chip: "border-slate-200/50 bg-slate-100/30 text-slate-600 dark:border-slate-600/30 dark:bg-slate-800/30 dark:text-slate-300",
    bar: "border-l-slate-400 dark:border-l-slate-500",
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

function humanize(value?: string) {
  return String(value || "—").replace(/_/g, " ")
}

function formatScopeValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—"
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => (typeof item === "string" || typeof item === "number" ? String(item) : ""))
      .filter(Boolean)
    return parts.length ? parts.join(", ") : `${value.length} item(ns)`
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .slice(0, 3)
      .map(([key, item]) => `${humanize(key)}: ${typeof item === "string" || typeof item === "number" ? String(item) : "..."}`)
    return entries.length ? entries.join(" · ") : "Objecto"
  }
  return String(value)
}

function compactDate(value?: string) {
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

function describeSource(source: { type?: string; label?: string; href?: string }) {
  const base = source.label || humanize(source.type) || "Fonte"
  if (!source.href) return base
  try {
    const parsed = new URL(source.href, "http://localhost")
    return `${base} · ${parsed.pathname}`
  } catch {
    return `${base} · ${source.href}`
  }
}

function severityMeta(severity?: string): { variant: "danger" | "warning" | "info"; bar: string } {
  if (severity === "critical") {
    return { variant: "danger", bar: "border-l-rose-500 dark:border-l-rose-400" }
  }
  if (severity === "warning") {
    return { variant: "warning", bar: "border-l-amber-500 dark:border-l-amber-400" }
  }
  return { variant: "info", bar: "border-l-blue-500 dark:border-l-blue-400" }
}

function confidenceTone(score: number) {
  if (score >= 70) return "bg-emerald-500"
  if (score >= 40) return "bg-amber-500"
  return "bg-rose-500"
}

function Section({
  title,
  icon: Icon,
  bar,
  count,
  children,
}: {
  title: string
  icon: typeof Lightbulb
  bar: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <section className={`${GLASS} border-l-4 ${bar}`}>
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <Icon size={13} className="text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">{title}</span>
        {typeof count === "number" ? (
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground-2">
            {count}
          </span>
        ) : null}
      </div>
      <div className="p-2">{children}</div>
    </section>
  )
}

function InvestigationFindingCard({ finding }: { finding: AiInvestigationFinding }) {
  const meta = severityMeta(finding.severity)
  return (
    <div className={`rounded-lg border border-l-4 border-white/20 bg-white/20 p-2 dark:border-white/10 dark:bg-white/5 ${meta.bar}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-foreground">{finding.title || "Finding"}</div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{finding.detail || "—"}</p>
        </div>
        <Badge variant={meta.variant}>{finding.severity || "info"}</Badge>
      </div>
      {finding.source ? (
        <div className="mt-1 text-[10px] font-medium text-muted-foreground">{finding.source}</div>
      ) : null}
    </div>
  )
}

function InvestigationStepCard({ step }: { step: AiInvestigationStep }) {
  const content = (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-l-4 border-white/20 border-l-cyan-500 bg-white/20 px-2 py-1.5 transition hover:bg-white/40 dark:border-white/10 dark:border-l-cyan-400 dark:bg-white/5 dark:hover:bg-white/10">
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold text-foreground">{step.label || "Follow up"}</div>
        <div className="mt-0.5 text-[10px] text-muted-foreground">
          {humanize(step.kind)} · {humanize(step.priority)}
        </div>
      </div>
      {step.href ? <ExternalLink size={13} className="shrink-0 text-muted-foreground" /> : null}
    </div>
  )
  if (!step.href) return content
  return (
    <Link href={step.href} prefetch={false}>
      {content}
    </Link>
  )
}

function SummaryMetric({
  label,
  value,
  tone = "",
}: {
  label: string
  value: React.ReactNode
  tone?: string
}) {
  return (
    <div className={`rounded-lg border border-white/20 bg-white/20 px-2.5 py-2 dark:border-white/10 dark:bg-white/5 ${tone}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xs font-semibold text-foreground">{value}</div>
    </div>
  )
}

export default function AiInvestigationDetailPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const { t, language, isPortuguese } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [investigation, setInvestigation] = useState<AiInvestigation | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingStatus, setSavingStatus] = useState("")
  const [preparingFollowUp, setPreparingFollowUp] = useState("")
  const [confirmingActionId, setConfirmingActionId] = useState<number | null>(null)
  const [actions, setActions] = useState<AiSuggestedAction[]>([])
  const [actionResults, setActionResults] = useState<Record<number, AiSuggestedAction>>({})
  const [error, setError] = useState("")

  const loadInvestigation = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError("")
    try {
      const result = await apiFetch<AiInvestigation>(`/ai/assistant/investigations/${encodeURIComponent(id)}/`, {
        clientCache: false,
        timeoutMs: 30_000,
      })
      setInvestigation(result || null)
    } catch (err: any) {
      setError(err?.message || t("Falha ao carregar a investigação.", "Failed to load the investigation."))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => {
    void loadInvestigation()
  }, [loadInvestigation, safeRefreshToken])

  async function updateStatus(nextStatus: string) {
    if (!id || !investigation || savingStatus) return
    setSavingStatus(nextStatus)
    setError("")
    try {
      const result = await apiFetch<AiInvestigation>(`/ai/assistant/investigations/${encodeURIComponent(id)}/`, {
        method: "PATCH",
        clientCache: false,
        timeoutMs: 30_000,
        body: JSON.stringify({ status: nextStatus }),
      })
      setInvestigation(result || null)
    } catch (err: any) {
      setError(err?.message || t("Falha ao actualizar o estado da investigação.", "Failed to update investigation status."))
    } finally {
      setSavingStatus("")
    }
  }

  async function prepareFollowUp(actionType: "create_operational_task" | "prepare_ai_report_export") {
    if (!id || !investigation || preparingFollowUp) return
    setPreparingFollowUp(actionType)
    setError("")
    try {
      const result = await apiFetch<AiSuggestedAction>(`/ai/assistant/investigations/${encodeURIComponent(id)}/follow-up/`, {
        method: "POST",
        clientCache: false,
        timeoutMs: 30_000,
        body: JSON.stringify({ action_type: actionType, language }),
      })
      setActions((current) => [result, ...current.filter((item) => item.id !== result.id)])
    } catch (err: any) {
      setError(err?.message || t("Falha ao preparar seguimento da investigação.", "Failed to prepare investigation follow-up."))
    } finally {
      setPreparingFollowUp("")
    }
  }

  async function handleConfirmAction(action: AiSuggestedAction) {
    if (confirmingActionId) return
    setConfirmingActionId(action.id)
    setError("")
    try {
      const result = await apiFetch<AiSuggestedAction>(`/ai/assistant/actions/${action.id}/confirm/`, {
        method: "POST",
        clientCache: false,
        timeoutMs: 45_000,
        body: JSON.stringify({ confirmation_text: action.confirmation_summary || action.action_type }),
      })
      setActionResults((current) => ({ ...current, [action.id]: result }))
      setActions((current) => current.map((item) => (item.id === action.id ? { ...item, ...result } : item)))
    } catch (err: any) {
      setError(err?.message || t("Falha ao confirmar a acção da IA.", "Failed to confirm the AI action."))
    } finally {
      setConfirmingActionId(null)
    }
  }

  const findings = investigation?.findings || []
  const nextSteps = investigation?.next_steps || []
  const sources = investigation?.sources || []
  const recommendedQuestions = investigation?.recommended_questions || []
  const toolNames = investigation?.tool_names || []

  const statusMeta = STATUS_META[investigation?.status || ""] || STATUS_META.ready
  const blocked = investigation?.status === "blocked"
  const score = Math.max(0, Math.min(100, investigation?.confidence_score ?? 0))
  const criticalFindings = findings.filter((finding) => finding.severity === "critical").length
  const warningFindings = findings.filter((finding) => finding.severity === "warning").length

  const scopeRows = useMemo(() => {
    const scope = investigation?.scope || {}
    return Object.entries(scope).map(([key, value]) => ({
      key,
      value: formatScopeValue(value),
    }))
  }, [investigation?.scope])

  const actionChip =
    "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
  const neutralChip =
    "border-white/25 bg-white/[0.05] text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/[0.03]"

  return (
    <AppLayout>
      <div className="space-y-1.5">
        {/* Cabeçalho fundido: identidade + pílulas + acções num só bloco translúcido */}
        <section className="relative overflow-hidden rounded-2xl border border-violet-200/25 bg-gradient-to-br from-violet-100/[0.05] via-white/[0.015] to-indigo-100/[0.03] shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-violet-800/20 dark:from-violet-950/[0.05] dark:via-white/[0.01] dark:to-indigo-950/[0.03]">
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-violet-400/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-2.5 px-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/25">
                <Lightbulb size={15} />
              </span>
              <div className="min-w-0">
                <h1 className="line-clamp-1 text-base font-bold leading-tight text-foreground">
                  {investigation?.title || t("Investigação da IA", "AI Investigation")}
                </h1>
                <p className="text-[10px] text-muted-foreground">
                  {investigation
                    ? `${investigation.custom_id || `#${investigation.id}`} · ${formatDate(investigation.created_at)}${investigation.created_by_name ? ` · ${investigation.created_by_name}` : ""}`
                    : t("A carregar…", "Loading…")}
                </p>
              </div>
            </div>

            {investigation ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[10px] font-semibold backdrop-blur-xl ${statusMeta.chip}`}
                >
                  <statusMeta.icon size={11} />
                  {isPortuguese ? statusMeta.pt : statusMeta.en}
                </span>
                <span className="inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border border-violet-200/50 bg-violet-100/30 px-2 text-[10px] font-semibold text-violet-700 backdrop-blur-xl dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300">
                  <TerminalSquare size={11} />
                  {humanize(investigation.intent)}
                </span>
                <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/25 bg-white/[0.05] px-2 text-[10px] font-semibold text-foreground backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
                  <span className="h-1 w-10 overflow-hidden rounded-full bg-muted">
                    <span className={`block h-full rounded-full ${confidenceTone(score)}`} style={{ width: `${score}%` }} />
                  </span>
                  {score}%
                </span>
                <span className="inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border border-white/25 bg-white/[0.05] px-2 text-[10px] font-semibold text-foreground backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
                  <FileText size={11} />
                  {t("Fontes", "Sources")} <strong className="text-[11px]">{sources.length}</strong>
                </span>
              </div>
            ) : null}

            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <Link
                href="/ai/investigations"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/25 bg-white/[0.05] px-2.5 text-xs font-medium text-foreground backdrop-blur-xl transition hover:bg-white/20 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.08]"
              >
                <ArrowLeft size={13} />
                {t("Investigações", "Investigations")}
              </Link>
              <button
                type="button"
                onClick={() => void loadInvestigation()}
                disabled={loading}
                aria-label={t("Actualizar", "Refresh")}
                title={t("Actualizar", "Refresh")}
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/25 bg-white/[0.05] text-foreground backdrop-blur-xl transition hover:bg-white/20 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.08]"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCcw size={13} />}
              </button>
            </div>
          </div>

          {investigation ? (
            <div className="relative flex flex-wrap items-center gap-1.5 border-t border-white/15 px-3 py-1.5 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => void updateStatus("open")}
                disabled={investigation.status === "open" || Boolean(savingStatus)}
                className={`${actionChip} ${investigation.status === "open" ? STATUS_META.open.chip : neutralChip}`}
              >
                {savingStatus === "open" ? <Loader2 size={10} className="animate-spin" /> : <CircleDot size={10} />}
                {t("Marcar aberta", "Mark open")}
              </button>
              <button
                type="button"
                onClick={() => void updateStatus("ready")}
                disabled={investigation.status === "ready" || Boolean(savingStatus)}
                className={`${actionChip} ${investigation.status === "ready" ? STATUS_META.ready.chip : neutralChip}`}
              >
                {savingStatus === "ready" ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                {t("Marcar pronta", "Mark ready")}
              </button>
              <button
                type="button"
                onClick={() => void updateStatus("archived")}
                disabled={investigation.status === "archived" || Boolean(savingStatus)}
                className={`${actionChip} ${investigation.status === "archived" ? STATUS_META.archived.chip : neutralChip}`}
              >
                {savingStatus === "archived" ? <Loader2 size={10} className="animate-spin" /> : <Archive size={10} />}
                {t("Arquivar", "Archive")}
              </button>

              <span className="mx-1 h-4 w-px bg-border/70" />

              <button
                type="button"
                onClick={() => void prepareFollowUp("create_operational_task")}
                disabled={Boolean(preparingFollowUp)}
                className={`${actionChip} ${neutralChip}`}
              >
                {preparingFollowUp === "create_operational_task" ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <ClipboardCheck size={10} />
                )}
                {t("Preparar tarefa", "Prepare task")}
              </button>
              <button
                type="button"
                onClick={() => void prepareFollowUp("prepare_ai_report_export")}
                disabled={Boolean(preparingFollowUp)}
                className={`${actionChip} ${neutralChip}`}
              >
                {preparingFollowUp === "prepare_ai_report_export" ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <FileText size={10} />
                )}
                {t("Preparar relatório", "Prepare report")}
              </button>

              {blocked ? (
                <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  {t("Bloqueada por política de acesso.", "Blocked by access policy.")}
                </span>
              ) : null}
            </div>
          ) : null}
        </section>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
            {error}
          </div>
        ) : null}

        {loading && !investigation ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-xs text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            {t("A carregar investigação...", "Loading investigation...")}
          </div>
        ) : null}

        {!loading && !investigation ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-xs text-muted-foreground">
            <ShieldAlert size={14} />
            {t("Investigação não encontrada ou sem permissão de acesso.", "Investigation not found or access is not permitted.")}
          </div>
        ) : null}

        {investigation ? (
          <>
            <section className={`${GLASS} border-l-4 ${statusMeta.bar} p-3`}>
              <div className="grid gap-2 xl:grid-cols-[1.25fr_0.75fr]">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("Pergunta operacional", "Operational question")}
                  </div>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-foreground">
                    {investigation.question || t("Sem pergunta registada.", "No question recorded.")}
                  </p>
                  {investigation.result_summary ? (
                    <>
                      <div className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("Leitura rápida", "Quick read")}
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {investigation.result_summary}
                      </p>
                    </>
                  ) : null}
                </div>

                <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-1">
                  <SummaryMetric label={t("Criada", "Created")} value={compactDate(investigation.created_at)} />
                  <SummaryMetric label={t("Actualizada", "Updated")} value={compactDate(investigation.updated_at)} />
                  <SummaryMetric label={t("Criada por", "Created by")} value={investigation.created_by_name || "—"} />
                  <SummaryMetric
                    label={t("Sinal clínico", "Operational signal")}
                    value={
                      criticalFindings
                        ? t(`${criticalFindings} crítico(s)`, `${criticalFindings} critical`)
                        : warningFindings
                          ? t(`${warningFindings} alerta(s)`, `${warningFindings} warning`)
                          : t("Sem alertas", "No alerts")
                    }
                    tone={
                      criticalFindings
                        ? "border-rose-200/60 bg-rose-100/30 dark:border-rose-700/30 dark:bg-rose-900/10"
                        : warningFindings
                          ? "border-amber-200/60 bg-amber-100/30 dark:border-amber-700/30 dark:bg-amber-900/10"
                          : ""
                    }
                  />
                </div>
              </div>
            </section>

            {actions.length ? (
              <section className={`${GLASS} border-l-4 border-l-violet-500 px-3 py-2 dark:border-l-violet-400`}>
                <AiActionPanel
                  actions={actions}
                  confirmingId={confirmingActionId}
                  results={actionResults}
                  onConfirm={handleConfirmAction}
                />
              </section>
            ) : null}

            <div className="grid gap-1.5 xl:grid-cols-[minmax(0,1.2fr)_22rem]">
              <div className="space-y-1.5">
                <Section title={t("Achados", "Findings")} icon={Lightbulb} bar="border-l-violet-500 dark:border-l-violet-400" count={findings.length}>
                  {findings.length ? (
                    <div className="space-y-1.5">
                      {findings.map((finding, index) => (
                        <InvestigationFindingCard key={`${finding.title}-${index}`} finding={finding} />
                      ))}
                    </div>
                  ) : (
                    <p className="px-1 py-2 text-[11px] text-muted-foreground">
                      {t("Sem achados estruturados.", "No structured findings.")}
                    </p>
                  )}
                </Section>

                <Section title={t("Fontes internas", "Internal sources")} icon={FileText} bar="border-l-blue-500 dark:border-l-blue-400" count={sources.length}>
                  {sources.length ? (
                    <div className="grid gap-1.5 md:grid-cols-2">
                      {sources.map((source, index) => {
                        const content = (
                          <div className="rounded-lg border border-white/20 bg-white/20 px-2.5 py-2 transition hover:bg-white/40 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="line-clamp-1 text-[11px] font-semibold text-foreground">
                                  {source.label || source.type || "Source"}
                                </div>
                                <div className="mt-0.5 text-[10px] text-muted-foreground">
                                  {humanize(source.type)}
                                </div>
                              </div>
                              {source.href ? <ExternalLink size={12} className="mt-0.5 shrink-0 text-muted-foreground" /> : null}
                            </div>
                            <div className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                              {describeSource(source)}
                            </div>
                          </div>
                        )
                        return source.href ? (
                          <Link key={`${source.label}-${index}`} href={source.href} prefetch={false}>
                            {content}
                          </Link>
                        ) : (
                          <div key={`${source.label}-${index}`}>{content}</div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="px-1 py-2 text-[11px] text-muted-foreground">{t("Sem fontes registadas.", "No sources recorded.")}</p>
                  )}
                </Section>
              </div>

              <div className="space-y-1.5">
                <Section title={t("Próximos passos", "Next steps")} icon={ClipboardCheck} bar="border-l-cyan-500 dark:border-l-cyan-400" count={nextSteps.length}>
                  {nextSteps.length ? (
                    <div className="space-y-1.5">
                      {nextSteps.map((step, index) => (
                        <InvestigationStepCard key={`${step.label}-${index}`} step={step} />
                      ))}
                    </div>
                  ) : (
                    <p className="px-1 py-2 text-[11px] text-muted-foreground">
                      {t("Sem próximos passos registados.", "No next steps recorded.")}
                    </p>
                  )}
                </Section>

                <Section title={t("Ferramentas usadas", "Tools used")} icon={Wrench} bar="border-l-emerald-500 dark:border-l-emerald-400" count={toolNames.length}>
                  {toolNames.length ? (
                    <div className="flex flex-wrap gap-1">
                      {toolNames.map((tool) => (
                        <Badge key={tool} variant="info">{humanize(tool)}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="px-1 py-2 text-[11px] text-muted-foreground">{t("Sem ferramentas registadas.", "No tools recorded.")}</p>
                  )}
                </Section>

                <Section title={t("Escopo", "Scope")} icon={TerminalSquare} bar="border-l-amber-500 dark:border-l-amber-400" count={scopeRows.length}>
                  {scopeRows.length ? (
                    <div className="space-y-1">
                      {scopeRows.map((row) => (
                        <div key={row.key} className="rounded-lg bg-muted/40 px-2 py-1.5">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
                            {humanize(row.key)}
                          </div>
                          <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                            {row.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="px-1 py-2 text-[11px] text-muted-foreground">{t("Sem escopo adicional.", "No additional scope.")}</p>
                  )}
                </Section>
              </div>
            </div>

            {recommendedQuestions.length ? (
              <Section title={t("Perguntas recomendadas", "Recommended questions")} icon={Sparkles} bar="border-l-indigo-500 dark:border-l-indigo-400" count={recommendedQuestions.length}>
                <div className="flex flex-wrap gap-1.5">
                  {recommendedQuestions.map((question) => (
                    <Link
                      key={question}
                      href={`/ai?question=${encodeURIComponent(question)}`}
                      className="rounded-full border border-white/25 bg-white/[0.05] px-2.5 py-1 text-[10px] font-medium text-foreground backdrop-blur-xl transition hover:border-[var(--primary-300)] hover:text-[var(--primary-700)] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-[var(--primary-600)] dark:hover:text-[var(--primary-400)]"
                    >
                      {question}
                    </Link>
                  ))}
                </div>
              </Section>
            ) : null}
          </>
        ) : null}
      </div>
    </AppLayout>
  )
}
