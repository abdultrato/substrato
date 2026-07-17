"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Loader2,
  MapPin,
  PackageCheck,
  Search,
  ShieldCheck,
  Syringe,
  type LucideIcon,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { useLanguage } from "@/hooks/useLanguage";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch } from "@/lib/api";
import { isNotFoundLikeError } from "@/lib/errors/api-error";
import { GROUPS } from "@/lib/rbac";

type Tone = "default" | "success" | "warning" | "danger" | "info";

type PublicHealthSummary = {
  vaccines: number;
  active_lots: number;
  active_campaigns: number;
  immunizations_30d: number;
  due_boosters: number;
  serious_aefi_open: number;
  pending_notifications: number;
  low_stock_lots: number;
  cold_chain_breaches: number;
  expired_lots: number;
};

type StockRisk = {
  id: number;
  custom_id?: string;
  vaccine_name?: string;
  lot_number?: string;
  status?: string;
  expiration_date?: string;
  doses_available?: number;
  reserved_doses?: number;
  cold_chain_status?: string;
  storage_location?: string;
  risk?: string;
};

type CampaignProgress = {
  id: number;
  custom_id?: string;
  name?: string;
  vaccine_name?: string;
  status?: string;
  target_region?: string;
  start_date?: string;
  end_date?: string | null;
  target_doses?: number;
  administered_doses?: number;
  coverage_percent?: string | number;
};

type BoosterDue = {
  id: number;
  custom_id?: string;
  patient_id?: number;
  patient_name?: string;
  vaccine_name?: string;
  dose_number?: number;
  administered_at?: string;
  next_due_date?: string;
  days_overdue?: number;
};

type AefiQueueItem = {
  id: number;
  custom_id?: string;
  patient_name?: string;
  vaccine_name?: string;
  severity?: string;
  status?: string;
  serious?: boolean;
  reported_at?: string;
  investigation_due_at?: string | null;
};

type NotificationQueueItem = {
  id: number;
  custom_id?: string;
  official_system?: string;
  event_type?: string;
  status?: string;
  external_reference?: string;
  attempt_count?: number;
  next_retry_at?: string | null;
  error_message?: string;
};

type PublicHealthDashboardCardItem = {
  id: number | string;
  title?: string;
  subtitle?: string;
  href?: string;
  status?: string;
  status_tone?: Tone;
  meta?: string[];
};

type PublicHealthDashboardCard = {
  key: string;
  title?: string;
  title_en?: string;
  subtitle?: string;
  subtitle_en?: string;
  href?: string;
  icon?: string;
  tone?: Tone;
  count?: number;
  empty_message?: string;
  empty_message_en?: string;
  items?: PublicHealthDashboardCardItem[];
};

type PublicHealthDashboard = {
  summary: PublicHealthSummary;
  cards: PublicHealthDashboardCard[];
  stock_risks: StockRisk[];
  campaign_progress: CampaignProgress[];
  booster_queue: BoosterDue[];
  aefi_queue: AefiQueueItem[];
  notification_queue: NotificationQueueItem[];
};

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
};

const EMPTY_DASHBOARD: PublicHealthDashboard = {
  summary: EMPTY_SUMMARY,
  cards: [],
  stock_risks: [],
  campaign_progress: [],
  booster_queue: [],
  aefi_queue: [],
  notification_queue: [],
};

/* ── Module definitions ──────────────────────────────────────────── */

type ModuleDef = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  grad: string;
  glow: string;
  bar: string;
  blob1: string;
  blob2: string;
  iconBg: string;
  keywords: string;
};

