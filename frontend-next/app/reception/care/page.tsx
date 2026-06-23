"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ClipboardList,
  Clock,
  FlaskConical,
  Pause,
  Play,
  Stethoscope,
  UserCheck,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

// ── Types ─────────────────────────────────────────────────────────────────────

type EventKind = "checkin" | "consultation" | "request";

type ActivityEvent = {
  key: string;
  kind: EventKind;
  patient_name: string;
  timestamp: string; // ISO
  label: string;
  sub?: string;
  status?: string;
  id: number;
  href?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const KIND_META: Record<EventKind, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  checkin:      { icon: UserCheck,    color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-100 dark:bg-amber-900/30",   label: "Check-in" },
  consultation: { icon: Stethoscope,  color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-100 dark:bg-blue-900/30",    label: "Consulta" },
  request:      { icon: FlaskConical, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-100 dark:bg-violet-900/30", label: "Requisição" },
};

// Badge: "tipo de serviço · estado" — pill visual
const EVENT_BADGE: Record<string, { text: string; cls: string }> = {
  // checkin statuses
  AGUARD: { text: "aguardando",      cls: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400" },
  ATEND:  { text: "em atendimento",  cls: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-400" },
  REQ:    { text: "req. criada",     cls: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-400" },
  FAT:    { text: "faturado",        cls: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-400" },
  CONC:   { text: "concluído",       cls: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-400" },
  CANC:   { text: "cancelado",       cls: "border-red-300 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-400" },
  // consultation statuses
  MARCADA:   { text: "marcada",      cls: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400" },
  CONCLUIDA: { text: "realizada",    cls: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-400" },
  CANCELADA: { text: "cancelada",    cls: "border-red-300 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-400" },
  // lab request clinical statuses
  URGENTE:       { text: "urgente",       cls: "border-red-300 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-400" },
  EMERGENCIA:    { text: "emergência",    cls: "border-red-400 bg-red-100 text-red-800 dark:border-red-600/40 dark:bg-red-900/30 dark:text-red-300" },
  MUITO_URGENTE: { text: "muito urgente", cls: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-400" },
  PRIORITARIO:   { text: "prioritário",   cls: "border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700/40 dark:bg-yellow-900/20 dark:text-yellow-400" },
  NORMAL:        { text: "normal",        cls: "border-border bg-muted text-muted-foreground" },
  ROTINA:        { text: "rotina",        cls: "border-border bg-muted text-muted-foreground" },
  NAO_URGENTE:   { text: "não urgente",   cls: "border-border bg-muted text-muted-foreground" },
};

function EventBadge({ kind, status }: { kind: EventKind; status?: string }) {
  const kindLabel = KIND_META[kind].label;
  const statusInfo = status ? EVENT_BADGE[status] : null;
  return (
    <span className={`inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${statusInfo?.cls ?? "border-border bg-muted text-muted-foreground"}`}>
      {kindLabel}
      {statusInfo ? <><span className="opacity-50">·</span>{statusInfo.text}</> : null}
    </span>
  );
}

function fmtTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function fmtDateTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString([], { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function mostRecentTs(...dates: (string | undefined)[]): string {
  const valid = dates.filter(Boolean).map((s) => new Date(s!).getTime()).filter((n) => !isNaN(n));
  if (!valid.length) return "";
  return new Date(Math.max(...valid)).toISOString();
}

// ── Data fetching & normalization ─────────────────────────────────────────────

async function fetchEvents(): Promise<ActivityEvent[]> {
  const [checkinRes, consultRes, reqRes] = await Promise.allSettled([
    apiFetch<any>("/reception/checkin/?ordering=-arrived_at&page_size=500", { clientCache: false }),
    apiFetch<any>("/consultations/?ordering=-scheduled_for&page_size=500", { clientCache: false }),
    apiFetch<any>("/clinical/labrequest/?ordering=-created_at&page_size=500", { clientCache: false }),
  ]);

  const list = (r: PromiseSettledResult<any>) =>
    r.status === "fulfilled"
      ? Array.isArray(r.value) ? r.value : (r.value?.results ?? [])
      : [];

  const events: ActivityEvent[] = [];

  for (const c of list(checkinRes)) {
    events.push({
      key: `checkin-${c.id}`,
      kind: "checkin",
      patient_name: c.patient_name || `Paciente #${c.patient ?? c.id}`,
      timestamp: mostRecentTs(c.completed_at, c.called_at, c.arrived_at),
      label: c.status_display || c.status || "Check-in",
      sub: c.reason || undefined,
      status: c.status,
      id: c.id,
      href: `/reception/care/${c.id}`,
    });
  }

  for (const c of list(consultRes)) {
    events.push({
      key: `consultation-${c.id}`,
      kind: "consultation",
      patient_name: c.patient_name || `Paciente #${c.patient ?? c.id}`,
      timestamp: mostRecentTs(c.scheduled_for, c.created_at),
      label: c.specialty_name || c.type || "Consulta",
      sub: c.doctor_name ? `Dr. ${c.doctor_name}` : undefined,
      status: c.status,
      id: c.id,
      href: `/consultations`,
    });
  }

  for (const r of list(reqRes)) {
    events.push({
      key: `request-${r.id}`,
      kind: "request",
      patient_name: r.patient_name || `Paciente #${r.patient ?? r.id}`,
      timestamp: mostRecentTs(r.updated_at, r.created_at),
      label: r.custom_id || "Requisição de exames",
      sub: r.clinical_status_display || r.clinical_status || undefined,
      status: r.clinical_status,
      id: r.id,
      href: `/requests/${r.id}`,
    });
  }

  // Sort: most recent first
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return events.slice(0, 500);
}

// Group by patient, most recent activity first
function groupByPatient(events: ActivityEvent[]): Array<{ name: string; events: ActivityEvent[] }> {
  const map = new Map<string, ActivityEvent[]>();
  for (const e of events) {
    const key = e.patient_name;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  // Each group already sorted since source is sorted. Sort groups by their most recent event.
  return Array.from(map.entries())
    .map(([name, evs]) => ({ name, events: evs }))
    .sort((a, b) => new Date(b.events[0].timestamp).getTime() - new Date(a.events[0].timestamp).getTime());
}

// ── Row components ────────────────────────────────────────────────────────────

function FeedRow({ event, idx }: { event: ActivityEvent; idx: number }) {
  const meta = KIND_META[event.kind];
  const Icon = meta.icon;
  const isNew = idx < 5;

  return (
    <div className={`flex items-start gap-2 border-b border-border/30 px-3 py-1.5 text-xs transition-colors ${isNew ? "bg-violet-50/40 dark:bg-violet-900/10" : ""}`}>
      {/* Time */}
      <span className="w-14 shrink-0 font-mono text-[10px] text-muted-foreground pt-0.5">
        {fmtTime(event.timestamp)}
      </span>

      {/* Kind icon */}
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${meta.bg} ${meta.color}`}>
        <Icon size={10} />
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-foreground truncate">{event.patient_name}</span>
          <EventBadge kind={event.kind} status={event.status} />
          {event.href ? (
            <Link href={event.href} className="truncate text-muted-foreground hover:text-foreground hover:underline">
              {event.label}
            </Link>
          ) : (
            <span className="truncate text-muted-foreground">{event.label}</span>
          )}
        </div>
        {event.sub ? <div className="text-[10px] text-muted-foreground truncate">{event.sub}</div> : null}
      </div>
    </div>
  );
}

function PatientCard({ group }: { group: { name: string; events: ActivityEvent[] } }) {
  const latest = group.events[0];
  const meta = KIND_META[latest.kind];
  const Icon = meta.icon;

  return (
    <div className="rounded-lg border border-border/60 p-2.5">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs font-semibold text-foreground truncate">{group.name}</span>
        <span className="text-[10px] text-muted-foreground shrink-0">{fmtDateTime(latest.timestamp)}</span>
      </div>
      <div className="space-y-1">
        {group.events.slice(0, 5).map((e) => {
          const m = KIND_META[e.kind];
          const EIcon = m.icon;
          return (
            <div key={e.key} className="flex items-center gap-1.5 text-[11px]">
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${m.bg} ${m.color}`}>
                <EIcon size={8} />
              </span>
              <EventBadge kind={e.kind} status={e.status} />
              {e.href ? (
                <Link href={e.href} className="truncate text-muted-foreground hover:text-foreground hover:underline">
                  {e.label}
                </Link>
              ) : (
                <span className="truncate text-muted-foreground">{e.label}</span>
              )}
              <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground/60">{fmtTime(e.timestamp)}</span>
            </div>
          );
        })}
        {group.events.length > 5 ? (
          <div className="text-[10px] text-muted-foreground pl-5">+{group.events.length - 5} eventos</div>
        ) : null}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReceptionCarePage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [tickCount, setTickCount] = useState(0);
  const fetchingRef = useRef(false);
  const pausedRef = useRef(false);

  pausedRef.current = paused;

  const refresh = useCallback(async (initial = false) => {
    if (fetchingRef.current) return;
    if (pausedRef.current && !initial) return;
    fetchingRef.current = true;
    try {
      if (initial) setLoading(true);
      const data = await fetchEvents();
      setEvents(data);
      setError(null);
      setTickCount((n) => n + 1);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar.");
    } finally {
      fetchingRef.current = false;
      if (initial) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { refresh(true); }, [refresh]);

  // 0.5s polling
  useEffect(() => {
    const id = setInterval(() => refresh(false), 500);
    return () => clearInterval(id);
  }, [refresh]);

  const grouped = groupByPatient(events);

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("reception")}>
      <div className="flex h-[calc(100vh-7rem)] flex-col gap-3">

        {/* Header */}
        <div className="relative shrink-0 overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-2.5 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                <Activity size={14} />
              </span>
              <div>
                <h1 className="text-base font-bold leading-tight text-foreground">Monitor em tempo real</h1>
                <p className="text-[11px] text-muted-foreground">
                  {events.length} eventos · {grouped.length} pacientes
                  {!paused && <span className="ml-1.5 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />ao vivo</span>}
                  {paused && <span className="ml-1.5 text-amber-600 dark:text-amber-400">pausado</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full ${KIND_META.checkin.bg} ${KIND_META.checkin.color}`}><UserCheck size={10} /></span> Check-in
                <span className={`ml-2 flex h-5 w-5 items-center justify-center rounded-full ${KIND_META.consultation.bg} ${KIND_META.consultation.color}`}><Stethoscope size={10} /></span> Consulta
                <span className={`ml-2 flex h-5 w-5 items-center justify-center rounded-full ${KIND_META.request.bg} ${KIND_META.request.color}`}><FlaskConical size={10} /></span> Requisição
              </div>

              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className={`inline-flex h-7 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${paused ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-400" : "border-border bg-card text-foreground hover:bg-muted"}`}
              >
                {paused ? <><Play size={11} /> Retomar</> : <><Pause size={11} /> Pausar</>}
              </button>

              <Link
                href="/reception/care/new"
                className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700"
              >
                <UserCheck size={11} />
                Novo check-in
              </Link>
            </div>
          </div>
        </div>

        {error ? (
          <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {/* Two-column layout */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">

          {/* Left: chronological feed */}
          <div className="flex flex-col overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
            <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                <ClipboardList size={11} />
              </span>
              <span className="text-xs font-semibold text-foreground">Feed de eventos</span>
              <span className="ml-auto text-[10px] text-muted-foreground font-mono">{events.length} reg.</span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Clock size={16} className="mr-2 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Carregando...</span>
                </div>
              ) : events.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Activity size={24} className="text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">Sem actividade registada.</p>
                </div>
              ) : (
                events.map((e, i) => <FeedRow key={e.key} event={e} idx={i} />)
              )}
            </div>
          </div>

          {/* Right: grouped by patient */}
          <div className="flex flex-col overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
            <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                <UserCheck size={11} />
              </span>
              <span className="text-xs font-semibold text-foreground">Por paciente</span>
              <span className="ml-auto text-[10px] text-muted-foreground font-mono">{grouped.length} pacientes</span>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-lg border border-border/40 bg-muted/30" />
                  ))}
                </div>
              ) : grouped.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <UserCheck size={24} className="text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">Nenhum paciente activo.</p>
                </div>
              ) : (
                grouped.map((g) => <PatientCard key={g.name} group={g} />)
              )}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
