"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Link2,
  ListChecks,
  Pencil,
  Scale,
  Tag,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Metadata ──────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  CONFORMIDADE: "Conformidade",
  NC_MENOR:     "NC menor",
  NC_MAIOR:     "NC maior",
  OBSERVACAO:   "Observação",
  MELHORIA:     "Oportunidade de melhoria",
};

const TYPE_COLOR: Record<string, string> = {
  CONFORMIDADE: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  NC_MENOR:     "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  NC_MAIOR:     "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
  OBSERVACAO:   "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300",
  MELHORIA:     "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300",
};

const TYPE_DOT: Record<string, string> = {
  CONFORMIDADE: "bg-emerald-500",
  NC_MENOR:     "bg-amber-400",
  NC_MAIOR:     "bg-red-500",
  OBSERVACAO:   "bg-sky-500",
  MELHORIA:     "bg-violet-500",
};

const TYPE_BAR = TYPE_DOT;

const TYPE_DESC: Record<string, string> = {
  CONFORMIDADE: "Evidência de cumprimento do requisito.",
  NC_MENOR:     "Desvio pontual que não compromete o sistema.",
  NC_MAIOR:     "Falha sistémica que requer ação corretiva imediata.",
  OBSERVACAO:   "Situação a acompanhar, sem desvio confirmado.",
  MELHORIA:     "Oportunidade de melhoria contínua.",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Finding = {
  id: number;
  custom_id: string;
  finding_type: string;
  clause: string;
  description: string;
  audit: number | null;
  audit_display?: { id: number; label: string; code: string } | null;
  nonconformity: number | null;
  nonconformity_display?: { id: number; label: string } | null;
  created_at: string;
  updated_at: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleString("pt-MZ", {
    day: "2-digit", month: "long", year: "numeric",
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

export default function FindingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rec, setRec] = useState<Finding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<Finding>(`/clinical_laboratory/audit_finding/${id}/`)
      .then(setRec)
      .catch((e) => setError(e?.message ?? "Erro ao carregar achado."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (error || !rec) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
          {error ?? "Achado não encontrado."}
        </div>
      </AppLayout>
    );
  }

  const bar  = TYPE_BAR[rec.finding_type]   ?? "bg-slate-400";
  const tClr = TYPE_COLOR[rec.finding_type] ?? "border-border bg-muted text-foreground";
  const tDot = TYPE_DOT[rec.finding_type]   ?? "bg-slate-400";
  const tLbl = TYPE_LABEL[rec.finding_type] ?? rec.finding_type;

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-red-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${bar}`} />

          <div className="relative flex flex-wrap items-center gap-4 px-5 py-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 ${tClr} shadow-sm`}>
              <ListChecks size={22} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/clinical-laboratory/quality-management/findings" className="hover:underline">
                  Achados de auditoria
                </Link>
                <span>/</span>
                <span className="font-mono text-[9px]">{rec.custom_id}</span>
              </div>
              <h1 className="mt-0.5 line-clamp-2 text-lg font-bold leading-tight text-foreground">
                {rec.description.slice(0, 90) || "Achado"}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${tClr}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${tDot}`} />
                  {tLbl}
                </span>
                {rec.clause && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:border-slate-700/40 dark:bg-slate-900/20 dark:text-slate-300">
                    <Scale size={9} /> Cláusula {rec.clause}
                  </span>
                )}
                {rec.audit_display && (
                  <Link
                    href={`/clinical-laboratory/quality-management/audits/${rec.audit_display.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300">
                    <ClipboardCheck size={9} /> {rec.audit_display.code || rec.audit_display.label}
                  </Link>
                )}
                {rec.nonconformity_display && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
                    <Link2 size={9} /> {rec.nonconformity_display.label}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`/clinical-laboratory/quality-management/findings/${id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-red-600 px-4 text-xs font-semibold text-white shadow-md shadow-amber-500/30 transition hover:from-amber-700 hover:to-red-700">
                <Pencil size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        {/* ── Grid de cards ─────────────────────────────────────── */}
        <div className="grid gap-2 lg:grid-cols-2">

          {/* Classificação */}
          <SectionCard icon={Tag} title="Classificação" accent="bg-amber-500">
            <Row label="Tipo de achado">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${tClr}`}>
                {tLbl}
              </span>
            </Row>
            <Row label="Cláusula / requisito">{rec.clause || "—"}</Row>
            <Row label="Código">{rec.custom_id}</Row>
          </SectionCard>

          {/* Ligações */}
          <SectionCard icon={ClipboardCheck} title="Ligações" accent="bg-blue-500">
            <Row label="Auditoria">
              {rec.audit_display ? (
                <Link
                  href={`/clinical-laboratory/quality-management/audits/${rec.audit_display.id}`}
                  className="text-blue-600 underline-offset-2 hover:underline dark:text-blue-400">
                  {rec.audit_display.code || rec.audit_display.label}
                </Link>
              ) : "—"}
            </Row>
            <Row label="NC gerada">
              {rec.nonconformity_display ? (
                <Link
                  href={`/clinical-laboratory/quality-management/nonconformities/${rec.nonconformity_display.id}`}
                  className="text-red-600 underline-offset-2 hover:underline dark:text-red-400">
                  {rec.nonconformity_display.label}
                </Link>
              ) : "—"}
            </Row>
          </SectionCard>

          {/* Descrição */}
          <div className="lg:col-span-2">
            <SectionCard icon={FileText} title="Descrição do achado" accent="bg-orange-500">
              {rec.description ? (
                <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">{rec.description}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Sem descrição.</p>
              )}
            </SectionCard>
          </div>

          {/* Metadados */}
          <div className="lg:col-span-2">
            <SectionCard icon={CalendarDays} title="Registo" accent="bg-slate-400">
              <Row label="Criado em">
                <span className="text-[10px] text-muted-foreground">{fmtDateTime(rec.created_at)}</span>
              </Row>
              <Row label="Última atualização">
                <span className="text-[10px] text-muted-foreground">{fmtDateTime(rec.updated_at)}</span>
              </Row>
            </SectionCard>
          </div>

          {/* Tipo — grelha explicativa full width */}
          <div className="lg:col-span-2">
            <SectionCard icon={Scale} title="Tipo de achado" accent={bar}>
              <div className="grid gap-1.5 sm:grid-cols-5">
                {Object.entries(TYPE_LABEL).map(([value, label]) => {
                  const isActive = rec.finding_type === value;
                  return (
                    <div key={value}
                      className={`relative overflow-hidden rounded-lg border px-3 py-2.5 text-[11px] transition ${isActive ? TYPE_COLOR[value] + " ring-1 ring-current/20" : "border-border bg-background opacity-40"}`}>
                      <span className={`absolute inset-y-0 left-0 w-0.5 ${TYPE_BAR[value]}`} />
                      <span className={`block pl-1.5 font-semibold ${isActive ? "" : "text-foreground"}`}>{label}</span>
                      <span className={`block pl-1.5 pt-0.5 text-[9px] leading-snug ${isActive ? "opacity-80" : "text-muted-foreground"}`}>
                        {TYPE_DESC[value]}
                      </span>
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