const MODULES: ModuleDef[] = [
  {
    title: "Vacinas",
    description:
      "Produtos vacinais, doenças alvo, doses requeridas, reforços e cadeia fria.",
    href: "/public-health/vaccines",
    icon: Syringe,
    grad: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/30",
    bar: "bg-gradient-to-b from-emerald-500 to-teal-600",
    blob1: "bg-emerald-500/10",
    blob2: "bg-teal-500/10",
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    keywords: "vacinas imunobiologicos produtos",
  },
  {
    title: "Lotes e stock",
    description:
      "Validade, doses disponíveis, quarentena, recolha e quebra de cadeia fria.",
    href: "/public-health/lots",
    icon: PackageCheck,
    grad: "from-amber-500 to-orange-600",
    glow: "shadow-amber-500/30",
    bar: "bg-gradient-to-b from-amber-500 to-orange-600",
    blob1: "bg-amber-500/10",
    blob2: "bg-orange-500/10",
    iconBg: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    keywords: "lotes stock doses validade",
  },
  {
    title: "Campanhas",
    description:
      "Campanhas de gripe, HPV, COVID, rotina, surto ou vacinação escolar.",
    href: "/public-health/campaigns",
    icon: ClipboardList,
    grad: "from-blue-500 to-indigo-600",
    glow: "shadow-blue-500/30",
    bar: "bg-gradient-to-b from-blue-500 to-indigo-600",
    blob1: "bg-blue-500/10",
    blob2: "bg-indigo-500/10",
    iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
    keywords: "campanhas vacinacao cobertura gripe hpv covid",
  },
  {
    title: "Metas por região",
    description:
      "População alvo, distrito, faixa etária, doses planeadas e cobertura.",
    href: "/public-health/targets",
    icon: MapPin,
    grad: "from-indigo-500 to-purple-600",
    glow: "shadow-indigo-500/30",
    bar: "bg-gradient-to-b from-indigo-500 to-purple-600",
    blob1: "bg-indigo-500/10",
    blob2: "bg-purple-500/10",
    iconBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
    keywords: "metas regiao populacao distrito cobertura",
  },
  {
    title: "Registos de imunização",
    description:
      "Histórico vacinal, lote rastreável, dose aplicada e próxima data de reforço.",
    href: "/public-health/immunizations",
    icon: ClipboardCheck,
    grad: "from-teal-500 to-cyan-600",
    glow: "shadow-teal-500/30",
    bar: "bg-gradient-to-b from-teal-500 to-cyan-600",
    blob1: "bg-teal-500/10",
    blob2: "bg-cyan-500/10",
    iconBg: "bg-teal-500/15 text-teal-600 dark:text-teal-300",
    keywords: "imunizacao registos vacinal historico reforco",
  },
  {
    title: "Eventos adversos",
    description:
      "AEFI, gravidade, investigação, sintomas, desfecho e causalidade.",
    href: "/public-health/adverse-events",
    icon: AlertTriangle,
    grad: "from-orange-500 to-red-600",
    glow: "shadow-orange-500/30",
    bar: "bg-gradient-to-b from-orange-500 to-red-600",
    blob1: "bg-orange-500/10",
    blob2: "bg-red-500/10",
    iconBg: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
    keywords: "aefi eventos adversos gravidade investigacao",
  },
  {
    title: "Notificações oficiais",
    description:
      "Integração e-SUS, SIPNI, DHIS2 ou sistemas oficiais customizados.",
    href: "/public-health/notifications",
    icon: Bell,
    grad: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/30",
    bar: "bg-gradient-to-b from-violet-500 to-purple-600",
    blob1: "bg-violet-500/10",
    blob2: "bg-purple-500/10",
    iconBg: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
    keywords: "notificacoes esus sipni dhis2 oficial",
  },
];

/* ── Metric definitions ──────────────────────────────────────────── */

type MetricDef = {
  label: string;
  getValue: (s: PublicHealthSummary) => number;
  bar: string;
  chip: string;
  alertIf?: (n: number) => boolean;
};

