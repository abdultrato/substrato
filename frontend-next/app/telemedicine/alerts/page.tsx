"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  MonitorOff,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Siren,
  Stethoscope,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type Alert = {
  id: number;
  custom_id?: string | null;
  patient_name?: string | null;
  device_label?: string | null;
  program_label?: string | null;
  alert_type?: string | null;
  severity?: string | null;
  status?: string | null;
  triggered_at?: string | null;
  acknowledged_at?: string | null;
  message?: string | null;
  recommended_action?: string | null;
};

const ACTIVE_STATUSES = new Set(["OPEN", "ACKNOWLEDGED", "ESCALATED"]);

const severityMeta: Record<string, { label: string; className: string; bar: string; icon: typeof Siren }> = {
  CRITICAL: { label: "Crítico", className: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/35 dark:text-rose-300", bar: "bg-rose-500", icon: Siren },
  HIGH: { label: "Alto", className: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/50 dark:bg-orange-950/30 dark:text-orange-300", bar: "bg-orange-500", icon: AlertTriangle },
  MEDIUM: { label: "Médio", className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300", bar: "bg-amber-500", icon: ShieldAlert },
  LOW: { label: "Baixo", className: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-300", bar: "bg-sky-500", icon: BellRing },
  INFO: { label: "Informativo", className: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300", bar: "bg-slate-400", icon: BellRing },
};

const typeMeta: Record<string, { label: string; icon: typeof Activity }> = {
  VITAL_THRESHOLD: { label: "Limiar vital", icon: Activity },
  MISSED_READING: { label: "Leitura em falta", icon: Clock3 },
  DEVICE_OFFLINE: { label: "Dispositivo offline", icon: MonitorOff },
  TRIAGE_RISK: { label: "Risco de triagem", icon: Stethoscope },
  OTHER: { label: "Outro alerta", icon: BellRing },
};

const statusLabel: Record<string, string> = {
  OPEN: "Aberto",
  ACKNOWLEDGED: "Reconhecido",
  ESCALATED: "Escalonado",
  RESOLVED: "Resolvido",
  DISMISSED: "Descartado",
};

function elapsed(value?: string | null) {
  if (!value) return "sem horário";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  if (minutes < 1440) return `há ${Math.floor(minutes / 60)}h`;
  return `há ${Math.floor(minutes / 1440)}d`;
}

export default function TelemedicineAlertsListPage() {
  const [items, setItems] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetchList<Alert>("/telemedicine/alert/", {
        page: 1,
        pageSize: 100,
        clientPaginate: true,
        clientCache: false,
      });
      setItems(response.items || []);
    } catch (err: any) {
      setError(err?.message || "Não foi possível carregar os alertas clínicos.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const acknowledge = useCallback(async (alert: Alert) => {
    setBusyId(alert.id);
    setError(null);
    try {
      await apiFetch(`/telemedicine/alert/${alert.id}/reconhecer/`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await load();
    } catch (err: any) {
      setError(err?.message || "Não foi possível reconhecer o alerta.");
    } finally {
      setBusyId(null);
    }
  }, [load]);

  const active = useMemo(() => items.filter((item) => ACTIVE_STATUSES.has(String(item.status))), [items]);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return items.filter((item) => {
      if (!showHistory && !ACTIVE_STATUSES.has(String(item.status))) return false;
      if (severity && item.severity !== severity) return false;
      return !term || [item.patient_name, item.custom_id, item.message, item.device_label, item.program_label]
        .filter(Boolean).join(" ").toLocaleLowerCase().includes(term);
    });
  }, [items, search, severity, showHistory]);

  const critical = active.filter((item) => item.severity === "CRITICAL").length;
  const escalated = active.filter((item) => item.status === "ESCALATED").length;
  const acknowledged = active.filter((item) => item.status === "ACKNOWLEDGED").length;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-[1500px] space-y-3 pb-4">
        <section className="relative overflow-hidden rounded-2xl border border-cyan-200/70 bg-gradient-to-br from-white/90 via-cyan-50/55 to-violet-50/60 p-4 shadow-sm backdrop-blur dark:border-cyan-900/45 dark:from-slate-950/90 dark:via-cyan-950/20 dark:to-violet-950/20">
          <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/20">
                <BellRing size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Central clínica remota</p>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Alertas de telemonitorização</h1>
                <p className="text-xs text-muted-foreground">Priorize intercorrências, reconheça sinais e acompanhe a conduta clínica.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="Ativos" value={active.length} icon={BellRing} tone="text-cyan-600" />
              <Metric label="Críticos" value={critical} icon={Siren} tone="text-rose-600" />
              <Metric label="Escalonados" value={escalated} icon={ShieldAlert} tone="text-orange-600" />
              <Metric label="Reconhecidos" value={acknowledged} icon={CheckCircle2} tone="text-emerald-600" />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/75 p-2 shadow-sm backdrop-blur sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar paciente, alerta ou dispositivo…" className="h-9 w-full rounded-lg border border-border bg-background/80 pl-9 pr-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15" />
          </div>
          <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="h-9 rounded-lg border border-border bg-background/80 px-3 text-sm outline-none focus:border-cyan-400">
            <option value="">Todas as gravidades</option>
            <option value="CRITICAL">Crítico</option><option value="HIGH">Alto</option><option value="MEDIUM">Médio</option><option value="LOW">Baixo</option><option value="INFO">Informativo</option>
          </select>
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground">
            <input type="checkbox" checked={showHistory} onChange={(event) => setShowHistory(event.target.checked)} className="accent-cyan-600" />
            Incluir histórico
          </label>
          <button type="button" onClick={load} title="Atualizar alertas" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-200 text-cyan-700 transition hover:bg-cyan-50 dark:border-cyan-800/60 dark:text-cyan-300 dark:hover:bg-cyan-950/30">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <Link href="/telemedicine/alerts/new" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-violet-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:from-cyan-700 hover:to-violet-700">
            <Plus size={15} /> Novo alerta
          </Link>
        </section>

        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/25 dark:text-rose-300">{error}</div> : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground"><Loader2 size={19} className="animate-spin" /> A atualizar a central de alertas…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 px-6 py-16 text-center dark:border-emerald-800/60 dark:bg-emerald-950/15">
            <CheckCircle2 className="mx-auto mb-3 text-emerald-600" size={30} />
            <h2 className="font-semibold text-foreground">Nenhum alerta nesta seleção</h2>
            <p className="mt-1 text-sm text-muted-foreground">A central não encontrou intercorrências com os filtros atuais.</p>
          </div>
        ) : (
          <div className="grid gap-2 xl:grid-cols-2">
            {filtered.map((alert) => <AlertCard key={alert.id} alert={alert} busy={busyId === alert.id} onAcknowledge={acknowledge} />)}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof BellRing; tone: string }) {
  return <div className="min-w-[108px] rounded-xl border border-white/70 bg-white/65 px-3 py-2 shadow-sm dark:border-white/10 dark:bg-slate-900/55">
    <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span><Icon size={14} className={tone} /></div>
    <p className={`mt-0.5 text-lg font-bold tabular-nums ${tone}`}>{value}</p>
  </div>;
}

function AlertCard({ alert, busy, onAcknowledge }: { alert: Alert; busy: boolean; onAcknowledge: (alert: Alert) => void }) {
  const severity = severityMeta[String(alert.severity)] || severityMeta.INFO;
  const kind = typeMeta[String(alert.alert_type)] || typeMeta.OTHER;
  const SeverityIcon = severity.icon;
  const TypeIcon = kind.icon;
  const active = ACTIVE_STATUSES.has(String(alert.status));

  return <article className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/85 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md dark:hover:border-cyan-700/70">
    <span className={`absolute inset-y-0 left-0 w-1 ${severity.bar}`} />
    <div className="p-3 pl-4">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${severity.className}`}><SeverityIcon size={17} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="truncate text-sm font-bold text-foreground">{alert.patient_name || "Paciente não identificado"}</h2>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${severity.className}`}><SeverityIcon size={10} />{severity.label}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{statusLabel[String(alert.status)] || alert.status || "Sem estado"}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-foreground/85">{alert.message || "Alerta clínico sem descrição."}</p>
          {alert.recommended_action ? <p className="mt-1 line-clamp-1 text-xs text-cyan-700 dark:text-cyan-300"><b>Conduta sugerida:</b> {alert.recommended_action}</p> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><TypeIcon size={12} /> {kind.label}</span>
        <span className="inline-flex items-center gap-1"><Clock3 size={12} /> {elapsed(alert.triggered_at)}</span>
        {alert.device_label ? <span className="inline-flex items-center gap-1"><Activity size={12} /> {alert.device_label}</span> : null}
        {alert.program_label ? <span className="inline-flex items-center gap-1"><User size={12} /> {alert.program_label}</span> : null}
        <span className="ml-auto font-mono text-[10px]">{alert.custom_id || `#${alert.id}`}</span>
      </div>
    </div>
    <div className="flex items-center justify-end gap-2 border-t border-border/50 bg-muted/20 px-3 py-2">
      {alert.status === "OPEN" ? <button type="button" disabled={busy} onClick={() => onAcknowledge(alert)} className="inline-flex h-7 items-center gap-1 rounded-md border border-cyan-200 bg-cyan-50 px-2.5 text-[11px] font-semibold text-cyan-700 transition hover:bg-cyan-100 disabled:opacity-50 dark:border-cyan-800/60 dark:bg-cyan-950/30 dark:text-cyan-300">{busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Reconhecer</button> : null}
      <Link href={`/telemedicine/alerts/${alert.id}`} className="inline-flex h-7 items-center gap-1 rounded-md bg-gradient-to-r from-cyan-600 to-violet-600 px-2.5 text-[11px] font-semibold text-white transition hover:from-cyan-700 hover:to-violet-700">
        {active ? "Avaliar alerta" : "Ver registo"} <ChevronRight size={12} />
      </Link>
    </div>
  </article>;
}
