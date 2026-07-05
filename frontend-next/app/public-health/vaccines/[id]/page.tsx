"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Edit2,
  Loader2,
  Snowflake,
  Syringe,
  Target,
  Thermometer,
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

interface VaccineRecord {
  id: number;
  custom_id: string;
  version: string;
  name: string;
  code: string;
  disease: string;
  vaccine_type: string;
  manufacturer: string;
  dose_volume_ml: string;
  dose_count_required: number;
  booster_interval_days: number;
  minimum_age_months: number | null;
  maximum_age_months: number | null;
  cold_chain_min_c: string;
  cold_chain_max_c: string;
  official_code: string;
  active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

const TYPE_META: Record<string, { label: string; emoji: string; bar: string; chip: string; grad: string; glow: string; btn: string; blob1: string; blob2: string }> = {
  LIVE_ATTENUATED: { label: "Viva atenuada", emoji: "🦠", bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300", grad: "from-emerald-500 to-teal-600", glow: "shadow-emerald-500/30", btn: "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/30", blob1: "bg-emerald-500/10", blob2: "bg-teal-500/10"   },
  INACTIVATED:     { label: "Inativada",     emoji: "💉", bar: "bg-blue-500",    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",             grad: "from-blue-500 to-indigo-600", glow: "shadow-blue-500/30",  btn: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30",   blob1: "bg-blue-500/10",    blob2: "bg-indigo-500/10" },
  TOXOID:          { label: "Toxóide",       emoji: "☣️", bar: "bg-amber-500",   chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",         grad: "from-amber-500 to-orange-600", glow: "shadow-amber-500/30", btn: "from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/30", blob1: "bg-amber-500/10",   blob2: "bg-orange-500/10" },
  SUBUNIT:         { label: "Subunidade",    emoji: "🧩", bar: "bg-teal-500",    chip: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300",             grad: "from-teal-500 to-cyan-600",  glow: "shadow-teal-500/30",  btn: "from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-teal-500/30",       blob1: "bg-teal-500/10",    blob2: "bg-cyan-500/10"   },
  MRNA:            { label: "mRNA",          emoji: "🧬", bar: "bg-violet-500",  chip: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300", grad: "from-violet-500 to-fuchsia-600", glow: "shadow-violet-500/30", btn: "from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-violet-500/30", blob1: "bg-violet-500/10", blob2: "bg-fuchsia-500/10" },
  VIRAL_VECTOR:    { label: "Vetor viral",   emoji: "🧫", bar: "bg-pink-500",    chip: "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-700/40 dark:bg-pink-900/20 dark:text-pink-300",                 grad: "from-pink-500 to-rose-600",  glow: "shadow-pink-500/30",  btn: "from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 shadow-pink-500/30",       blob1: "bg-pink-500/10",    blob2: "bg-rose-500/10"   },
  OTHER:           { label: "Outra",         emoji: "💊", bar: "bg-slate-400",   chip: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-300",         grad: "from-slate-400 to-slate-600", glow: "shadow-slate-400/20", btn: "from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 shadow-slate-400/20", blob1: "bg-slate-400/10",   blob2: "bg-slate-500/10"  },
};

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

export default function VaccineDetailPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [rec, setRec] = useState<VaccineRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<VaccineRecord>(`/public_health/vaccine/${id}/`)
      .then(setRec)
      .catch(() => setError("Vacina não encontrada."))
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
        {error ?? "Erro ao carregar vacina."}
      </div>
    </AppLayout>
  );

  const tm = TYPE_META[rec.vaccine_type] ?? TYPE_META["OTHER"];

  return (
    <AppLayout requiredGroups={DETAIL_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl ${tm.blob1}`} />
            <div className={`absolute -bottom-8 left-6 h-24 w-24 rounded-full blur-2xl ${tm.blob2}`} />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${tm.bar}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tm.grad} shadow-md ${tm.glow}`}>
              <Syringe size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/public-health/vaccines" className="hover:underline">Vacinas</Link>
                <span>/</span>
                <span className="font-medium text-foreground">{rec.custom_id}</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">{rec.name}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tm.chip}`}>
                  {tm.emoji} {tm.label}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${rec.active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                  : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-400"}`}>
                  {rec.active ? "Ativa" : "Inativa"}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">v{rec.version}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`/public-health/vaccines/${id}/edit`}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r px-4 text-xs font-semibold text-white shadow-md transition ${tm.btn}`}>
                <Edit2 size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        {/* ── Cards ─────────────────────────────────────────────── */}
        <div className="grid gap-2 lg:grid-cols-2">

          {/* Identificação */}
          <Card icon={Target} title="Identificação" accent={tm.bar}>
            <div className="space-y-0.5">
              <Row label="Nome" value={<span className="font-semibold">{rec.name}</span>} />
              <Row label="Doença alvo" value={rec.disease} />
              <Row label="Tipo" value={<span>{tm.emoji} {tm.label}</span>} />
              <Row label="Fabricante" value={rec.manufacturer || null} />
              <Row label="Código" value={rec.code ? <span className="font-mono">{rec.code}</span> : null} />
              <Row label="Código oficial" value={rec.official_code ? <span className="font-mono">{rec.official_code}</span> : null} />
              <Row label="Estado" value={
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold ${rec.active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                  : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-400"}`}>
                  {rec.active ? "Ativa" : "Inativa"}
                </span>
              } />
            </div>
          </Card>

          {/* Esquema vacinal */}
          <Card icon={Syringe} title="Esquema vacinal" accent="bg-indigo-500">
            <div className="space-y-0.5">
              <Row label="Doses requeridas" value={<span className="font-semibold">{rec.dose_count_required}</span>} />
              <Row label="Intervalo de reforço" value={rec.booster_interval_days > 0 ? `${rec.booster_interval_days} dias` : "Sem reforço"} />
              <Row label="Volume da dose" value={rec.dose_volume_ml ? `${rec.dose_volume_ml} ml` : null} />
              <Row label="Faixa etária" value={ageLabel(rec.minimum_age_months, rec.maximum_age_months)} />
            </div>
          </Card>

          {/* Cadeia fria */}
          <Card icon={Snowflake} title="Cadeia fria" accent="bg-sky-500">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-3 py-1">
                <div className="text-center">
                  <div className="text-sm font-bold text-sky-600 dark:text-sky-400">{rec.cold_chain_min_c}°C</div>
                  <div className="text-[9px] text-muted-foreground">Mínima</div>
                </div>
                <Thermometer size={18} className="text-sky-500" />
                <div className="text-center">
                  <div className="text-sm font-bold text-sky-600 dark:text-sky-400">{rec.cold_chain_max_c}°C</div>
                  <div className="text-[9px] text-muted-foreground">Máxima</div>
                </div>
              </div>
              <p className="text-center text-[10px] text-muted-foreground">
                Conservar entre {rec.cold_chain_min_c}°C e {rec.cold_chain_max_c}°C
              </p>
            </div>
          </Card>

          {/* Registo */}
          <Card icon={CalendarDays} title="Registo" accent="bg-slate-400">
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
