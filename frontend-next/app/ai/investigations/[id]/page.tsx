"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, CheckCircle2, ExternalLink, Lightbulb, RefreshCcw, ShieldAlert } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { type AiInvestigation, type AiInvestigationFinding, type AiInvestigationStep } from "@/components/ai/AiInvestigationPanel"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import { useLanguage } from "@/hooks/useLanguage"
import { apiFetch } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"

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

function statusVariant(status?: string): "default" | "success" | "warning" | "danger" | "info" {
  if (status === "blocked") return "warning"
  if (status === "archived") return "default"
  if (status === "open") return "info"
  return "success"
}

function severityVariant(severity?: string): "default" | "success" | "warning" | "danger" | "info" {
  if (severity === "critical") return "danger"
  if (severity === "warning") return "warning"
  return "info"
}

function InvestigationFindingCard({ finding }: { finding: AiInvestigationFinding }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{finding.title || "Finding"}</div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{finding.detail || "—"}</p>
        </div>
        <Badge variant={severityVariant(finding.severity)}>{finding.severity || "info"}</Badge>
      </div>
      {finding.source ? (
        <div className="mt-2 text-xs font-medium text-muted-foreground">{finding.source}</div>
      ) : null}
    </div>
  )
}

function InvestigationStepCard({ step }: { step: AiInvestigationStep }) {
  const content = (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-3 shadow-sm transition hover:border-primary/35 hover:bg-muted/30">
      <div>
        <div className="font-semibold text-foreground">{step.label || "Follow up"}</div>
        <div className="mt-1 text-xs text-muted-foreground">{humanize(step.kind)} · {humanize(step.priority)}</div>
      </div>
      {step.href ? <ExternalLink size={16} className="text-muted-foreground" /> : null}
    </div>
  )
  if (!step.href) return content
  return (
    <Link href={step.href} prefetch={false}>
      {content}
    </Link>
  )
}

