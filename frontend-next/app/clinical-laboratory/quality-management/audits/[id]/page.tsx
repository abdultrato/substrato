"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Link2,
  ListChecks,
  MapPin,
  Pencil,
  Shield,
  Target,
  AlertTriangle,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Metadata ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PLANEADA:        "Planeada",
  AGENDADA:        "Agendada",
  EM_CURSO:        "Em curso",
  CONCLUIDA:       "Concluída",
  ACHADOS_ABERTOS: "Achados em aberto",
  FECHADA:         "Fechada",
};

const STATUS_COLOR: Record<string, string> = {
  PLANEADA:        "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/40 dark:bg-slate-900/20 dark:text-slate-300",
  AGENDADA:        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  EM_CURSO:        "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300",
  CONCLUIDA:       "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",
  ACHADOS_ABERTOS: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300",
  FECHADA:         "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
};

const STATUS_DOT: Record<string, string> = {
  PLANEADA:        "bg-slate-400",
  AGENDADA:        "bg-amber-400",
  EM_CURSO:        "bg-sky-500",
  CONCLUIDA:       "bg-blue-500",
  ACHADOS_ABERTOS: "bg-orange-500",
  FECHADA:         "bg-emerald-500",
};

const STATUS_BAR = STATUS_DOT;

const STATUS_STEPS = ["PLANEADA", "AGENDADA", "EM_CURSO", "CONCLUIDA", "ACHADOS_ABERTOS", "FECHADA"];

const FINDING_LABEL: Record<string, string> = {
  CONFORMIDADE: "Conformidade",
  NC_MENOR:     "NC menor",
  NC_MAIOR:     "NC maior",
  OBSERVACAO:   "Observação",
  MELHORIA:     "Oportunidade de melhoria",
};

const FINDING_COLOR: Record<string, string> = {
  CONFORMIDADE: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  NC_MENOR:     "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  NC_MAIOR:     "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
  OBSERVACAO:   "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300",
  MELHORIA:     "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Audit = {
  id: number;
  custom_id: string;
  code: string;
  area: string;
  audit_date: string | null;
  scope: string;
  criteria: string;
  conclusion: string;
  status: string;
  auditor: number | null;
  auditor_display?: string | null;
  sectors_display?: { id: number; label: string }[];
  findings_count?: number;
  created_at: string;
  updated_at: string;
};

