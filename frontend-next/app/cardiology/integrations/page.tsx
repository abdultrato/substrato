"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  HeartPulse,
  Loader2,
  RefreshCw,
  Search,
  ServerCog,
  XCircle,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import PageSizeInput from "@/components/ui/PageSizeInput";
import useDebounce from "@/hooks/useDebounce";
import { apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const REQUIRED_GROUPS = [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.CARDIOLOGIA];

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const STATUS_META: Record<string, { label: string; bar: string; chip: string; Icon: typeof Clock3 }> = {
  PENDING: {
    label: "Pendente",
    bar: "bg-amber-500",
    chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
    Icon: Clock3,
  },
  SENT: {
    label: "Enviado",
    bar: "bg-blue-500",
    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300",
    Icon: ArrowUpRight,
  },
  ACKNOWLEDGED: {
    label: "Confirmado",
    bar: "bg-emerald-500",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
  FAILED: {
    label: "Falhou",
    bar: "bg-rose-500",
    chip: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
    Icon: XCircle,
  },
  IGNORED: {
    label: "Ignorado",
    bar: "bg-slate-400",
    chip: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/50 dark:bg-slate-900/30 dark:text-slate-300",
    Icon: AlertTriangle,
  },
};

const STATUS_FILTERS = [
  { value: "", label: "Estado: todos" },
  { value: "PENDING", label: "Pendente" },
  { value: "SENT", label: "Enviado" },
  { value: "ACKNOWLEDGED", label: "Confirmado" },
  { value: "FAILED", label: "Falhou" },
  { value: "IGNORED", label: "Ignorado" },
];

const EVENT_LABELS: Record<string, string> = {
  WORKLIST_CREATE: "Criar worklist",
  WORKLIST_UPDATE: "Atualizar worklist",
  DEVICE_IMPORT: "Importar equipamento",
  RESULT_SYNC: "Sincronizar resultado",
  REPORT_SEND: "Enviar laudo",
  ERROR: "Erro",
};

const DIRECTION_LABELS: Record<string, string> = {
  OUTBOUND: "Saída",
  INBOUND: "Entrada",
};

type IntegrationEvent = {
  id: number;
  custom_id?: string;
  order?: number | null;
  order_label?: string;
  equipment?: number | null;
  equipment_name?: string;
  event_type?: string;
  direction?: string;
  status?: string;
  external_system?: string;
  order_number?: string;
  external_order_id?: string;
  message_control_id?: string;
  event_at?: string | null;
  error_message?: string;
  retry_count?: number;
};

function fmtDatetime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function eventLabel(value?: string) {
  return EVENT_LABELS[value || ""] || value || "-";
}

function directionLabel(value?: string) {
  return DIRECTION_LABELS[value || ""] || value || "-";
}

function eventTitle(item: IntegrationEvent) {
  return item.order_label || item.order_number || item.external_order_id || item.custom_id || `Evento #${item.id}`;
}

function Metric({
  label,
  value,
  tone = "slate",
  active,
  onClick,
}: {
  label: string;
  value: number | string;
  tone?: "slate" | "emerald" | "amber" | "rose" | "blue";
  active?: boolean;
  onClick: () => void;
}) {
  const tones = {
    slate: "border-l-slate-500 bg-slate-500/5",
    emerald: "border-l-emerald-500 bg-emerald-500/5",
    amber: "border-l-amber-500 bg-amber-500/5",
    rose: "border-l-rose-500 bg-rose-500/5",
    blue: "border-l-blue-500 bg-blue-500/5",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 rounded-md border border-border/60 border-l-2 px-2 py-1 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${tones[tone]} ${
        active ? "ring-2 ring-rose-500/30" : ""
      }`}
    >
      <div className="whitespace-nowrap text-[10px] font-medium text-muted-foreground">{label}</div>
      <div className="whitespace-nowrap text-sm font-bold text-foreground">{value}</div>
    </button>
  );
}

function IntegrationCard({ item }: { item: IntegrationEvent }) {
  const meta = STATUS_META[item.status || ""] || STATUS_META.PENDING;
  const Icon = meta.Icon;
  const DirectionIcon = item.direction === "INBOUND" ? ArrowDownLeft : ArrowUpRight;

  return (
    <Link
      href={`/cardiology/integrations/${item.id}/`}
      className={`group relative block overflow-hidden ${GLASS} transition hover:border-rose-500/30 hover:bg-white/40 hover:shadow-md dark:hover:bg-white/[0.07]`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${meta.bar}`} />
      <div className="space-y-1 px-2 py-1.5 pl-3">
        <div className="flex flex-wrap items-start justify-between gap-1.5 sm:flex-nowrap">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-300">
              <Icon size={12} />
            </span>
            <div className="min-w-0">
              <p className="break-words text-[11px] font-bold leading-tight text-foreground group-hover:text-rose-500 md:truncate">
                {eventTitle(item)}
              </p>
              <p className="break-all font-mono text-[9px] leading-tight text-muted-foreground md:truncate">
                {item.custom_id || `SDI-${item.id}`} · {item.message_control_id || "sem mensagem"}
              </p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-semibold leading-none ${meta.chip}`}>
            {meta.label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1 text-[9px] text-muted-foreground md:flex-nowrap">
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-rose-200 bg-rose-50 px-1 py-0.5 font-semibold leading-none text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300">
            <HeartPulse size={9} /> {eventLabel(item.event_type)}
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-border px-1 py-0.5 leading-none">
            <DirectionIcon size={9} /> {directionLabel(item.direction)}
          </span>
          <span className="min-w-0 break-words md:truncate">{item.external_system || "Sistema externo não definido"}</span>
        </div>

        <div className="grid grid-cols-1 gap-1 border-t border-border/40 pt-1 text-[9px] leading-tight min-[360px]:grid-cols-3">
          <div className="min-w-0">
            <div className="text-muted-foreground">Evento</div>
            <div className="break-words font-medium text-foreground md:truncate">{fmtDatetime(item.event_at)}</div>
          </div>
          <div className="min-w-0">
            <div className="text-muted-foreground">Equipamento</div>
            <div className="break-words font-medium text-foreground md:truncate">{item.equipment_name || "-"}</div>
          </div>
          <div className="min-w-0 min-[360px]:text-right">
            <div className="text-muted-foreground">Tentativas</div>
            <div className="font-medium text-foreground">{item.retry_count ?? 0}</div>
          </div>
        </div>

        {item.error_message ? (
          <div className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] leading-tight text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300">
            <span className="font-semibold">Erro: </span>
            <span className="break-words">{item.error_message}</span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export default function CardiologyIntegrationsListPage() {
  const [items, setItems] = useState<IntegrationEvent[]>([]);
  const [metricRows, setMetricRows] = useState<IntegrationEvent[]>([]);
  const [metricTotal, setMetricTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [quickFilter, setQuickFilter] = useState<"TOTAL" | "PENDING" | "FAILED" | "ACK" | "OUTBOUND">("TOTAL");
  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (debouncedSearch.trim()) query.search = debouncedSearch.trim();
      if (status) query.status = status;

      const { items: rows, meta } = await apiFetchList<IntegrationEvent>("/specialty_diagnostics/integration_event/", {
        page: 1,
        pageSize: 999,
        query,
      });
      const cardiologyRows = rows.filter((item) => item.order || item.equipment || item.order_label || item.order_number);
      setMetricRows(cardiologyRows);
      setMetricTotal(meta.total ?? cardiologyRows.length);
      const filtered = cardiologyRows.filter((item) => {
        if (quickFilter === "PENDING") return item.status === "PENDING";
        if (quickFilter === "FAILED") return item.status === "FAILED";
        if (quickFilter === "ACK") return item.status === "ACKNOWLEDGED";
        if (quickFilter === "OUTBOUND") return item.direction === "OUTBOUND";
        return true;
      });
      const start = (page - 1) * pageSize;
      setItems(filtered.slice(start, start + pageSize));
      setTotal(quickFilter === "TOTAL" && !status ? meta.total ?? filtered.length : filtered.length);
    } catch {
      setItems([]);
      setMetricRows([]);
      setMetricTotal(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, pageSize, quickFilter, status]);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(() => {
    const pending = metricRows.filter((item) => item.status === "PENDING").length;
    const failed = metricRows.filter((item) => item.status === "FAILED").length;
    const acknowledged = metricRows.filter((item) => item.status === "ACKNOWLEDGED").length;
    const outbound = metricRows.filter((item) => item.direction === "OUTBOUND").length;
    return { pending, failed, acknowledged, outbound };
  }, [metricRows]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const applyQuickFilter = (next: typeof quickFilter) => {
    setQuickFilter(next);
    setStatus("");
    setPage(1);
  };

  return (
    <AppLayout requiredGroups={REQUIRED_GROUPS}>
      <div className="mx-auto w-full max-w-[97vw] space-y-2 px-1">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-rose-500" />
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 pl-5 xl:flex-nowrap">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/20">
              <ServerCog size={16} />
            </span>
            <div className="min-w-[9rem] flex-1 xl:flex-none">
              <h1 className="break-words text-base font-bold leading-tight text-foreground xl:truncate">Integrações cardiológicas</h1>
              <p className="whitespace-nowrap text-[11px] text-muted-foreground">
                {loading ? "A carregar..." : `${total} evento${total !== 1 ? "s" : ""}`}
              </p>
            </div>

            <Link
              href="/cardiology/"
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2.5 text-xs font-medium text-muted-foreground backdrop-blur-sm transition hover:bg-white/20 hover:text-foreground"
            >
              <ArrowLeft size={13} /> Voltar
            </Link>

            <div className="relative min-w-full flex-1 sm:min-w-[13rem]">
              <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Pesquisar exame, mensagem, erro..."
                className="h-8 w-full rounded-md border border-border bg-background/60 pl-7 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              />
            </div>

            <select
              aria-label="Estado da integração"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setQuickFilter("TOTAL");
                setPage(1);
              }}
              className={`h-8 w-40 shrink-0 rounded-md border border-border bg-background/60 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/40 ${status ? "text-foreground" : "text-muted-foreground"}`}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={load}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-border bg-background/60 px-2 text-xs font-medium text-foreground transition hover:bg-muted"
            >
              <RefreshCw size={13} /> Actualizar
            </button>

            <div className="inline-flex h-8 shrink-0 items-center gap-1" title="Eventos por página">
              <PageSizeInput
                value={pageSize}
                onChange={(value) => {
                  setPageSize(value);
                  setPage(1);
                }}
                ariaLabel="Eventos por página"
              />
              <span className="whitespace-nowrap text-xs text-muted-foreground">/pág</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 border-t border-white/20 px-3 py-2 pl-5 min-[520px]:grid-cols-3 md:grid-cols-5 dark:border-white/10">
            <Metric label="Total" value={loading ? "..." : metricTotal} tone="slate" active={quickFilter === "TOTAL" && !status} onClick={() => applyQuickFilter("TOTAL")} />
            <Metric label="Pendentes" value={loading ? "..." : metrics.pending} tone="amber" active={quickFilter === "PENDING"} onClick={() => applyQuickFilter("PENDING")} />
            <Metric label="Falhas" value={loading ? "..." : metrics.failed} tone="rose" active={quickFilter === "FAILED"} onClick={() => applyQuickFilter("FAILED")} />
            <Metric label="Confirmados" value={loading ? "..." : metrics.acknowledged} tone="emerald" active={quickFilter === "ACK"} onClick={() => applyQuickFilter("ACK")} />
            <Metric label="Saída" value={loading ? "..." : metrics.outbound} tone="blue" active={quickFilter === "OUTBOUND"} onClick={() => applyQuickFilter("OUTBOUND")} />
          </div>
        </section>

        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <section className={`relative overflow-hidden ${GLASS}`}>
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                <ServerCog size={22} />
              </span>
              <p className="text-sm font-medium text-foreground">Nenhum evento de integração encontrado</p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                Os eventos aparecem quando worklists, equipamentos, resultados ou laudos trocam mensagens com sistemas externos.
              </p>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-4 2xl:grid-cols-6">
            {items.map((item) => (
              <IntegrationCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">
              Página {page} de {totalPages} · {total} eventos
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card transition hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card transition hover:bg-muted disabled:opacity-40"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