export default function AiInvestigationDetailPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const { t } = useLanguage()
  const [investigation, setInvestigation] = useState<AiInvestigation | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingStatus, setSavingStatus] = useState("")
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
  }, [loadInvestigation])

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

  const findings = investigation?.findings || []
  const nextSteps = investigation?.next_steps || []
  const sources = investigation?.sources || []
  const recommendedQuestions = investigation?.recommended_questions || []
  const toolNames = investigation?.tool_names || []

  const sourceCount = sources.length
  const blocked = investigation?.status === "blocked"
  const archived = investigation?.status === "archived"

  const scopeRows = useMemo(() => {
    const scope = investigation?.scope || {}
    return Object.entries(scope).map(([key, value]) => ({
      key,
      value: typeof value === "string" || typeof value === "number" ? String(value) : JSON.stringify(value),
    }))
  }, [investigation?.scope])

  return (
    <AppLayout>
      <div className="space-y-5">
        <PageHeader
          title={investigation?.title || t("Investigação da IA", "AI Investigation")}
          subtitle={t(
            "Detalhe auditável com achados, fontes, ferramentas, próximos passos e estado operacional.",
            "Auditable detail with findings, sources, tools, next steps and operational status."
          )}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/ai/investigations"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
              >
                <ArrowLeft size={15} />
                {t("Investigações", "Investigations")}
              </Link>
              <Button type="button" variant="secondary" loading={loading} onClick={() => void loadInvestigation()}>
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
            {t("A carregar investigação...", "Loading investigation...")}
          </div>
        ) : null}

        {!loading && !investigation ? (
          <Card>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldAlert size={16} />
              {t("Investigação não encontrada ou sem permissão de acesso.", "Investigation not found or access is not permitted.")}
            </div>
          </Card>
        ) : null}

        {investigation ? (
          <>
            <div className="overflow-hidden rounded-3xl border border-border bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),linear-gradient(135deg,rgba(2,6,23,0.96),rgba(15,23,42,0.88))] p-4 text-white shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(investigation.status)}>{humanize(investigation.status)}</Badge>
                    <Badge variant="info">{humanize(investigation.intent)}</Badge>
                    <Badge variant="default">{investigation.confidence_score ?? 0}%</Badge>
                  </div>
                  <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">{investigation.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/70">
                    {investigation.question || investigation.result_summary || t("Sem pergunta registada.", "No question recorded.")}
                  </p>
                  {investigation.result_summary ? (
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/80">{investigation.result_summary}</p>
                  ) : null}
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[20rem] lg:grid-cols-1">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-white/55">{t("Criada", "Created")}</div>
                    <div className="mt-1 font-semibold">{formatDate(investigation.created_at)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-white/55">{t("Fontes", "Sources")}</div>
                    <div className="mt-1 font-semibold">{sourceCount}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-white/55">{t("Criada por", "Created by")}</div>
                    <div className="mt-1 font-semibold">{investigation.created_by_name || "—"}</div>
                  </div>
                </div>
              </div>
            </div>

            <Card title={t("Estado operacional", "Operational status")}>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={investigation.status === "open" ? "primary" : "secondary"}
                  loading={savingStatus === "open"}
                  disabled={investigation.status === "open"}
                  onClick={() => void updateStatus("open")}
                >
                  <Lightbulb size={15} />
                  {t("Marcar aberta", "Mark open")}
                </Button>
                <Button
                  type="button"
                  variant={investigation.status === "ready" ? "primary" : "secondary"}
                  loading={savingStatus === "ready"}
                  disabled={investigation.status === "ready"}
                  onClick={() => void updateStatus("ready")}
                >
                  <CheckCircle2 size={15} />
                  {t("Marcar pronta", "Mark ready")}
                </Button>
                <Button
                  type="button"
                  variant={archived ? "primary" : "secondary"}
                  loading={savingStatus === "archived"}
                  disabled={archived}
                  onClick={() => void updateStatus("archived")}
                >
                  {t("Arquivar", "Archive")}
                </Button>
                {blocked ? (
                  <div className="text-sm text-amber-700 dark:text-amber-200">
                    {t("Esta investigação está bloqueada por política de acesso.", "This investigation is blocked by access policy.")}
                  </div>
                ) : null}
              </div>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <Card title={t("Achados", "Findings")}>
                <div className="space-y-3">
                  {findings.length ? findings.map((finding, index) => (
                    <InvestigationFindingCard key={`${finding.title}-${index}`} finding={finding} />
                  )) : (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                      {t("Sem achados estruturados.", "No structured findings.")}
                    </div>
                  )}
                </div>
              </Card>

              <Card title={t("Próximos passos", "Next steps")}>
                <div className="space-y-3">
                  {nextSteps.length ? nextSteps.map((step, index) => (
                    <InvestigationStepCard key={`${step.label}-${index}`} step={step} />
                  )) : (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                      {t("Sem próximos passos registados.", "No next steps recorded.")}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <Card title={t("Fontes internas", "Internal sources")}>
                <div className="space-y-2">
                  {sources.length ? sources.map((source, index) => {
                    const content = (
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm transition hover:bg-muted/30">
                        <span className="truncate">{source.label || source.type || "Source"}</span>
                        {source.href ? <ExternalLink size={14} className="text-muted-foreground" /> : null}
                      </div>
                    )
                    return source.href ? (
                      <Link key={`${source.label}-${index}`} href={source.href} prefetch={false}>
                        {content}
                      </Link>
                    ) : (
                      <div key={`${source.label}-${index}`}>{content}</div>
                    )
                  }) : (
                    <p className="text-sm text-muted-foreground">{t("Sem fontes registadas.", "No sources recorded.")}</p>
                  )}
                </div>
              </Card>

              <Card title={t("Ferramentas usadas", "Tools used")}>
                <div className="flex flex-wrap gap-2">
                  {toolNames.length ? toolNames.map((tool) => (
                    <Badge key={tool} variant="info">{humanize(tool)}</Badge>
                  )) : (
                    <p className="text-sm text-muted-foreground">{t("Sem ferramentas registadas.", "No tools recorded.")}</p>
                  )}
                </div>
              </Card>

              <Card title={t("Escopo", "Scope")}>
                <div className="space-y-2 text-sm">
                  {scopeRows.length ? scopeRows.map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-3 py-2">
                      <span className="font-semibold text-foreground">{humanize(row.key)}</span>
                      <span className="truncate text-muted-foreground">{row.value}</span>
                    </div>
                  )) : (
                    <p className="text-muted-foreground">{t("Sem escopo adicional.", "No additional scope.")}</p>
                  )}
                </div>
              </Card>
            </div>

            <Card title={t("Perguntas recomendadas", "Recommended questions")}>
              <div className="flex flex-wrap gap-2">
                {recommendedQuestions.length ? recommendedQuestions.map((question) => (
                  <Link
                    key={question}
                    href={`/ai?question=${encodeURIComponent(question)}`}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted"
                  >
                    {question}
                  </Link>
                )) : (
                  <p className="text-sm text-muted-foreground">{t("Sem perguntas recomendadas.", "No recommended questions.")}</p>
                )}
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </AppLayout>
  )
}
