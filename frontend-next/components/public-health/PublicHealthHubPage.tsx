"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  ClipboardCheck,
  ClipboardList,
  FileText,
  MapPin,
  PackageCheck,
  Syringe,
  type LucideIcon,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS } from "@/lib/rbac"

type Tone = "default" | "success" | "warning" | "danger" | "info"

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

type PublicHealthDashboardCardItem = {
  id: number | string
  title?: string
  subtitle?: string
  href?: string
  status?: string
  status_tone?: Tone
  meta?: string[]
}

type PublicHealthDashboardCard = {
  key: string
  title?: string
  title_en?: string
  subtitle?: string
  subtitle_en?: string
  href?: string
  icon?: string
  tone?: Tone
  count?: number
  empty_message?: string
  empty_message_en?: string
  items?: PublicHealthDashboardCardItem[]
}

type PublicHealthDashboard = {
  summary: PublicHealthSummary
  cards: PublicHealthDashboardCard[]
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
  cards: [],
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

        <div className="grid gap-1.5 xl:grid-cols-2">
          {dashboard.cards.map((card) => {
            const definition = cardDefinition(card.key)
            return (
              <div key={card.key} className={definition.spanClass}>
                <DashboardCard card={card} loading={loading} />
              </div>
            )
          })}
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
  const raw = (payload || {}) as any
  const dashboard: PublicHealthDashboard = {
    summary: normalizeSummary(raw.summary || raw.resumo || {}),
    cards: [],
    stock_risks: listFrom<StockRisk>(raw.stock_risks, raw.lots_at_risk, raw.lotes_em_risco),
    campaign_progress: listFrom<CampaignProgress>(raw.campaign_progress, raw.active_campaigns, raw.campanhas_ativas),
    booster_queue: listFrom<BoosterDue>(raw.booster_queue, raw.overdue_boosters, raw.reforcos_vencidos, raw.reforços_vencidos),
    aefi_queue: listFrom<AefiQueueItem>(raw.aefi_queue, raw.aefi_under_investigation, raw.aefi_em_investigacao, raw.aefi_em_investigação),
    notification_queue: listFrom<NotificationQueueItem>(
      raw.notification_queue,
      raw.pending_notifications,
      raw.notificacoes_pendentes,
      raw.notificações_pendentes
    ),
  }
  const incomingCards = listFrom<PublicHealthDashboardCard>(raw.cards, raw.cartoes, raw.cartões)
  dashboard.cards = incomingCards.length ? incomingCards.map(normalizeCard) : buildLegacyCards(dashboard)
  return dashboard
}

function normalizeSummary(raw: Record<string, unknown>): PublicHealthSummary {
  return {
    vaccines: numberFrom(raw.vaccines, raw.vacinas),
    active_lots: numberFrom(raw.active_lots, raw.lotes_ativos),
    active_campaigns: numberFrom(raw.active_campaigns, raw.campanhas_ativas),
    immunizations_30d: numberFrom(raw.immunizations_30d, raw.imunizacoes_30d, raw.imunizações_30d),
    due_boosters: numberFrom(raw.due_boosters, raw.overdue_boosters, raw.reforcos_vencidos, raw.reforços_vencidos),
    serious_aefi_open: numberFrom(raw.serious_aefi_open, raw.aefi_graves, raw.aefi_em_investigacao, raw.aefi_em_investigação),
    pending_notifications: numberFrom(raw.pending_notifications, raw.notificacoes_pendentes, raw.notificações_pendentes),
    low_stock_lots: numberFrom(raw.low_stock_lots, raw.lotes_stock_baixo, raw.lotes_estoque_baixo),
    cold_chain_breaches: numberFrom(raw.cold_chain_breaches, raw.quebras_cadeia_fria),
    expired_lots: numberFrom(raw.expired_lots, raw.lotes_expirados, raw.lotes_vencidos),
  }
}

