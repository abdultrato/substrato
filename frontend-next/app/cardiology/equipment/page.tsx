"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  HeartPulse,
  Loader2,
  Plus,
  Search,
  Wrench,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import PageSizeInput from "@/components/ui/PageSizeInput";
import useDebounce from "@/hooks/useDebounce";
import { apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const REQUIRED_GROUPS = [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.CARDIOLOGIA];

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const STATUS_META: Record<string, { label: string; bar: string; chip: string; Icon: typeof Wrench }> = {
  ACTIVE: {
    label: "Ativo",
    bar: "bg-emerald-500",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
  MAINTENANCE: {
    label: "Em manutenção",
    bar: "bg-amber-500",
    chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
    Icon: Wrench,
  },
  INACTIVE: {
    label: "Inativo",
    bar: "bg-rose-500",
    chip: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
    Icon: AlertTriangle,
  },
};

const STATUS_FILTERS = [
  { value: "", label: "Estado: todos" },
  { value: "ACTIVE", label: "Ativo" },
  { value: "MAINTENANCE", label: "Em manutenção" },
  { value: "INACTIVE", label: "Inativo" },
];

const MODALITY_LABELS: Record<string, string> = {
  ECG: "ECG",
  ECHOCARDIOGRAM: "Ecocardiograma",
  EXERCISE_TEST: "Teste ergométrico",
  HOLTER: "Holter",
  AMBULATORY_BP: "MAPA",
  OTHER: "Outra",
};

type CardiologyEquipment = {
  id: number;
  custom_id?: string;
  code?: string;
  name?: string;
  specialty?: string;
  modality?: string;
  status?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  station_name?: string;
  location?: string;
  last_quality_control?: string | null;
  next_quality_control?: string | null;
  notes?: string;
};

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function equipmentTitle(item: CardiologyEquipment) {
  return item.name || item.code || item.custom_id || `Equipamento #${item.id}`;
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
      <div className="truncate text-[10px] font-medium text-muted-foreground">{label}</div>
      <div className="whitespace-nowrap text-sm font-bold text-foreground">{value}</div>
    </button>
  );
}

function EquipmentCard({ item }: { item: CardiologyEquipment }) {
  const meta = STATUS_META[item.status || ""] || STATUS_META.ACTIVE;
  const Icon = meta.Icon;
  const modality = MODALITY_LABELS[item.modality || ""] || item.modality || "Cardiologia";
  const qcDays = daysUntil(item.next_quality_control);
  const qcTone =
    qcDays === null
      ? "text-muted-foreground"
      : qcDays < 0
        ? "text-rose-600 dark:text-rose-300"
        : qcDays <= 30
          ? "text-amber-600 dark:text-amber-300"
          : "text-emerald-600 dark:text-emerald-300";

  return (
    <Link
      href={`/cardiology/equipment/${item.id}`}
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
                {equipmentTitle(item)}
              </p>
              <p className="break-all font-mono text-[9px] leading-tight text-muted-foreground md:truncate">
                {item.code || item.custom_id || `SDE-${item.id}`} · {item.serial_number || "sem série"}
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
            {item.manufacturer || "Fabricante n/d"} {item.model || ""}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-1 border-t border-border/40 pt-1 text-[9px] leading-tight min-[380px]:grid-cols-3">
          <div className="min-w-0">
            <div className="text-muted-foreground">Local</div>
            <div className="break-words font-medium text-foreground md:truncate">{item.location || item.station_name || "-"}</div>
          </div>
          <div className="min-w-0">
            <div className="text-muted-foreground">Último CQ</div>
            <div className="break-words font-medium text-foreground md:truncate">{fmtDate(item.last_quality_control)}</div>
          </div>
          <div className="min-w-0 min-[380px]:text-right">
            <div className="text-muted-foreground">Próximo CQ</div>
            <div className={`break-words font-semibold md:truncate ${qcTone}`}>{fmtDate(item.next_quality_control)}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function CardiologyEquipmentListPage() {
  const [items, setItems] = useState<CardiologyEquipment[]>([]);
  const [metricRows, setMetricRows] = useState<CardiologyEquipment[]>([]);
  const [metricTotal, setMetricTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [quickFilter, setQuickFilter] = useState<"TOTAL" | "ACTIVE" | "MAINTENANCE" | "INACTIVE" | "QC_DUE">("TOTAL");
  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query: Record<string, string> = { specialty: "CARDIOLOGY" };
      if (debouncedSearch.trim()) query.search = debouncedSearch.trim();
      if (status) query.status = status;

      const { items: rows, meta } = await apiFetchList<CardiologyEquipment>(
        "/specialty_diagnostics/equipment/",
        { page: 1, pageSize: 999, query }
      );
      setMetricRows(rows);
      setMetricTotal(meta.total ?? rows.length);
      const filtered = rows.filter((item) => {
        if (quickFilter === "ACTIVE") return item.status === "ACTIVE";
        if (quickFilter === "MAINTENANCE") return item.status === "MAINTENANCE";
        if (quickFilter === "INACTIVE") return item.status === "INACTIVE";
        if (quickFilter === "QC_DUE") {
          const days = daysUntil(item.next_quality_control);
          return days !== null && days <= 30;
        }
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
    const active = metricRows.filter((item) => item.status === "ACTIVE").length;
    const maintenance = metricRows.filter((item) => item.status === "MAINTENANCE").length;
    const inactive = metricRows.filter((item) => item.status === "INACTIVE").length;
    const qcDue = metricRows.filter((item) => {
      const days = daysUntil(item.next_quality_control);
      return days !== null && days <= 30;
    }).length;
    return { active, maintenance, inactive, qcDue };
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
              <Wrench size={16} />
            </span>
            <div className="min-w-[10rem] flex-1 xl:flex-none">
              <h1 className="break-words text-base font-bold leading-tight text-foreground xl:truncate">Equipamentos de cardiologia</h1>
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
              href="/cardiology/equipment/new"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-gradient-to-br from-rose-500 to-red-600 px-3 text-xs font-semibold text-white shadow-sm shadow-rose-500/20 transition hover:opacity-90"
            >
              <Plus size={14} /> Novo equipamento
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
                placeholder="Pesquisar equipamento, série, local..."
                className="h-8 w-full rounded-md border border-border bg-background/60 pl-7 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              />
            </div>

            <select
              aria-label="Estado do equipamento"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setQuickFilter("TOTAL");
                setPage(1);
              }}
              className={`h-8 w-44 shrink-0 rounded-md border border-border bg-background/60 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/40 ${status ? "text-foreground" : "text-muted-foreground"}`}
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
            <Metric label="Ativos" value={loading ? "..." : metrics.active} tone="emerald" active={quickFilter === "ACTIVE"} onClick={() => applyQuickFilter("ACTIVE")} />
            <Metric label="Manutenção" value={loading ? "..." : metrics.maintenance} tone="amber" active={quickFilter === "MAINTENANCE"} onClick={() => applyQuickFilter("MAINTENANCE")} />
            <Metric label="Inativos" value={loading ? "..." : metrics.inactive} tone="rose" active={quickFilter === "INACTIVE"} onClick={() => applyQuickFilter("INACTIVE")} />
            <Metric label="CQ em 30d" value={loading ? "..." : metrics.qcDue} tone="blue" active={quickFilter === "QC_DUE"} onClick={() => applyQuickFilter("QC_DUE")} />
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
                <Wrench size={22} />
              </span>
              <p className="text-sm font-medium text-foreground">Nenhum equipamento de cardiologia encontrado</p>
              <p className="mt-1 text-xs text-muted-foreground">Ajuste os filtros ou registe um equipamento.</p>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-4 2xl:grid-cols-6">
            {items.map((item) => (
              <EquipmentCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">
              Página {page} de {totalPages} · {total} equipamentos
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card transition hover:bg-muted disabled:opacity-40"
              >
                <Activity size={13} className="rotate-180" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card transition hover:bg-muted disabled:opacity-40"
              >
                <Activity size={13} />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
