"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  Droplets,
  Edit2,
  FlaskConical,
  Link2,
  Loader2,
  MapPin,
  Shield,
  Zap,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const DETAIL_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

interface SpillRecord {
  id: number;
  custom_id: string;
  version: string;
  spill_type: "BIOLOGICO" | "QUIMICO";
  location: string;
  material_involved: string;
  estimated_volume: string;
  immediate_action: string;
  disinfection_method: string;
  staff_exposed: boolean;
  exposure_incident: number | null;
  occurred_at: string;
  created_at: string;
  updated_at: string;
}

const TYPE_META = {
  BIOLOGICO: {
    label: "Biológico",
    icon: FlaskConical,
    bar:  "bg-violet-500",
    badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300",
    grad: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/30",
    btn:  "from-violet-600 to-purple-600 shadow-violet-500/30 hover:from-violet-700 hover:to-purple-700",
    blob1: "bg-violet-500/10",
    blob2: "bg-purple-500/10",
  },
  QUIMICO: {
    label: "Químico",
    icon: Zap,
    bar:  "bg-amber-500",
    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
    grad: "from-amber-500 to-orange-600",
    glow: "shadow-amber-500/30",
    btn:  "from-amber-600 to-orange-600 shadow-amber-500/30 hover:from-amber-700 hover:to-orange-700",
    blob1: "bg-amber-500/10",
    blob2: "bg-orange-500/10",
  },
} as const;

function fmtDateTime(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleString("pt-PT", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
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

export default function SpillDetailPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [rec,     setRec]     = useState<SpillRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<SpillRecord>(`/clinical_laboratory/spill/${id}/`)
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

  const tm = TYPE_META[rec.spill_type];
  const Icon = tm.icon;

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
              <Icon size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/clinical-laboratory/biosafety/spills" className="hover:underline">
                  Derrames
                </Link>
                <span>/</span>
                <span className="font-medium text-foreground">{rec.custom_id}</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">{rec.location}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tm.badge}`}>
                  <Icon size={8} className="mr-1" /> {tm.label}
                </span>
                {rec.staff_exposed ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
                    <AlertTriangle size={8} /> Houve exposição
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                    <CheckCircle size={8} /> Sem exposição
                  </span>
                )}
                {rec.material_involved && (
                  <span className="inline-flex items-center rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground">
                    {rec.material_involved}
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
              <Link href={`/clinical-laboratory/biosafety/spills/${id}/edit`}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r px-4 text-xs font-semibold text-white shadow-md transition ${tm.btn}`}>
                <Edit2 size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        {/* ── Exposure alert ────────────────────────────────────── */}
        {rec.staff_exposed && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-800/40 dark:bg-red-900/15">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-xs font-semibold text-red-800 dark:text-red-300">Exposição de colaboradores registada</p>
              <p className="text-[11px] text-red-700 dark:text-red-400">
                Este derrame resultou em exposição de pessoal.
                {rec.exposure_incident
                  ? <> Incidente associado: <Link href={`/clinical-laboratory/biosafety/exposure-incidents/${rec.exposure_incident}`} className="underline font-medium">ver registo</Link>.</>
                  : " Considere criar um registo de incidente de exposição."}
              </p>
            </div>
          </div>
        )}

        {/* ── Cards ─────────────────────────────────────────────── */}
        <div className="grid gap-2 lg:grid-cols-2">

          {/* Localização + Tipo */}
          <Card icon={MapPin} title="Localização e tipo" accent={tm.bar}>
            <div className="space-y-0.5">
              <Row label="Local / Área" value={<span className="font-semibold">{rec.location}</span>} />
              <Row label="Tipo de derrame" value={
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tm.badge}`}>
                  {tm.label}
                </span>
              } />
              <Row label="Data e hora" value={fmtDateTime(rec.occurred_at)} />
            </div>
          </Card>

          {/* Material */}
          <Card icon={Droplets} title="Material envolvido" accent="bg-orange-400">
            <div className="space-y-0.5">
              <Row label="Material" value={rec.material_involved || null} />
              <Row label="Volume estimado" value={rec.estimated_volume || null} />
              <Row label="Método de desinfeção" value={rec.disinfection_method || null} />
            </div>
          </Card>

          {/* Ação imediata — full width */}
          {rec.immediate_action && (
            <div className="lg:col-span-2">
              <Card icon={Shield} title="Ação imediata tomada" accent="bg-blue-500">
                <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-line">
                  {rec.immediate_action}
                </p>
              </Card>
            </div>
          )}

          {/* Exposição */}
          <Card icon={AlertTriangle} title="Exposição de colaboradores" accent={rec.staff_exposed ? "bg-red-500" : "bg-emerald-500"}>
            <div className="space-y-0.5">
              <Row label="Houve exposição?" value={
                rec.staff_exposed
                  ? <span className="font-semibold text-red-700 dark:text-red-400">Sim</span>
                  : <span className="font-medium text-emerald-700 dark:text-emerald-400">Não</span>
              } />
              {rec.exposure_incident && (
                <Row label="Incidente associado" value={
                  <Link href={`/clinical-laboratory/biosafety/exposure-incidents/${rec.exposure_incident}`}
                    className="inline-flex items-center gap-1 text-blue-600 underline dark:text-blue-400 hover:text-blue-800">
                    <Link2 size={10} /> Ver incidente #{rec.exposure_incident}
                  </Link>
                } />
              )}
            </div>
          </Card>

          {/* Registo */}
          <Card icon={CalendarDays} title="Registo" accent="bg-slate-400">
            <div className="space-y-0.5">
              <Row label="Referência" value={<span className="font-mono">{rec.custom_id}</span>} />
              <Row label="Versão"     value={`v${rec.version}`} />
              <Row label="Criado em"  value={fmtDate(rec.created_at)} />
              <Row label="Actualizado" value={fmtDate(rec.updated_at)} />
            </div>
          </Card>

        </div>
      </div>
    </AppLayout>
  );
}
