"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  ChevronRight,
  ClipboardList,
  FileText,
  Loader2,
  PackageCheck,
  RefreshCw,
  Syringe,
  type LucideIcon,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const DASHBOARD_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.RECEPCAO,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.ENFERMAGEM,
  GROUPS.LABORATORIO,
  GROUPS.SAUDE_PUBLICA,
];

/* ── Types ─────────────────────────────────────────────────────────── */

interface Summary {
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
}

interface StockRisk {
  id: number;
  custom_id?: string;
  vaccine_name?: string;
  lot_number?: string;
  expiration_date?: string;
  doses_available?: number;
  storage_location?: string;
  risk?: string;
}

interface CampaignItem {
  id: number;
  custom_id?: string;
  name?: string;
  vaccine_name?: string;
  target_region?: string;
  administered_doses?: number;
  target_doses?: number;
  coverage_percent?: string | number;
}

interface BoosterItem {
  id: number;
  custom_id?: string;
  patient_name?: string;
  vaccine_name?: string;
  dose_number?: number;
  next_due_date?: string;
  days_overdue?: number;
}

interface AefiItem {
  id: number;
  custom_id?: string;
  patient_name?: string;
  vaccine_name?: string;
  severity?: string;
  serious?: boolean;
  reported_at?: string;
  investigation_due_at?: string | null;
}

interface NotifItem {
  id: number;
  custom_id?: string;
  official_system?: string;
  event_type?: string;
  status?: string;
  attempt_count?: number;
  next_retry_at?: string | null;
  error_message?: string;
}

interface DashboardData {
  summary?: Partial<Summary>;
  resumo?: Partial<Summary>;
  stock_risks?: StockRisk[];
  lots_at_risk?: StockRisk[];
  campaign_progress?: CampaignItem[];
  booster_queue?: BoosterItem[];
  overdue_boosters?: BoosterItem[];
  aefi_queue?: AefiItem[];
  notification_queue?: NotifItem[];
  pending_notifications?: NotifItem[];
}

/* ── Helpers ───────────────────────────────────────────────────────── */

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
function fmtDate(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}
function fmtPct(v?: string | number): string {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : "0%";
}

function parseData(raw: DashboardData) {
  const s = (raw.summary || raw.resumo || {}) as Record<string, unknown>;
  const summary: Summary = {
    vaccines: num(s.vaccines ?? s.vacinas),
    active_lots: num(s.active_lots ?? s.lotes_ativos),
    active_campaigns: num(s.active_campaigns ?? s.campanhas_ativas),
    immunizations_30d: num(s.immunizations_30d ?? s.imunizacoes_30d),
    due_boosters: num(
      s.due_boosters ?? s.overdue_boosters ?? s.reforcos_vencidos,
    ),
    serious_aefi_open: num(s.serious_aefi_open ?? s.aefi_graves),
    pending_notifications: num(
      s.pending_notifications ?? s.notificacoes_pendentes,
    ),
    low_stock_lots: num(s.low_stock_lots ?? s.lotes_stock_baixo),
    cold_chain_breaches: num(s.cold_chain_breaches ?? s.quebras_cadeia_fria),
    expired_lots: num(s.expired_lots ?? s.lotes_expirados),
  };
  return {
    summary,
    stockRisks: arr<StockRisk>(raw.stock_risks ?? raw.lots_at_risk),
    campaigns: arr<CampaignItem>(raw.campaign_progress),
    boosters: arr<BoosterItem>(raw.booster_queue ?? raw.overdue_boosters),
    aefi: arr<AefiItem>(raw.aefi_queue),
    notifications: arr<NotifItem>(
      raw.notification_queue ?? raw.pending_notifications,
    ),
  };
}

/* ── Metric row ────────────────────────────────────────────────────── */

type MetricItem = {
  label: string;
  value: number;
  bar: string;
  chip: string;
  href: string;
  alert?: boolean;
};

