"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Bell, ClipboardCheck, ClipboardList, FileText, MapPin, PackageCheck, Syringe } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Badge from "@/components/ui/Badge"
import Card from "@/components/ui/Card"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS } from "@/lib/rbac"

type PublicHealthSummary = {
  vaccines: number
  active_lots: number
  active_campaigns: number
  immunizations_30d: number
  due_boosters: number
  serious_aefi_open: number
  pending_notifications: number
  low_stock_lots: number
  cold_chain_breaches: number
  expired_lots: number
}

type StockRisk = {
  id: number
  custom_id?: string
  vaccine_name?: string
  lot_number?: string
  status?: string
  expiration_date?: string
  doses_available?: number
  reserved_doses?: number
  cold_chain_status?: string
  storage_location?: string
  risk?: string
}

type CampaignProgress = {
  id: number
  custom_id?: string
  name?: string
  vaccine_name?: string
  status?: string
  target_region?: string
  start_date?: string
  end_date?: string | null
  target_doses?: number
  administered_doses?: number
  coverage_percent?: string | number
}

type BoosterDue = {
  id: number
  custom_id?: string
  patient_id?: number
  patient_name?: string
  vaccine_name?: string
  dose_number?: number
  administered_at?: string
  next_due_date?: string
  days_overdue?: number
}

type AefiQueueItem = {
  id: number
  custom_id?: string
  patient_name?: string
  vaccine_name?: string
  severity?: string
  status?: string
  serious?: boolean
  reported_at?: string
  investigation_due_at?: string | null
}

type NotificationQueueItem = {
  id: number
  custom_id?: string
  official_system?: string
  event_type?: string
  status?: string
  external_reference?: string
  attempt_count?: number
  next_retry_at?: string | null
  error_message?: string
}

type PublicHealthDashboard = {
  summary: PublicHealthSummary
  stock_risks: StockRisk[]
  campaign_progress: CampaignProgress[]
  booster_queue: BoosterDue[]
  aefi_queue: AefiQueueItem[]
  notification_queue: NotificationQueueItem[]
}

const EMPTY_SUMMARY: PublicHealthSummary = {
  vaccines: 0,
  active_lots: 0,
  active_campaigns: 0,
  immunizations_30d: 0,
  due_boosters: 0,
  serious_aefi_open: 0,
  pending_notifications: 0,
  low_stock_lots: 0,
  cold_chain_breaches: 0,
  expired_lots: 0,
}

const EMPTY_DASHBOARD: PublicHealthDashboard = {
  summary: EMPTY_SUMMARY,
  stock_risks: [],
  campaign_progress: [],
  booster_queue: [],
  aefi_queue: [],
  notification_queue: [],
}

