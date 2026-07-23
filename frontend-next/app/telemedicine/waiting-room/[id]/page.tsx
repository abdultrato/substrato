"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronRight, Clock3, Loader2, MonitorCheck, ShieldCheck, ShieldAlert, Stethoscope, User, Video, XCircle } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { SubstratoTimeline } from "@/components/ui/SubstratoTimeline";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";
import { routeParamToString } from "@/lib/routeParams";

type Entry = {
  id: number;
  custom_id?: string | null;
  patient_name?: string | null;
  clinician_name?: string | null;
  consultation_label?: string | null;
  status?: string | null;
  priority?: string | null;
  queue_position?: number | null;
  check_in_at?: string | null;
  triage_started_at?: string | null;
  triage_completed_at?: string | null;
  estimated_start_at?: string | null;
  call_started_at?: string | null;
  completed_at?: string | null;
  chief_complaint?: string | null;
  preliminary_symptoms?: string | null;
  triage_notes?: string | null;
  device_check_passed?: boolean;
  consent_confirmed?: boolean;
  video_room_url?: string | null;
  notes?: string | null;
};

const STATUS_META: Record<string, { label: string; tone: string; bar: string }> = {
  CHECKED_IN: { label: "Na sala", tone: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/40 dark:bg-sky-950/30 dark:text-sky-300", bar: "from-sky-500 to-cyan-500" },
  TRIAGE: { label: "Em triagem", tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300", bar: "from-amber-500 to-orange-500" },
  READY: { label: "Pronto", tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300", bar: "from-emerald-500 to-teal-500" },
  IN_CALL: { label: "Em chamada", tone: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/40 dark:bg-violet-950/30 dark:text-violet-300", bar: "from-violet-500 to-fuchsia-500" },
  COMPLETED: { label: "Concluída", tone: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300", bar: "from-slate-400 to-slate-500" },
  NO_SHOW: { label: "Faltou", tone: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300", bar: "from-rose-500 to-red-500" },
  CANCELLED: { label: "Cancelada", tone: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400", bar: "from-slate-400 to-slate-500" },
};

const PRIORITY_META: Record<string, { label: string; tone: string }> = {
  EMERGENCY: { label: "Emergência", tone: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300" },
  URGENT: { label: "Urgente", tone: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/40 dark:bg-orange-950/30 dark:text-orange-300" },
  PRIORITY: { label: "Prioritário", tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300" },
  ROUTINE: { label: "Rotina", tone: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300" },
};

// Ações disponíveis conforme o estado atual.
const ACTIONS_BY_STATUS: Record<string, Array<{ endpoint: string; label: string; kind: "primary" | "danger" }>> = {
  CHECKED_IN: [{ endpoint: "iniciar-triagem", label: "Iniciar triagem", kind: "primary" }, { endpoint: "faltou", label: "Faltou", kind: "danger" }, { endpoint: "cancelar", label: "Cancelar", kind: "danger" }],
  TRIAGE: [{ endpoint: "marcar-pronto", label: "Marcar pronto", kind: "primary" }, { endpoint: "faltou", label: "Faltou", kind: "danger" }, { endpoint: "cancelar", label: "Cancelar", kind: "danger" }],
  READY: [{ endpoint: "iniciar-chamada", label: "Iniciar chamada", kind: "primary" }, { endpoint: "faltou", label: "Faltou", kind: "danger" }, { endpoint: "cancelar", label: "Cancelar", kind: "danger" }],
  IN_CALL: [{ endpoint: "concluir", label: "Concluir atendimento", kind: "primary" }],
};

function fmt(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function TelemedicineWaitingRoomDetailPage() {
  const params = useParams();
  const id = routeParamToString((params as any)?.id);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<Entry>(`/telemedicine/waiting_room/${id}/`, { clientCache: false });
      setEntry(data);
    } catch (err: any) {
      setError(err?.message || "Não foi possível carregar esta entrada.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const runAction = useCallback(async (endpoint: string) => {
    if (!id || busy) return;
    setBusy(endpoint);
    setError(null);
    try {
      const data = await apiFetch<Entry>(`/telemedicine/waiting_room/${id}/${endpoint}/`, { method: "POST", body: JSON.stringify({}) });
      setEntry(data);
    } catch (err: any) {
      setError(err?.message || "Não foi possível executar a ação.");
    } finally {
      setBusy(null);
    }
  }, [id, busy]);

  const status = String(entry?.status || "").toUpperCase();
  const statusMeta = STATUS_META[status] || STATUS_META.CHECKED_IN;
  const priorityMeta = PRIORITY_META[String(entry?.priority || "").toUpperCase()] || PRIORITY_META.ROUTINE;
  const actions = ACTIONS_BY_STATUS[status] || [];

  // Linha do tempo do fluxo, com marcos concluídos vs. pendentes.
  const timeline = [
    { label: "Entrada na sala", at: entry?.check_in_at, icon: User },
    { label: "Triagem iniciada", at: entry?.triage_started_at, icon: Stethoscope },
    { label: "Triagem concluída", at: entry?.triage_completed_at, icon: CheckCircle2 },
    { label: "Chamada iniciada", at: entry?.call_started_at, icon: Video },
    { label: "Concluída", at: entry?.completed_at, icon: CheckCircle2 },
  ];

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.RECEPCAO, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-[99vw] space-y-2 px-1 pb-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" /> A carregar…</div>
        ) : !entry ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">{error || "Entrada não encontrada."}</div>
        ) : (
          <>
            {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">{error}</div> : null}

            {/* Cabeçalho: paciente, código, estado, prioridade e ações. */}
            <section className="relative overflow-hidden rounded-xl border border-cyan-200/60 bg-white/55 p-3 shadow-sm backdrop-blur dark:border-cyan-900/35 dark:bg-slate-950/45">
              <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${statusMeta.bar}`} />
              <div className="flex flex-wrap items-start gap-2">
                <Link href="/telemedicine/waiting-room" title="Voltar à sala de espera" className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/70 text-muted-foreground shadow-sm transition hover:border-cyan-300 hover:text-foreground"><ArrowLeft size={15} /></Link>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] text-muted-foreground">{entry.custom_id || `TWR-${entry.id}`}{entry.consultation_label ? ` · ${entry.consultation_label}` : ""}</p>
                  <h1 className="truncate text-lg font-bold leading-tight text-foreground">{entry.patient_name || "Paciente não identificado"}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className={`rounded-full border px-2 py-0.5 font-semibold ${statusMeta.tone}`}>{statusMeta.label}</span>
                    <span className={`rounded-full border px-2 py-0.5 font-semibold ${priorityMeta.tone}`}>{priorityMeta.label}</span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock3 size={11} /> Fila #{entry.queue_position || "—"}</span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground"><Stethoscope size={11} /> {entry.clinician_name || "Sem clínico"}</span>
                  </div>
                </div>
                {entry.video_room_url ? (
                  <a href={entry.video_room_url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-violet-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:from-cyan-700 hover:to-violet-700"><Video size={14} /> Entrar na sala</a>
                ) : null}
              </div>

              {actions.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/40 pt-2">
                  {actions.map((action) => (
                    <button
                      key={action.endpoint}
                      type="button"
                      disabled={!!busy}
                      onClick={() => runAction(action.endpoint)}
                      className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition disabled:opacity-50 ${action.kind === "primary" ? "bg-gradient-to-r from-cyan-600 to-violet-600 text-white shadow-sm hover:from-cyan-700 hover:to-violet-700" : "border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800/40 dark:text-rose-300"}`}
                    >
                      {busy === action.endpoint ? <Loader2 size={13} className="animate-spin" /> : action.kind === "danger" ? <XCircle size={13} /> : <ChevronRight size={13} />}
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </section>

            <div className="grid gap-2 md:grid-cols-3">
              {/* Linha do tempo do fluxo. */}
              <SubstratoTimeline
                title="Linha do tempo"
                className="md:col-span-2"
                accentClassName="bg-cyan-500"
                steps={[
                  ...timeline.map((step) => ({
                    label: step.label,
                    date: step.at ? fmt(step.at) : undefined,
                    done: Boolean(step.at),
                  })),
                  ...(entry.estimated_start_at
                    ? [{ label: "Previsão de início", date: fmt(entry.estimated_start_at), done: true }]
                    : []),
                ]}
              />

              {/* Estado de prontidão: dispositivo e consentimento. */}
              <section className="rounded-xl border border-border/60 bg-card/60 p-3">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Prontidão</h2>
                <div className="space-y-1.5">
                  <ReadyRow ok={!!entry.device_check_passed} okIcon={<MonitorCheck size={14} />} label="Teste de dispositivo" />
                  <ReadyRow ok={!!entry.consent_confirmed} okIcon={<ShieldCheck size={14} />} label="Consentimento" />
                </div>
              </section>
            </div>

            {/* Detalhes clínicos. */}
            <section className="rounded-xl border border-border/60 bg-card/60 p-3">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Informação clínica</h2>
              <dl className="grid gap-2 sm:grid-cols-2">
                <Field label="Queixa principal" value={entry.chief_complaint} />
                <Field label="Sintomas preliminares" value={entry.preliminary_symptoms} />
                <Field label="Notas de triagem" value={entry.triage_notes} />
                <Field label="Observações" value={entry.notes} />
              </dl>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function ReadyRow({ ok, okIcon, label }: { ok: boolean; okIcon: React.ReactNode; label: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${ok ? "border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-300" : "border-slate-200 bg-slate-50/60 text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400"}`}>
      <span className="shrink-0">{ok ? okIcon : <ShieldAlert size={14} />}</span>
      <span className="font-medium">{label}</span>
      <span className="ml-auto font-semibold">{ok ? "OK" : "Pendente"}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-xs text-foreground">{value?.trim() ? value : <span className="text-muted-foreground/60">—</span>}</dd>
    </div>
  );
}
