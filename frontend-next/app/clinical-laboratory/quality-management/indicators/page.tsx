"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  GaugeCircle,
  Hash,
  Loader2,
  Plus,
  Search,
  Target,
  TrendingUp,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";
import { indicatorStatusLabel } from "./_components";

const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

const STATUS_LABEL: Record<string, string> = {
  NA_META: "Dentro da meta",
  ALERTA: "Alerta",
  FORA_META: "Fora da meta",
  NAO_MEDIDO: "Não medido",
};

const STATUS_BADGE: Record<string, string> = {
  NA_META: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
  ALERTA: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  FORA_META: "bg-red-50 text-red-700 dark:bg-red-900/15 dark:text-red-300",
  NAO_MEDIDO: "bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
};

const STATUS_DOT: Record<string, string> = {
  NA_META: "bg-emerald-500",
  ALERTA: "bg-amber-400",
  FORA_META: "bg-red-500",
  NAO_MEDIDO: "bg-slate-400",
};

const STATUS_TOP = STATUS_DOT;
const STATUSES = Object.entries(STATUS_LABEL);
const PAGE_SIZE_OPTS = [30, 60, 90, 120];

const TONES = [
  { icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" },
  { icon: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300" },
  { icon: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300" },
  { icon: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300" },
  { icon: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300" },
  { icon: "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-300" },
];

type Indicator = {
  id: number;
  custom_id?: string | null;
  name: string;
  formula?: string;
  sector?: number | null;
  target_value?: string | number | null;
  current_value?: string | number | null;
  period?: string;
  status: string;
};

function formatNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toLocaleString("pt-MZ", { maximumFractionDigits: 2 });
}

function progressPercent(current: string | number | null | undefined, target: string | number | null | undefined) {
  const currentNumber = Number(current);
  const targetNumber = Number(target);
  if (!Number.isFinite(currentNumber) || !Number.isFinite(targetNumber) || targetNumber <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((currentNumber / targetNumber) * 100)));
}

export default function QualityIndicatorsListPage() {
  const [rows, setRows] = useState<Indicator[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCustomId, setFilterCustomId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedCustomId, setDebouncedCustomId] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setDebouncedCustomId(filterCustomId);
    }, 300);
  }, [search, filterCustomId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q: Record<string, string> = {};
      if (debouncedSearch) q.search = debouncedSearch;
      if (filterStatus) q.status = filterStatus;
      if (debouncedCustomId) q.custom_id = debouncedCustomId;
      const { items, meta } = await apiFetchList<Indicator>(
        "/clinical_laboratory/quality_indicator/",
        { page, pageSize, query: q },
      );
      setRows(items);
      setTotal(meta.total ?? 0);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar indicadores.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterStatus, debouncedCustomId, page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [debouncedSearch, filterStatus, debouncedCustomId, pageSize]);

  const totalPages = Math.ceil(total / pageSize);
  const hasFilters = !!(search || filterStatus || filterCustomId);
  function clearFilters() {
    setSearch("");
    setFilterStatus("");
    setFilterCustomId("");
    setPage(1);
  }

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-[90%] space-y-3">

        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-teal-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-emerald-500 to-teal-600" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <Link
              href="/clinical-laboratory/quality-management"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card/80 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft size={13} />
            </Link>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/30">
              <GaugeCircle size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground">
                Gestão da qualidade <span className="mx-0.5">/</span>{" "}
                <span className="font-medium text-foreground">Indicadores da qualidade</span>
              </p>
              <h1 className="text-base font-bold leading-tight text-foreground">
                Indicadores da qualidade
                {total > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({total})</span>
                )}
              </h1>
            </div>

            <Link
              href="/clinical-laboratory/quality-management/indicators/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-xs font-semibold text-white shadow-md shadow-emerald-500/30 transition hover:from-emerald-700 hover:to-teal-700"
            >
              <Plus size={13} /> Novo indicador
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar indicador, fórmula..."
              className="w-full rounded-lg border border-border bg-card py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={10} />
              </button>
            )}
          </div>

          <div className="relative w-36">
            <Hash size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={filterCustomId}
              onChange={(e) => setFilterCustomId(e.target.value)}
              placeholder="Nº ex: QKPI-0001"
              className="w-full rounded-lg border border-border bg-card py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            {filterCustomId && (
              <button onClick={() => setFilterCustomId("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={10} />
              </button>
            )}
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-border bg-card py-1.5 pl-2.5 pr-6 text-xs text-foreground outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Todos os estados</option>
            {STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-lg border border-border bg-card py-1.5 pl-2.5 pr-6 text-xs text-foreground outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          >
            {PAGE_SIZE_OPTS.map((n) => (
              <option key={n} value={n}>{n} / página</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X size={10} /> Limpar
            </button>
          )}

          {loading && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
            <GaugeCircle size={28} className="mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum indicador encontrado.</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-1.5 text-xs text-emerald-600 underline dark:text-emerald-400">
                Limpar filtros
              </button>
            )}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6">
          {rows.map((indicator, idx) => {
            const tone = TONES[idx % TONES.length];
            const topBar = STATUS_TOP[indicator.status] ?? "bg-slate-400";
            const badgeCls = STATUS_BADGE[indicator.status] ?? "bg-muted text-foreground";
            const dotCls = STATUS_DOT[indicator.status] ?? "bg-slate-400";
            const statusLabel = indicatorStatusLabel(indicator.status, indicator.current_value, indicator.target_value);
            const progress = progressPercent(indicator.current_value, indicator.target_value);

            return (
              <Link
                key={indicator.id}
                href={`/clinical-laboratory/quality-management/indicators/${indicator.id}`}
                className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/80 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300/60 hover:shadow-md dark:hover:border-emerald-700/40"
              >
                <span className={`absolute inset-x-0 top-0 h-0.5 ${topBar}`} />

                <div className="flex flex-col gap-2 p-3 pt-3.5">
                  <div className="flex items-start gap-2">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone.icon}`}>
                      <GaugeCircle size={13} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                      <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${badgeCls}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />
                        {statusLabel}
                      </span>
                      {indicator.period && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                          {indicator.period}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                    {indicator.name || "(sem nome)"}
                  </p>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="rounded-lg border border-border/60 bg-background px-2 py-1.5">
                      <p className="flex items-center gap-1 text-[9px] text-muted-foreground">
                        <TrendingUp size={8} /> Atual
                      </p>
                      <p className="truncate text-xs font-semibold text-foreground">
                        {formatNumber(indicator.current_value)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background px-2 py-1.5">
                      <p className="flex items-center gap-1 text-[9px] text-muted-foreground">
                        <Target size={8} /> Meta
                      </p>
                      <p className="truncate text-xs font-semibold text-foreground">
                        {formatNumber(indicator.target_value)}
                      </p>
                    </div>
                  </div>

                  {progress !== null && (
                    <div className="space-y-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <span
                          className={`block h-full rounded-full ${progress >= 100 ? "bg-emerald-500" : progress >= 80 ? "bg-amber-400" : "bg-red-500"}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-muted-foreground">{progress}% da meta</p>
                    </div>
                  )}

                  {indicator.formula && (
                    <p className="line-clamp-2 text-[10px] text-muted-foreground">
                      {indicator.formula}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[9px] text-muted-foreground/70">
                      {indicator.sector ? `Sector #${indicator.sector}` : "Sem sector"}
                    </span>
                    <span className="shrink-0 font-mono text-[9px] text-muted-foreground/60">
                      {indicator.custom_id}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-[10px] text-muted-foreground">
              Página {page} de {totalPages} · {total} registos
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Anterior
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pg = totalPages <= 7 ? i + 1
                  : page <= 4 ? i + 1
                  : page >= totalPages - 3 ? totalPages - 6 + i
                  : page - 3 + i;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${pg === page ? "border-emerald-500 bg-emerald-600 text-white" : "border-border bg-card text-foreground hover:bg-muted"}`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