function normalizeCard(card: PublicHealthDashboardCard): PublicHealthDashboardCard {
  const raw = (card || {}) as any
  const key = textFrom(raw.key, raw.chave) || "dashboard-card"
  const definition = cardDefinition(key)
  const items = listFrom<PublicHealthDashboardCardItem>(raw.items, raw.itens, raw.rows).map((item) =>
    normalizeCardItem(item, definition.href)
  )

  return {
    key,
    title: textFrom(raw.title, raw.titulo, definition.title),
    title_en: textFrom(raw.title_en, raw.titleEn, definition.titleEn),
    subtitle: textFrom(raw.subtitle, raw.subtitulo, definition.subtitle),
    subtitle_en: textFrom(raw.subtitle_en, raw.subtitleEn, definition.subtitleEn),
    href: textFrom(raw.href, raw.url, definition.href),
    icon: textFrom(raw.icon, raw.icone, definition.iconName),
    tone: normalizeTone(raw.tone, raw.tom) || definition.tone,
    count: numberFrom(raw.count, raw.total, items.length),
    empty_message: textFrom(raw.empty_message, raw.emptyMessage, raw.mensagem_vazia, definition.empty),
    empty_message_en: textFrom(raw.empty_message_en, raw.emptyMessageEn, definition.emptyEn),
    items,
  }
}

function normalizeCardItem(item: PublicHealthDashboardCardItem, fallbackHref: string): PublicHealthDashboardCardItem {
  const raw = (item || {}) as any
  return {
    id: raw.id ?? raw.pk ?? raw.key ?? raw.chave ?? `${fallbackHref}-${raw.title || raw.titulo || "item"}`,
    title: textFrom(raw.title, raw.titulo),
    subtitle: textFrom(raw.subtitle, raw.subtitulo),
    href: textFrom(raw.href, raw.url, fallbackHref),
    status: textFrom(raw.status, raw.estado, raw.situacao, raw.situação),
    status_tone: normalizeTone(raw.status_tone, raw.statusTone, raw.tone, raw.tom) || "default",
    meta: listFrom<string>(raw.meta),
  }
}

function buildLegacyCards(dashboard: PublicHealthDashboard): PublicHealthDashboardCard[] {
  return [
    legacyCard(
      "stock_risks",
      dashboard.stock_risks.map((item) => ({
        id: item.id,
        title: `${item.vaccine_name || "Vacina"} · ${item.lot_number || item.custom_id || item.id}`,
        subtitle: `${formatDate(item.expiration_date)} · ${item.doses_available ?? 0} doses · ${item.storage_location || "-"}`,
        href: `/public-health/lots/${item.id}`,
        status: item.risk || item.status || "-",
        status_tone: riskVariant(item.risk),
      }))
    ),
    legacyCard(
      "campaign_progress",
      dashboard.campaign_progress.map((item) => ({
        id: item.id,
        title: item.name || item.custom_id || String(item.id),
        subtitle: `${item.vaccine_name || "-"} · ${item.target_region || "-"} · ${item.administered_doses ?? 0}/${item.target_doses ?? 0} doses`,
        href: `/public-health/campaigns/${item.id}`,
        status: formatPercent(item.coverage_percent),
        status_tone: coverageVariant(item.coverage_percent),
      }))
    ),
    legacyCard(
      "booster_queue",
      dashboard.booster_queue.map((item) => ({
        id: item.id,
        title: item.patient_name || item.custom_id || String(item.id),
        subtitle: `${item.vaccine_name || "-"} · dose ${item.dose_number ?? "-"} · vence ${formatDate(item.next_due_date)}`,
        href: `/public-health/immunizations/${item.id}`,
        status: `${item.days_overdue || 0} dias`,
        status_tone: item.days_overdue ? "warning" : "info",
      }))
    ),
    legacyCard(
      "aefi_queue",
      dashboard.aefi_queue.map((item) => ({
        id: item.id,
        title: item.patient_name || item.custom_id || String(item.id),
        subtitle: `${item.vaccine_name || "-"} · ${formatDateTime(item.reported_at)} · investigar até ${formatDateTime(item.investigation_due_at)}`,
        href: `/public-health/adverse-events/${item.id}`,
        status: item.severity || item.status || "-",
        status_tone: item.serious ? "danger" : "warning",
      }))
    ),
    legacyCard(
      "notification_queue",
      dashboard.notification_queue.map((item) => ({
        id: item.id,
        title: `${item.official_system || "-"} · ${item.event_type || "-"}`,
        subtitle: `${item.external_reference || item.custom_id || item.id} · tentativas ${item.attempt_count ?? 0} · ${formatDateTime(item.next_retry_at)}`,
        href: `/public-health/notifications/${item.id}`,
        status: item.status || "-",
        status_tone: notificationVariant(item.status),
      }))
    ),
  ]
}