const METRIC_DEFS: MetricDef[] = [
  {
    label: "Vacinas",
    getValue: (s) => s.vaccines,
    bar: "bg-emerald-500",
    chip: "text-emerald-700 dark:text-emerald-300",
  },
  {
    label: "Lotes ativos",
    getValue: (s) => s.active_lots,
    bar: "bg-amber-500",
    chip: "text-amber-700   dark:text-amber-300",
  },
  {
    label: "Campanhas ativas",
    getValue: (s) => s.active_campaigns,
    bar: "bg-blue-500",
    chip: "text-blue-700    dark:text-blue-300",
  },
  {
    label: "Imunizações (30d)",
    getValue: (s) => s.immunizations_30d,
    bar: "bg-teal-500",
    chip: "text-teal-700    dark:text-teal-300",
  },
  {
    label: "Reforços vencidos",
    getValue: (s) => s.due_boosters,
    bar: "bg-orange-500",
    chip: "text-orange-700  dark:text-orange-300",
    alertIf: (n) => n > 0,
  },
  {
    label: "AEFI graves",
    getValue: (s) => s.serious_aefi_open,
    bar: "bg-red-500",
    chip: "text-red-700     dark:text-red-300",
    alertIf: (n) => n > 0,
  },
  {
    label: "Notif. pendentes",
    getValue: (s) => s.pending_notifications,
    bar: "bg-violet-500",
    chip: "text-violet-700 dark:text-violet-300",
    alertIf: (n) => n > 0,
  },
  {
    label: "Riscos de stock",
    getValue: (s) => s.low_stock_lots + s.cold_chain_breaches + s.expired_lots,
    bar: "bg-rose-500",
    chip: "text-rose-700 dark:text-rose-300",
    alertIf: (n) => n > 0,
  },
];

/* ── Main component ──────────────────────────────────────────────── */

