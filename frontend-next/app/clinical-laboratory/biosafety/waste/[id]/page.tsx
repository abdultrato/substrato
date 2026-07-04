"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Edit2,
  Loader2,
  MapPin,
  Package,
  Trash2,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const DETAIL_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

interface WasteRecord {
  id: number;
  custom_id: string;
  version: string;
  waste_type: string;
  status: string;
  department: string;
  quantity: string;
  container_type: string;
  container_code: string;
  fill_level: string;
  generated_at: string;
  storage_location: string;
  collected_by: number | null;
  disposal_method: string;
  disposal_date: string | null;
  created_at: string;
  updated_at: string;
}

const TYPE_META: Record<string, { label: string; emoji: string; bar: string; badge: string; grad: string; glow: string; btn: string; blob1: string; blob2: string }> = {
  BIOLOGICO:        { label: "Biológico",       emoji: "🧫", bar: "bg-violet-500",  badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300",   grad: "from-violet-500 to-purple-600",  glow: "shadow-violet-500/30", btn: "from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-violet-500/30", blob1: "bg-violet-500/10",  blob2: "bg-purple-500/10"  },
  PERFUROCORTANTE:  { label: "Perfurocortante", emoji: "🩺", bar: "bg-red-500",     badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",                     grad: "from-red-500 to-rose-600",        glow: "shadow-red-500/30",    btn: "from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-500/30",             blob1: "bg-red-500/10",     blob2: "bg-rose-500/10"    },
  QUIMICO:          { label: "Químico",          emoji: "⚗️",  bar: "bg-amber-500",  badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",          grad: "from-amber-500 to-orange-600",   glow: "shadow-amber-500/30",  btn: "from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/30",   blob1: "bg-amber-500/10",   blob2: "bg-orange-500/10"  },
  GERAL:            { label: "Geral",            emoji: "🗑️",  bar: "bg-slate-400",  badge: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-300",          grad: "from-slate-400 to-slate-600",    glow: "shadow-slate-400/20",  btn: "from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 shadow-slate-400/20",     blob1: "bg-slate-400/10",   blob2: "bg-slate-500/10"   },
  INFECCIOSO:       { label: "Infeccioso",       emoji: "☣️",  bar: "bg-orange-500", badge: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300",    grad: "from-orange-500 to-red-500",     glow: "shadow-orange-500/30", btn: "from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-orange-500/30",       blob1: "bg-orange-500/10",  blob2: "bg-red-500/10"     },
  ANATOMICO:        { label: "Anatómico",        emoji: "🫀", bar: "bg-pink-500",   badge: "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-700/40 dark:bg-pink-900/20 dark:text-pink-300",                 grad: "from-pink-500 to-rose-500",      glow: "shadow-pink-500/30",   btn: "from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 shadow-pink-500/30",           blob1: "bg-pink-500/10",    blob2: "bg-rose-500/10"    },
  CULTURA:          { label: "Cultura",          emoji: "🔬", bar: "bg-teal-500",   badge: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300",                 grad: "from-teal-500 to-emerald-600",   glow: "shadow-teal-500/30",   btn: "from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-teal-500/30",     blob1: "bg-teal-500/10",    blob2: "bg-emerald-500/10" },
  REAGENTE_VENCIDO: { label: "Reagente vencido", emoji: "🧪", bar: "bg-yellow-500", badge: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-700/40 dark:bg-yellow-900/20 dark:text-yellow-300",    grad: "from-yellow-500 to-amber-500",   glow: "shadow-yellow-500/30", btn: "from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 shadow-yellow-500/30",   blob1: "bg-yellow-500/10",  blob2: "bg-amber-500/10"   },
};

const STATUS_META: Record<string, { label: string; chip: string; bar: string }> = {
  GERADO:     { label: "Gerado",              chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",             bar: "bg-blue-400"    },
  ARMAZENADO: { label: "Armazenado",          chip: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300", bar: "bg-indigo-400"  },
  RECOLHIDO:  { label: "Recolhido",           chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",       bar: "bg-amber-400"   },
  TRATADO:    { label: "Tratado",             chip: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300",             bar: "bg-teal-400"    },
  DESCARTADO: { label: "Descartado",          chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300", bar: "bg-emerald-400" },
  INCIDENTE:  { label: "Incidente reportado", chip: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",                   bar: "bg-red-500"     },
};

// lifecycle steps in order
const LIFECYCLE = ["GERADO","ARMAZENADO","RECOLHIDO","TRATADO","DESCARTADO"];

function fmtDateTime(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleString("pt-PT", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
}

function Card({ icon: Icon, title, accent, children }: {
  icon: React.ElementType; title: string; accent?: string; children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
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

export default function WasteDetailPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [rec,     setRec]     = useState<WasteRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<WasteRecord>(`/clinical_laboratory/waste/${id}/`)
      .then(setRec)
      .catch(() => setError("Registo não encontrado."))
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
        {error ?? "Erro ao carregar registo."}
      </div>
    </AppLayout>
  );

  const tm = TYPE_META[rec.waste_type] ?? TYPE_META["GERAL"];
  const sm = STATUS_META[rec.status]   ?? STATUS_META["GERADO"];
  const isIncident   = rec.status === "INCIDENTE";
  const isSharps     = rec.waste_type === "PERFUROCORTANTE";
  const currentStep  = LIFECYCLE.indexOf(rec.status);

  return (
    <AppLayout requiredGroups={DETAIL_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl ${tm.blob1}`} />
            <div className={`absolute -bottom-8 left-6 h-24 w-24 rounded-full blur-2xl ${tm.blob2}`} />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${tm.bar}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tm.grad} shadow-md ${tm.glow}`}>
              <Trash2 size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/clinical-laboratory/biosafety/waste" className="hover:underline">Resíduos</Link>
                <span>/</span>
                <span className="font-medium text-foreground">{rec.custom_id}</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">{rec.department}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tm.badge}`}>
                  {tm.emoji} {tm.label}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${sm.chip}`}>
                  {sm.label}
                </span>
                {isIncident && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:border-red-700/40 dark:bg-red-900/30 dark:text-red-300">
                    <AlertTriangle size={8} /> Incidente
                  </span>
                )}
                <span className="font-mono text-[10px] text-muted-foreground">v{rec.version}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`/clinical-laboratory/biosafety/waste/${id}/edit`}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r px-4 text-xs font-semibold text-white shadow-md transition ${tm.btn}`}>
                <Edit2 size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        {/* ── Lifecycle stepper ─────────────────────────────────── */}
        {!isIncident && (
          <div className="rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10 px-4 py-3">
            <div className="flex items-center gap-0">
              {LIFECYCLE.map((step, idx) => {
                const sm2 = STATUS_META[step];
                const done    = currentStep > idx;
                const active  = currentStep === idx;
                const isLast  = idx === LIFECYCLE.length - 1;
                return (
                  <div key={step} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center gap-1 min-w-0">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition ${
                        active  ? `${sm2.bar} text-white shadow-sm` :
                        done    ? "bg-emerald-500 text-white" :
                        "bg-border text-muted-foreground"
                      }`}>
                        {done ? "✓" : idx + 1}
                      </div>
                      <span className={`text-[9px] text-center leading-tight ${active ? "font-semibold text-foreground" : done ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                        {sm2.label}
                      </span>
                    </div>
                    {!isLast && (
                      <div className={`flex-1 h-0.5 mx-1 rounded-full ${done ? "bg-emerald-400" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Cards ─────────────────────────────────────────────── */}
        <div className="grid gap-2 lg:grid-cols-2">

          {/* Identificação */}
          <Card icon={MapPin} title="Sector e identificação" accent={tm.bar}>
            <div className="space-y-0.5">
              <Row label="Sector / Departamento" value={<span className="font-semibold">{rec.department}</span>} />
              <Row label="Tipo de resíduo"       value={<span>{tm.emoji} {tm.label}</span>} />
              <Row label="Estado"                value={
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold ${sm.chip}`}>{sm.label}</span>
              } />
              <Row label="Quantidade"            value={rec.quantity || null} />
              <Row label="Gerado em"             value={fmtDateTime(rec.generated_at)} />
            </div>
          </Card>

          {/* Contentor */}
          <Card icon={Package} title="Contentor" accent="bg-teal-500">
            <div className="space-y-0.5">
              <Row label="Tipo de contentor"  value={rec.container_type || null} />
              <Row label="Código"             value={rec.container_code ? <span className="font-mono">{rec.container_code}</span> : null} />
              <Row label="Local de armazenamento" value={rec.storage_location || null} />
              {isSharps && rec.fill_level && (
                <Row label="Nível de enchimento" value={
                  <span className={`font-semibold ${rec.fill_level.startsWith("Cheio") ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {rec.fill_level}
                  </span>
                } />
              )}
            </div>
          </Card>

          {/* Descarte */}
          <Card icon={User} title="Recolha e descarte" accent="bg-emerald-500">
            <div className="space-y-0.5">
              <Row label="Recolhido por"    value={rec.collected_by ? `Utilizador #${rec.collected_by}` : null} />
              <Row label="Método de descarte" value={rec.disposal_method || null} />
              <Row label="Data de descarte"   value={rec.disposal_date ? fmtDate(rec.disposal_date) : null} />
            </div>
          </Card>

          {/* Registo */}
          <Card icon={CalendarDays} title="Registo" accent="bg-slate-400">
            <div className="space-y-0.5">
              <Row label="Referência"   value={<span className="font-mono">{rec.custom_id}</span>} />
              <Row label="Versão"       value={`v${rec.version}`} />
              <Row label="Criado em"   value={fmtDate(rec.created_at)} />
              <Row label="Actualizado" value={fmtDate(rec.updated_at)} />
            </div>
          </Card>

        </div>
      </div>
    </AppLayout>
  );
}