function MetricPill({ m, loading }: { m: MetricItem; loading: boolean }) {
  return (
    <Link
      href={m.href}
      className={`relative flex min-w-0 items-center overflow-hidden rounded-md border border-white/20 bg-white/25 px-2 py-1.5 pl-3 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/40 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 ${m.alert ? "ring-1 ring-red-400/40" : ""}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 rounded-l-md ${m.bar}`} />
      <div className="min-w-0">
        {loading ? (
          <div className="h-3 w-8 animate-pulse rounded bg-current/20" />
        ) : (
          <div
            className={`text-sm font-bold tabular-nums leading-none ${m.chip}`}
          >
            {m.value}
          </div>
        )}
        <div className="truncate text-[9px] leading-tight text-muted-foreground">
          {m.label}
        </div>
        {m.alert && (
          <div className="truncate text-[8px] font-semibold leading-tight text-red-600 dark:text-red-400">
            ⚠ atenção
          </div>
        )}
      </div>
    </Link>
  );
}

/* ── Queue card ────────────────────────────────────────────────────── */

type QueueCardProps = {
  icon: LucideIcon;
  title: string;
  count: number;
  href: string;
  bar: string;
  iconBg: string;
  badge: string;
  loading: boolean;
  children: React.ReactNode;
};

function QueueCard({
  icon: Icon,
  title,
  count,
  href,
  bar,
  iconBg,
  badge,
  loading,
  children,
}: QueueCardProps) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${bar}`} />
      <div className="flex items-center gap-2.5 border-b border-border/50 px-3 py-2 pl-4">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
        >
          <Icon size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[12px] font-semibold text-foreground">
              {title}
            </h3>
            {!loading && (
              <span
                className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold tabular-nums ${badge}`}
              >
                {count}
              </span>
            )}
          </div>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
        >
          Abrir <ArrowRight size={11} />
        </Link>
      </div>
      <div className="space-y-1 p-2 pl-3">
        {loading ? (
          <div className="space-y-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-white/35 dark:bg-white/10"
              />
            ))}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-white/20 py-4 text-center text-[11px] text-muted-foreground dark:bg-white/5">
      {message}
    </div>
  );
}