export default function PublicHealthHubPage() {
  const { t } = useLanguage();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] =
    useState<PublicHealthDashboard>(EMPTY_DASHBOARD);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const payload = await apiFetch<PublicHealthDashboard>(
          "/public_health/dashboard/",
          {
            clientCache: safeRefreshToken === 0,
            clientCacheTtlMs: 30000,
          },
        );
        if (!mounted) return;
        setDashboard(normalizeDashboard(payload));
      } catch (e: any) {
        if (!mounted) return;
        setError(
          isNotFoundLikeError(e)
            ? null
            : e?.message ||
                t(
                  "Falha ao carregar o módulo de saúde pública.",
                  "Failed to load the public health module.",
                ),
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [safeRefreshToken, t]);

  const summary = dashboard.summary;

  const filteredModules = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return MODULES;
    return MODULES.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.keywords.includes(q),
    );
  }, [search]);

  return (
    <AppLayout requiredGroups={PUBLIC_HEALTH_GROUPS}>
      <div className="mx-auto w-full max-w-[97vw] space-y-2">
        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="absolute -bottom-10 left-8 h-32 w-32 rounded-full bg-teal-500/10 blur-2xl" />
            <div className="absolute right-1/3 top-0 h-24 w-24 rounded-full bg-cyan-500/8 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-emerald-500 to-teal-600" />

          {/* Title row */}
          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/30">
              <Activity size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-medium text-muted-foreground">
                Sistema de Saúde
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                Saúde Pública
              </h1>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {MODULES.length} módulos · vigilância epidemiológica e vacinação
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/public-health/vaccines"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted"
              >
                Recursos
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          <div className="relative border-t border-white/20 px-3 py-1.5 dark:border-white/10">
            <div className="grid grid-cols-8 gap-1 whitespace-nowrap">
              {METRIC_DEFS.map((def) => {
                const val = loading ? null : def.getValue(summary);
                const isAlert =
                  !loading && def.alertIf && val !== null && def.alertIf(val);
                return (
                  <div
                    key={def.label}
                    className={`relative inline-flex h-7 min-w-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-white/20 bg-white/25 px-1.5 pl-2.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5 ${isAlert ? "ring-1 ring-red-400/40" : ""}`}
                  >
                    <span className={`absolute inset-y-0 left-0 w-0.5 ${def.bar}`} />
                    <span className={`text-sm font-bold tabular-nums leading-none ${def.chip}`}>
                      {loading ? (
                        <span className="inline-block h-3 w-6 animate-pulse rounded bg-current/20" />
                      ) : (
                        val
                      )}
                    </span>
                    <span className="truncate text-[10px] font-semibold text-muted-foreground">
                      {def.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search inside hero */}
          <div className="relative border-t border-white/20 px-4 py-2 dark:border-white/10">
            <Search
              size={11}
              className="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar módulos: vacinas, campanhas, imunização, eventos adversos…"
              className="w-full rounded-lg border border-white/30 bg-white/40 py-1.5 pl-7 pr-3 text-xs outline-none transition placeholder:text-muted-foreground focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-white/10 dark:bg-white/5"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/15 dark:text-amber-300">
            {error}
          </div>
        )}

	        {/* ── Module cards ──────────────────────────────────────── */}
        {filteredModules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            Nenhum módulo encontrado para &ldquo;{search}&rdquo;.
          </div>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="group relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:bg-white/40 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  {/* blobs */}
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                    <div
                      className={`absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl ${mod.blob1}`}
                    />
                    <div
                      className={`absolute -bottom-4 left-4 h-14 w-14 rounded-full blur-2xl ${mod.blob2}`}
                    />
                  </div>
                  {/* accent bar */}
                  <span
                    className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${mod.bar}`}
                  />

                  <div className="relative flex items-start gap-2.5 px-3 py-3 pl-4">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${mod.grad} shadow-md ${mod.glow} transition group-hover:scale-105`}
                    >
                      <Icon size={17} className="text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[12px] font-semibold leading-tight text-foreground">
                          {mod.title}
                        </p>
                        <ArrowRight
                          size={11}
                          className="shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground"
                        />
                      </div>
                      <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground line-clamp-2">
                        {mod.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Dashboard operational cards ───────────────────────── */}
        <div className="grid gap-1.5 xl:grid-cols-2">
          {dashboard.cards.map((card) => {
            const definition = cardDefinition(card.key);
            return (
              <div key={card.key} className={definition.spanClass}>
                <DashboardCard card={card} loading={loading} />
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

/* ── RBAC ────────────────────────────────────────────────────────── */

export const PUBLIC_HEALTH_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.RECEPCAO,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.ENFERMAGEM,
  GROUPS.LABORATORIO,
  GROUPS.SAUDE_PUBLICA,
];

/* ── Normalisation helpers ───────────────────────────────────────── */

function normalizeDashboard(
  payload?: Partial<PublicHealthDashboard> | null,
): PublicHealthDashboard {
  const raw = (payload || {}) as any;
  const dashboard: PublicHealthDashboard = {
    summary: normalizeSummary(raw.summary || raw.resumo || {}),
    cards: [],
    stock_risks: listFrom<StockRisk>(
      raw.stock_risks,
      raw.lots_at_risk,
      raw.lotes_em_risco,
    ),
    campaign_progress: listFrom<CampaignProgress>(
      raw.campaign_progress,
      raw.active_campaigns,
      raw.campanhas_ativas,
    ),
    booster_queue: listFrom<BoosterDue>(
      raw.booster_queue,
      raw.overdue_boosters,
      raw.reforcos_vencidos,
      raw.reforços_vencidos,
    ),
    aefi_queue: listFrom<AefiQueueItem>(
      raw.aefi_queue,
      raw.aefi_under_investigation,
      raw.aefi_em_investigacao,
      raw.aefi_em_investigação,
    ),
    notification_queue: listFrom<NotificationQueueItem>(
      raw.notification_queue,
      raw.pending_notifications,
      raw.notificacoes_pendentes,
      raw.notificações_pendentes,
    ),
  };
  const incomingCards = listFrom<PublicHealthDashboardCard>(
    raw.cards,
    raw.cartoes,
    raw.cartões,
  );
  dashboard.cards = incomingCards.length
    ? incomingCards.map(normalizeCard)
    : buildLegacyCards(dashboard);
  return dashboard;
}

function normalizeSummary(raw: Record<string, unknown>): PublicHealthSummary {
  return {
    vaccines: numberFrom(raw.vaccines, raw.vacinas),
    active_lots: numberFrom(raw.active_lots, raw.lotes_ativos),
    active_campaigns: numberFrom(raw.active_campaigns, raw.campanhas_ativas),
    immunizations_30d: numberFrom(
      raw.immunizations_30d,
      raw.imunizacoes_30d,
      raw.imunizações_30d,
    ),
    due_boosters: numberFrom(
      raw.due_boosters,
      raw.overdue_boosters,
      raw.reforcos_vencidos,
      raw.reforços_vencidos,
    ),
    serious_aefi_open: numberFrom(
      raw.serious_aefi_open,
      raw.aefi_graves,
      raw.aefi_em_investigacao,
      raw.aefi_em_investigação,
    ),
    pending_notifications: numberFrom(
      raw.pending_notifications,
      raw.notificacoes_pendentes,
      raw.notificações_pendentes,
    ),
    low_stock_lots: numberFrom(
      raw.low_stock_lots,
      raw.lotes_stock_baixo,
      raw.lotes_estoque_baixo,
    ),
    cold_chain_breaches: numberFrom(
      raw.cold_chain_breaches,
      raw.quebras_cadeia_fria,
    ),
    expired_lots: numberFrom(
      raw.expired_lots,
      raw.lotes_expirados,
      raw.lotes_vencidos,
    ),
  };
}

function normalizeCard(
  card: PublicHealthDashboardCard,
): PublicHealthDashboardCard {
  const raw = (card || {}) as any;
  const key = textFrom(raw.key, raw.chave) || "dashboard-card";
  const definition = cardDefinition(key);
  const items = listFrom<PublicHealthDashboardCardItem>(
    raw.items,
    raw.itens,
    raw.rows,
  ).map((item) => normalizeCardItem(item, definition.href));
  return {
    key,
    title: textFrom(raw.title, raw.titulo, definition.title),
    title_en: textFrom(raw.title_en, raw.titleEn, definition.titleEn),
    subtitle: textFrom(raw.subtitle, raw.subtitulo, definition.subtitle),
    subtitle_en: textFrom(
      raw.subtitle_en,
      raw.subtitleEn,
      definition.subtitleEn,
    ),
    href: textFrom(raw.href, raw.url, definition.href),
    icon: textFrom(raw.icon, raw.icone, definition.iconName),
    tone: normalizeTone(raw.tone, raw.tom) || definition.tone,
    count: numberFrom(raw.count, raw.total, items.length),
    empty_message: textFrom(
      raw.empty_message,
      raw.emptyMessage,
      raw.mensagem_vazia,
      definition.empty,
    ),
    empty_message_en: textFrom(
      raw.empty_message_en,
      raw.emptyMessageEn,
      definition.emptyEn,
    ),
    items,
  };
}

function normalizeCardItem(
  item: PublicHealthDashboardCardItem,
  fallbackHref: string,
): PublicHealthDashboardCardItem {
  const raw = (item || {}) as any;
  return {
    id:
      raw.id ??
      raw.pk ??
      raw.key ??
      raw.chave ??
      `${fallbackHref}-${raw.title || raw.titulo || "item"}`,
    title: textFrom(raw.title, raw.titulo),
    subtitle: textFrom(raw.subtitle, raw.subtitulo),
    href: textFrom(raw.href, raw.url, fallbackHref),
    status: textFrom(raw.status, raw.estado, raw.situacao, raw.situação),
    status_tone:
      normalizeTone(raw.status_tone, raw.statusTone, raw.tone, raw.tom) ||
      "default",
    meta: listFrom<string>(raw.meta),
  };
}

function buildLegacyCards(
  dashboard: PublicHealthDashboard,
): PublicHealthDashboardCard[] {
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
      })),
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
      })),
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
      })),
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
      })),
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
      })),
    ),
  ];
}

