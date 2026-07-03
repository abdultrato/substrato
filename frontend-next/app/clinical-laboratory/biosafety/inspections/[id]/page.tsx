"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  MapPin,
  Pencil,
  Shield,
  User,
  XSquare,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Metadata ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PLANEADA:            "Planeada",
  CONCLUIDA:           "Concluída",
  ACHADOS_ABERTOS:     "Achados em aberto",
  CORRETIVA_REQUERIDA: "Ação corretiva requerida",
  FECHADA:             "Fechada",
};
const STATUS_BAR: Record<string, string> = {
  PLANEADA:            "bg-sky-400",
  CONCLUIDA:           "bg-emerald-500",
  ACHADOS_ABERTOS:     "bg-amber-400",
  CORRETIVA_REQUERIDA: "bg-orange-500",
  FECHADA:             "bg-slate-400",
};
const STATUS_COLOR: Record<string, string> = {
  PLANEADA:            "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300",
  CONCLUIDA:           "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  ACHADOS_ABERTOS:     "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  CORRETIVA_REQUERIDA: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300",
  FECHADA:             "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-400",
};
const STATUS_DOT: Record<string, string> = {
  PLANEADA:            "bg-sky-400",
  CONCLUIDA:           "bg-emerald-500",
  ACHADOS_ABERTOS:     "bg-amber-400",
  CORRETIVA_REQUERIDA: "bg-orange-500",
  FECHADA:             "bg-slate-400",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type ChecklistItem = { label: string; checked: boolean };

type Inspection = {
  id: number;
  custom_id: string;
  area: string;
  status: string;
  inspection_date: string;
  checklist: ChecklistItem[] | string;
  findings: string | null;
  inspector: number | null;
  inspector_detail: { id: number; name: string } | null;
  version: number;
  created_at: string;
  updated_at: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-MZ", {
    day: "2-digit", month: "long", year: "numeric",
  });
}
function fmtDateTime(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-MZ", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function parseChecklist(raw: ChecklistItem[] | string): ChecklistItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw as string); } catch { return []; }
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, children, accent }: {
  icon: React.ElementType; title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />}
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5 pl-5">
        <Icon size={13} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-4 pl-5">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/30 py-1.5 last:border-0">
      <span className="shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-medium text-foreground">{children ?? "—"}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BiosafetyInspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [insp, setInsp] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<Inspection>(`/clinical_laboratory/biosafety_inspection/${id}/`)
      .then(setInsp)
      .catch((e) => setError(e?.message ?? "Erro ao carregar inspecção."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    </AppLayout>
  );

  if (error || !insp) return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
        {error ?? "Inspecção não encontrada."}
      </div>
    </AppLayout>
  );

  const bar      = STATUS_BAR[insp.status]   ?? "bg-slate-400";
  const sClr     = STATUS_COLOR[insp.status] ?? "border-border bg-muted text-foreground";
  const sDot     = STATUS_DOT[insp.status]   ?? "bg-slate-400";
  const sLbl     = STATUS_LABEL[insp.status] ?? insp.status;
  const checklist = parseChecklist(insp.checklist);
  const checked   = checklist.filter((i) => i.checked).length;
  const total     = checklist.length;
  const pct       = total > 0 ? Math.round((checked / total) * 100) : 0;
  const pctColor  = pct === 100 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-400" : "bg-red-400";
  const hasFindings = !!insp.findings?.trim();

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-teal-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${bar}`} />

          <div className="relative flex flex-wrap items-center gap-4 px-5 py-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 ${sClr} shadow-sm`}>
              <Shield size={22} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/clinical-laboratory/biosafety/inspections" className="hover:underline">
                  Inspecções
                </Link>
                <span>/</span>
                <span className="font-mono text-[9px]">{insp.custom_id}</span>
              </div>
              <h1 className="mt-0.5 text-lg font-bold leading-tight text-foreground">
                <MapPin size={14} className="mr-1 inline-block -mt-0.5 text-muted-foreground" />
                {insp.area}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${sClr}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${sDot}`} /> {sLbl}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <CalendarDays size={9} /> {fmtDate(insp.inspection_date)}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{insp.custom_id}</span>
                <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:border-slate-700/40 dark:bg-slate-800/30 dark:text-slate-400">
                  v{insp.version}
                </span>
                {total > 0 && (
                  <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <CheckSquare size={9} />
                    {checked}/{total}
                    <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-border/60">
                      <span className={`absolute inset-y-0 left-0 rounded-full ${pctColor}`} style={{ width: `${pct}%` }} />
                    </span>
                    {pct}%
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`/clinical-laboratory/biosafety/inspections/${id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-xs font-semibold text-white shadow-md shadow-emerald-500/30 transition hover:from-emerald-700 hover:to-teal-700">
                <Pencil size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        {/* ── Grid ──────────────────────────────────────────────── */}
        <div className="grid gap-2 lg:grid-cols-2">

          {/* Identificação */}
          <SectionCard icon={MapPin} title="Identificação" accent="bg-emerald-500">
            <Row label="Código">{<span className="font-mono text-[10px] text-muted-foreground">{insp.custom_id}</span>}</Row>
            <Row label="Área">{insp.area}</Row>
            <Row label="Data da inspecção">{fmtDate(insp.inspection_date)}</Row>
            <Row label="Versão"><span className="font-mono">v{insp.version}</span></Row>
          </SectionCard>

          {/* Inspector + Estado */}
          <SectionCard icon={User} title="Inspector e estado" accent="bg-teal-500">
            <Row label="Inspector">
              {insp.inspector_detail
                ? <span className="font-medium">{insp.inspector_detail.name}</span>
                : "—"}
            </Row>
            <Row label="Estado">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${sClr}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${sDot}`} /> {sLbl}
              </span>
            </Row>
            <Row label="Criado em"><span className="text-[10px] text-muted-foreground">{fmtDateTime(insp.created_at)}</span></Row>
            <Row label="Última actualização"><span className="text-[10px] text-muted-foreground">{fmtDateTime(insp.updated_at)}</span></Row>
          </SectionCard>

          {/* Checklist — full width */}
          {checklist.length > 0 && (
            <div className="lg:col-span-2">
              <SectionCard icon={ClipboardList} title={`Checklist — ${checked}/${total} verificados (${pct}%)`} accent="bg-sky-500">
                {/* barra de progresso */}
                <div className="mb-3 space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-border/50">
                    <div className={`h-2 rounded-full transition-all ${pctColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {pct === 100 ? "Todos os itens verificados." : `${total - checked} item(s) por verificar.`}
                  </p>
                </div>

                {/* items em 2 colunas */}
                <div className="grid gap-1 sm:grid-cols-2">
                  {checklist.map((item, i) => (
                    <div key={i}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${item.checked ? "border-emerald-200/60 bg-emerald-50/50 dark:border-emerald-800/30 dark:bg-emerald-900/10" : "border-border bg-background"}`}>
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${item.checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-background"}`}>
                        {item.checked && (
                          <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-[11px] leading-snug ${item.checked ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}

          {/* Achados — full width, só se tiver */}
          {hasFindings && (
            <div className="lg:col-span-2">
              <SectionCard icon={AlertTriangle} title="Achados e observações" accent="bg-amber-400">
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">{insp.findings}</p>
              </SectionCard>
            </div>
          )}

          {/* Ciclo de vida dos estados — full width */}
          <div className="lg:col-span-2">
            <SectionCard icon={Shield} title="Ciclo de vida" accent={bar}>
              <div className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
                {Object.entries(STATUS_LABEL).map(([value, label]) => {
                  const isActive = insp.status === value;
                  return (
                    <div key={value}
                      className={`relative overflow-hidden rounded-lg border px-2.5 py-2 text-[11px] ${isActive ? STATUS_COLOR[value] + " ring-1 ring-current/20" : "border-border bg-background opacity-40"}`}>
                      <span className={`absolute inset-y-0 left-0 w-0.5 ${STATUS_DOT[value]}`} />
                      <div className="flex items-center justify-between pl-1.5">
                        <span className="font-semibold leading-tight">{label}</span>
                        {isActive && (
                          <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 shrink-0">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
