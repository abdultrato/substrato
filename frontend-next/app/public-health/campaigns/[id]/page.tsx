"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Edit2,
  Loader2,
  MapPin,
  Syringe,
  Target,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const DETAIL_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.RECEPCAO,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.ENFERMAGEM,
  GROUPS.LABORATORIO,
  GROUPS.SAUDE_PUBLICA,
];

interface CampaignRecord {
  id: number;
  custom_id: string;
  version: string;
  name: string;
  vaccine: number;
  vaccine_name: string;
  manager: number | null;
  manager_name: string;
  campaign_type: string;
  status: string;
  target_region: string;
  target_age_min_months: number | null;
  target_age_max_months: number | null;
  target_population: number;
  target_doses: number;
  administered_doses: number;
  coverage_percent: string;
  start_date: string;
  end_date: string | null;
  official_program_code: string;
  official_system: string;
  notification_endpoint: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

const TYPE_META: Record<string, { label: string; emoji: string }> = {
  ROUTINE:      { label: "Rotina",       emoji: "🔁" },
  MASS:         { label: "Massiva",      emoji: "📣" },
  OUTBREAK:     { label: "Surto",        emoji: "🚨" },
  SCHOOL:       { label: "Escolar",      emoji: "🏫" },
  OCCUPATIONAL: { label: "Ocupacional",  emoji: "🏭" },
  OTHER:        { label: "Outra",        emoji: "📋" },
};

const STATUS_META: Record<string, { label: string; emoji: string; bar: string; chip: string; grad: string; glow: string; btn: string; blob1: string; blob2: string }> = {
  PLANNED:   { label: "Planeada",  emoji: "📅", bar: "bg-blue-500",    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",             grad: "from-blue-500 to-indigo-600",  glow: "shadow-blue-500/30",    btn: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30",       blob1: "bg-blue-500/10",    blob2: "bg-indigo-500/10" },
  ACTIVE:    { label: "Ativa",     emoji: "▶️", bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300", grad: "from-emerald-500 to-teal-600", glow: "shadow-emerald-500/30", btn: "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/30", blob1: "bg-emerald-500/10", blob2: "bg-teal-500/10"   },
  PAUSED:    { label: "Pausada",   emoji: "⏸️", bar: "bg-amber-500",   chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",         grad: "from-amber-500 to-orange-600", glow: "shadow-amber-500/30",   btn: "from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/30",   blob1: "bg-amber-500/10",   blob2: "bg-orange-500/10" },
  COMPLETED: { label: "Concluída", emoji: "✅", bar: "bg-teal-500",    chip: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300",             grad: "from-teal-500 to-emerald-600", glow: "shadow-teal-500/30",    btn: "from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-teal-500/30",   blob1: "bg-teal-500/10",    blob2: "bg-emerald-500/10" },
  CANCELLED: { label: "Cancelada", emoji: "✖️", bar: "bg-red-500",     chip: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",                 grad: "from-red-500 to-rose-600",     glow: "shadow-red-500/30",     btn: "from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-500/30",             blob1: "bg-red-500/10",     blob2: "bg-rose-500/10"   },
};

const LIFECYCLE = ["PLANNED", "ACTIVE", "COMPLETED"];
const OFF_PATH = ["PAUSED", "CANCELLED"];

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
}

function ageLabel(min: number | null, max: number | null): string {
  const fmt = (m: number) => (m % 12 === 0 ? `${m / 12} anos` : `${m} meses`);
  if (min != null && max != null) return `${fmt(min)} a ${fmt(max)}`;
  if (min != null) return `A partir de ${fmt(min)}`;
  if (max != null) return `Até ${fmt(max)}`;
  return "Todas as idades";
}

function coverageTone(pct: number): string {
  if (pct >= 80) return "bg-emerald-500";
  if (pct < 50) return "bg-amber-500";
  return "bg-blue-500";
}

function Card({ icon: Icon, title, accent, children }: {
  icon: React.ElementType; title: string; accent?: string; children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />}
      <div className="flex items-center gap-1.5 border-b border-border/50 px-3 py-1.5 pl-4">
        <Icon size={11} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-[11px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-3 pl-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className="w-36 shrink-0 text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[11px] text-foreground">{value}</span>
    </div>
  );
}

export default function CampaignDetailPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [rec, setRec] = useState<CampaignRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<CampaignRecord>(`/public_health/campaign/${id}/`)
      .then(setRec)
      .catch(() => setError("Campanha não encontrada."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <AppLayout requiredGroups={DETAIL_GROUPS}>
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
      </div>
    </AppLayout>
  );

  if (error || !rec) return (
    <AppLayout requiredGroups={DETAIL_GROUPS}>
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
        {error ?? "Erro ao carregar campanha."}
      </div>
    </AppLayout>
  );

  const sm = STATUS_META[rec.status] ?? STATUS_META["PLANNED"];
  const tm = TYPE_META[rec.campaign_type] ?? { label: rec.campaign_type, emoji: "📋" };
  const pct = Math.min(100, Math.max(0, Number(rec.coverage_percent) || 0));
  const isOffPath = OFF_PATH.includes(rec.status);
  const currentStep = LIFECYCLE.indexOf(rec.status);

  return (
    <AppLayout requiredGroups={DETAIL_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl ${sm.blob1}`} />
            <div className={`absolute -bottom-8 left-6 h-24 w-24 rounded-full blur-2xl ${sm.blob2}`} />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${sm.bar}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${sm.grad} shadow-md ${sm.glow}`}>
              <ClipboardList size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/public-health/campaigns" className="hover:underline">Campanhas</Link>
                <span>/</span>
                <span className="font-medium text-foreground">{rec.custom_id}</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">{rec.name}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sm.chip}`}>
                  {sm.emoji} {sm.label}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {tm.emoji} {tm.label}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">v{rec.version}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`/public-health/campaigns/${id}/edit`}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r px-4 text-xs font-semibold text-white shadow-md transition ${sm.btn}`}>
                <Edit2 size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        {/* ── Cobertura ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-white/20 bg-white/25 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="mb-1 flex items-end justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground">Cobertura de doses</div>
              <div className="text-lg font-bold text-foreground">{pct.toFixed(2)}%</div>
            </div>
            <div className="text-right text-[10px] text-muted-foreground">
              <span className="font-semibold text-foreground">{rec.administered_doses ?? 0}</span> aplicadas
              {" · "}meta <span className="font-semibold text-foreground">{rec.target_doses ?? 0}</span>
            </div>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-border">
            <div className={coverageTone(pct)} style={{ width: `${pct}%`, height: "100%" }} />
          </div>
        </div>

        {/* ── Ciclo de vida ─────────────────────────────────────── */}
        <div className="rounded-xl border border-white/20 bg-white/25 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          {isOffPath ? (
            <div className="flex items-center gap-2 text-[11px]">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sm.chip}`}>
                {sm.emoji} {sm.label}
              </span>
              <span className="text-muted-foreground">
                Campanha fora do ciclo normal (planeada → ativa → concluída).
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-0">
              {LIFECYCLE.map((step, idx) => {
                const sm2 = STATUS_META[step];
                const done = currentStep > idx;
                const active = currentStep === idx;
                const isLast = idx === LIFECYCLE.length - 1;
                return (
                  <div key={step} className="flex flex-1 items-center">
                    <div className="flex min-w-0 flex-col items-center gap-1">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition ${
                        active ? `${sm2.bar} text-white shadow-sm` :
                        done ? "bg-emerald-500 text-white" :
                        "bg-border text-muted-foreground"
                      }`}>
                        {done ? "✓" : idx + 1}
                      </div>
                      <span className={`text-center text-[9px] leading-tight ${active ? "font-semibold text-foreground" : done ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                        {sm2.label}
                      </span>
                    </div>
                    {!isLast && (
                      <div className={`mx-1 h-0.5 flex-1 rounded-full ${done ? "bg-emerald-400" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Cards ─────────────────────────────────────────────── */}
        <div className="grid gap-2 lg:grid-cols-2">

          {/* Identificação */}
          <Card icon={Target} title="Identificação" accent={sm.bar}>
            <div className="space-y-0.5">
              <Row label="Nome" value={<span className="font-semibold">{rec.name}</span>} />
              <Row label="Tipo" value={<span>{tm.emoji} {tm.label}</span>} />
              <Row label="Vacina" value={rec.vaccine_name || (rec.vaccine ? `#${rec.vaccine}` : null)} />
              <Row label="Responsável" value={rec.manager_name || null} />
              <Row label="Código do programa" value={rec.official_program_code ? <span className="font-mono">{rec.official_program_code}</span> : null} />
            </div>
          </Card>

          {/* Alvo */}
          <Card icon={MapPin} title="População alvo" accent="bg-indigo-500">
            <div className="space-y-0.5">
              <Row label="Região" value={rec.target_region || null} />
              <Row label="Faixa etária" value={ageLabel(rec.target_age_min_months, rec.target_age_max_months)} />
              <Row label="População alvo" value={rec.target_population ? rec.target_population.toLocaleString("pt-PT") : null} />
              <Row label="Meta de doses" value={rec.target_doses ? rec.target_doses.toLocaleString("pt-PT") : null} />
              <Row label="Doses aplicadas" value={<span className="font-semibold">{(rec.administered_doses ?? 0).toLocaleString("pt-PT")}</span>} />
            </div>
          </Card>

          {/* Calendário */}
          <Card icon={CalendarDays} title="Calendário" accent="bg-blue-500">
            <div className="space-y-0.5">
              <Row label="Início" value={fmtDate(rec.start_date)} />
              <Row label="Fim" value={rec.end_date ? fmtDate(rec.end_date) : "Em aberto"} />
            </div>
          </Card>

          {/* Integração */}
          <Card icon={Syringe} title="Integração oficial" accent="bg-teal-500">
            <div className="space-y-0.5">
              <Row label="Sistema oficial" value={rec.official_system || null} />
              <Row label="Endpoint" value={rec.notification_endpoint ? <span className="break-all font-mono text-[10px]">{rec.notification_endpoint}</span> : null} />
              {!rec.official_system && !rec.notification_endpoint && (
                <p className="py-1 text-[10px] text-muted-foreground">Sem integração oficial configurada.</p>
              )}
            </div>
          </Card>

          {/* Registo */}
          <Card icon={User} title="Registo" accent="bg-slate-400">
            <div className="space-y-0.5">
              <Row label="Referência" value={<span className="font-mono">{rec.custom_id}</span>} />
              <Row label="Versão" value={`v${rec.version}`} />
              <Row label="Criado em" value={fmtDate(rec.created_at)} />
              <Row label="Actualizado" value={fmtDate(rec.updated_at)} />
              <Row label="Observações" value={rec.notes || null} />
            </div>
          </Card>

        </div>
      </div>
    </AppLayout>
  );
}
