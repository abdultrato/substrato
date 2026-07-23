"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Activity, AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, ClipboardCheck, Droplet, Gauge, HeartPulse, Loader2, Pause, Play, User, Wind, XCircle } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";
import { routeParamToString } from "@/lib/routeParams";

type Program = {
  id: number;
  custom_id?: string | null;
  patient_name?: string | null;
  care_manager_name?: string | null;
  alert_count?: number | null;
  condition?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  review_frequency_days?: number | null;
  next_review_date?: string | null;
  target_systolic_max?: number | null;
  target_diastolic_max?: number | null;
  target_glucose_min?: string | number | null;
  target_glucose_max?: string | number | null;
  target_spo2_min?: string | number | null;
  care_plan?: string | null;
  escalation_protocol?: string | null;
  notes?: string | null;
};

const CONDITION_LABEL: Record<string, string> = { COPD: "DPCO", HYPERTENSION: "Hipertensão", DIABETES: "Diabetes", HEART_FAILURE: "Insuficiência cardíaca", PREGNANCY_RISK: "Gravidez de risco", OTHER: "Outra" };
const STATUS_META: Record<string, { label: string; tone: string; bar: string }> = {
  ENROLLED: { label: "Inscrito", tone: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/40 dark:bg-sky-950/30 dark:text-sky-300", bar: "from-sky-500 to-cyan-500" },
  ACTIVE: { label: "Ativo", tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300", bar: "from-emerald-500 to-teal-500" },
  PAUSED: { label: "Pausado", tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300", bar: "from-amber-500 to-orange-500" },
  COMPLETED: { label: "Concluído", tone: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300", bar: "from-slate-400 to-slate-500" },
  CANCELLED: { label: "Cancelado", tone: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400", bar: "from-slate-400 to-slate-500" },
};
const ACTIONS_BY_STATUS: Record<string, Array<{ endpoint: string; label: string; icon: any; kind: "primary" | "danger" }>> = {
  ENROLLED: [{ endpoint: "ativar", label: "Ativar", icon: Play, kind: "primary" }, { endpoint: "cancelar", label: "Cancelar", icon: XCircle, kind: "danger" }],
  ACTIVE: [{ endpoint: "registar-revisao", label: "Registar revisão", icon: ClipboardCheck, kind: "primary" }, { endpoint: "pausar", label: "Pausar", icon: Pause, kind: "primary" }, { endpoint: "concluir", label: "Concluir", icon: CheckCircle2, kind: "primary" }],
  PAUSED: [{ endpoint: "ativar", label: "Reativar", icon: Play, kind: "primary" }, { endpoint: "cancelar", label: "Cancelar", icon: XCircle, kind: "danger" }],
};

function num(v: string | number | null | undefined): number | null { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isNaN(n) ? null : n; }
function fmtDate(value?: string | null) { if (!value) return "—"; const d = new Date(value); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }); }
function isOverdue(value?: string | null) { if (!value) return false; const d = new Date(value); if (Number.isNaN(d.getTime())) return false; const t = new Date(); t.setHours(0, 0, 0, 0); return d < t; }

export default function TelemedicineChronicProgramDetailPage() {
  const params = useParams();
  const id = routeParamToString((params as any)?.id);
  const [item, setItem] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<Program>(`/telemedicine/program/${id}/`, { clientCache: false });
      setItem(data);
    } catch (e: any) {
      setError(e?.message || "Não foi possível carregar o programa.");
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
      const data = await apiFetch<Program>(`/telemedicine/program/${id}/${endpoint}/`, { method: "POST", body: JSON.stringify({}) });
      setItem(data);
    } catch (e: any) {
      setError(e?.message || "Não foi possível executar a ação.");
    } finally {
      setBusy(null);
    }
  }, [id, busy]);

  const status = String(item?.status || "").toUpperCase();
  const meta = STATUS_META[status] || STATUS_META.ENROLLED;
  const actions = ACTIONS_BY_STATUS[status] || [];
  const overdue = ["ACTIVE", "ENROLLED"].includes(status) && isOverdue(item?.next_review_date);

  const targets = item ? [
    (item.target_systolic_max != null || item.target_diastolic_max != null) ? { icon: Gauge, label: "PA máx.", value: `${item.target_systolic_max ?? "—"}/${item.target_diastolic_max ?? "—"}`, unit: "mmHg" } : null,
    (num(item.target_glucose_min) != null || num(item.target_glucose_max) != null) ? { icon: Droplet, label: "Glicemia", value: `${num(item.target_glucose_min) ?? "—"}–${num(item.target_glucose_max) ?? "—"}`, unit: "mg/dL" } : null,
    num(item.target_spo2_min) != null ? { icon: Wind, label: "SpO2 mín.", value: `${num(item.target_spo2_min)}`, unit: "%" } : null,
  ].filter(Boolean) as Array<{ icon: any; label: string; value: string; unit: string }> : [];

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM, GROUPS.TELEMEDICINA]}>
      <div className="mx-auto w-full max-w-[99vw] space-y-2 px-1 pb-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" /> A carregar…</div>
        ) : !item ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">{error || "Programa não encontrado."}</div>
        ) : (
          <>
            {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">{error}</div> : null}

            {/* Cabeçalho. */}
            <section className="relative overflow-hidden rounded-xl border border-cyan-200/60 bg-white/55 p-3 shadow-sm backdrop-blur dark:border-cyan-900/35 dark:bg-slate-950/45">
              <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${meta.bar}`} />
              <div className="flex flex-wrap items-start gap-2">
                <Link href="/telemedicine/chronic-programs" title="Voltar aos programas" className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/70 text-muted-foreground shadow-sm transition hover:border-cyan-300 hover:text-foreground"><ArrowLeft size={15} /></Link>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] text-muted-foreground">{item.custom_id || `CMP-${item.id}`}</p>
                  <h1 className="flex items-center gap-1.5 truncate text-lg font-bold leading-tight text-foreground"><HeartPulse size={18} className="shrink-0 text-cyan-600 dark:text-cyan-400" />{CONDITION_LABEL[String(item.condition || "").toUpperCase()] || "Programa crónico"}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className={`rounded-full border px-2 py-0.5 font-semibold ${meta.tone}`}>{meta.label}</span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground"><User size={11} />{item.patient_name || "Sem paciente"}</span>
                    {item.care_manager_name ? <span className="inline-flex items-center gap-1 text-muted-foreground"><ClipboardCheck size={11} />{item.care_manager_name}</span> : null}
                    {(item.alert_count ?? 0) > 0 ? <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400"><AlertTriangle size={11} />{item.alert_count} alertas</span> : null}
                  </div>
                </div>
              </div>
              {actions.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/40 pt-2">
                  {actions.map((a) => {
                    const AIcon = a.icon;
                    return (
                      <button key={a.endpoint} type="button" disabled={!!busy} onClick={() => runAction(a.endpoint)}
                        className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition disabled:opacity-50 ${a.kind === "primary" ? "bg-gradient-to-r from-cyan-600 to-violet-600 text-white shadow-sm hover:from-cyan-700 hover:to-violet-700" : "border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800/40 dark:text-rose-300"}`}>
                        {busy === a.endpoint ? <Loader2 size={13} className="animate-spin" /> : <AIcon size={13} />}{a.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </section>

            <div className="grid gap-2 md:grid-cols-3">
              {/* Metas clínicas + planos. */}
              <section className="space-y-2 md:col-span-2">
                <div className="rounded-xl border border-border/60 bg-card/60 p-3">
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Metas clínicas</h2>
                  {targets.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem metas definidas.</p>
                  ) : (
                    <div className="grid gap-1.5 sm:grid-cols-3">
                      {targets.map((t) => {
                        const TIcon = t.icon;
                        return (
                          <div key={t.label} className="rounded-lg border border-border/50 bg-muted/30 px-2 py-1.5">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><TIcon size={11} />{t.label}</div>
                            <div className="text-sm font-bold text-foreground">{t.value}<span className="ml-0.5 text-[9px] font-normal text-muted-foreground">{t.unit}</span></div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <Block title="Plano de cuidado" value={item.care_plan} />
                <Block title="Protocolo de escalonamento" value={item.escalation_protocol} highlightTone="amber" />
                <Block title="Observações" value={item.notes} />
              </section>

              {/* Cronograma. */}
              <section className="rounded-xl border border-border/60 bg-card/60 p-3">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Cronograma</h2>
                <dl className="space-y-2 text-xs">
                  <Row icon={CalendarClock} label="Início" value={fmtDate(item.start_date)} />
                  <Row icon={CalendarClock} label="Fim" value={fmtDate(item.end_date)} />
                  <Row icon={Activity} label="Frequência" value={`${item.review_frequency_days ?? "—"} dias`} />
                  <Row icon={CalendarClock} label="Próxima revisão" value={fmtDate(item.next_review_date)} danger={overdue} />
                </dl>
              </section>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function Row({ icon: Icon, label, value, danger }: { icon: any; label: string; value: string; danger?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${danger ? "border-rose-200 bg-rose-50/60 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300" : "border-border/60"}`}>
      <Icon size={13} className={danger ? "" : "text-muted-foreground"} /><span className="font-medium">{label}</span><span className="ml-auto font-semibold">{value}{danger ? " (atraso)" : ""}</span>
    </div>
  );
}

function Block({ title, value, highlightTone }: { title: string; value?: string | null; highlightTone?: "amber" }) {
  const empty = !value?.trim();
  const tone = highlightTone === "amber" ? "border-amber-200/70 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/20" : "border-border/60 bg-card/60";
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <p className={`whitespace-pre-wrap text-sm ${empty ? "text-muted-foreground/60" : "text-foreground"}`}>{empty ? "—" : value}</p>
    </div>
  );
}