type Finding = {
  id: number;
  custom_id: string;
  finding_type: string;
  clause: string;
  description: string;
  nonconformity: number | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d + "T00:00:00").toLocaleDateString("pt-MZ", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function fmtDateTime(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleString("pt-MZ", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
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

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rec, setRec] = useState<Audit | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<Audit>(`/clinical_laboratory/internal_audit/${id}/`)
      .then((data) => {
        setRec(data);
        apiFetch<any>(`/clinical_laboratory/audit_finding/?audit=${id}`)
          .then((resp) => setFindings(resp?.results ?? resp?.items ?? []))
          .catch(() => {});
      })
      .catch((e) => setError(e?.message ?? "Erro ao carregar auditoria."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (error || !rec) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
          {error ?? "Auditoria não encontrada."}
        </div>
      </AppLayout>
    );
  }

  const bar     = STATUS_BAR[rec.status]   ?? "bg-slate-400";
  const sClr    = STATUS_COLOR[rec.status] ?? "border-border bg-muted text-foreground";
  const sDot    = STATUS_DOT[rec.status]   ?? "bg-slate-400";
  const sLbl    = STATUS_LABEL[rec.status] ?? rec.status;
  const stepIdx = STATUS_STEPS.indexOf(rec.status);

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${bar}`} />

          <div className="relative flex flex-wrap items-center gap-4 px-5 py-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 ${sClr} shadow-sm`}>
              <ClipboardCheck size={22} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/clinical-laboratory/quality-management/audits" className="hover:underline">
                  Auditorias internas
                </Link>
                <span>/</span>
                <span className="font-mono text-[9px]">{rec.custom_id}</span>
              </div>
              <h1 className="mt-0.5 text-lg font-bold leading-tight text-foreground">{rec.area}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${sClr}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${sDot}`} />
                  {sLbl}
                </span>
                {rec.code && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:border-slate-700/40 dark:bg-slate-900/20 dark:text-slate-300">
                    <MapPin size={9} /> {rec.code}
                  </span>
                )}
                {rec.auditor_display && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-medium text-cyan-700 dark:border-cyan-700/40 dark:bg-cyan-900/20 dark:text-cyan-300">
                    <User size={9} /> {rec.auditor_display}
                  </span>
                )}
                {findings.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300">
                    <AlertTriangle size={9} /> {findings.length} achado{findings.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`/clinical-laboratory/quality-management/audits/${id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 text-xs font-semibold text-white shadow-md shadow-blue-500/30 transition hover:from-blue-700 hover:to-cyan-700">
                <Pencil size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        {/* ── Stepper de ciclo de vida ──────────────────────────── */}
        <div className="rounded-xl border border-white/20 bg-white/25 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex items-center">
            {STATUS_STEPS.map((s, i) => {
              const done   = stepIdx >= 0 && i <= stepIdx;
              const active = i === stepIdx;
              return (
                <div key={s} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition ${
                      active ? `${STATUS_DOT[s]} text-white ring-2 ring-offset-1 ring-current/30`
                        : done ? `${STATUS_DOT[s]} text-white`
                        : "border border-border bg-background text-muted-foreground"
                    }`}>
                      {done && !active ? <CheckCircle2 size={12} /> : i + 1}
                    </div>
                    <span className={`whitespace-nowrap text-[9px] ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {STATUS_LABEL[s]}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`mx-1 h-0.5 flex-1 rounded ${done && i < stepIdx ? STATUS_DOT[s] : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Grid de cards ─────────────────────────────────────── */}
        <div className="grid gap-2 lg:grid-cols-2">

          {/* Identificação */}
          <SectionCard icon={MapPin} title="Identificação" accent="bg-blue-500">
            <div className="border-b border-border/30 py-1.5">
              <span className="text-[11px] text-muted-foreground">Sectores auditados</span>
              {(rec.sectors_display ?? []).length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {(rec.sectors_display ?? []).map((s) => (
                    <span key={s.id} className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-medium text-cyan-700 dark:border-cyan-700/40 dark:bg-cyan-900/20 dark:text-cyan-300">
                      {s.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-xs font-medium text-foreground">{rec.area || "—"}</p>
              )}
            </div>
            <Row label="Código interno">
              <span className="font-mono text-[10px]">{rec.code || "—"}</span>
            </Row>
            <Row label="Código">{rec.custom_id}</Row>
          </SectionCard>

          {/* Auditor & Data */}
          <SectionCard icon={User} title="Auditor e data" accent="bg-cyan-500">
            <Row label="Auditor">
              {rec.auditor_display ?? (rec.auditor ? `#${rec.auditor}` : "—")}
            </Row>
            <Row label="Data da auditoria">{fmtDate(rec.audit_date) ?? "—"}</Row>
            <Row label="Criado em">
              <span className="text-[10px] text-muted-foreground">{fmtDateTime(rec.created_at)}</span>
            </Row>
            <Row label="Última atualização">
              <span className="text-[10px] text-muted-foreground">{fmtDateTime(rec.updated_at)}</span>
            </Row>
          </SectionCard>

          {/* Âmbito */}
          <SectionCard icon={Target} title="Âmbito" accent="bg-sky-500">
            {rec.scope ? (
              <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">{rec.scope}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">Sem âmbito definido.</p>
            )}
          </SectionCard>

          {/* Critérios */}
          <SectionCard icon={FileText} title="Critérios" accent="bg-indigo-500">
            {rec.criteria ? (
              <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">{rec.criteria}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">Sem critérios definidos.</p>
            )}
          </SectionCard>

          {/* Conclusão */}
          <div className="lg:col-span-2">
            <SectionCard icon={CheckCircle2} title="Conclusão" accent="bg-blue-400">
              {rec.conclusion ? (
                <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">{rec.conclusion}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Ainda sem conclusão registada.</p>
              )}
            </SectionCard>
          </div>

          {/* Achados */}
          <div className="lg:col-span-2">
            <SectionCard icon={ListChecks} title={`Achados de auditoria (${findings.length})`} accent="bg-orange-500">
              {findings.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 py-3 text-center">
                  <ListChecks size={20} className="text-muted-foreground/40" />
                  <p className="text-[11px] text-muted-foreground">Nenhum achado registado.</p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {findings.map((f) => (
                    <li key={f.id} className="rounded-lg border border-border/50 bg-background px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold ${FINDING_COLOR[f.finding_type] ?? "border-border bg-muted text-foreground"}`}>
                          {FINDING_LABEL[f.finding_type] ?? f.finding_type}
                        </span>
                        {f.clause && (
                          <span className="text-[10px] text-muted-foreground">Cláusula: {f.clause}</span>
                        )}
                        {f.nonconformity && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300">
                            <Link2 size={8} /> NC
                          </span>
                        )}
                        <span className="ml-auto font-mono text-[9px] text-muted-foreground/60">{f.custom_id}</span>
                      </div>
                      {f.description && (
                        <p className="mt-1 text-[11px] leading-relaxed text-foreground">{f.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          {/* Estado — full width */}
          <div className="lg:col-span-2">
            <SectionCard icon={Shield} title="Estado da auditoria" accent={bar}>
              <div className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
                {Object.entries(STATUS_LABEL).map(([value, label]) => {
                  const isActive = rec.status === value;
                  return (
                    <div key={value}
                      className={`relative overflow-hidden rounded-lg border px-3 py-2.5 text-[11px] transition ${isActive ? STATUS_COLOR[value] + " ring-1 ring-current/20" : "border-border bg-background opacity-40"}`}>
                      <span className={`absolute inset-y-0 left-0 w-0.5 ${STATUS_BAR[value]}`} />
                      <span className={`block pl-1.5 font-semibold ${isActive ? "" : "text-foreground"}`}>{label}</span>
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
