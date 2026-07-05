"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react"
import { Bell, ClipboardCheck, ClipboardList, FileText, MapPin, PackageCheck, Syringe } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
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
          title="Saúde Pública"
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

        <div className="grid gap-3 xl:grid-cols-2">
          <QueuePanel
            title={t("Lotes em risco", "Lots at risk")}
            subtitle={t("Stock, validade, quarentena e cadeia fria.", "Stock, expiry, quarantine and cold chain.")}
            href="/public-health/lots"
            icon={PackageCheck}
            theme={PANEL_THEMES.lots}
            count={dashboard.stock_risks.length}
            loading={loading}
            emptyMessage={t("Sem lotes em risco.", "No lots at risk.")}
          >
            {dashboard.stock_risks.map((item) => (
              <QueueRow
                key={item.id}
                emoji="📦"
                barTone={riskVariant(item.risk)}
                title={`${item.vaccine_name || "Vacina"} · ${item.lot_number || item.custom_id || item.id}`}
                subtitle={`${formatDate(item.expiration_date)} · ${item.doses_available ?? 0} doses · ${item.storage_location || "-"}`}
                href={`/public-health/lots/${item.id}`}
                badge={<Chip tone={riskVariant(item.risk)}>{item.risk || item.status || "-"}</Chip>}
              />
            ))}
          </QueuePanel>

          <QueuePanel
            title={t("Campanhas ativas", "Active campaigns")}
            subtitle={t("Cobertura de doses e região alvo.", "Dose coverage and target region.")}
            href="/public-health/campaigns"
            icon={ClipboardList}
            theme={PANEL_THEMES.campaigns}
            count={dashboard.campaign_progress.length}
            loading={loading}
            emptyMessage={t("Sem campanha ativa.", "No active campaign.")}
          >
            {dashboard.campaign_progress.map((item) => (
              <QueueRow
                key={item.id}
                emoji="📣"
                barTone="info"
                title={item.name || item.custom_id || String(item.id)}
                subtitle={`${item.vaccine_name || "-"} · ${item.target_region || "-"} · ${item.administered_doses ?? 0}/${item.target_doses ?? 0} doses`}
                href={`/public-health/campaigns/${item.id}`}
                badge={<Chip tone="info">{formatPercent(item.coverage_percent)}</Chip>}
              />
            ))}
          </QueuePanel>

          <QueuePanel
            title={t("Reforços vencidos", "Overdue boosters")}
            subtitle={t("Pacientes com próxima dose em atraso.", "Patients with overdue next dose.")}
            href="/public-health/immunizations"
            icon={Syringe}
            theme={PANEL_THEMES.boosters}
            count={dashboard.booster_queue.length}
            loading={loading}
            emptyMessage={t("Sem reforços vencidos.", "No overdue boosters.")}
          >
            {dashboard.booster_queue.map((item) => (
              <QueueRow
                key={item.id}
                emoji="💉"
                barTone={item.days_overdue ? "warning" : "info"}
                title={item.patient_name || item.custom_id || String(item.id)}
                subtitle={`${item.vaccine_name || "-"} · dose ${item.dose_number ?? "-"} · vence ${formatDate(item.next_due_date)}`}
                href={`/public-health/immunizations/${item.id}`}
                badge={<Chip tone={item.days_overdue ? "warning" : "info"}>{item.days_overdue || 0} {t("dias", "days")}</Chip>}
              />
            ))}
          </QueuePanel>

          <QueuePanel
            title={t("AEFI em investigação", "AEFI under investigation")}
            subtitle={t("Eventos graves ainda abertos.", "Serious events still open.")}
            href="/public-health/adverse-events"
            icon={Bell}
            theme={PANEL_THEMES.aefi}
            count={dashboard.aefi_queue.length}
            loading={loading}
            emptyMessage={t("Sem AEFI grave aberto.", "No open serious AEFI.")}
          >
            {dashboard.aefi_queue.map((item) => (
              <QueueRow
                key={item.id}
                emoji="⚠️"
                barTone={item.serious ? "danger" : "warning"}
                title={item.patient_name || item.custom_id || String(item.id)}
                subtitle={`${item.vaccine_name || "-"} · ${formatDateTime(item.reported_at)} · investigar até ${formatDateTime(item.investigation_due_at)}`}
                href={`/public-health/adverse-events/${item.id}`}
                badge={<Chip tone={item.serious ? "danger" : "warning"}>{item.severity || item.status || "-"}</Chip>}
              />
            ))}
          </QueuePanel>

          <div className="xl:col-span-2">
            <QueuePanel
              title={t("Notificações oficiais pendentes", "Pending official notifications")}
              subtitle={t("Integração com e-SUS, SIPNI, DHIS2 ou sistema oficial configurado.", "Integration with e-SUS, SIPNI, DHIS2 or configured official system.")}
              href="/public-health/notifications"
              icon={FileText}
              theme={PANEL_THEMES.notifications}
              count={dashboard.notification_queue.length}
              loading={loading}
              emptyMessage={t("Sem notificação oficial pendente.", "No pending official notification.")}
            >
              {dashboard.notification_queue.map((item) => (
                <QueueRow
                  key={item.id}
                  emoji="📡"
                  barTone={notificationVariant(item.status)}
                  title={`${item.official_system || "-"} · ${item.event_type || "-"}`}
                  subtitle={`${item.external_reference || item.custom_id || item.id} · ${t("tentativas", "attempts")} ${item.attempt_count ?? 0} · ${formatDateTime(item.next_retry_at)}`}
                  href={`/public-health/notifications/${item.id}`}
                  badge={<Chip tone={notificationVariant(item.status)}>{item.status || "-"}</Chip>}
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

type Tone = "default" | "success" | "warning" | "danger" | "info"

type PanelTheme = {
  bar: string
  glow: string
  count: string
}

const PANEL_THEMES: Record<"lots" | "campaigns" | "boosters" | "aefi" | "notifications", PanelTheme> = {
  lots:          { bar: "from-red-500 to-orange-500",     glow: "bg-red-500/10",     count: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300"          },
  campaigns:     { bar: "from-blue-500 to-indigo-600",    glow: "bg-blue-500/10",    count: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300"       },
  boosters:      { bar: "from-amber-500 to-orange-600",   glow: "bg-amber-500/10",   count: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"   },
  aefi:          { bar: "from-rose-500 to-red-600",       glow: "bg-rose-500/10",    count: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300"        },
  notifications: { bar: "from-violet-500 to-purple-600",  glow: "bg-violet-500/10",  count: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300" },
}

const CHIP_TONE: Record<Tone, string> = {
  default: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-300",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  danger:  "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
  info:    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",
}

const BAR_TONE: Record<Tone, string> = {
  default: "bg-slate-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger:  "bg-red-500",
  info:    "bg-blue-500",
}

function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${CHIP_TONE[tone]}`}>
      {children}
    </span>
  )
}

function QueuePanel({
  title,
  subtitle,
  href,
  icon: Icon,
  theme,
  count,
  loading,
  emptyMessage,
  children,
}: {
  title: string
  subtitle: string
  href: string
  icon: ComponentType<{ size?: number; className?: string }>
  theme: PanelTheme
  count: number
  loading: boolean
  emptyMessage: string
  children: ReactNode
}) {
  const { t } = useLanguage()
  const isEmpty = Array.isArray(children) && children.length === 0

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b ${theme.bar}`} />
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${theme.glow} blur-2xl`} />
      </div>

      <div className="relative px-3 py-3 pl-4">
        {/* header */}
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.bar} shadow-md`}>
            <Icon size={16} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-sm font-bold text-foreground">{title}</h3>
              {!loading && count > 0 && (
                <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${theme.count}`}>
                  {count}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{subtitle}</p>
          </div>
          <Link href={href} className="shrink-0 text-[11px] font-semibold text-primary no-underline hover:underline">
            {t("Abrir", "Open")}
          </Link>
        </div>

        {/* rows */}
        <div className="mt-2.5 space-y-1">
          {loading ? (
            <div className="py-4 text-center text-[11px] text-muted-foreground">...</div>
          ) : isEmpty ? (
            <div className="rounded-lg border border-dashed border-border/60 py-4 text-center text-[11px] text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  )
}

function QueueRow({
  title,
  subtitle,
  href,
  badge,
  emoji,
  barTone,
}: {
  title: string
  subtitle: string
  href: string
  badge: ReactNode
  emoji: string
  barTone: Tone
}) {
  return (
    <Link
      href={href}
      className="relative block overflow-hidden rounded-lg border border-white/20 bg-white/25 px-2.5 py-1.5 pl-3 shadow-sm transition hover:bg-white/45 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
    >
      <span className={`absolute inset-y-0 left-0 w-0.5 ${BAR_TONE[barTone]}`} />
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs leading-none">{emoji}</span>
            <span className="truncate text-[11px] font-semibold text-foreground">{title}</span>
          </div>
          <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{subtitle}</span>
        </div>
        <span className="shrink-0">{badge}</span>
      </div>
    </Link>
  )
}
