"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, ExternalLink, Lightbulb, RefreshCcw, Search } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { type AiInvestigation } from "@/components/ai/AiInvestigationPanel"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import TextInput from "@/components/ui/TextInput"
import { useLanguage } from "@/hooks/useLanguage"
import { apiFetch } from "@/lib/api"

const STATUS_OPTIONS = ["", "ready", "open", "blocked", "archived"]
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

function statusVariant(status?: string): "default" | "success" | "warning" | "danger" | "info" {
  if (status === "blocked") return "warning"
  if (status === "archived") return "default"
  if (status === "open") return "info"
  return "success"
}

function humanize(value?: string) {
  return String(value || "—").replace(/_/g, " ")
}

export default function AiInvestigationsPage() {
  const { t } = useLanguage()
  const [rows, setRows] = useState<AiInvestigation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const [intent, setIntent] = useState("")

  const loadInvestigations = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set("q", query.trim())
      if (status) params.set("status", status)
      if (intent) params.set("intent", intent)
      params.set("limit", "150")
      const suffix = params.toString()
      const result = await apiFetch<AiInvestigation[]>(`/ai/assistant/investigations/${suffix ? `?${suffix}` : ""}`, {
        clientCache: false,
        timeoutMs: 30_000,
      })
      setRows(Array.isArray(result) ? result : [])
    } catch (err: any) {
      setError(err?.message || t("Falha ao carregar investigações da IA.", "Failed to load AI investigations."))
    } finally {
      setLoading(false)
    }
  }, [intent, query, status, t])

  useEffect(() => {
    void loadInvestigations()
  }, [loadInvestigations])

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

  return (
    <AppLayout>
      <div className="space-y-5">
        <PageHeader
          title={t("Investigações da IA", "AI Investigations")}
          subtitle={t(
            "Workspace persistente para rever achados, fontes, próximos passos e estado das investigações geradas pela IA.",
            "Persistent workspace to review findings, sources, next steps and status from AI-generated investigations."
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
              <Button type="button" variant="secondary" loading={loading} onClick={() => void loadInvestigations()}>
                <RefreshCcw size={15} />
                {t("Actualizar", "Refresh")}
              </Button>
            </div>
          }
        />

        <div className="grid gap-3 sm:grid-cols-4">
          <Card>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Total", "Total")}</div>
            <div className="mt-1 font-display text-3xl font-semibold text-foreground">{stats.total}</div>
          </Card>
          <Card>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Activas", "Active")}</div>
            <div className="mt-1 font-display text-3xl font-semibold text-foreground">{stats.active}</div>
          </Card>
          <Card>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Bloqueadas", "Blocked")}</div>
            <div className="mt-1 font-display text-3xl font-semibold text-foreground">{stats.blocked}</div>
          </Card>
          <Card>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Arquivadas", "Archived")}</div>
            <div className="mt-1 font-display text-3xl font-semibold text-foreground">{stats.archived}</div>
          </Card>
        </div>

        <Card title={t("Filtros de investigação", "Investigation filters")}>
          <div className="grid gap-3 lg:grid-cols-[1.5fr_0.8fr_1fr_auto]">
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Pesquisar por pergunta, título ou resumo", "Search by question, title or summary")}
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
              value={intent}
              onChange={(event) => setIntent(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
            >
              {INTENT_OPTIONS.map((item) => (
                <option key={item || "all"} value={item}>
                  {item ? humanize(item) : t("Todas as intenções", "All intents")}
                </option>
              ))}
            </select>
            <Button type="button" loading={loading} onClick={() => void loadInvestigations()}>
              <Search size={15} />
              {t("Pesquisar", "Search")}
            </Button>
          </div>
        </Card>

        <Card title={t("Histórico estruturado", "Structured history")}>
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              {t("A carregar investigações...", "Loading investigations...")}
            </div>
          ) : null}

          {!loading && !rows.length ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
              {t("Ainda não há investigações para estes filtros.", "There are no investigations for these filters yet.")}
            </div>
          ) : null}

          <div className="grid gap-3 xl:grid-cols-2">
            {rows.map((item) => (
              <Link
                key={item.id || item.custom_id}
                href={`/ai/investigations/${item.id}`}
                className="group rounded-2xl border border-border bg-background p-3 shadow-sm transition hover:border-primary/40 hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      <Lightbulb size={17} />
                      <span className="line-clamp-1">{item.title || t("Investigação da IA", "AI investigation")}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {item.question || item.result_summary || t("Sem pergunta registada.", "No question recorded.")}
                    </p>
                  </div>
                  <ExternalLink size={16} className="shrink-0 text-muted-foreground transition group-hover:text-primary" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(item.status)}>{humanize(item.status)}</Badge>
                  <Badge variant="info">{humanize(item.intent)}</Badge>
                  <Badge variant="default">{item.confidence_score ?? 0}%</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{item.custom_id || `#${item.id}`}</span>
                  <span>{formatDate(item.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