function legacyCard(key: string, items: PublicHealthDashboardCardItem[]): PublicHealthDashboardCard {
  const definition = cardDefinition(key)
  return {
    key,
    title: definition.title,
    title_en: definition.titleEn,
    subtitle: definition.subtitle,
    subtitle_en: definition.subtitleEn,
    href: definition.href,
    icon: definition.iconName,
    tone: definition.tone,
    count: items.length,
    empty_message: definition.empty,
    empty_message_en: definition.emptyEn,
    items,
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

function numberFrom(...values: unknown[]): number {
  for (const value of values) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function textFrom(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (value === null || value === undefined) continue
    const text = String(value).trim()
    if (text) return text
  }
  return undefined
}

function listFrom<T>(...values: unknown[]): T[] {
  for (const value of values) {
    if (Array.isArray(value)) return value as T[]
  }
  return []
}

function normalizeTone(...values: unknown[]): Tone | undefined {
  for (const value of values) {
    if (value === "default" || value === "success" || value === "warning" || value === "danger" || value === "info") {
      return value
    }
  }
  return undefined
}

function riskVariant(risk?: string): Tone {
  const text = String(risk || "").toLocaleLowerCase("pt")
  if (text.includes("expir") || text.includes("quebra") || text.includes("sem doses") || text.includes("recolh")) return "danger"
  if (text.includes("baixo") || text.includes("validade") || text.includes("quarentena")) return "warning"
  return "info"
}

function notificationVariant(status?: string): Tone {
  if (status === "FAILED" || status === "REJECTED") return "danger"
  if (status === "PENDING") return "warning"
  if (status === "SENT" || status === "ACCEPTED") return "success"
  return "info"
}

function coverageVariant(value?: string | number): Tone {
  const parsed = Number(value ?? 0)
  if (!Number.isFinite(parsed)) return "info"
  if (parsed >= 80) return "success"
  if (parsed < 50) return "warning"
  return "info"
}

type CardDefinition = {
  title: string
  titleEn: string
  subtitle: string
  subtitleEn: string
  href: string
  iconName: string
  icon: LucideIcon
  tone: Tone
  empty: string
  emptyEn: string
  spanClass?: string
}

const CARD_DEFINITIONS: Record<string, CardDefinition> = {
  stock_risks: {
    title: "Lotes em risco",
    titleEn: "Lots at risk",
    subtitle: "Stock, validade, quarentena e cadeia fria.",
    subtitleEn: "Stock, expiry, quarantine and cold chain.",
    href: "/public-health/lots",
    iconName: "PackageCheck",
    icon: PackageCheck,
    tone: "danger",
    empty: "Sem lotes em risco.",
    emptyEn: "No lots at risk.",
  },
  campaign_progress: {
    title: "Campanhas ativas",
    titleEn: "Active campaigns",
    subtitle: "Cobertura de doses e região alvo.",
    subtitleEn: "Dose coverage and target region.",
    href: "/public-health/campaigns",
    iconName: "ClipboardList",
    icon: ClipboardList,
    tone: "info",
    empty: "Sem campanha ativa.",
    emptyEn: "No active campaign.",
  },
  booster_queue: {
    title: "Reforços vencidos",
    titleEn: "Overdue boosters",
    subtitle: "Pacientes com próxima dose em atraso.",
    subtitleEn: "Patients with overdue next dose.",
    href: "/public-health/immunizations",
    iconName: "Syringe",
    icon: Syringe,
    tone: "warning",
    empty: "Sem reforços vencidos.",
    emptyEn: "No overdue boosters.",
  },
  aefi_queue: {
    title: "AEFI em investigação",
    titleEn: "AEFI under investigation",
    subtitle: "Eventos graves ainda abertos.",
    subtitleEn: "Serious events still open.",
    href: "/public-health/adverse-events",
    iconName: "Bell",
    icon: Bell,
    tone: "danger",
    empty: "Sem AEFI grave aberto.",
    emptyEn: "No open serious AEFI.",
  },
  notification_queue: {
    title: "Notificações oficiais pendentes",
    titleEn: "Pending official notifications",
    subtitle: "Integração com e-SUS, SIPNI, DHIS2 ou sistema oficial configurado.",
    subtitleEn: "Integration with e-SUS, SIPNI, DHIS2 or configured official system.",
    href: "/public-health/notifications",
    iconName: "FileText",
    icon: FileText,
    tone: "warning",
    empty: "Sem notificação oficial pendente.",
    emptyEn: "No pending official notification.",
    spanClass: "xl:col-span-2",
  },
}

const FALLBACK_CARD_DEFINITION: CardDefinition = {
  title: "Pendências",
  titleEn: "Pending items",
  subtitle: "Itens operacionais para acompanhamento.",
  subtitleEn: "Operational items to track.",
  href: "/public-health",
  iconName: "AlertTriangle",
  icon: AlertTriangle,
  tone: "default",
  empty: "Sem itens pendentes.",
  emptyEn: "No pending items.",
}

const ICON_BY_NAME: Record<string, LucideIcon> = {
  AlertTriangle,
  Bell,
  ClipboardList,
  FileText,
  PackageCheck,
  Syringe,
}

const TONE_CLASSES: Record<Tone, { accent: string; icon: string; badge: string; pill: string }> = {
  default: {
    accent: "border-l-slate-400 dark:border-l-slate-500",
    icon: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
    badge: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/40 dark:bg-slate-900/20 dark:text-slate-300",
    pill: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/40 dark:bg-slate-900/20 dark:text-slate-300",
  },
  success: {
    accent: "border-l-emerald-500 dark:border-l-emerald-400",
    icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  },
  warning: {
    accent: "border-l-amber-500 dark:border-l-amber-400",
    icon: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
    pill: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  },
  danger: {
    accent: "border-l-red-500 dark:border-l-red-400",
    icon: "bg-red-500/15 text-red-600 dark:text-red-300",
    badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
    pill: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
  },
  info: {
    accent: "border-l-blue-500 dark:border-l-blue-400",
    icon: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
    badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",
    pill: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",
  },
}

function cardDefinition(key: string): CardDefinition {
  return CARD_DEFINITIONS[key] || FALLBACK_CARD_DEFINITION
}

function cardIcon(card: PublicHealthDashboardCard, definition: CardDefinition): LucideIcon {
  return ICON_BY_NAME[card.icon || ""] || definition.icon
}

function DashboardCard({ card, loading }: { card: PublicHealthDashboardCard; loading: boolean }) {
  const { t } = useLanguage()
  const definition = cardDefinition(card.key)
  const tone = normalizeTone(card.tone) || definition.tone
  const toneClasses = TONE_CLASSES[tone]
  const Icon = cardIcon(card, definition)
  const href = card.href || definition.href
  const items = card.items || []
  const count = card.count ?? items.length
  const title = t(card.title || definition.title, card.title_en || definition.titleEn)
  const subtitle = t(card.subtitle || definition.subtitle, card.subtitle_en || definition.subtitleEn)
  const emptyMessage = t(card.empty_message || definition.empty, card.empty_message_en || definition.emptyEn)

  return (
    <section
      className={`h-full overflow-hidden rounded-xl border-t border-r border-b border-white/20 border-l-4 bg-white/30 px-3 py-3 shadow-sm backdrop-blur-sm dark:border-t-white/10 dark:border-r-white/10 dark:border-b-white/10 dark:bg-white/5 ${toneClasses.accent}`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneClasses.icon}`}>
          <Icon size={16} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
            {!loading ? (
              <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold tabular-nums ${toneClasses.badge}`}>
                {count}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-primary no-underline hover:underline"
        >
          {t("Abrir", "Open")}
          <ArrowRight size={12} strokeWidth={2} />
        </Link>
      </div>

      <div className="mt-2.5 space-y-1">
        {loading ? (
          <DashboardCardSkeleton />
        ) : items.length ? (
          items.map((item) => <DashboardCardRow key={`${card.key}-${item.id}`} item={item} />)
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 bg-white/20 py-4 text-center text-[11px] text-muted-foreground dark:bg-white/5">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  )
}

function DashboardCardSkeleton() {
  return (
    <div className="space-y-1">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-10 animate-pulse rounded-lg bg-white/35 dark:bg-white/10" />
      ))}
    </div>
  )
}

function DashboardCardRow({ item }: { item: PublicHealthDashboardCardItem }) {
  const tone = normalizeTone(item.status_tone) || "default"
  const content = (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="truncate text-[11px] font-semibold text-foreground">{item.title || "-"}</div>
        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{item.subtitle || "-"}</div>
      </div>
      {item.status ? <StatusPill tone={tone}>{item.status}</StatusPill> : null}
    </div>
  )

  const className =
    "block rounded-lg border border-white/20 bg-white/25 px-2.5 py-2 shadow-sm transition hover:border-[var(--primary-300)]/60 hover:bg-white/45 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"

  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {content}
      </Link>
    )
  }

  return <div className={className}>{content}</div>
}

function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${TONE_CLASSES[tone].pill}`}>
      {children}
    </span>
  )
}
