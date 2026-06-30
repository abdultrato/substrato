"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  ChevronRight,
  Clock3,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetchList } from "@/lib/api";
import { formatCount } from "@/lib/i18n/plural";
import { GROUPS } from "@/lib/rbac";

type ProcedureCatalog = {
  id: number;
  custom_id?: string | null;
  name: string;
  procedure_code?: string | null;
  description?: string | null;
  vat_percentage?: string | number | null;
  applies_vat_by_default?: boolean;
  estimated_duration_minutes?: number | null;
  active?: boolean;
};

const PAGE_SIZE = 18;

const CARD_TONES = [
  {
    line: "bg-violet-400",
    icon: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    hover: "hover:border-violet-300/70 dark:hover:border-violet-700/60",
  },
  {
    line: "bg-sky-400",
    icon: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    hover: "hover:border-sky-300/70 dark:hover:border-sky-700/60",
  },
  {
    line: "bg-emerald-400",
    icon: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    hover: "hover:border-emerald-300/70 dark:hover:border-emerald-700/60",
  },
  {
    line: "bg-amber-400",
    icon: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    hover: "hover:border-amber-300/70 dark:hover:border-amber-700/60",
  },
] as const;

function formatVat(value: ProcedureCatalog["vat_percentage"]) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return `${amount.toLocaleString("pt-PT", { maximumFractionDigits: 2 })}% IVA`;
}

export default function NursingProcedureCatalogsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [catalogs, setCatalogs] = useState<ProcedureCatalog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string | number | boolean> = {
        page,
        page_size: PAGE_SIZE,
      };
      if (debouncedSearch) query.search = debouncedSearch;
      if (status !== "all") query.active = status === "active";

      const response = await apiFetchList<ProcedureCatalog>("/nursing/procedure_catalog/", {
        page,
        pageSize: PAGE_SIZE,
        query,
        clientCache: safeRefreshToken === 0,
        clientCacheTtlMs: 20000,
      });
      setCatalogs(response.items || []);
      setTotal(response.meta.total ?? response.items.length);
    } catch (reason: any) {
      setError(reason?.message || "Não foi possível carregar os catálogos.");
      setCatalogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, safeRefreshToken, status]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-3">
        <section className="overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm shadow-violet-500/25">
                <BookOpen size={17} />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-foreground">Catálogo de procedimentos</h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? "A carregar…" : formatCount(total, { one: "catálogo encontrado", other: "catálogos encontrados" })}
                </p>
              </div>
            </div>
            <Link
              href="/nursing/procedure-catalogs/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/25 transition hover:from-violet-700 hover:to-indigo-700"
            >
              <Plus size={13} /> Novo catálogo
            </Link>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <div className="relative w-48">
            <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar…"
              className="w-full rounded-lg border border-border bg-background/60 py-1.5 pl-7 pr-6 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:w-72 focus:ring-2 focus:ring-violet-500/40 transition-all"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filtrar por estado"
            className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground outline-none transition focus:border-violet-500"
          >
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="all">Todos</option>
          </select>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> A carregar catálogos…
          </div>
        ) : catalogs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
            <BookOpen size={26} className="text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">Nenhum catálogo encontrado</p>
            <p className="text-xs text-muted-foreground">Altere os filtros ou crie um novo catálogo.</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {catalogs.map((catalog, index) => {
              const tone = CARD_TONES[(catalog.id || index) % CARD_TONES.length];
              const code = catalog.procedure_code || catalog.custom_id || `CAT-${catalog.id}`;
              const vat = formatVat(catalog.vat_percentage);
              return (
                <Link
                  key={catalog.id}
                  href={`/nursing/procedure-catalogs/${catalog.id}`}
                  aria-label={`Ver detalhes de ${catalog.name}`}
                  className={`group relative min-h-[142px] overflow-hidden rounded-xl border border-border/70 bg-card/80 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${tone.hover}`}
                >
                  <span className={`absolute inset-x-0 top-0 h-1 ${tone.line}`} />
                  <div className="flex h-full flex-col gap-2.5 p-3.5 pt-4">
                    <div className="flex items-start gap-2.5">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone.icon}`}>
                        <Activity size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{code}</p>
                          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${catalog.active === false ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"}`}>
                            {catalog.active === false ? "Inativo" : "Ativo"}
                          </span>
                        </div>
                        <h2 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-foreground">{catalog.name}</h2>
                      </div>
                    </div>

                    <p className="line-clamp-2 min-h-8 text-[11px] leading-4 text-muted-foreground">
                      {catalog.description?.trim() || "Sem descrição registada para este procedimento."}
                    </p>

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-2">
                      <div className="flex min-w-0 items-center gap-2.5 text-[10px] text-muted-foreground">
                        {catalog.estimated_duration_minutes ? (
                          <span className="inline-flex items-center gap-1 whitespace-nowrap">
                            <Clock3 size={11} /> {catalog.estimated_duration_minutes} min
                          </span>
                        ) : null}
                        {vat && catalog.applies_vat_by_default !== false ? (
                          <span className="inline-flex items-center gap-1 whitespace-nowrap">
                            <ShieldCheck size={11} /> {vat}
                          </span>
                        ) : null}
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                        Detalhes <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-muted-foreground">Página {page} de {totalPages}</p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="h-7 rounded-lg border border-border bg-card px-3 text-xs text-foreground transition hover:bg-muted disabled:opacity-40"
              >
                ← Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                className="h-7 rounded-lg border border-border bg-card px-3 text-xs text-foreground transition hover:bg-muted disabled:opacity-40"
              >
                Seguinte →
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
