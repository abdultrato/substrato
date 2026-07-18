"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  Loader2,
  Ruler,
  Search,
  Stethoscope,
  Waves,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import PageSizeInput from "@/components/ui/PageSizeInput";
import useDebounce from "@/hooks/useDebounce";
import { apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const REQUIRED_GROUPS = [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.CARDIOLOGIA];

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const VALUE_TYPE_LABELS: Record<string, string> = {
  NUMERIC: "Numérico",
  TEXT: "Texto",
  BOOLEAN: "Booleano",
  WAVEFORM: "Traçado",
  IMAGE: "Imagem",
};

const MODALITY_LABELS: Record<string, string> = {
  ECG: "ECG",
  ECHOCARDIOGRAM: "Ecocardiograma",
  EXERCISE_TEST: "Teste ergométrico",
  HOLTER: "Holter",
  AMBULATORY_BP: "MAPA",
  OTHER: "Outra",
};

type Measurement = {
  id: number;
  custom_id?: string;
  order?: number;
  order_label?: string;
  patient_name?: string;
  specialty?: string;
  modality?: string;
  position?: number;
  code?: string;
  name?: string;
  value_type?: string;
  numeric_value?: string | number | null;
  text_value?: string;
  unit?: string;
  reference_range?: string;
  interpretation?: string;
  abnormal?: boolean;
  critical?: boolean;
  measured_at?: string | null;
  notes?: string;
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

function textValue(value?: string | number | null) {
  const clean = String(value ?? "").trim();
  return clean || "-";
}

function modalityLabel(value?: string) {
  return MODALITY_LABELS[value || ""] || value || "Cardiologia";
}

function valueTypeLabel(value?: string) {
  return VALUE_TYPE_LABELS[value || ""] || value || "-";
}

function measurementTitle(item: Measurement) {
  return item.name || item.code || item.custom_id || `Medição #${item.id}`;
}

function measurementValue(item: Measurement) {
  const numeric = textValue(item.numeric_value);
  const textual = textValue(item.text_value);
  const value = numeric !== "-" ? numeric : textual;
  return `${value}${item.unit ? ` ${item.unit}` : ""}`;
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

function MeasurementCard({ item }: { item: Measurement }) {
  const state = item.critical ? "CRITICAL" : item.abnormal ? "ABNORMAL" : "NORMAL";
  const stateMeta = {
    NORMAL: {
      label: "Normal",
      bar: "bg-emerald-500",
      chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
      Icon: CheckCircle2,
    },
    ABNORMAL: {
      label: "Alterada",
      bar: "bg-amber-500",
      chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
      Icon: AlertTriangle,
    },
    CRITICAL: {
      label: "Crítica",
      bar: "bg-rose-500",
      chip: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
      Icon: AlertTriangle,
    },
  }[state];
  const Icon = stateMeta.Icon;

  return (
    <Link
      href={`/cardiology/measurements/${item.id}/`}
      className={`group relative block overflow-hidden ${GLASS} transition hover:border-rose-500/30 hover:bg-white/40 hover:shadow-md dark:hover:bg-white/[0.07]`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${stateMeta.bar}`} />
      <div className="space-y-1 px-2 py-1.5 pl-3">
        <div className="flex flex-wrap items-start justify-between gap-1.5 sm:flex-nowrap">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-300">
              <Icon size={12} />
            </span>
            <div className="min-w-0">
              <p className="break-words text-[11px] font-bold leading-tight text-foreground group-hover:text-rose-500 md:truncate">
                {measurementTitle(item)}
              </p>
              <p className="break-all font-mono text-[9px] leading-tight text-muted-foreground md:truncate">
                {item.custom_id || `SDM-${item.id}`} · {item.order_label || `Exame #${item.order || "-"}`}
              </p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-semibold leading-none ${stateMeta.chip}`}>
            {stateMeta.label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1 text-[9px] text-muted-foreground md:flex-nowrap">
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-rose-200 bg-rose-50 px-1 py-0.5 font-semibold leading-none text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300">
            <HeartPulse size={9} /> {modalityLabel(item.modality)}
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-border px-1 py-0.5 leading-none">
            <Ruler size={9} /> {valueTypeLabel(item.value_type)}
          </span>
          <span className="min-w-0 break-words md:truncate">{item.patient_name || "Paciente não definido"}</span>
        </div>

        <div className="rounded border border-border/60 bg-background/40 px-2 py-1">
          <div className="text-[9px] text-muted-foreground">Valor medido</div>
          <div className="break-words text-sm font-bold leading-tight text-foreground">{measurementValue(item)}</div>
          <div className="break-words text-[9px] leading-tight text-muted-foreground">{item.reference_range || "Sem intervalo de referência"}</div>
        </div>

        <div className="grid grid-cols-1 gap-1 border-t border-border/40 pt-1 text-[9px] leading-tight min-[360px]:grid-cols-2">
          <div className="min-w-0">
            <div className="text-muted-foreground">Medido em</div>
            <div className="break-words font-medium text-foreground md:truncate">{fmtDatetime(item.measured_at)}</div>
          </div>
          <div className="min-w-0 min-[360px]:text-right">
            <div className="text-muted-foreground">Posição</div>
            <div className="font-medium text-foreground">{item.position ?? "-"}</div>
          </div>
        </div>

        {item.interpretation ? (
          <p className="break-words text-[10px] leading-3 text-muted-foreground md:truncate" title={item.interpretation}>
            {item.interpretation}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

export default function CardiologyMeasurementsListPage() {
  const [items, setItems] = useState<Measurement[]>([]);
  const [metricRows, setMetricRows] = useState<Measurement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [valueType, setValueType] = useState("");
  const [quickFilter, setQuickFilter] = useState<"TOTAL" | "NORMAL" | "ABNORMAL" | "CRITICAL" | "WAVEFORM">("TOTAL");
  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query: Record<string, string> = { specialty: "CARDIOLOGY" };
      if (debouncedSearch.trim()) query.search = debouncedSearch.trim();
      if (valueType) query.value_type = valueType;

      const { items: rows } = await apiFetchList<Measurement>("/specialty_diagnostics/measurement/", {
        page: 1,
        pageSize: 999,
        query,
      });
      setMetricRows(rows);
      const filtered = rows.filter((item) => {
        if (quickFilter === "NORMAL") return !item.abnormal && !item.critical;
        if (quickFilter === "ABNORMAL") return Boolean(item.abnormal) && !item.critical;
        if (quickFilter === "CRITICAL") return Boolean(item.critical);
        if (quickFilter === "WAVEFORM") return item.value_type === "WAVEFORM";
        return true;
      });
      const start = (page - 1) * pageSize;
      setItems(filtered.slice(start, start + pageSize));
      setTotal(filtered.length);
    } catch {
      setItems([]);
      setMetricRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, pageSize, quickFilter, valueType]);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(() => {
    const normal = metricRows.filter((item) => !item.abnormal && !item.critical).length;
    const abnormal = metricRows.filter((item) => item.abnormal && !item.critical).length;
    const critical = metricRows.filter((item) => item.critical).length;
    const waveform = metricRows.filter((item) => item.value_type === "WAVEFORM").length;
    return { normal, abnormal, critical, waveform };
  }, [metricRows]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const applyQuickFilter = (next: typeof quickFilter) => {
    setQuickFilter(next);
    setPage(1);
  };

  return (
    <AppLayout requiredGroups={REQUIRED_GROUPS}>
      <div className="mx-auto w-full max-w-[97vw] space-y-2 px-1">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-rose-500" />
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 pl-5 xl:flex-nowrap">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/20">
              <Waves size={16} />
            </span>
            <div className="min-w-[9rem] flex-1 xl:flex-none">
              <h1 className="break-words text-base font-bold leading-tight text-foreground xl:truncate">Medições cardiológicas</h1>
              <p className="whitespace-nowrap text-[11px] text-muted-foreground">
                {loading ? "A carregar..." : `${total} medição${total !== 1 ? "ões" : ""}`}
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
                placeholder="Pesquisar paciente, exame, código..."
                className="h-8 w-full rounded-md border border-border bg-background/60 pl-7 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              />
            </div>

            <select
              aria-label="Tipo de valor"
              value={valueType}
              onChange={(event) => {
                setValueType(event.target.value);
                setPage(1);
              }}
              className={`h-8 w-40 shrink-0 rounded-md border border-border bg-background/60 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/40 ${valueType ? "text-foreground" : "text-muted-foreground"}`}
            >
              <option value="">Tipo: todos</option>
              <option value="NUMERIC">Numérico</option>
              <option value="TEXT">Texto</option>
              <option value="BOOLEAN">Booleano</option>
              <option value="WAVEFORM">Traçado</option>
              <option value="IMAGE">Imagem</option>
            </select>

            <div className="inline-flex h-8 shrink-0 items-center gap-1" title="Medições por página">
              <PageSizeInput
                value={pageSize}
                onChange={(value) => {
                  setPageSize(value);
                  setPage(1);
                }}
                ariaLabel="Medições por página"
              />
              <span className="whitespace-nowrap text-xs text-muted-foreground">/pág</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 border-t border-white/20 px-3 py-2 pl-5 min-[520px]:grid-cols-3 md:grid-cols-5 dark:border-white/10">
            <Metric label="Total" value={loading ? "..." : metricRows.length} tone="slate" active={quickFilter === "TOTAL"} onClick={() => applyQuickFilter("TOTAL")} />
            <Metric label="Normais" value={loading ? "..." : metrics.normal} tone="emerald" active={quickFilter === "NORMAL"} onClick={() => applyQuickFilter("NORMAL")} />
            <Metric label="Alteradas" value={loading ? "..." : metrics.abnormal} tone="amber" active={quickFilter === "ABNORMAL"} onClick={() => applyQuickFilter("ABNORMAL")} />
            <Metric label="Críticas" value={loading ? "..." : metrics.critical} tone="rose" active={quickFilter === "CRITICAL"} onClick={() => applyQuickFilter("CRITICAL")} />
            <Metric label="Traçados" value={loading ? "..." : metrics.waveform} tone="blue" active={quickFilter === "WAVEFORM"} onClick={() => applyQuickFilter("WAVEFORM")} />
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
                <Stethoscope size={22} />
              </span>
              <p className="text-sm font-medium text-foreground">Nenhuma medição cardiológica encontrada</p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">As medições aparecem depois de registadas no exame cardiológico correspondente.</p>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-4 2xl:grid-cols-6">
            {items.map((item) => (
              <MeasurementCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">
              Página {page} de {totalPages} · {total} medições
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
