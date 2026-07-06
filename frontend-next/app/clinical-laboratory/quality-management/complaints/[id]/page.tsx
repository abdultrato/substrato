"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileText,
  Link2,
  MessagesSquare,
  Pencil,
  Reply,
  Shield,
  Tag,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Metadata ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  RECEBIDA:     "Recebida",
  INVESTIGACAO: "Em investigação",
  RESPONDIDA:   "Respondida",
  CAPA:         "Com ação corretiva",
  FECHADA:      "Fechada",
};

const STATUS_COLOR: Record<string, string> = {
  RECEBIDA:     "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  INVESTIGACAO: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300",
  RESPONDIDA:   "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300",
  CAPA:         "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300",
  FECHADA:      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
};

const STATUS_DOT: Record<string, string> = {
  RECEBIDA:     "bg-amber-400",
  INVESTIGACAO: "bg-sky-500",
  RESPONDIDA:   "bg-indigo-500",
  CAPA:         "bg-orange-500",
  FECHADA:      "bg-emerald-500",
};

const STATUS_BAR = STATUS_DOT;

const STATUS_STEPS = ["RECEBIDA", "INVESTIGACAO", "RESPONDIDA", "CAPA", "FECHADA"];

// ── Types ─────────────────────────────────────────────────────────────────────

type Complaint = {
  id: number;
  custom_id: string;
  code: string;
  source: string;
  received_at: string | null;
  description: string;
  investigation: string;
  response: string;
  status: string;
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

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rec, setRec] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<Complaint>(`/clinical_laboratory/complaint/${id}/`)
      .then(setRec)
      .catch((e) => setError(e?.message ?? "Erro ao carregar reclamação."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (error || !rec) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
          {error ?? "Reclamação não encontrada."}
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
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${bar}`} />

          <div className="relative flex flex-wrap items-center gap-4 px-5 py-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 ${sClr} shadow-sm`}>
              <MessagesSquare size={22} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/clinical-laboratory/quality-management/complaints" className="hover:underline">
                  Reclamações
                </Link>
                <span>/</span>
                <span className="font-mono text-[9px]">{rec.custom_id}</span>
              </div>
              <h1 className="mt-0.5 line-clamp-2 text-lg font-bold leading-tight text-foreground">
                {rec.code || rec.description.slice(0, 80) || "Reclamação"}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${sClr}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${sDot}`} />
                  {sLbl}
                </span>
                {rec.source && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:border-slate-700/40 dark:bg-slate-900/20 dark:text-slate-300">
                    <Tag size={9} /> {rec.source}
                  </span>
                )}
                {rec.nonconformity_display && (
                  <Link
                    href={`/clinical-laboratory/quality-management/nonconformities/${rec.nonconformity_display.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 transition hover:bg-red-100 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
                    <Link2 size={9} /> {rec.nonconformity_display.label}
                  </Link>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <Link href={`/clinical-laboratory/quality-management/complaints/${id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-orange-600 px-4 text-xs font-semibold text-white shadow-md shadow-rose-500/30 transition hover:from-rose-700 hover:to-orange-700">
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
          <SectionCard icon={Tag} title="Identificação" accent="bg-rose-500">
            <Row label="Código interno">{rec.code || "—"}</Row>
            <Row label="Origem">{rec.source || "—"}</Row>
            <Row label="Recebida em">
              <span className="text-[10px] text-muted-foreground">{fmtDateTime(rec.received_at) ?? "—"}</span>
            </Row>
            <Row label="NC gerada">
              {rec.nonconformity_display ? (
                <Link
                  href={`/clinical-laboratory/quality-management/nonconformities/${rec.nonconformity_display.id}`}
                  className="text-rose-600 underline-offset-2 hover:underline dark:text-rose-400">
                  {rec.nonconformity_display.label}
                </Link>
              ) : "—"}
            </Row>
          </SectionCard>

          {/* Metadados */}
          <SectionCard icon={CalendarDays} title="Registo" accent="bg-slate-400">
            <Row label="Código">{rec.custom_id}</Row>
            <Row label="Criado em">
              <span className="text-[10px] text-muted-foreground">{fmtDateTime(rec.created_at)}</span>
            </Row>
            <Row label="Última atualização">
              <span className="text-[10px] text-muted-foreground">{fmtDateTime(rec.updated_at)}</span>
            </Row>
          </SectionCard>

          {/* Descrição */}
          <div className="lg:col-span-2">
            <SectionCard icon={MessagesSquare} title="Descrição da reclamação" accent="bg-orange-500">
              {rec.description ? (
                <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">{rec.description}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Sem descrição.</p>
              )}
            </SectionCard>
          </div>

          {/* Investigação */}
          <SectionCard icon={FileText} title="Investigação" accent="bg-sky-500">
            {rec.investigation ? (
              <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">{rec.investigation}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">Ainda sem investigação registada.</p>
            )}
          </SectionCard>

          {/* Resposta */}
          <SectionCard icon={Reply} title="Resposta ao reclamante" accent="bg-indigo-500">
            {rec.response ? (
              <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">{rec.response}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">Ainda sem resposta registada.</p>
            )}
          </SectionCard>

          {/* Estado — full width */}
          <div className="lg:col-span-2">
            <SectionCard icon={Shield} title="Estado da reclamação" accent={bar}>
              <div className="grid gap-1.5 sm:grid-cols-5">
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