function legacyCard(
  key: string,
  items: PublicHealthDashboardCardItem[],
): PublicHealthDashboardCard {
  const definition = cardDefinition(key);
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
  };
}

/* ── Formatters ──────────────────────────────────────────────────── */

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatPercent(value?: string | number): string {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? `${parsed.toFixed(2)}%` : "0%";
}

function numberFrom(...values: unknown[]): number {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function textFrom(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return undefined;
}

function listFrom<T>(...values: unknown[]): T[] {
  for (const value of values) {
    if (Array.isArray(value)) return value as T[];
  }
  return [];
}

function normalizeTone(...values: unknown[]): Tone | undefined {
  for (const value of values) {
    if (
      value === "default" ||
      value === "success" ||
      value === "warning" ||
      value === "danger" ||
      value === "info"
    ) {
      return value;
    }
  }
  return undefined;
}

function riskVariant(risk?: string): Tone {
  const text = String(risk || "").toLocaleLowerCase("pt");
  if (
    text.includes("expir") ||
    text.includes("quebra") ||
    text.includes("sem doses") ||
    text.includes("recolh")
  )
    return "danger";
  if (
    text.includes("baixo") ||
    text.includes("validade") ||
    text.includes("quarentena")
  )
    return "warning";
  return "info";
}

function notificationVariant(status?: string): Tone {
  if (status === "FAILED" || status === "REJECTED") return "danger";
  if (status === "PENDING") return "warning";
  if (status === "SENT" || status === "ACCEPTED") return "success";
  return "info";
}

function coverageVariant(value?: string | number): Tone {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return "info";
  if (parsed >= 80) return "success";
  if (parsed < 50) return "warning";
  return "info";
}

/* ── Card definitions ────────────────────────────────────────────── */

type CardDefinition = {
  title: string;
  titleEn: string;
  subtitle: string;
  subtitleEn: string;
  href: string;
  iconName: string;
  icon: LucideIcon;
  tone: Tone;
  empty: string;
  emptyEn: string;
  spanClass?: string;
};

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
    title: "Notificações pendentes",
    titleEn: "Pending official notifications",
    subtitle:
      "Integração com e-SUS, SIPNI, DHIS2 ou sistema oficial configurado.",
    subtitleEn:
      "Integration with e-SUS, SIPNI, DHIS2 or configured official system.",
    href: "/public-health/notifications",
    iconName: "FileText",
    icon: FileText,
    tone: "warning",
    empty: "Sem notificação pendente.",
    emptyEn: "No pending official notification.",
    spanClass: "xl:col-span-2",
  },
};

