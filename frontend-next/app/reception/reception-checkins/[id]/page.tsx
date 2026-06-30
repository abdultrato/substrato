"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Edit,
  FileText,
  Loader2,
  Receipt,
  Stethoscope,
  User,
  UserCheck,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { GROUPS, userHasAnyGroup } from "@/lib/rbac";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

// ── Types ─────────────────────────────────────────────────────────────────────

type Checkin = {
  id: number;
  custom_id?: string;
  patient?: number;
  patient_name?: string;
  patient_code?: string;
  attendant?: number;
  attendant_name?: string;
  status?: string;
  status_display?: string;
  priority?: string;
  priority_display?: string;
  reason?: string;
  notes?: string;
  arrived_at?: string;
  called_at?: string;
  completed_at?: string;
  request?: number;
  request_code?: string;
  invoice?: number;
  invoice_code?: string;
};

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; cls: string; dot: string; bar: string }> = {
  AGUARD: { label: "Aguardando",       cls: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400",    dot: "bg-amber-400",   bar: "bg-amber-400" },
  ATEND:  { label: "Em atendimento",   cls: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-400",          dot: "bg-blue-500",    bar: "bg-blue-500" },
  REQ:    { label: "Req. criada",      cls: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-400", dot: "bg-violet-500", bar: "bg-violet-500" },
  FAT:    { label: "Fatura vinculada", cls: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-400", dot: "bg-indigo-500", bar: "bg-indigo-500" },
  CONC:   { label: "Concluído",        cls: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-400", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  CANC:   { label: "Cancelado",        cls: "border-red-300 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-400",                dot: "bg-red-400",     bar: "bg-red-400" },
};

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  URG:  { label: "Urgente",      cls: "border-red-300 bg-red-100 text-red-700 font-bold dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-400" },
  PREF: { label: "Preferencial", cls: "border-amber-300 bg-amber-100 text-amber-700 font-semibold dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400" },
  NOR:  { label: "Normal",       cls: "border-border bg-muted text-muted-foreground" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString([], { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const m = STATUS_META[status];
  if (!m) return <span className="text-xs text-muted-foreground">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${m.cls}`}>
      <span className={`h-2 w-2 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority) return null;
  const m = PRIORITY_META[priority] ?? PRIORITY_META.NOR;
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${m.cls}`}>
      {m.label}
    </span>
  );
}

function SectionCard({ icon: Icon, title, accent = "bg-[var(--primary-600)]", children }: {
  icon: React.ElementType; title: string; accent?: string; children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-1.5 pl-5">
        <Icon size={13} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
      </div>
      <div className="px-4 py-2.5 pl-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  );
}

// ── Timeline step ─────────────────────────────────────────────────────────────

function TimelineStep({ label, time, active, done, last }: {
  label: string; time?: string; active?: boolean; done?: boolean; last?: boolean;
}) {
  return (
    <div className="relative flex flex-1 flex-col items-center text-center">
      {!last && (
        <span className={`absolute left-1/2 top-2.5 h-px w-full ${done ? "bg-emerald-400/60" : "bg-border"}`} />
      )}
      <div className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition
        ${done ? "border-emerald-500 bg-emerald-500 text-white" : active ? "border-[var(--primary-600)] bg-[var(--primary-600)] text-white" : "border-border bg-muted text-muted-foreground"}`}>
        {done ? "✓" : ""}
      </div>
      <div className="mt-1.5 min-w-0">
        <div className={`text-xs font-semibold ${active || done ? "text-foreground" : "text-muted-foreground"}`}>{label}</div>
        <div className="text-[11px] text-muted-foreground">{time || "—"}</div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReceptionCheckinDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const canWrite = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.RECEPCAO]);

  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<Checkin>(`/reception/checkin/${id}/`);
      setCheckin(data);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleAction(action: "start-care" | "complete" | "cancel") {
    setActionError(null);
    setActing(action);
    try {
      const data = await apiFetch<Checkin>(`/reception/checkin/${id}/${action}/`, {
        method: "POST", body: JSON.stringify({}),
      });
      setCheckin(data);
    } catch (e: any) {
      setActionError(e?.message || "Erro ao executar acção.");
    } finally {
      setActing(null);
    }
  }

  const statusMeta = checkin?.status ? STATUS_META[checkin.status] : null;
  const canStart    = checkin?.status === "AGUARD";
  const canComplete = checkin?.status === "ATEND" || checkin?.status === "REQ" || checkin?.status === "FAT";
  const canCancel   = checkin?.status !== "CONC" && checkin?.status !== "CANC";

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("reception")}>
      <div className="mx-auto w-full max-w-3xl space-y-3">

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          {/* Status accent top bar */}
          {statusMeta && <div className={`absolute inset-x-0 top-0 h-1 ${statusMeta.bar}`} />}

          <div className="px-4 py-2.5 pl-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                  <ClipboardList size={18} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-foreground">
                      {loading ? "Check-in" : checkin?.custom_id || `Check-in #${id}`}
                    </h1>
                    {!loading && checkin && (
                      <>
                        <StatusBadge status={checkin.status} />
                        <PriorityBadge priority={checkin.priority} />
                      </>
                    )}
                  </div>
                  {checkin?.patient_name && (
                    <p className="text-[11px] text-muted-foreground">{checkin.patient_name}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => router.push("/reception/reception-checkins")}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                  <ArrowLeft size={13} /> Voltar
                </button>
                {canWrite && checkin && (
                  <Link href={`/reception/reception-checkins/${id}/edit`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                    <Edit size={13} /> Editar
                  </Link>
                )}
                {canWrite && canStart && (
                  <button type="button" disabled={!!acting} onClick={() => handleAction("start-care")}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-3 text-xs font-semibold text-white shadow-md shadow-blue-500/30 transition hover:from-blue-700 hover:to-blue-600 disabled:opacity-60">
                    {acting === "start-care" ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
                    Iniciar atendimento
                  </button>
                )}
                {canWrite && canComplete && (
                  <ConfirmDialog title="Concluir atendimento" message="Marcar como concluído?" confirmText="Concluir" onConfirm={() => handleAction("complete")}>
                    <button type="button" disabled={!!acting}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-3 text-xs font-semibold text-white shadow-md shadow-emerald-500/30 transition hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-60">
                      {acting === "complete" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      Concluir
                    </button>
                  </ConfirmDialog>
                )}
                {canWrite && canCancel && (
                  <ConfirmDialog title="Cancelar check-in" message="Cancelar este check-in?" confirmText="Cancelar check-in" danger onConfirm={() => handleAction("cancel")}>
                    <button type="button" disabled={!!acting}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:bg-transparent dark:text-red-400">
                      {acting === "cancel" ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                      Cancelar
                    </button>
                  </ConfirmDialog>
                )}
              </div>
            </div>
          </div>
        </div>

        {actionError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {actionError}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> Carregando...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">{error}</div>
        ) : checkin ? (
          <>
          <div className="grid gap-2 sm:grid-cols-2">

            {/* Patient */}
            <SectionCard icon={User} title="Paciente" accent="bg-sky-500">
              <dl className="space-y-2">
                <Field label="Nome">{checkin.patient_name || "—"}</Field>
                {checkin.patient_code && <Field label="Código">{checkin.patient_code}</Field>}
              </dl>
            </SectionCard>

            {/* Atendimento */}
            <SectionCard icon={Stethoscope} title="Atendimento" accent="bg-violet-500">
              <dl className="space-y-2">
                <Field label="Estado"><StatusBadge status={checkin.status} /></Field>
                <Field label="Prioridade"><PriorityBadge priority={checkin.priority} /></Field>
                {checkin.attendant_name && <Field label="Atendente">{checkin.attendant_name}</Field>}
              </dl>
            </SectionCard>

            {/* Motivo / Notas */}
            <SectionCard icon={ClipboardList} title="Motivo e notas" accent="bg-amber-500">
              <dl className="space-y-2">
                <Field label="Motivo">{checkin.reason || <span className="text-muted-foreground">—</span>}</Field>
                {checkin.notes && <Field label="Notas">{checkin.notes}</Field>}
              </dl>
            </SectionCard>

            {/* Documentos */}
            {(checkin.request_code || checkin.invoice_code) && (
              <div className="sm:col-span-2">
                <SectionCard icon={FileText} title="Documentos vinculados" accent="bg-indigo-500">
                  <div className="flex flex-wrap gap-3">
                    {checkin.request_code && (
                      <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 dark:border-violet-700/30 dark:bg-violet-900/20">
                        <FileText size={14} className="text-violet-600 dark:text-violet-400" />
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">Requisição</div>
                          <div className="text-sm font-semibold text-violet-700 dark:text-violet-300">{checkin.request_code}</div>
                        </div>
                        {checkin.request && (
                          <Link href={`/requests/${checkin.request}`}
                            className="ml-2 text-[11px] text-violet-600 hover:underline dark:text-violet-400">
                            Ver →
                          </Link>
                        )}
                      </div>
                    )}
                    {checkin.invoice_code && (
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-700/30 dark:bg-emerald-900/20">
                        <Receipt size={14} className="text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Fatura</div>
                          <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{checkin.invoice_code}</div>
                        </div>
                        {checkin.invoice && (
                          <Link href={`/invoices/draft/${checkin.invoice}`}
                            className="ml-2 text-[11px] text-emerald-600 hover:underline dark:text-emerald-400">
                            Ver →
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </SectionCard>
              </div>
            )}

          </div>

          {/* Linha do tempo — barra horizontal final */}
          <SectionCard icon={Clock} title="Linha do tempo" accent="bg-emerald-500">
            <div className="flex items-start gap-0 pt-1">
              <TimelineStep
                label="Chegada"
                time={fmtDateTime(checkin.arrived_at)}
                done={!!checkin.arrived_at}
              />
              <TimelineStep
                label="Chamado para atendimento"
                time={fmtDateTime(checkin.called_at)}
                active={checkin.status === "ATEND" && !checkin.completed_at}
                done={!!checkin.called_at && checkin.status !== "ATEND"}
              />
              <TimelineStep
                label="Concluído"
                time={fmtDateTime(checkin.completed_at)}
                done={checkin.status === "CONC"}
                last
              />
            </div>
          </SectionCard>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