export default function PublicHealthHubPage() {
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<PublicHealthDashboard>(EMPTY_DASHBOARD)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const payload = await apiFetch<PublicHealthDashboard>("/public_health/dashboard/", {
          clientCache: safeRefreshToken === 0,
          clientCacheTtlMs: 30000,
        })

        if (!mounted) return
        setDashboard(normalizeDashboard(payload))
      } catch (e: any) {
        if (!mounted) return
        setError(
          isNotFoundLikeError(e)
            ? null
            : e?.message || t("Falha ao carregar o módulo de saúde pública.", "Failed to load the public health module.")
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [safeRefreshToken, t])

  const metricValue = useMemo(() => (loading ? "..." : null), [loading])
  const summary = dashboard.summary

  return (
    <AppLayout requiredGroups={PUBLIC_HEALTH_GROUPS}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <WorkspaceHub
          title="Substrato Saúde Pública"
          subtitle={t(
            "Gestão de vacinas, lotes, reforços, campanhas por região, eventos adversos pós-vacinação e notificações oficiais.",
            "Management of vaccines, lots, boosters, regional campaigns, adverse events following immunization and official notifications."
          )}
          adminHref="/admin/saude_publica/"
          secondaryCta={{ href: "/public-health/vaccines", label: t("Recursos de Saúde Pública", "Public health resources") }}
          metrics={[
            { label: "Vacinas", value: metricValue || summary.vaccines },
            { label: "Lotes ativos", value: metricValue || summary.active_lots },
            { label: "Campanhas ativas", value: metricValue || summary.active_campaigns },
            { label: "Imunizações 30d", value: metricValue || summary.immunizations_30d },
            { label: "Reforços vencidos", value: metricValue || summary.due_boosters },
            { label: "AEFI graves", value: metricValue || summary.serious_aefi_open },
            { label: "Notificações pendentes", value: metricValue || summary.pending_notifications },
            {
              label: "Riscos de stock",
              value: metricValue || (summary.low_stock_lots + summary.cold_chain_breaches + summary.expired_lots),
              hint: t("Stock baixo, validade ou cadeia fria.", "Low stock, expiry or cold chain."),
            },
          ]}
          actions={[
            {
              title: "Vacinas",
              description: t("Produtos vacinais, doenças alvo, doses requeridas, reforços e cadeia fria.", "Vaccine products, target diseases, required doses, boosters and cold chain."),
              href: "/public-health/vaccines",
              icon: Syringe,
            },
            {
              title: "Lotes e stock",
              description: t("Validade, doses disponíveis, quarentena, recolha e quebra de cadeia fria.", "Expiry, available doses, quarantine, recall and cold-chain breach."),
              href: "/public-health/lots",
              icon: PackageCheck,
            },
            {
              title: "Campanhas",
              description: t("Campanhas de gripe, HPV, COVID, rotina, surto ou vacinação escolar.", "Flu, HPV, COVID, routine, outbreak or school vaccination campaigns."),
              href: "/public-health/campaigns",
              icon: ClipboardList,
            },
            {
              title: "Metas por região",
              description: t("População alvo, distrito, faixa etária, doses planeadas e cobertura.", "Target population, district, age range, planned doses and coverage."),
              href: "/public-health/targets",
              icon: MapPin,
            },
            {
              title: "Registos de imunização",
              description: t("Histórico vacinal, lote rastreável, dose aplicada e próxima data de reforço.", "Vaccine history, traceable lot, administered dose and next booster date."),
              href: "/public-health/immunizations",
              icon: ClipboardCheck,
            },
            {
              title: "Eventos adversos",
              description: t("AEFI, gravidade, investigação, sintomas, desfecho e causalidade.", "AEFI, severity, investigation, symptoms, outcome and causality."),
              href: "/public-health/adverse-events",
              icon: Bell,
            },
            {
              title: "Notificações oficiais",
              description: t("Integração e-SUS, SIPNI, DHIS2 ou sistemas oficiais customizados.", "Integration with e-SUS, SIPNI, DHIS2 or custom official systems."),
              href: "/public-health/notifications",
              icon: FileText,
            },
          ]}
        />

        <div className="grid gap-4 xl:grid-cols-2">
          <QueuePanel
            title={t("Lotes em risco", "Lots at risk")}
            subtitle={t("Stock, validade, quarentena e cadeia fria.", "Stock, expiry, quarantine and cold chain.")}
            href="/public-health/lots"
            emptyMessage={loading ? "..." : t("Sem lotes em risco.", "No lots at risk.")}
          >
            {dashboard.stock_risks.map((item) => (
              <QueueRow
                key={item.id}
                title={`${item.vaccine_name || "Vacina"} - ${item.lot_number || item.custom_id || item.id}`}
                subtitle={`${formatDate(item.expiration_date)} · ${item.doses_available ?? 0} doses · ${item.storage_location || "-"}`}
                href={`/public-health/lots/${item.id}`}
                badge={<Badge variant={riskVariant(item.risk)}>{item.risk || item.status || "-"}</Badge>}
              />
            ))}
          </QueuePanel>

          <QueuePanel
            title={t("Campanhas ativas", "Active campaigns")}
            subtitle={t("Cobertura de doses e região alvo.", "Dose coverage and target region.")}
            href="/public-health/campaigns"
            emptyMessage={loading ? "..." : t("Sem campanha ativa.", "No active campaign.")}
          >
            {dashboard.campaign_progress.map((item) => (
              <QueueRow
                key={item.id}
                title={item.name || item.custom_id || String(item.id)}
                subtitle={`${item.vaccine_name || "-"} · ${item.target_region || "-"} · ${item.administered_doses ?? 0}/${item.target_doses ?? 0} doses`}
                href={`/public-health/campaigns/${item.id}`}
                badge={<Badge variant="info">{formatPercent(item.coverage_percent)}</Badge>}
              />
            ))}
          </QueuePanel>

          <QueuePanel
            title={t("Reforços vencidos", "Overdue boosters")}
            subtitle={t("Pacientes com próxima dose em atraso.", "Patients with overdue next dose.")}
            href="/public-health/immunizations"
            emptyMessage={loading ? "..." : t("Sem reforços vencidos.", "No overdue boosters.")}
          >
            {dashboard.booster_queue.map((item) => (
              <QueueRow
                key={item.id}
                title={item.patient_name || item.custom_id || String(item.id)}
                subtitle={`${item.vaccine_name || "-"} · dose ${item.dose_number ?? "-"} · vence ${formatDate(item.next_due_date)}`}
                href={`/public-health/immunizations/${item.id}`}
                badge={<Badge variant={item.days_overdue ? "warning" : "info"}>{item.days_overdue || 0} dias</Badge>}
              />
            ))}
          </QueuePanel>

          <QueuePanel
            title={t("AEFI em investigação", "AEFI under investigation")}
            subtitle={t("Eventos graves ainda abertos.", "Serious events still open.")}
            href="/public-health/adverse-events"
            emptyMessage={loading ? "..." : t("Sem AEFI grave aberto.", "No open serious AEFI.")}
          >
            {dashboard.aefi_queue.map((item) => (
              <QueueRow
                key={item.id}
                title={item.patient_name || item.custom_id || String(item.id)}
                subtitle={`${item.vaccine_name || "-"} · reportado ${formatDateTime(item.reported_at)} · investigar até ${formatDateTime(item.investigation_due_at)}`}
                href={`/public-health/adverse-events/${item.id}`}
                badge={<Badge variant={item.serious ? "danger" : "warning"}>{item.severity || item.status || "-"}</Badge>}
              />
            ))}
          </QueuePanel>

          <div className="xl:col-span-2">
            <QueuePanel
              title={t("Notificações oficiais pendentes", "Pending official notifications")}
              subtitle={t("Integração com e-SUS, SIPNI, DHIS2 ou sistema oficial configurado.", "Integration with e-SUS, SIPNI, DHIS2 or configured official system.")}
              href="/public-health/notifications"
              emptyMessage={loading ? "..." : t("Sem notificação oficial pendente.", "No pending official notification.")}
            >
              {dashboard.notification_queue.map((item) => (
                <QueueRow
                  key={item.id}
                  title={`${item.official_system || "-"} · ${item.event_type || "-"}`}
                  subtitle={`${item.external_reference || item.custom_id || item.id} · tentativas ${item.attempt_count ?? 0} · próxima ${formatDateTime(item.next_retry_at)}`}
                  href={`/public-health/notifications/${item.id}`}
                  badge={<Badge variant={notificationVariant(item.status)}>{item.status || "-"}</Badge>}
                />
              ))}
            </QueuePanel>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export const PUBLIC_HEALTH_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.RECEPCAO,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.ENFERMAGEM,
  GROUPS.LABORATORIO,
  GROUPS.SAUDE_PUBLICA,
]

function normalizeDashboard(payload?: Partial<PublicHealthDashboard> | null): PublicHealthDashboard {
  return {
    summary: { ...EMPTY_SUMMARY, ...(payload?.summary || {}) },
    stock_risks: payload?.stock_risks || [],
    campaign_progress: payload?.campaign_progress || [],
    booster_queue: payload?.booster_queue || [],
    aefi_queue: payload?.aefi_queue || [],
    notification_queue: payload?.notification_queue || [],
  }
}

function formatDate(value?: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function formatPercent(value?: string | number): string {
  const parsed = Number(value ?? 0)
  if (!Number.isFinite(parsed)) return "0%"
  return `${parsed.toFixed(2)}%`
}

function riskVariant(risk?: string): "default" | "success" | "warning" | "danger" | "info" {
  const text = String(risk || "").toLocaleLowerCase("pt")
  if (text.includes("expir") || text.includes("quebra") || text.includes("sem doses")) return "danger"
  if (text.includes("baixo") || text.includes("validade") || text.includes("quarentena")) return "warning"
  return "info"
}

function notificationVariant(status?: string): "default" | "success" | "warning" | "danger" | "info" {
  if (status === "FAILED" || status === "REJECTED") return "danger"
  if (status === "PENDING") return "warning"
  if (status === "SENT" || status === "ACCEPTED") return "success"
  return "info"
}

function QueuePanel({
  title,
  subtitle,
  href,
  emptyMessage,
  children,
}: {
  title: string
  subtitle: string
  href: string
  emptyMessage: string
  children: ReactNode
}) {
  const { t } = useLanguage()

  return (
    <Card
      title={title}
      subtitle={subtitle}
      actions={
        <Link href={href} className="text-xs font-semibold text-primary hover:underline">
          {t("Abrir", "Open")}
        </Link>
      }
    >
      <div className="divide-y divide-border">
        {Array.isArray(children) && children.length === 0 ? (
          <div className="py-5 text-sm text-muted-foreground">{emptyMessage}</div>
        ) : (
          children
        )}
      </div>
    </Card>
  )
}

function QueueRow({
  title,
  subtitle,
  href,
  badge,
}: {
  title: string
  subtitle: string
  href: string
  badge: ReactNode
}) {
  return (
    <Link href={href} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <span className="shrink-0">{badge}</span>
    </Link>
  )
}
