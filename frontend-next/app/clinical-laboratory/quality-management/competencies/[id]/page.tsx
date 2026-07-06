"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  CheckCircle2,
  Clock,
  FlaskConical,
  MessageSquare,
  Pencil,
  Shield,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Metadata ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  AGENDADA:           "Agendada",
  AVALIADA:           "Avaliada",
  COMPETENTE:         "Competente",
  NECESSITA_FORMACAO: "Necessita formação",
  RESTRINGIDA:        "Restringida",
  EXPIRADA:           "Expirada",
};

const STATUS_COLOR: Record<string, string> = {
  AGENDADA:           "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  AVALIADA:           "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300",
  COMPETENTE:         "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  NECESSITA_FORMACAO: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300",
  RESTRINGIDA:        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300",
  EXPIRADA:           "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
};

const STATUS_DOT: Record<string, string> = {
  AGENDADA:           "bg-amber-400",
  AVALIADA:           "bg-sky-500",
  COMPETENTE:         "bg-emerald-500",
  NECESSITA_FORMACAO: "bg-orange-500",
  RESTRINGIDA:        "bg-rose-500",
  EXPIRADA:           "bg-red-500",
};

const STATUS_BAR = STATUS_DOT;

const STATUS_DESC: Record<string, string> = {
  AGENDADA:           "Avaliação planeada, ainda por realizar.",
  AVALIADA:           "Avaliação realizada, resultado em análise.",
  COMPETENTE:         "Colaborador considerado competente para a atividade.",
  NECESSITA_FORMACAO: "Requer formação adicional antes de nova avaliação.",
  RESTRINGIDA:        "Atividade restringida para este colaborador.",
  EXPIRADA:           "Competência fora da validade — reavaliar.",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Competency = {
  id: number;
  custom_id: string;
  area: string;
  status: string;
  staff: number | null;
  staff_display?: string | null;
  assessed_by: number | null;
  assessed_by_display?: string | null;
  related_test: number | null;
  related_test_display?: string | null;
  assessment_date: string | null;
  expiry_date: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d.includes("T") ? d : d + "T00:00:00").toLocaleDateString("pt-MZ", {
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

function daysUntil(d: string | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
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

export default function CompetencyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rec, setRec] = useState<Competency | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<Competency>(`/clinical_laboratory/competency/${id}/`)
      .then(setRec)
      .catch((e) => setError(e?.message ?? "Erro ao carregar avaliação."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-fuchsia-500 border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (error || !rec) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
          {error ?? "Avaliação não encontrada."}
        </div>
      </AppLayout>
    );
  }

  const bar      = STATUS_BAR[rec.status]   ?? "bg-slate-400";
  const sClr     = STATUS_COLOR[rec.status] ?? "border-border bg-muted text-foreground";
  const sDot     = STATUS_DOT[rec.status]   ?? "bg-slate-400";
  const sLbl     = STATUS_LABEL[rec.status] ?? rec.status;
  const days     = daysUntil(rec.expiry_date);
  const expiring = days !== null && days >= 0 && days <= 30;
  const expired  = rec.status === "EXPIRADA" || (days !== null && days < 0);

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-fuchsia-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${bar}`} />

          <div className="relative flex flex-wrap items-center gap-4 px-5 py-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 ${sClr} shadow-sm`}>
              <Award size={22} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/clinical-laboratory/quality-management/competencies" className="hover:underline">
                  Avaliações de competência
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
                {rec.staff_display && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300">
                    <User size={9} /> {rec.staff_display}
                  </span>
                )}
                {expiring && !expired && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300">
                    <Clock size={9} /> Expira em {days} dia{days !== 1 ? "s" : ""}
                  </span>
                )}
                {expired && rec.status !== "EXPIRADA" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
                    <Clock size={9} /> Validade expirada
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`/clinical-laboratory/quality-management/competencies/${id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-purple-600 px-4 text-xs font-semibold text-white shadow-md shadow-fuchsia-500/30 transition hover:from-fuchsia-700 hover:to-purple-700">
                <Pencil size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        {/* ── Grid de cards ─────────────────────────────────────── */}
        <div className="grid gap-2 lg:grid-cols-2">

          {/* Identificação */}
          <SectionCard icon={Award} title="Identificação" accent="bg-fuchsia-500">
            <Row label="Código">{rec.custom_id}</Row>
            <Row label="Atividade / competência">{rec.area}</Row>
            <Row label="Exame relacionado">
              {rec.related_test_display ? (
                <span className="inline-flex items-center gap-1">
                  <FlaskConical size={10} className="text-fuchsia-500" /> {rec.related_test_display}
                </span>
              ) : "—"}
            </Row>
          </SectionCard>

          {/* Colaborador */}
          <SectionCard icon={User} title="Colaborador" accent="bg-purple-500">
            <Row label="Colaborador avaliado">
              {rec.staff_display ?? (rec.staff ? `#${rec.staff}` : "—")}
            </Row>
            <Row label="Avaliado por">
              {rec.assessed_by_display ?? (rec.assessed_by ? `#${rec.assessed_by}` : "—")}
            </Row>
          </SectionCard>

          {/* Datas */}
          <SectionCard icon={CalendarDays} title="Datas" accent="bg-teal-500">
            <Row label="Data da avaliação">{fmtDate(rec.assessment_date) ?? "—"}</Row>
            <Row label="Validade / expiração">
              {rec.expiry_date ? (
                <span className={expiring || expired ? "font-semibold text-orange-600 dark:text-orange-400" : ""}>
                  {fmtDate(rec.expiry_date)}
                  {days !== null && days >= 0 && (
                    <span className="ml-1 text-[10px] text-muted-foreground">({days}d restantes)</span>
                  )}
                  {days !== null && days < 0 && (
                    <span className="ml-1 text-[10px] text-red-500">({Math.abs(days)}d expirado)</span>
                  )}
                </span>
              ) : "—"}
            </Row>
            <Row label="Criado em">
              <span className="text-[10px] text-muted-foreground">{fmtDateTime(rec.created_at)}</span>
            </Row>
            <Row label="Última atualização">
              <span className="text-[10px] text-muted-foreground">{fmtDateTime(rec.updated_at)}</span>
            </Row>
          </SectionCard>

          {/* Observações */}
          <SectionCard icon={MessageSquare} title="Observações" accent="bg-slate-400">
            {rec.notes ? (
              <p className="whitespace-pre-wrap text-[11px] text-foreground leading-relaxed">{rec.notes}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">Sem observações.</p>
            )}
          </SectionCard>

          {/* Estado — full width */}
          <div className="lg:col-span-2">
            <SectionCard icon={Shield} title="Estado da competência" accent={bar}>
              <div className="grid gap-1.5 sm:grid-cols-3">
                {Object.entries(STATUS_LABEL).map(([value, label]) => {
                  const isActive = rec.status === value;
                  return (
                    <div key={value}
                      className={`relative overflow-hidden rounded-lg border px-3 py-2.5 text-[11px] transition ${isActive ? STATUS_COLOR[value] + " ring-1 ring-current/20" : "border-border bg-background opacity-40"}`}>
                      <span className={`absolute inset-y-0 left-0 w-0.5 ${STATUS_BAR[value]}`} />
                      <span className={`block pl-1.5 font-semibold ${isActive ? "" : "text-foreground"}`}>{label}</span>
                      <span className={`block pl-1.5 pt-0.5 text-[9px] leading-snug ${isActive ? "opacity-80" : "text-muted-foreground"}`}>
                        {STATUS_DESC[value]}
                      </span>
                      {isActive && <CheckCircle2 size={12} className="absolute right-2 top-2" />}
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