const FALLBACK_CARD_DEFINITION: CardDefinition = {
  title: "Pendências",
  titleEn: "Pending items",
  subtitle: "Itens operacionais para acompanhamento.",
  subtitleEn: "Operational items to track.",
  href: "/public-health",
  iconName: "AlertTriangle",
  icon: AlertTriangle,
  tone: "default",
  empty: "Sem itens.",
  emptyEn: "No items.",
};

const ICON_BY_NAME: Record<string, LucideIcon> = {
  AlertTriangle,
  Bell,
  ClipboardList,
  FileText,
  PackageCheck,
  Syringe,
};

const TONE_CLASSES: Record<
  Tone,
  { bar: string; icon: string; badge: string; pill: string }
> = {
  default: {
    bar: "bg-gradient-to-b from-slate-400 to-slate-500",
    icon: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
    badge:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/40 dark:bg-slate-900/20 dark:text-slate-300",
    pill: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/40 dark:bg-slate-900/20 dark:text-slate-300",
  },
  success: {
    bar: "bg-gradient-to-b from-emerald-500 to-teal-600",
    icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  },
  warning: {
    bar: "bg-gradient-to-b from-amber-500 to-orange-600",
    icon: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
    pill: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  },
  danger: {
    bar: "bg-gradient-to-b from-red-500 to-rose-600",
    icon: "bg-red-500/15 text-red-600 dark:text-red-300",
    badge:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
    pill: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
  },
  info: {
    bar: "bg-gradient-to-b from-blue-500 to-indigo-600",
    icon: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
    badge:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",
    pill: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",
  },
};

