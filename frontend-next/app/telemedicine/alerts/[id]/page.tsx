"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Activity, AlertTriangle, ArrowLeft, ArrowUpCircle, CheckCircle2, Cpu, HeartPulse, Loader2, Stethoscope, User, XCircle } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";
import { routeParamToString } from "@/lib/routeParams";

type Alert = {
  id: number;
  custom_id?: string | null;
  patient_name?: string | null;
  device_label?: string | null;
  program_label?: string | null;
  acknowledged_by_name?: string | null;
  resolved_by_name?: string | null;
  alert_type?: string | null;
  severity?: string | null;
  status?: string | null;
  triggered_at?: string | null;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  message?: string | null;
  recommended_action?: string | null;
  action_taken?: string | null;
  notes?: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  VITAL_THRESHOLD: "Limiar de sinais vitais",
  MISSED_READING: "Leitura em falta",
  DEVICE_OFFLINE: "Dispositivo offline",
  TRIAGE_RISK: "Risco de triagem",
  OTHER: "Outro",
};

const SEVERITY_META: Record<string, { label: string; tone: string }> = {
  INFO: { label: "Informativo", tone: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300" },
  LOW: { label: "Baixo", tone: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/40 dark:bg-sky-950/30 dark:text-sky-300" },
  MEDIUM: { label: "Médio", tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300" },
  HIGH: { label: "Alto", tone: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/40 dark:bg-orange-950/30 dark:text-orange-300" },
  CRITICAL: { label: "Crítico", tone: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300" },
};

const STATUS_META: Record<string, { label: string; tone: string; bar: string }> = {
  OPEN: { label: "Aberto", tone: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300", bar: "from-rose-500 to-orange-500" },
  ACKNOWLEDGED: { label: "Reconhecido", tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300", bar: "from-amber-500 to-yellow-500" },
  ESCALATED: { label: "Escalonado", tone: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/40 dark:bg-orange-950/30 dark:text-orange-300", bar: "from-orange-500 to-red-500" },
  RESOLVED: { label: "Resolvido", tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300", bar: "from-emerald-500 to-teal-500" },
  DISMISSED: { label: "Descartado", tone: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400", bar: "from-slate-400 to-slate-500" },
};

const ACTIONS_BY_STATUS: Record<string, Array<{ endpoint: string; label: string; icon: any; kind: "primary" | "warn" | "danger" }>> = {
  OPEN: [
    { endpoint: "reconhecer", label: "Reconhecer", icon: CheckCircle2, kind: "primary" },
    { endpoint: "escalar", label: "Escalar", icon: ArrowUpCircle, kind: "warn" },
    { endpoint: "resolver", label: "Resolver", icon: CheckCircle2, kind: "primary" },
    { endpoint: "descartar", label: "Descartar", icon: XCircle, kind: "danger" },
  ],
  ACKNOWLEDGED: [
    { endpoint: "escalar", label: "Escalar", icon: ArrowUpCircle, kind: "warn" },
    { endpoint: "resolver", label: "Resolver", icon: CheckCircle2, kind: "primary" },
    { endpoint: "descartar", label: "Descartar", icon: XCircle, kind: "danger" },
  ],
  ESCALATED: [
    { endpoint: "resolver", label: "Resolver", icon: CheckCircle2, kind: "primary" },
    { endpoint: "descartar", label: "Descartar", icon: XCircle, kind: "danger" },
  ],
};

function fmt(value?: string | null) { if (!value) return "—"; const d = new Date(value); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }

export default function TelemedicineAlertDetailPage() {
  const params = useParams();
  const id = routeParamToString((params as any)?.id);
  const [item, setItem] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<Alert>(`/telemedicine/alert/${id}/`, { clientCache: false });
      setItem(data);
    } catch (e: any) {
      setError(e?.message || "Não foi possível carregar o alerta.");
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
      const data = await apiFetch<Alert>(`/telemedicine/alert/${id}/${endpoint}/`, { method: "POST", body: JSON.stringify({}) });
      setItem(data);
    } catch (e: any) {
      setError(e?.message || "Não foi possível executar a ação.");
    } finally {
      setBusy(null);
    }
  }, [id, busy]);

  const status = String(item?.status || "").toUpperCase();
  const severity = String(item?.severity || "").toUpperCase();
  const meta = STATUS_META[status] || STATUS_META.OPEN;
  const sevMeta = SEVERITY_META[severity] || SEVERITY_META.MEDIUM;
  const actions = ACTIONS_BY_STATUS[status] || [];

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.RECEPCAO, GROUPS.TELEMEDICINA]}>
      <div className="mx-auto w-full max-w-[99vw] space-y-2 px-1 pb-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" /> A carregar…</div>
        ) : !item ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">{error || "Alerta não encontrado."}</div>
        ) : (
          <>
            {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">{error}</div> : null}

            {/* Cabeçalho. */}
            <section className="relative overflow-hidden rounded-xl border border-cyan-200/60 bg-white/55 p-3 shadow-sm backdrop-blur dark:border-cyan-900/35 dark:bg-slate-950/45">
              <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${meta.bar}`} />
              <div className="flex flex-wrap items-start gap-2">
                <Link href="/telemedicine/alerts" title="Voltar aos alertas" className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/70 text-muted-foreground shadow-sm transition hover:border-cyan-300 hover:text-foreground"><ArrowLeft size={15} /></Link>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] text-muted-foreground">{item.custom_id || `RCA-${item.id}`}{item.program_label ? ` · ${item.program_label}` : ""}</p>
                  <h1 className="flex items-center gap-1.5 truncate text-lg font-bold leading-tight text-foreground"><AlertTriangle size={17} className="shrink-0 text-rose-500" />{TYPE_LABEL[String(item.alert_type || "").toUpperCase()] || "Alerta clínico"}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className={`rounded-full border px-2 py-0.5 font-semibold ${meta.tone}`}>{meta.label}</span>
                    <span className={`rounded-full border px-2 py-0.5 font-semibold ${sevMeta.tone}`}>{sevMeta.label}</span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground"><User size={11} />{item.patient_name || "Sem paciente"}</span>
                    {item.device_label ? <span className="inline-flex items-center gap-1 text-muted-foreground"><Cpu size={11} />{item.device_label}</span> : null}
                  </div>
                </div>
              </div>
              {actions.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/40 pt-2">
                  {actions.map((a) => {
                    const AIcon = a.icon;
                    const cls = a.kind === "primary"
                      ? "bg-gradient-to-r from-cyan-600 to-violet-600 text-white shadow-sm hover:from-cyan-700 hover:to-violet-700"
                      : a.kind === "warn"
                        ? "border border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-800/40 dark:text-orange-300"
                        : "border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800/40 dark:text-rose-300";
                    return (
                      <button key={a.endpoint} type="button" disabled={!!busy} onClick={() => runAction(a.endpoint)}
                        className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition disabled:opacity-50 ${cls}`}>
                        {busy === a.endpoint ? <Loader2 size={13} className="animate-spin" /> : <AIcon size={13} />}{a.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </section>

            <div className="grid gap-2 md:grid-cols-3">
              {/* Conteúdo clínico. */}
              <section className="space-y-2 md:col-span-2">
                <Block title="Mensagem" value={item.message} highlight />
                <Block title="Ação recomendada" value={item.recommended_action} highlightTone="cyan" />
                <Block title="Conduta tomada" value={item.action_taken} highlightTone="emerald" />
                <Block title="Observações" value={item.notes} />
              </section>

              {/* Lateral: cronologia e origem. */}
              <section className="space-y-2">
                <div className="rounded-xl border border-border/60 bg-card/60 p-3">
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Cronologia</h2>
                  <ol className="space-y-1.5 text-xs">
                    <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" /><span className="text-foreground">Disparado</span><span className="ml-auto text-[11px] text-muted-foreground">{fmt(item.triggered_at)}</span></li>
                    <li className="flex items-center gap-2"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.acknowledged_at ? "bg-amber-500" : "bg-muted-foreground/40"}`} /><span className={item.acknowledged_at ? "text-foreground" : "text-muted-foreground/70"}>Reconhecido{item.acknowledged_by_name ? ` · ${item.acknowledged_by_name}` : ""}</span><span className="ml-auto text-[11px] text-muted-foreground">{fmt(item.acknowledged_at)}</span></li>
                    <li className="flex items-center gap-2"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.resolved_at ? "bg-emerald-500" : "bg-muted-foreground/40"}`} /><span className={item.resolved_at ? "text-foreground" : "text-muted-foreground/70"}>Resolvido{item.resolved_by_name ? ` · ${item.resolved_by_name}` : ""}</span><span className="ml-auto text-[11px] text-muted-foreground">{fmt(item.resolved_at)}</span></li>
                  </ol>
                </div>

                <div className="rounded-xl border border-border/60 bg-card/60 p-3">
                  <h2 className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground"><Activity size={12} /> Origem</h2>
                  <dl className="space-y-1 text-xs">
                    <Row icon={HeartPulse} label="Paciente" value={item.patient_name} />
                    <Row icon={Stethoscope} label="Programa" value={item.program_label} />
                    <Row icon={Cpu} label="Dispositivo" value={item.device_label} />
                  </dl>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={12} className="shrink-0 text-cyan-600 dark:text-cyan-400" />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto min-w-0 truncate font-medium text-foreground">{value?.trim() || "—"}</span>
    </div>
  );
}

function Block({ title, value, highlight, highlightTone }: { title: string; value?: string | null; highlight?: boolean; highlightTone?: "emerald" | "cyan" }) {
  const empty = !value?.trim();
  const tone = highlightTone === "emerald"
    ? "border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/20"
    : highlightTone === "cyan"
      ? "border-cyan-200/70 bg-cyan-50/50 dark:border-cyan-800/40 dark:bg-cyan-950/20"
      : highlight
        ? "border-rose-200/70 bg-rose-50/50 dark:border-rose-800/40 dark:bg-rose-950/20"
        : "border-border/60 bg-card/60";
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <p className={`whitespace-pre-wrap text-sm ${empty ? "text-muted-foreground/60" : "text-foreground"}`}>{empty ? "—" : value}</p>
    </div>
  );
}
