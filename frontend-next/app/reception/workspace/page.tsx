"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileText,
  Loader2,
  PauseCircle,
  PlayCircle,
  Receipt,
  RefreshCw,
  Stethoscope,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

// ── Types ─────────────────────────────────────────────────────────────────────

type QueueItem = {
  id: number;
  custom_id?: string;
  patient_name: string;
  patient_code?: string;
  priority: string;
  status: string;
  arrived_at: string;
  attendant?: string;
  request_code?: string;
  invoice_code?: string;
};

type Summary = {
  checkins_today: number;
  queue_size: number;
  in_care: number;
  new_patients: number;
  pending_requests: number;
  open_invoices: number;
  receipts_generated_today: number;
  received_today: number | string;
};

type WorkspaceData = {
  date: string;
  summary: Summary;
  queue: QueueItem[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtCurrency(val: number | string) {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return n.toLocaleString("pt-PT", { style: "currency", currency: "MZN" });
}

function waitingMinutes(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}min` : ""}`;
}

// ── Priority / Status visuals ─────────────────────────────────────────────────

const PRIORITY_CLS: Record<string, string> = {
  Urgente:      "border-red-300 bg-red-100 text-red-700 font-bold dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-400",
  Preferencial: "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400",
  Normal:       "border-border bg-muted text-muted-foreground",
};

const STATUS_META: Record<string, { cls: string; dot: string }> = {
  "Aguardando":       { dot: "bg-amber-400",   cls: "text-amber-700 dark:text-amber-400" },
  "Em atendimento":   { dot: "bg-blue-500",    cls: "text-blue-700 dark:text-blue-400" },
  "Req. criada":      { dot: "bg-violet-500",  cls: "text-violet-700 dark:text-violet-400" },
  "Fatura vinculada": { dot: "bg-indigo-500",  cls: "text-indigo-700 dark:text-indigo-400" },
};

function PriorityBadge({ priority }: { priority: string }) {
  const cls = PRIORITY_CLS[priority] ?? PRIORITY_CLS["Normal"];
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${cls}`}>
      {priority}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const m = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1 text-[11px]">
      <span className={`h-1.5 w-1.5 rounded-full ${m?.dot ?? "bg-border"}`} />
      <span className={m?.cls ?? "text-muted-foreground"}>{status}</span>
    </span>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, color, accent, href }: {
  icon: React.ElementType; label: string; value: string | number; color: string; accent: string; href?: string;
}) {
  const inner = (
    <div className={`relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/20 bg-white/25 px-4 py-3 pl-5 shadow-sm backdrop-blur-sm transition dark:bg-white/5 dark:border-white/10 ${href ? "hover:bg-white/35 dark:hover:bg-white/8 cursor-pointer" : ""}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}/10`}>
        <Icon size={16} className={color} />
      </span>
      <div>
        <div className={`text-xl font-bold leading-none ${color}`}>{value}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

// ── Page ──────────────────────────────────────────────────────────────────────

const POLL_MS = 30_000;

export default function ReceptionWorkspacePage() {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const fetchingRef = useRef(false);

  const load = useCallback(async (manual = false) => {
    if (fetchingRef.current && !manual) return;
    fetchingRef.current = true;
    try {
      if (manual) setLoading(true);
      setError(null);
      const res = await apiFetch<WorkspaceData>("/reception/workspace/", { clientCache: false });
      setData(res);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar.");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => { load(true); }, [load]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => load(), POLL_MS);
    return () => clearInterval(id);
  }, [paused, load]);

  const s = data?.summary;
  const queue = data?.queue ?? [];

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("reception")}>
      <div className="space-y-3">

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                <Stethoscope size={16} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">Workspace de recepção</h1>
                <p className="text-[11px] text-muted-foreground">
                  {data?.date ? new Date(data.date + "T00:00:00").toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" }) : "Hoje"}
                  {lastRefresh && <span className="ml-2 opacity-60">· actualizado {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPaused((p) => !p)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                {paused ? <><PlayCircle size={13} className="text-emerald-500" /> Retomar</> : <><PauseCircle size={13} /> Pausar</>}
              </button>
              <button type="button" onClick={() => load(true)} disabled={loading}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-50">
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              </button>
              <Link href="/reception/reception-checkins/new"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700">
                <UserPlus size={13} /> Novo check-in
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {/* KPIs */}
        {s && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard icon={Users}       label="Check-ins hoje"       value={s.checkins_today}             color="text-[var(--primary-600)] dark:text-[var(--primary-400)]" accent="bg-[var(--primary-600)]" href="/reception/reception-checkins" />
            <KpiCard icon={ClipboardList} label="Na fila"            value={s.queue_size}                 color="text-amber-600 dark:text-amber-400" accent="bg-amber-500" href="/reception/reception-checkins?status=AGUARD" />
            <KpiCard icon={Stethoscope} label="Em atendimento"       value={s.in_care}                    color="text-blue-600 dark:text-blue-400" accent="bg-blue-500" href="/reception/reception-checkins?status=ATEND" />
            <KpiCard icon={UserPlus}    label="Novos pacientes"      value={s.new_patients}               color="text-emerald-600 dark:text-emerald-400" accent="bg-emerald-500" href="/patients" />
            <KpiCard icon={FileText}    label="Requisições pendentes"       value={s.pending_requests}           color="text-violet-600 dark:text-violet-400" accent="bg-violet-500" href="/requests" />
            <KpiCard icon={AlertCircle} label="Faturas em aberto"    value={s.open_invoices}              color="text-orange-600 dark:text-orange-400" accent="bg-orange-500" href="/invoices" />
            <KpiCard icon={Receipt}     label="Recibos hoje"         value={s.receipts_generated_today}   color="text-indigo-600 dark:text-indigo-400" accent="bg-indigo-500" href="/receipts" />
            <KpiCard icon={DollarSign}  label="Recebido hoje"        value={fmtCurrency(s.received_today)} color="text-emerald-600 dark:text-emerald-400" accent="bg-emerald-500" href="/receipts" />
          </div>
        )}

        {/* Queue */}
        <div className="overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <UserCheck size={13} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
              <h2 className="text-xs font-semibold text-foreground">Fila activa</h2>
              {queue.length > 0 && (
                <span className="rounded-full bg-[var(--primary-600)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                  {queue.length}
                </span>
              )}
            </div>
            <Link href="/reception/reception-checkins"
              className="text-[11px] text-[var(--primary-600)] hover:underline dark:text-[var(--primary-400)]">
              Ver todos →
            </Link>
          </div>

          {loading && !data ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 size={15} className="animate-spin" /> Carregando...
            </div>
          ) : queue.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <CheckCircle2 size={24} className="text-emerald-500/50" />
              <p className="text-sm text-muted-foreground">Fila vazia — nenhum paciente aguardando.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {queue.map((item, idx) => (
                <Link key={item.id} href={`/reception/reception-checkins/${item.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-muted/30">

                  {/* Position */}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                    {idx + 1}
                  </span>

                  {/* Patient */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{item.patient_name}</span>
                      {item.patient_code && <span className="text-[10px] text-muted-foreground">{item.patient_code}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusDot status={item.status} />
                      {item.attendant && (
                        <span className="text-[10px] text-muted-foreground">· {item.attendant}</span>
                      )}
                    </div>
                  </div>

                  {/* Codes */}
                  <div className="hidden sm:flex items-center gap-1.5">
                    {item.request_code && (
                      <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-400">
                        {item.request_code}
                      </span>
                    )}
                    {item.invoice_code && (
                      <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400">
                        {item.invoice_code}
                      </span>
                    )}
                  </div>

                  {/* Priority + time */}
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <PriorityBadge priority={item.priority} />
                    <span className="text-[10px] text-muted-foreground">{fmtTime(item.arrived_at)} · {waitingMinutes(item.arrived_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
