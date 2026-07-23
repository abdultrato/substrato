"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FilePlus2,
  Loader2,
  RefreshCcw,
  Search,
  Server,
  TerminalSquare,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type PacsEvent = {
  id: number;
  custom_id?: string;
  study?: number | { id?: number };
  study_label?: string;
  equipment?: number | { id?: number };
  equipment_name?: string;
  event_type?: string;
  direction?: string;
  status?: string;
  external_system?: string;
  accession_number?: string;
  study_instance_uid?: string;
  message_control_id?: string;
  event_at?: string;
  error_message?: string;
  retry_count?: number;
};

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const EVENT_TYPE_LABELS: Record<string, string> = {
  WORKLIST_CREATE: "Criar worklist",
  WORKLIST_UPDATE: "Atualizar worklist",
  STUDY_SYNC: "Sincronizar estudo",
  STORE: "Armazenar imagem",
  QUERY: "Consultar PACS",
  RETRIEVE: "Recuperar imagem",
  REPORT_SEND: "Enviar laudo",
  ERROR: "Erro",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  SENT: "Enviado",
  ACKNOWLEDGED: "Confirmado",
  FAILED: "Falhou",
  IGNORED: "Ignorado",
};

const STATUS_STYLES: Record<string, { bar: string; badge: string }> = {
  PENDING: {
    bar: "bg-amber-500",
    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
  },
  SENT: {
    bar: "bg-sky-500",
    badge: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-300",
  },
  ACKNOWLEDGED: {
    bar: "bg-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  FAILED: {
    bar: "bg-rose-500",
    badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
  },
  IGNORED: {
    bar: "bg-slate-500",
    badge: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800/50 dark:bg-slate-950/30 dark:text-slate-300",
  },
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function shortUid(value?: string) {
  if (!value) return "Sem UID";
  return value.length > 26 ? `…${value.slice(-25)}` : value;
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-[112px] flex-none rounded-md border border-border/60 bg-background/45 px-2 py-1">
      <div className="mb-0.5 flex items-center gap-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        <Icon size={11} />
        {label}
      </div>
      <div className="truncate whitespace-nowrap text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}

function EventCard({ item }: { item: PacsEvent }) {
  const status = item.status || "PENDING";
  const style = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
  const inbound = item.direction === "INBOUND";
  const title = item.accession_number || item.study_label || item.custom_id || `Evento #${item.id}`;

  return (
    <Link
      href={`/radiology/pacs-events/${item.id}`}
      className={`${GLASS} group relative block overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${style.bar}`} />
      <div className="space-y-2 px-3 py-2 pl-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan-500/12 text-cyan-600 dark:text-cyan-300">
              <TerminalSquare size={17} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-300">
                {title}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {EVENT_TYPE_LABELS[item.event_type || ""] || item.event_type || "Evento"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
              {STATUS_LABELS[status] || status}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
              {inbound ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
              {inbound ? "Entrada" : "Saída"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1">
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Evento</p>
            <p className="truncate text-xs font-bold text-foreground">{formatDate(item.event_at)}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Tentativas</p>
            <p className="truncate text-xs font-bold text-foreground">{item.retry_count ?? 0}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Sistema</p>
            <p className="truncate text-xs font-bold text-foreground">{item.external_system || "—"}</p>
          </div>
        </div>

        <div className="space-y-1 border-t border-border/50 pt-1.5 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Server size={11} className="shrink-0" />
            <span className="truncate">{item.equipment_name || "Equipamento não associado"}</span>
          </div>
          {item.error_message ? (
            <div className="flex items-start gap-1.5 text-red-600 dark:text-red-300">
              <AlertTriangle size={11} className="mt-0.5 shrink-0" />
              <span className="line-clamp-2">{item.error_message}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Activity size={11} className="shrink-0" />
              <span className="truncate font-mono">{shortUid(item.study_instance_uid)}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function RadiologyPacsEventsListPage() {
  useAuthGuard();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<PacsEvent[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [eventType, setEventType] = useState("ALL");
  const [onlyFailed, setOnlyFailed] = useState(false);
  const [limit, setLimit] = useState(12);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await apiFetchList<PacsEvent>("/radiology/pacs_event/", {
          page: 1,
          pageSize: 500,
          clientPaginate: true,
          clientCache: safeRefreshToken === 0,
        });
        if (!mounted) return;
        setEvents(response.items || []);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Falha ao carregar os eventos PACS.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [safeRefreshToken]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return events.filter((item) => {
      if (status !== "ALL" && item.status !== status) return false;
      if (eventType !== "ALL" && item.event_type !== eventType) return false;
      if (onlyFailed && item.status !== "FAILED") return false;
      if (!term) return true;
      return [
        item.custom_id,
        item.accession_number,
        item.study_label,
        item.equipment_name,
        item.message_control_id,
        item.study_instance_uid,
        item.external_system,
        item.error_message,
      ].some((value) => String(value || "").toLowerCase().includes(term));
    });
  }, [eventType, events, onlyFailed, search, status]);

  const visible = filtered.slice(0, limit);

  const failedCount = events.filter((item) => item.status === "FAILED").length;
  const pendingCount = events.filter((item) => item.status === "PENDING").length;
  const ackCount = events.filter((item) => item.status === "ACKNOWLEDGED").length;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RADIOLOGIA]}>
      <div className="w-full space-y-1.5 px-0.5">
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-cyan-500" />
          <div className="space-y-1.5 px-2.5 py-1.5 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan-500/12 text-cyan-600 dark:text-cyan-300">
                  <TerminalSquare size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">Eventos PACS</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {loading ? "A carregar..." : `${visible.length} de ${filtered.length} eventos`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Link href="/radiology" className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
                  <ArrowLeft size={13} />
                  Voltar
                </Link>
                <Link href="/radiology/pacs-events/new" className="inline-flex h-7 items-center gap-1 rounded-md border border-cyan-400/50 bg-cyan-500/15 px-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-500/20 dark:text-cyan-200">
                  <FilePlus2 size={13} />
                  Novo evento
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 xl:flex-row xl:items-center">
              <div className="flex flex-1 flex-nowrap gap-1 overflow-x-auto">
                <MetricCard icon={Activity} label="Eventos" value={events.length} />
                <MetricCard icon={CheckCircle2} label="Confirmados" value={ackCount} />
                <MetricCard icon={Clock3} label="Pendentes" value={pendingCount} />
                <MetricCard icon={AlertTriangle} label="Falhas" value={failedCount} />
              </div>
              <div className="flex min-w-0 gap-1.5 overflow-x-auto xl:w-[700px]">
                <div className="relative min-w-[190px] flex-1">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Pesquisar..."
                    className="h-7 w-full rounded-md border border-border bg-background/70 pl-8 pr-8 text-xs text-foreground outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  />
                  {search ? (
                    <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Limpar pesquisa">
                      <X size={12} />
                    </button>
                  ) : null}
                </div>
                <label className="w-16 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={limit}
                    onChange={(event) => setLimit(Math.min(500, Math.max(1, Number(event.target.value || 1))))}
                    className="h-7 w-full rounded-md border border-border bg-background/70 px-2 text-center text-xs font-semibold text-foreground outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                    aria-label="Quantidade de eventos a exibir"
                  />
                </label>
                <select
                  value={eventType}
                  onChange={(event) => setEventType(event.target.value)}
                  className="h-7 max-w-36 rounded-md border border-border bg-background/70 px-2 text-xs font-semibold text-foreground outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  aria-label="Filtrar por tipo de evento"
                >
                  <option value="ALL">Todos os tipos</option>
                  {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="h-7 max-w-32 rounded-md border border-border bg-background/70 px-2 text-xs font-semibold text-foreground outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  aria-label="Filtrar por estado do evento"
                >
                  <option value="ALL">Todos os estados</option>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setOnlyFailed((previous) => !previous)}
                  aria-pressed={onlyFailed}
                  className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-xs font-semibold transition ${
                    onlyFailed
                      ? "border-red-400/60 bg-red-500/15 text-red-700 dark:text-red-300"
                      : "border-border bg-background/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <AlertTriangle size={12} />
                  Falhas
                </button>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className={`${GLASS} flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground`}>
            <Loader2 size={19} className="animate-spin" />
            A carregar eventos...
          </div>
        ) : visible.length === 0 ? (
          <section className={`${GLASS} flex min-h-36 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground`}>
            <RefreshCcw size={25} className="opacity-60" />
            <span>Nenhum evento corresponde aos filtros.</span>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-4">
            {visible.map((item) => (
              <EventCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