function QueueRow({
  href,
  title,
  subtitle,
  pill,
  pillClass,
}: {
  href: string;
  title: string;
  subtitle: string;
  pill?: string;
  pillClass?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-2 rounded-lg border border-white/20 bg-white/25 px-2.5 py-2 transition hover:bg-white/40 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
    >
      <div className="min-w-0">
        <div className="truncate text-[11px] font-semibold text-foreground">
          {title}
        </div>
        <div className="truncate text-[10px] text-muted-foreground">
          {subtitle}
        </div>
      </div>
      {pill && (
        <span
          className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${pillClass}`}
        >
          {pill}
        </span>
      )}
      <ChevronRight size={11} className="shrink-0 text-muted-foreground" />
    </Link>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function PublicHealthDashboardPage() {
  useAuthGuard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReturnType<typeof parseData> | null>(null);
  const [refreshed, setRefreshed] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<DashboardData>("/public_health/dashboard/")
      .then((raw) => setData(parseData(raw)))
      .catch((e) => setError(e?.message || "Erro ao carregar dashboard."))
      .finally(() => setLoading(false));
  }, [refreshed]);

  const s: Summary = data?.summary ?? {
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

  const metrics: MetricItem[] = [
    {
      label: "Vacinas",
      value: s.vaccines,
      bar: "bg-emerald-500",
      chip: "text-emerald-700 dark:text-emerald-300",
      href: "/public-health/vaccines",
    },
    {
      label: "Lotes ativos",
      value: s.active_lots,
      bar: "bg-amber-500",
      chip: "text-amber-700   dark:text-amber-300",
      href: "/public-health/lots?status=ACTIVE",
    },
    {
      label: "Campanhas ativas",
      value: s.active_campaigns,
      bar: "bg-blue-500",
      chip: "text-blue-700    dark:text-blue-300",
      href: "/public-health/campaigns?status=ACTIVE",
    },
    {
      label: "Imunizações (30d)",
      value: s.immunizations_30d,
      bar: "bg-teal-500",
      chip: "text-teal-700    dark:text-teal-300",
      href: "/public-health/immunizations",
    },
    {
      label: "Reforços vencidos",
      value: s.due_boosters,
      bar: "bg-orange-500",
      chip: "text-orange-700  dark:text-orange-300",
      href: "/public-health/immunizations",
      alert: s.due_boosters > 0,
    },
    {
      label: "AEFI graves",
      value: s.serious_aefi_open,
      bar: "bg-red-500",
      chip: "text-red-700     dark:text-red-300",
      href: "/public-health/adverse-events?serious=true",
      alert: s.serious_aefi_open > 0,
    },
    {
      label: "Notif. pendentes",
      value: s.pending_notifications,
      bar: "bg-violet-500",
      chip: "text-violet-700 dark:text-violet-300",
      href: "/public-health/notifications?status=PENDING",
      alert: s.pending_notifications > 0,
    },
    {
      label: "Riscos de stock",
      value: s.low_stock_lots + s.cold_chain_breaches + s.expired_lots,
      bar: "bg-rose-500",
      chip: "text-rose-700 dark:text-rose-300",
      href: "/public-health/lots",
      alert: s.low_stock_lots + s.cold_chain_breaches + s.expired_lots > 0,
    },
  ];

  return (
    <AppLayout requiredGroups={DASHBOARD_GROUPS}>
      <div className="mx-auto w-full max-w-[97vw] space-y-2">
        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="absolute -bottom-10 left-8 h-32 w-32 rounded-full bg-teal-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-emerald-500 to-teal-600" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/30">
              <Activity size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/public-health" className="hover:underline">
                  Saúde Pública
                </Link>
                <span>/</span>
                <span className="font-medium text-foreground">
                  Dashboard operacional
                </span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                Monitorização em tempo real
              </h1>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                Filas operacionais · stock · AEFI · notificações pendentes
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRefreshed((n) => n + 1)}
                disabled={loading}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                Actualizar
              </button>
              <Link
                href="/public-health"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted"
              >
                <ArrowLeft size={12} /> Hub
              </Link>
            </div>
          </div>

          <div className="relative border-t border-white/20 px-3 py-1.5 dark:border-white/10">
            <div className="grid grid-cols-8 gap-1 whitespace-nowrap">
              {metrics.map((m) => (
                <MetricPill key={m.label} m={m} loading={loading} />
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {/* ── Queues ────────────────────────────────────────────── */}
        <div className="grid gap-2 xl:grid-cols-2">
          {/* Lotes em risco */}
          <QueueCard
            icon={PackageCheck}
            title="Lotes em risco"
            count={data?.stockRisks.length ?? 0}
            href="/public-health/lots"
            loading={loading}
            bar="bg-gradient-to-b from-amber-500 to-orange-600"
            iconBg="bg-amber-500/15 text-amber-700 dark:text-amber-300"
            badge="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"
          >
            {data?.stockRisks.length ? (
              data.stockRisks.map((item) => (
                <QueueRow
                  key={item.id}
                  href={`/public-health/lots/${item.id}`}
                  title={`${item.vaccine_name || "Vacina"} · ${item.lot_number || item.custom_id}`}
                  subtitle={`Validade: ${fmtDate(item.expiration_date)} · ${item.doses_available ?? 0} doses · ${item.storage_location || "—"}`}
                  pill={item.risk || "—"}
                  pillClass="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"
                />
              ))
            ) : (
              <EmptyState message="Sem lotes em risco." />
            )}
          </QueueCard>

          {/* Campanhas ativas */}
          <QueueCard
            icon={ClipboardList}
            title="Campanhas ativas"
            count={data?.campaigns.length ?? 0}
            href="/public-health/campaigns"
            loading={loading}
            bar="bg-gradient-to-b from-blue-500 to-indigo-600"
            iconBg="bg-blue-500/15 text-blue-600 dark:text-blue-300"
            badge="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300"
          >
            {data?.campaigns.length ? (
              data.campaigns.map((item) => (
                <QueueRow
                  key={item.id}
                  href={`/public-health/campaigns/${item.id}`}
                  title={item.name || item.custom_id || String(item.id)}
                  subtitle={`${item.vaccine_name || "—"} · ${item.target_region || "—"} · ${item.administered_doses ?? 0}/${item.target_doses ?? 0} doses`}
                  pill={fmtPct(item.coverage_percent)}
                  pillClass={
                    Number(item.coverage_percent ?? 0) >= 80
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                      : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"
                  }
                />
              ))
            ) : (
              <EmptyState message="Sem campanha ativa." />
            )}
          </QueueCard>

          {/* Reforços vencidos */}
          <QueueCard
            icon={Syringe}
            title="Reforços vencidos"
            count={data?.boosters.length ?? 0}
            href="/public-health/immunizations"
            loading={loading}
            bar="bg-gradient-to-b from-orange-500 to-red-600"
            iconBg="bg-orange-500/15 text-orange-700 dark:text-orange-300"
            badge="border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300"
          >
            {data?.boosters.length ? (
              data.boosters.map((item) => (
                <QueueRow
                  key={item.id}
                  href={`/public-health/immunizations/${item.id}`}
                  title={item.patient_name || item.custom_id || String(item.id)}
                  subtitle={`${item.vaccine_name || "—"} · dose ${item.dose_number ?? "—"} · vence ${fmtDate(item.next_due_date)}`}
                  pill={`${item.days_overdue || 0} dias`}
                  pillClass="border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300"
                />
              ))
            ) : (
              <EmptyState message="Sem reforços vencidos." />
            )}
          </QueueCard>

          {/* AEFI em investigação */}
          <QueueCard
            icon={AlertTriangle}
            title="AEFI em investigação"
            count={data?.aefi.length ?? 0}
            href="/public-health/adverse-events"
            loading={loading}
            bar="bg-gradient-to-b from-red-500 to-rose-600"
            iconBg="bg-red-500/15 text-red-600 dark:text-red-300"
            badge="border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300"
          >
            {data?.aefi.length ? (
              data.aefi.map((item) => (
                <QueueRow
                  key={item.id}
                  href={`/public-health/adverse-events/${item.id}`}
                  title={item.patient_name || item.custom_id || String(item.id)}
                  subtitle={`${item.vaccine_name || "—"} · reportado: ${fmtDate(item.reported_at)} · investigar até ${fmtDate(item.investigation_due_at)}`}
                  pill={item.severity || item.serious ? "Grave" : "—"}
                  pillClass={
                    item.serious
                      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300"
                      : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"
                  }
                />
              ))
            ) : (
              <EmptyState message="Sem AEFI grave aberto." />
            )}
          </QueueCard>

          {/* Notificações pendentes — full width */}
          <div className="xl:col-span-2">
            <QueueCard
              icon={Bell}
              title="Notificações oficiais pendentes"
              count={data?.notifications.length ?? 0}
              href="/public-health/notifications"
              loading={loading}
              bar="bg-gradient-to-b from-violet-500 to-purple-600"
              iconBg="bg-violet-500/15 text-violet-600 dark:text-violet-300"
              badge="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300"
            >
              {data?.notifications.length ? (
                <div className="grid gap-1 sm:grid-cols-2">
                  {data.notifications.map((item) => {
                    const isFailed =
                      item.status === "FAILED" || item.status === "REJECTED";
                    const pillClass = isFailed
                      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300"
                      : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300";
                    return (
                      <QueueRow
                        key={item.id}
                        href={`/public-health/notifications/${item.id}`}
                        title={`${item.official_system || "—"} · ${item.event_type || "—"}`}
                        subtitle={`${item.custom_id} · tentativas: ${item.attempt_count ?? 0} · retry: ${fmtDate(item.next_retry_at)}`}
                        pill={item.status || "—"}
                        pillClass={pillClass}
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState message="Sem notificação oficial pendente." />
              )}
            </QueueCard>
          </div>
        </div>

        {/* ── Footer links ──────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl border border-white/20 bg-white/20 px-4 py-2 text-[11px] text-muted-foreground backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <span>Dados actualizados em tempo real via API.</span>
          <div className="flex items-center gap-3">
            <Link
              href="/public-health"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ArrowLeft size={11} /> Hub de Saúde Pública
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