function cardDefinition(key: string): CardDefinition {
  return CARD_DEFINITIONS[key] || FALLBACK_CARD_DEFINITION;
}

function cardIcon(
  card: PublicHealthDashboardCard,
  definition: CardDefinition,
): LucideIcon {
  return ICON_BY_NAME[card.icon || ""] || definition.icon;
}

/* ── Dashboard card ──────────────────────────────────────────────── */

function DashboardCard({
  card,
  loading,
}: {
  card: PublicHealthDashboardCard;
  loading: boolean;
}) {
  const { t } = useLanguage();
  const definition = cardDefinition(card.key);
  const tone = normalizeTone(card.tone) || definition.tone;
  const tc = TONE_CLASSES[tone];
  const Icon = cardIcon(card, definition);
  const href = card.href || definition.href;
  const items = card.items || [];
  const count = card.count ?? items.length;
  const title = t(
    card.title || definition.title,
    card.title_en || definition.titleEn,
  );
  const subtitle = t(
    card.subtitle || definition.subtitle,
    card.subtitle_en || definition.subtitleEn,
  );
  const emptyMessage = t(
    card.empty_message || definition.empty,
    card.empty_message_en || definition.emptyEn,
  );

  return (
    <section className="relative h-full overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      <span
        className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${tc.bar}`}
      />

      <div className="flex items-center gap-2.5 border-b border-border/50 px-3 py-2 pl-4">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tc.icon}`}
        >
          <Icon size={14} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[12px] font-semibold text-foreground">
              {title}
            </h3>
            {!loading && (
              <span
                className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold tabular-nums ${tc.badge}`}
              >
                {count}
              </span>
            )}
          </div>
          <p className="truncate text-[10px] text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-primary no-underline hover:underline"
        >
          Abrir <ArrowRight size={12} strokeWidth={2} />
        </Link>
      </div>

      <div className="space-y-1 p-2 pl-3">
        {loading ? (
          <DashboardCardSkeleton />
        ) : items.length ? (
          items.map((item) => (
            <DashboardCardRow key={`${card.key}-${item.id}`} item={item} />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 bg-white/20 py-4 text-center text-[11px] text-muted-foreground dark:bg-white/5">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
}

function DashboardCardSkeleton() {
  return (
    <div className="space-y-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-lg bg-white/35 dark:bg-white/10"
        />
      ))}
    </div>
  );
}

function DashboardCardRow({ item }: { item: PublicHealthDashboardCardItem }) {
  const tone = normalizeTone(item.status_tone) || "default";
  const content = (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="truncate text-[11px] font-semibold text-foreground">
          {item.title || "-"}
        </div>
        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {item.subtitle || "-"}
        </div>
      </div>
      {item.status ? (
        <span
          className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${TONE_CLASSES[tone].pill}`}
        >
          {item.status}
        </span>
      ) : null}
    </div>
  );

  const cls =
    "block rounded-lg border border-white/20 bg-white/25 px-2.5 py-2 shadow-sm transition hover:border-white/40 hover:bg-white/45 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10";

  if (item.href)
    return (
      <Link href={item.href} className={cls}>
        {content}
      </Link>
    );
  return <div className={cls}>{content}</div>;
}
