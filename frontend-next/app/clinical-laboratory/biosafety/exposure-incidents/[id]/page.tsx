"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Edit2,
  Loader2,
  MapPin,
  Stethoscope,
  User,
  Zap,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const LIST_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Choices ───────────────────────────────────────────────────────────────────

const EXPOSURE_TYPE_LABELS: Record<string, string> = {
  PICADA:   "Picada de agulha",
  MUCOSA:   "Contacto com mucosa",
  PELE:     "Contacto com pele",
  CORTE:    "Corte c/ material contaminado",
  AEROSSOL: "Inalação de aerossol",
  CULTURA:  "Contacto com cultura",
  OUTRO:    "Outro",
};

const EXPOSURE_TYPE_COLOR: Record<string, { bar: string; badge: string; icon: string }> = {
  PICADA:   { bar: "bg-red-500",    badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",         icon: "from-red-500 to-rose-600" },
  MUCOSA:   { bar: "bg-orange-500", badge: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300", icon: "from-orange-500 to-red-500" },
  PELE:     { bar: "bg-amber-400",  badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",   icon: "from-amber-400 to-orange-500" },
  CORTE:    { bar: "bg-rose-600",   badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300",         icon: "from-rose-600 to-red-700" },
  AEROSSOL: { bar: "bg-violet-500", badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300", icon: "from-violet-500 to-purple-600" },
  CULTURA:  { bar: "bg-indigo-500", badge: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300", icon: "from-indigo-500 to-violet-600" },
  OUTRO:    { bar: "bg-slate-400",  badge: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/30 dark:text-slate-300",    icon: "from-slate-500 to-slate-600" },
};

const STATUS_STEPS = [
  { value: "REPORTADO",  label: "Reportado" },
  { value: "EM_ANALISE", label: "Em análise" },
  { value: "SAUDE_OCUP", label: "Saúde ocup." },
  { value: "SEGUIMENTO", label: "Seguimento" },
  { value: "FECHADO",    label: "Fechado" },
];

const STATUS_COLOR: Record<string, string> = {
  REPORTADO:  "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
  EM_ANALISE: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  SAUDE_OCUP: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",
  SEGUIMENTO: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300",
  FECHADO:    "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-400",
};

const STATUS_BAR: Record<string, string> = {
  REPORTADO:  "bg-red-500",
  EM_ANALISE: "bg-amber-400",
  SAUDE_OCUP: "bg-blue-500",
  SEGUIMENTO: "bg-violet-500",
  FECHADO:    "bg-slate-400",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface NamedRef { id: number; name: string }
interface Incident {
  id: number;
  custom_id: string;
  version: string;
  incident_at: string;
  investigated_at: string | null;
  created_at: string;
  updated_at: string;
  exposure_type: string;
  status: string;
  material_involved: string;
  body_site: string;
  activity: string;
  immediate_action: string;
  reported_to: string;
  requires_medical_followup: boolean;
  root_cause: string;
  contributing_factors: string;
  conclusion: string;
  staff: number;
  staff_detail: NamedRef | null;
  investigated_by: number | null;
  investigator_detail: NamedRef | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
}
function fmtDateTime(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Card({ icon: Icon, title, accent, children }: {
  icon: React.ElementType; title: string; accent?: string; children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
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
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className="w-32 shrink-0 text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[11px] text-foreground">{value}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExposureIncidentDetailPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [inc,     setInc]     = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<Incident>(`/clinical_laboratory/exposure_incident/${id}/`)
      .then(setInc)
      .catch(() => setError("Incidente não encontrado."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
      </div>
    </AppLayout>
  );

  if (error || !inc) return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
        {error ?? "Erro ao carregar incidente."}
      </div>
    </AppLayout>
  );

  const expColor   = EXPOSURE_TYPE_COLOR[inc.exposure_type] ?? EXPOSURE_TYPE_COLOR.OUTRO;
  const statusIdx  = STATUS_STEPS.findIndex((s) => s.value === inc.status);

  return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-red-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${expColor.bar}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${expColor.icon} shadow-md shadow-red-500/20`}>
              <Zap size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/clinical-laboratory/biosafety/exposure-incidents" className="hover:underline">Incidentes de exposição</Link>
                <span>/</span>
                <span className="font-medium text-foreground">{inc.custom_id}</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {EXPOSURE_TYPE_LABELS[inc.exposure_type] ?? inc.exposure_type}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${expColor.badge}`}>
                  <Zap size={8} className="mr-0.5" />
                  {EXPOSURE_TYPE_LABELS[inc.exposure_type] ?? inc.exposure_type}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[inc.status] ?? ""}`}>
                  {STATUS_STEPS.find((s) => s.value === inc.status)?.label ?? inc.status}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{inc.custom_id}</span>
                <span className="font-mono text-[10px] text-muted-foreground">v{inc.version}</span>
                {inc.requires_medical_followup && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300">
                    <Stethoscope size={8} /> Acompanhamento médico
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`/clinical-laboratory/biosafety/exposure-incidents/${id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 px-4 text-xs font-semibold text-white shadow-md shadow-red-500/30 transition hover:from-red-700 hover:to-orange-700">
                <Edit2 size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        {/* ── Status lifecycle ──────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${STATUS_BAR[inc.status] ?? "bg-slate-400"}`} />
          <div className="grid grid-cols-5 gap-0 pl-1">
            {STATUS_STEPS.map((step, idx) => {
              const isActive  = step.value === inc.status;
              const isPast    = idx < statusIdx;
              return (
                <div key={step.value}
                  className={`relative px-2 py-2 text-center text-[10px] font-medium transition ${isActive ? "text-foreground" : isPast ? "text-muted-foreground/70" : "text-muted-foreground/40"}`}>
                  {idx > 0 && <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-px w-full ${isPast || isActive ? "bg-border" : "bg-border/30"}`} />}
                  <span className={`relative inline-flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-bold mb-0.5 ${isActive ? STATUS_COLOR[step.value] + " ring-2 ring-current/20" : isPast ? "border-border bg-muted text-muted-foreground" : "border-border/40 bg-background/50 text-muted-foreground/40"}`}>
                    {idx + 1}
                  </span>
                  <div className={isActive ? "font-semibold" : ""}>{step.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2 lg:grid-cols-2">

          {/* Colaborador */}
          <Card icon={User} title="Colaborador afectado" accent="bg-red-500">
            <div className="space-y-0.5">
              <Row label="Nome" value={inc.staff_detail?.name ?? `Utilizador #${inc.staff}`} />
              <Row label="Data do incidente" value={fmtDateTime(inc.incident_at)} />
              <Row label="Reportado a"       value={inc.reported_to || null} />
              <Row label="Acompanhamento médico"
                value={
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${inc.requires_medical_followup ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                    {inc.requires_medical_followup ? "Sim" : "Não"}
                  </span>
                }
              />
            </div>
          </Card>

          {/* Detalhes da exposição */}
          <Card icon={AlertTriangle} title="Detalhes da exposição" accent="bg-orange-500">
            <div className="space-y-0.5">
              <Row label="Tipo de exposição"
                value={
                  <span className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${expColor.badge}`}>
                    <Zap size={8} />{EXPOSURE_TYPE_LABELS[inc.exposure_type] ?? inc.exposure_type}
                  </span>
                }
              />
              <Row label="Material envolvido" value={inc.material_involved || null} />
              <Row label="Local corporal"
                value={inc.body_site ? (
                  <span className="flex items-center gap-1"><MapPin size={10} className="text-muted-foreground" />{inc.body_site}</span>
                ) : null}
              />
              <Row label="Actividade em curso" value={inc.activity || null} />
            </div>
          </Card>

          {/* Acção imediata */}
          {inc.immediate_action?.trim() && (
            <Card icon={Activity} title="Acção imediata" accent="bg-amber-400">
              <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">{inc.immediate_action}</p>
            </Card>
          )}

          {/* Datas */}
          <Card icon={CalendarDays} title="Datas e controlo" accent="bg-slate-400">
            <div className="space-y-0.5">
              <Row label="Data do incidente"   value={fmtDateTime(inc.incident_at)} />
              <Row label="Data investigação"   value={fmtDateTime(inc.investigated_at)} />
              <Row label="Criado em"           value={fmtDate(inc.created_at)} />
              <Row label="Última actualização" value={fmtDate(inc.updated_at)} />
            </div>
          </Card>

          {/* Investigação — full width se existir conteúdo */}
          {(inc.root_cause?.trim() || inc.contributing_factors?.trim() || inc.conclusion?.trim() || inc.investigated_by) && (
            <div className="lg:col-span-2">
              <Card icon={ClipboardList} title="Investigação do incidente" accent="bg-violet-500">
                <div className="grid gap-3 sm:grid-cols-2">
                  {inc.root_cause?.trim() && (
                    <div>
                      <p className="mb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Causa raiz</p>
                      <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">{inc.root_cause}</p>
                    </div>
                  )}
                  {inc.contributing_factors?.trim() && (
                    <div>
                      <p className="mb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Factores contribuintes</p>
                      <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">{inc.contributing_factors}</p>
                    </div>
                  )}
                  {inc.conclusion?.trim() && (
                    <div className="sm:col-span-2">
                      <p className="mb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Conclusão / medidas correctivas</p>
                      <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">{inc.conclusion}</p>
                    </div>
                  )}
                  {inc.investigator_detail && (
                    <div className="border-t border-border/30 pt-2 sm:col-span-2">
                      <div className="flex flex-wrap items-center gap-3 text-[11px]">
                        <span className="text-muted-foreground">Investigado por:</span>
                        <span className="font-medium text-foreground">{inc.investigator_detail.name}</span>
                        {inc.investigated_at && (
                          <>
                            <span className="text-muted-foreground">em</span>
                            <span className="text-foreground">{fmtDateTime(inc.investigated_at)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
