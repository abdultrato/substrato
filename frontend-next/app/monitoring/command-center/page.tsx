"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import DataTable from "@/components/ui/DataTable"
import MetricCard from "@/components/ui/MetricCard"
import PageHeader from "@/components/ui/PageHeader"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type CommandCenterAlert = {
  id?: string
  severity?: "critical" | "warning" | "info"
  category?: string
  module_key?: string
  path?: string
  title_pt?: string
  title_en?: string
  description_pt?: string
  description_en?: string
  value?: number
  target?: number
}

type ModuleHealthRow = {
  module_key?: string
  label_pt?: string
  label_en?: string
  total_requests?: number
  success_count?: number
  client_4xx?: number
  server_5xx?: number
  error_4xx_5xx?: number
  success_rate?: number
  avg_duration_ms?: number
  slo_target?: number
  slo_gap?: number
  slo_state?: "healthy" | "warning" | "critical" | "neutral"
}

type RouteHealthRow = {
  path?: string
  server_5xx?: number
}

type ScheduledReportRow = {
  key?: string
  label_pt?: string
  label_en?: string
  frequency?: string
  next_run_at?: string
  delivery?: string
  active?: boolean
}

type CommandCenterResponse = {
  generated_at?: string
  range?: { start?: string; end?: string; days?: number }
  thresholds?: {
    slo_target?: number
    route_5xx_threshold?: number
    client_4xx_threshold?: number
    server_5xx_threshold?: number
  }
  global_totals?: {
    total_requests?: number
    success_count?: number
    client_4xx?: number
    server_5xx?: number
    error_4xx_5xx?: number
    success_rate?: number
    avg_duration_ms?: number
    modules_below_slo?: number
    active_modules?: number
  }
  modules?: ModuleHealthRow[]
  top_failing_routes?: RouteHealthRow[]
  alerts?: CommandCenterAlert[]
  outbox?: {
    pending?: number
    failed_or_dead_letter?: number
  }
  scheduled_reports?: ScheduledReportRow[]
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function fmtDateTime(value: unknown): string {
  if (!value) return "-"
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

function fmtPercent(value: unknown): string {
  const n = toNumber(value)
  return `${n.toFixed(2)}%`
}

function severityPill(severity: string | undefined, label: string) {
  const tone =
    severity === "critical"
      ? "border-rose-300 bg-rose-50 text-rose-700"
      : severity === "warning"
        ? "border-amber-300 bg-amber-50 text-amber-700"
        : "border-slate-300 bg-slate-50 text-slate-700"

  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>
}

export default function MonitoringCommandCenterPage() {
  const { t, isPortuguese } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [data, setData] = useState<CommandCenterResponse | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setErrorMessage(null)

        const response = await apiFetch<CommandCenterResponse>(
          `/monitoring/telemetry/command_center/?days=${encodeURIComponent(String(days))}&slo_target=99&route_5xx_threshold=3`,
          { clientCache: false }
        )

        if (!mounted) return
        setData(response || null)
      } catch (error: any) {
        if (!mounted) return
        setErrorMessage(
          isNotFoundLikeError(error)
            ? null
            : error?.message || t("Falha ao carregar o Centro de comando.", "Failed to load Command Center.")
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [days, safeRefreshToken, t])

  const totals = data?.global_totals || {}
  const alerts = data?.alerts || []
  const modules = data?.modules || []
  const topFailingRoutes = data?.top_failing_routes || []
  const scheduledReports = data?.scheduled_reports || []

  const alertColumns = useMemo(
    () => [
      {
        header: t("Severidade", "Severity"),
        render: (row: CommandCenterAlert) =>
          severityPill(
            row.severity,
            row.severity === "critical"
              ? t("Crítico", "Critical")
              : row.severity === "warning"
                ? t("Aviso", "Warning")
                : t("Info", "Info")
          ),
      },
      {
        header: t("Categoria", "Category"),
        render: (row: CommandCenterAlert) => row.category || "-",
      },
      {
        header: t("Título", "Title"),
        render: (row: CommandCenterAlert) => (isPortuguese ? row.title_pt : row.title_en) || "-",
      },
      {
        header: t("Descrição", "Description"),
        render: (row: CommandCenterAlert) => (isPortuguese ? row.description_pt : row.description_en) || "-",
      },
      {
        header: t("Valor", "Value"),
        render: (row: CommandCenterAlert) => toNumber(row.value).toLocaleString(),
        className: "text-right",
      },
      {
        header: t("Meta", "Target"),
        render: (row: CommandCenterAlert) => toNumber(row.target).toLocaleString(),
        className: "text-right",
      },
    ],
    [isPortuguese, t]
  )

  const moduleColumns = useMemo(
    () => [
      {
        header: t("Módulo", "Module"),
        render: (row: ModuleHealthRow) => (isPortuguese ? row.label_pt : row.label_en) || row.module_key || "-",
      },
      {
        header: t("Estado SLO", "SLO state"),
        render: (row: ModuleHealthRow) =>
          row.slo_state === "critical"
            ? t("Crítico", "Critical")
            : row.slo_state === "warning"
              ? t("Aviso", "Warning")
              : row.slo_state === "healthy"
                ? t("Saudável", "Healthy")
                : t("Neutro", "Neutral"),
      },
      {
        header: t("Taxa de sucesso", "Success rate"),
        render: (row: ModuleHealthRow) => fmtPercent(row.success_rate),
        className: "text-right",
      },
      {
        header: t("Meta SLO", "SLO target"),
        render: (row: ModuleHealthRow) => fmtPercent(row.slo_target),
        className: "text-right",
      },
      {
        header: t("Total de pedidos", "Total requests"),
        render: (row: ModuleHealthRow) => toNumber(row.total_requests).toLocaleString(),
        className: "text-right",
      },
      {
        header: t("Erros 4xx/5xx", "4xx/5xx errors"),
        render: (row: ModuleHealthRow) => toNumber(row.error_4xx_5xx).toLocaleString(),
        className: "text-right",
      },
      {
        header: t("Latência média (ms)", "Average latency (ms)"),
        render: (row: ModuleHealthRow) => toNumber(row.avg_duration_ms).toLocaleString(),
        className: "text-right",
      },
    ],
    [isPortuguese, t]
  )

  const routeColumns = useMemo(
    () => [
      { header: t("Rota", "Route"), render: (row: RouteHealthRow) => row.path || "-" },
      {
        header: t("Falhas 5xx", "5xx failures"),
        render: (row: RouteHealthRow) => toNumber(row.server_5xx).toLocaleString(),
        className: "text-right",
      },
    ],
    [t]
  )

  const reportColumns = useMemo(
    () => [
      {
        header: t("Relatório", "Report"),
        render: (row: ScheduledReportRow) => (isPortuguese ? row.label_pt : row.label_en) || row.key || "-",
      },
      {
        header: t("Frequência", "Frequency"),
        render: (row: ScheduledReportRow) => row.frequency || "-",
      },
      {
        header: t("Próxima execução", "Next run"),
        render: (row: ScheduledReportRow) => fmtDateTime(row.next_run_at),
      },
      {
        header: t("Canal", "Channel"),
        render: (row: ScheduledReportRow) => row.delivery || "-",
      },
      {
        header: t("Ativo", "Active"),
        render: (row: ScheduledReportRow) => (row.active ? t("Sim", "Yes") : t("Não", "No")),
      },
    ],
    [isPortuguese, t]
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN]}>
      <div className="space-y-6">
        <PageHeader
          title={t("Centro de comando operacional", "Operational Command Center")}
          subtitle={t(
            "Observabilidade ativa com alertas automáticos, SLO por módulo e rastreio operacional centralizado.",
            "Active observability with automatic alerts, module-level SLO and centralized operational tracking."
          )}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-[var(--gray-700)]">
                <span>{t("Janela", "Window")}</span>
                <select
                  value={days}
                  onChange={(event) => setDays(Number(event.target.value))}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm"
                >
                  <option value={7}>{t("7 dias", "7 days")}</option>
                  <option value={30}>{t("30 dias", "30 days")}</option>
                  <option value={90}>{t("90 dias", "90 days")}</option>
                </select>
              </label>

              <Link
                href="/monitoring"
                className="inline-flex items-center rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground-2 shadow-sm transition hover:bg-muted"
              >
                {t("Voltar", "Back")}
              </Link>

              <Link
                href="/admin/monitoring/systemerror/"
                className="inline-flex items-center rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
              >
                {t("Abrir na Administração", "Open in Administration")}
              </Link>
            </div>
          }
        />

        {data?.range ? (
          <div className="text-xs text-[var(--muted-foreground)]">
            {t("Intervalo", "Range")}: {fmtDateTime(data.range.start)} {t("até", "to")} {fmtDateTime(data.range.end)}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{errorMessage}</div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={t("Total de pedidos", "Total requests")} value={loading ? "..." : toNumber(totals.total_requests).toLocaleString()} />
          <MetricCard label={t("Taxa global de sucesso", "Global success rate")} value={loading ? "..." : fmtPercent(totals.success_rate)} />
          <MetricCard label={t("Alertas ativos", "Active alerts")} value={loading ? "..." : alerts.length} />
          <MetricCard label={t("Módulos abaixo do SLO", "Modules below SLO")} value={loading ? "..." : toNumber(totals.modules_below_slo).toLocaleString()} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={t("Erros 4xx", "4xx errors")} value={loading ? "..." : toNumber(totals.client_4xx).toLocaleString()} />
          <MetricCard label={t("Erros 5xx", "5xx errors")} value={loading ? "..." : toNumber(totals.server_5xx).toLocaleString()} />
          <MetricCard label={t("Latência média (ms)", "Average latency (ms)")} value={loading ? "..." : toNumber(totals.avg_duration_ms).toLocaleString()} />
          <MetricCard
            label={t("Outbox pendente/falhado", "Outbox pending/failed")}
            value={
              loading
                ? "..."
                : `${toNumber(data?.outbox?.pending).toLocaleString()} / ${toNumber(data?.outbox?.failed_or_dead_letter).toLocaleString()}`
            }
          />
        </div>

        <Card
          title={t("Alertas operacionais", "Operational alerts")}
          subtitle={t(
            "Lista priorizada por severidade para resposta rápida da equipa de operação.",
            "Severity-prioritized list for fast operational response."
          )}
        >
          <DataTable columns={alertColumns as any} data={alerts} emptyMessage={t("Sem alertas no período selecionado.", "No alerts for the selected period.")} />
        </Card>

        <Card
          title={t("Saúde por módulo", "Module health")}
          subtitle={t(
            "SLO, volume de requests e erro operacional em cada módulo do sistema.",
            "SLO, request volume and operational error footprint for each system module."
          )}
        >
          <DataTable columns={moduleColumns as any} data={modules} emptyMessage={t("Sem dados de módulos.", "No module data.")} />
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card
            title={t("Rotas críticas com falhas", "Critical failing routes")}
            subtitle={t(
              "Rotas com incidência de 5xx no período filtrado.",
              "Routes with 5xx incidence in the selected period."
            )}
          >
            <DataTable columns={routeColumns as any} data={topFailingRoutes} emptyMessage={t("Sem rotas críticas no período.", "No critical routes in period.")} />
          </Card>

          <Card
            title={t("Relatórios agendados", "Scheduled reports")}
            subtitle={t(
              "Plano de geração automática para acompanhamento executivo e governança.",
              "Automatic generation plan for executive follow-up and governance."
            )}
          >
            <DataTable columns={reportColumns as any} data={scheduledReports} emptyMessage={t("Sem relatórios agendados.", "No scheduled reports.")} />
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
