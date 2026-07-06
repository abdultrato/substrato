"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, FileWarning, Hash, Loader2, Plus, Search, ShieldAlert, X } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";
import {
  Nonconformity,
  SEVERITY_BAR,
  SEVERITY_CHOICES,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  SOURCE_LABEL,
  STATUS_CHOICES,
  STATUS_COLOR,
  STATUS_LABEL,
  fmtDateTime,
  sectorLabel,
} from "./_components";

const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];
const PAGE_SIZE_OPTS = [30, 60, 90, 120];

export default function NonconformityListPage() {
  const [rows, setRows] = useState<Nonconformity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
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
      const query: Record<string, string> = {};
      if (debouncedSearch) query.search = debouncedSearch;
      if (debouncedCustomId) query.custom_id = debouncedCustomId;
      if (filterStatus) query.status = filterStatus;
      if (filterSeverity) query.severity = filterSeverity;
      const { items, meta } = await apiFetchList<Nonconformity>(
        "/clinical_laboratory/nonconformity/",
        { page, pageSize, query },
      );
      setRows(items);
      setTotal(meta.total ?? 0);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar não conformidades.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, debouncedCustomId, filterStatus, filterSeverity, page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [debouncedSearch, debouncedCustomId, filterStatus, filterSeverity, pageSize]);

  const totalPages = Math.ceil(total / pageSize);
  const hasFilters = !!(search || filterStatus || filterSeverity || filterCustomId);
  function clearFilters() {
    setSearch(""); setFilterStatus(""); setFilterSeverity(""); setFilterCustomId(""); setPage(1);
  }

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-rose-500 to-orange-600" />
          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <Link href="/clinical-laboratory/quality-management" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card/80 text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <ArrowLeft size={13} />
            </Link>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 shadow-md shadow-rose-500/30">
              <FileWarning size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground">
                Gestão da qualidade <span className="mx-0.5">/</span>{" "}
                <span className="font-medium text-foreground">Não conformidades</span>
              </p>
              <h1 className="text-base font-bold leading-tight text-foreground">
                Não conformidades
                {total > 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">({total})</span>}
              </h1>
            </div>
            <Link href="/clinical-laboratory/quality-management/nonconformities/new" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-orange-600 px-4 text-xs font-semibold text-white shadow-md shadow-rose-500/30 transition hover:from-rose-700 hover:to-orange-700">
              <Plus size={13} /> Nova NC
            </Link>
          </div>

          <div className="relative flex flex-wrap items-center gap-1.5 border-t border-border/40 px-4 pb-3 pt-2">
            <div className="relative min-w-[220px] flex-1">
              <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar descrição, causa, código..." className="w-full rounded-lg border border-border bg-card/90 py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" />
              {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={10} /></button>}
            </div>
            <div className="relative w-36">
              <Hash size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={filterCustomId} onChange={(e) => setFilterCustomId(e.target.value)} placeholder="Nº ex: QNC-0001" className="w-full rounded-lg border border-border bg-card/90 py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-border bg-card/90 py-1.5 pl-2.5 pr-6 text-xs text-foreground outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20">
              <option value="">Todos os estados</option>
              {STATUS_CHOICES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="rounded-lg border border-border bg-card/90 py-1.5 pl-2.5 pr-6 text-xs text-foreground outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20">
              <option value="">Todas gravidades</option>
              {SEVERITY_CHOICES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-lg border border-border bg-card/90 py-1.5 pl-2.5 pr-6 text-xs text-foreground outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20">
              {PAGE_SIZE_OPTS.map((n) => <option key={n} value={n}>{n} / página</option>)}
            </select>
            {hasFilters && <button onClick={clearFilters} className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/90 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"><X size={10} /> Limpar</button>}
            {loading && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">{error}</div>}
        {!loading && !error && rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
            <FileWarning size={28} className="mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Nenhuma não conformidade encontrada.</p>
            {hasFilters && <button onClick={clearFilters} className="mt-1.5 text-xs text-rose-600 underline dark:text-rose-400">Limpar filtros</button>}
          </div>
        )}

        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {rows.map((nc) => {
            const bar = SEVERITY_BAR[nc.severity] ?? "bg-slate-400";
            const severity = SEVERITY_COLOR[nc.severity] ?? "border-border bg-muted text-foreground";
            const status = STATUS_COLOR[nc.status] ?? "border-border bg-muted text-foreground";
            return (
              <Link key={nc.id} href={`/clinical-laboratory/quality-management/nonconformities/${nc.id}`} className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/80 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-rose-300/60 hover:shadow-md dark:hover:border-rose-700/40">
                <span className={`absolute inset-x-0 top-0 h-0.5 ${bar}`} />
                <div className="flex flex-col gap-1.5 p-2.5 pt-3">
                  <div className="flex items-start gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">
                      <ShieldAlert size={13} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${severity}`}>{SEVERITY_LABEL[nc.severity] ?? nc.severity}</span>
                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${status}`}>{STATUS_LABEL[nc.status] ?? nc.status}</span>
                    </div>
                  </div>
                  <p className="line-clamp-3 text-[11px] font-semibold leading-snug text-foreground group-hover:text-rose-700 dark:group-hover:text-rose-300">{nc.description || "(sem descrição)"}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="rounded-lg border border-border/60 bg-background px-2 py-1.5">
                      <p className="text-[9px] text-muted-foreground">Origem</p>
                      <p className="truncate text-[11px] font-semibold text-foreground">{SOURCE_LABEL[nc.source] ?? nc.source}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background px-2 py-1.5">
                      <p className="flex items-center gap-1 text-[9px] text-muted-foreground"><CalendarDays size={8} /> Detetada</p>
                      <p className="truncate text-[11px] font-semibold text-foreground">{fmtDateTime(nc.detected_at)}</p>
                    </div>
                  </div>
                  {nc.immediate_action && <p className="line-clamp-2 text-[10px] text-muted-foreground">{nc.immediate_action}</p>}
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[9px] text-muted-foreground/70">{sectorLabel(nc) ?? "Sem sector"}</span>
                    <span className="shrink-0 font-mono text-[9px] text-muted-foreground/60">{nc.code || nc.custom_id}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-[10px] text-muted-foreground">Página {page} de {totalPages} · {total} registos</p>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">Próxima</button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
