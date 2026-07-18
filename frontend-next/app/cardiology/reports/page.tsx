"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileEdit,
  FileText,
  HeartPulse,
  Loader2,
  Plus,
  Search,
  Stethoscope,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import PageSizeInput from "@/components/ui/PageSizeInput";
import useDebounce from "@/hooks/useDebounce";
import { apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const REQUIRED_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.RECEPCAO,
  GROUPS.MEDICINA,
  GROUPS.CARDIOLOGIA,
];

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const STATUS_META: Record<string, { label: string; bar: string; chip: string; Icon: typeof FileText }> = {
  DRAFT: {
    label: "Rascunho",
    bar: "bg-slate-400",
    chip: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/50 dark:bg-slate-900/30 dark:text-slate-300",
    Icon: FileEdit,
  },
  PRELIMINARY: {
    label: "Preliminar",
    bar: "bg-amber-500",
    chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
    Icon: ClipboardCheck,
  },
  FINAL: {
    label: "Final",
    bar: "bg-emerald-500",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
  AMENDED: {
    label: "Retificado",
    bar: "bg-blue-500",
    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300",
    Icon: FileText,
  },
  CANCELLED: {
    label: "Cancelado",
    bar: "bg-rose-500",
    chip: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
    Icon: AlertTriangle,
  },
};

const STATUS_FILTERS = [
  { value: "", label: "Estado: todos" },
  { value: "DRAFT", label: "Rascunho" },
  { value: "PRELIMINARY", label: "Preliminar" },
  { value: "FINAL", label: "Final" },
  { value: "AMENDED", label: "Retificado" },
  { value: "CANCELLED", label: "Cancelado" },
];

const MODALITY_LABELS: Record<string, string> = {
  ECG: "ECG",
  ECHOCARDIOGRAM: "Ecocardiograma",
  EXERCISE_TEST: "Teste ergométrico",
  HOLTER: "Holter",
  AMBULATORY_BP: "MAPA",
  OTHER: "Outra",
};

type CardiologyReport = {
  id: number;
  custom_id?: string;
  order?: number;
  order_label?: string;
  patient_name?: string;
  specialty?: string;
  modality?: string;
  specialist_name?: string;
  status?: string;
  version_number?: number;
  reported_at?: string | null;
  signed_at?: string | null;
  technique?: string;
  findings?: string;
  impression?: string;
  recommendations?: string;
  critical_result?: boolean;
  critical_notified_at?: string | null;
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

function reportTitle(item: CardiologyReport) {
  return item.patient_name || item.order_label || item.custom_id || `Laudo #${item.id}`;
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

function ReportCard({ item }: { item: CardiologyReport }) {
  const meta = STATUS_META[item.status || ""] || STATUS_META.DRAFT;
  const Icon = meta.Icon;
  const modality = MODALITY_LABELS[item.modality || ""] || item.modality || "Cardiologia";
  const summary = item.impression || item.findings || item.recommendations || item.technique || "Sem conclusão registada.";

  return (
    <Link
      href={`/cardiology/reports/${item.id}`}
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
                {reportTitle(item)}
              </p>
              <p className="break-all font-mono text-[9px] leading-tight text-muted-foreground md:truncate">
                {item.custom_id || `SDR-${item.id}`} · {item.order_label || `Exame #${item.order || "-"}`}
              </p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-semibold leading-none ${meta.chip}`}>
            {meta.label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1 text-[9px] text-muted-foreground md:flex-nowrap">
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-rose-200 bg-rose-50 px-1 py-0.5 font-semibold leading-none text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300">
            <HeartPulse size={9} /> {modality}
          </span>
          <span className="min-w-0 break-words md:truncate">
            <Stethoscope size={9} className="mr-0.5 inline" />
            {item.specialist_name || "Especialista não definido"}
          </span>
        </div>

        <p className="break-words text-[10px] leading-3 text-muted-foreground md:truncate" title={summary}>
          {summary}
        </p>

        <div className="grid grid-cols-1 gap-1 border-t border-border/40 pt-1 text-[9px] leading-tight min-[360px]:grid-cols-3">
          <div className="min-w-0">
            <div className="text-muted-foreground">Laudado</div>
            <div className="break-words font-medium text-foreground md:truncate">{fmtDatetime(item.reported_at)}</div>
          </div>
          <div className="min-w-0">
            <div className="text-muted-foreground">Assinado</div>
            <div className="break-words font-medium text-foreground md:truncate">{fmtDatetime(item.signed_at)}</div>
          </div>
          <div className="min-w-0 min-[360px]:text-right">
            <div className="text-muted-foreground">Versão</div>
            <div className="font-medium text-foreground">v{item.version_number || 1}</div>
          </div>
        </div>

        {item.critical_result ? (
          <div className="flex flex-wrap items-center justify-between gap-1 rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] leading-tight text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300 sm:flex-nowrap">
            <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold">
              <AlertTriangle size={10} /> Crítico
            </span>
            <span className="min-w-0 break-words md:truncate">{item.critical_notified_at ? `Notificado ${fmtDatetime(item.critical_notified_at)}` : "Sem notificação"}</span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export default function CardiologyReportsListPage() {
  const [items, setItems] = useState<CardiologyReport[]>([]);
  const [metricRows, setMetricRows] = useState<CardiologyReport[]>([]);
  const [metricTotal, setMetricTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [quickFilter, setQuickFilter] = useState<"TOTAL" | "FINALIZED" | "EDITING" | "CRITICAL" | "SIGNED">("TOTAL");
  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query: Record<string, string> = { specialty: "CARDIOLOGY" };
      if (debouncedSearch.trim()) query.search = debouncedSearch.trim();
      if (status) query.status = status;

      const { items: rows, meta } = await apiFetchList<CardiologyReport>(
        "/specialty_diagnostics/report/",
        { page: 1, pageSize: 999, query }
      );
      setMetricRows(rows);
      setMetricTotal(meta.total ?? rows.length);
      const filtered = rows.filter((item) => {
        if (quickFilter === "FINALIZED") return item.status === "FINAL" || item.status === "AMENDED";
        if (quickFilter === "EDITING") return item.status === "DRAFT" || item.status === "PRELIMINARY";
        if (quickFilter === "CRITICAL") return Boolean(item.critical_result);
        if (quickFilter === "SIGNED") return Boolean(item.signed_at);
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
    const final = metricRows.filter((item) => item.status === "FINAL" || item.status === "AMENDED").length;
    const draft = metricRows.filter((item) => item.status === "DRAFT" || item.status === "PRELIMINARY").length;
    const critical = metricRows.filter((item) => item.critical_result).length;
    const signed = metricRows.filter((item) => Boolean(item.signed_at)).length;
    return { final, draft, critical, signed };
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
              <FileText size={16} />
            </span>
            <div className="min-w-[9rem] flex-1 xl:flex-none">
              <h1 className="break-words text-base font-bold leading-tight text-foreground xl:truncate">Laudos de cardiologia</h1>
              <p className="whitespace-nowrap text-[11px] text-muted-foreground">
                {loading ? "A carregar..." : `${total} registo${total !== 1 ? "s" : ""}`}
              </p>
            </div>

            <Link
              href="/cardiology/"
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2.5 text-xs font-medium text-muted-foreground backdrop-blur-sm transition hover:bg-white/20 hover:text-foreground"
            >
              <ArrowLeft size={13} /> Voltar
            </Link>
            <Link
              href="/cardiology/reports/new"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-gradient-to-br from-rose-500 to-red-600 px-3 text-xs font-semibold text-white shadow-sm shadow-rose-500/20 transition hover:opacity-90"
            >
              <Plus size={14} /> Novo laudo
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
                placeholder="Pesquisar paciente, exame, achados..."
                className="h-8 w-full rounded-md border border-border bg-background/60 pl-7 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              />
            </div>

            <select
              aria-label="Estado do laudo"
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

            <div className="inline-flex h-8 shrink-0 items-center gap-1" title="Registos por página">
              <PageSizeInput
                value={pageSize}
                onChange={(value) => {
                  setPageSize(value);
                  setPage(1);
                }}
                ariaLabel="Registos por página"
              />
              <span className="whitespace-nowrap text-xs text-muted-foreground">/pág</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 border-t border-white/20 px-3 py-2 pl-5 min-[520px]:grid-cols-3 md:grid-cols-5 dark:border-white/10">
            <Metric label="Total" value={loading ? "..." : metricTotal} tone="slate" active={quickFilter === "TOTAL" && !status} onClick={() => applyQuickFilter("TOTAL")} />
            <Metric label="Finais" value={loading ? "..." : metrics.final} tone="emerald" active={quickFilter === "FINALIZED"} onClick={() => applyQuickFilter("FINALIZED")} />
            <Metric label="Em edição" value={loading ? "..." : metrics.draft} tone="amber" active={quickFilter === "EDITING"} onClick={() => applyQuickFilter("EDITING")} />
            <Metric label="Críticos" value={loading ? "..." : metrics.critical} tone="rose" active={quickFilter === "CRITICAL"} onClick={() => applyQuickFilter("CRITICAL")} />
            <Metric label="Assinados" value={loading ? "..." : metrics.signed} tone="blue" active={quickFilter === "SIGNED"} onClick={() => applyQuickFilter("SIGNED")} />
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
                <FileText size={22} />
              </span>
              <p className="text-sm font-medium text-foreground">Nenhum laudo de cardiologia encontrado</p>
              <p className="mt-1 text-xs text-muted-foreground">Ajuste os filtros ou crie um novo laudo.</p>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-4 2xl:grid-cols-6">
            {items.map((item) => (
              <ReportCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">
              Página {page} de {totalPages} · {total} laudos
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
