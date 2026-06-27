"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  ClipboardCheck,
  Clock3,
  Loader2,
  PackageCheck,
  Plus,
  Search,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetchList } from "@/lib/api";
import { formatCount } from "@/lib/i18n/plural";
import { GROUPS } from "@/lib/rbac";

type ProcedureItem = {
  id: number;
  custom_id?: string | null;
  procedure?: number;
  procedure_code?: string | null;
  patient_name?: string | null;
  ward_name?: string | null;
  catalog_name?: string | null;
  catalog_code?: string | null;
  description?: string | null;
  quantity?: number | null;
  position?: number | null;
  performed?: boolean;
  execution_status?: string | null;
  execution_status_display?: string | null;
  billed?: boolean;
  observation?: string | null;
  executed_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
};

const DEFAULT_PAGE_SIZE = 50;

const STATUS_OPTIONS = [
  { value: "", label: "Todos os estados" },
  { value: "PEN", label: "Pendente" },
  { value: "EXE", label: "Em execução" },
  { value: "CON", label: "Concluído" },
  { value: "NCO", label: "Não concluído" },
];

function statusStyle(status?: string | null) {
  switch (String(status || "").toUpperCase()) {
    case "CON":
      return { line: "bg-emerald-400", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-950/45 dark:text-emerald-300" };
    case "EXE":
      return { line: "bg-sky-400", badge: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/30 dark:bg-sky-950/45 dark:text-sky-300" };
    case "NCO":
      return { line: "bg-rose-400", badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/30 dark:bg-rose-950/45 dark:text-rose-300" };
    default:
      return { line: "bg-amber-400", badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-950/45 dark:text-amber-300" };
  }
}

function formatDate(value?: string | null) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

export default function NursingProcedureItemsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [items, setItems] = useState<ProcedureItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [billing, setBilling] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, status, billing, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string | number | boolean> = { page, page_size: pageSize };
      if (debouncedSearch) query.search = debouncedSearch;
      if (status) query.execution_status = status;
      if (billing) query.billed = billing === "billed";

      const response = await apiFetchList<ProcedureItem>("/nursing/procedure_item/", {
        page,
        pageSize,
        query,
        clientCache: safeRefreshToken === 0,
        clientCacheTtlMs: 20000,
      });
      setItems(response.items || []);
      setTotal(response.meta.total ?? response.items.length);
    } catch (reason: any) {
      setError(reason?.message || "Não foi possível carregar os itens de procedimentos.");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [billing, debouncedSearch, page, pageSize, safeRefreshToken, status]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-3">
        <section className="relative overflow-hidden rounded-xl border border-white/35 bg-gradient-to-br from-white/30 via-white/12 to-sky-100/20 px-4 py-3 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:from-white/[0.07] dark:via-white/[0.025] dark:to-sky-950/15">
          <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-500/25">
                <ClipboardCheck size={17} />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-foreground">Itens de procedimentos</h1>
                <p className="text-[11px] text-muted-foreground">{loading ? "A carregar…" : formatCount(total, { one: "item encontrado", other: "itens encontrados" })}</p>
              </div>
            </div>
            <Link href="/nursing/procedure-items/new" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 px-3 text-xs font-semibold text-white shadow-md shadow-sky-500/25 transition hover:from-sky-700 hover:to-indigo-700">
              <Plus size={13} /> Novo item
            </Link>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Pesquisar itens</span>
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar por paciente, catálogo, código ou descrição…" className="h-8 w-full rounded-lg border border-white/40 bg-white/25 pl-7 pr-3 text-xs text-foreground outline-none backdrop-blur-xl transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 dark:border-white/10 dark:bg-white/5" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar por execução" className="h-8 rounded-lg border border-white/40 bg-white/25 px-2.5 text-xs text-foreground outline-none backdrop-blur-xl focus:border-sky-500 dark:border-white/10 dark:bg-slate-900/60">
            {STATUS_OPTIONS.map((option) => <option key={option.value || "all"} value={option.value}>{option.label}</option>)}
          </select>
          <select value={billing} onChange={(event) => setBilling(event.target.value)} aria-label="Filtrar por faturação" className="h-8 rounded-lg border border-white/40 bg-white/25 px-2.5 text-xs text-foreground outline-none backdrop-blur-xl focus:border-sky-500 dark:border-white/10 dark:bg-slate-900/60">
            <option value="">Toda faturação</option>
            <option value="billed">Faturados</option>
            <option value="pending">Não faturados</option>
          </select>
          <label className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/40 bg-white/25 px-2.5 text-[10px] font-medium text-muted-foreground backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60">
            Mostrar
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              aria-label="Número de itens por página"
              className="bg-transparent text-xs font-semibold text-foreground outline-none"
            >
              {[25, 50, 100, 200].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
            por página
          </label>
        </div>

        {error ? <div className="rounded-xl border border-red-200/60 bg-red-50/50 px-4 py-3 text-sm text-red-800 backdrop-blur-xl dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-300">{error}</div> : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> A carregar itens…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/40 bg-white/15 py-16 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.02]">
            <PackageCheck size={26} className="text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">Nenhum item encontrado</p>
            <p className="text-xs text-muted-foreground">Altere os filtros ou crie um novo item.</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((item) => {
              const tone = statusStyle(item.execution_status);
              const title = item.catalog_name || item.description || "Item sem descrição";
              const code = item.catalog_code || item.custom_id || `ITEM-${item.id}`;
              return (
                <Link key={item.id} href={`/nursing/procedure-items/${item.id}`} className="group relative min-h-[154px] overflow-hidden rounded-xl border border-white/35 bg-gradient-to-br from-white/30 via-white/15 to-sky-50/15 shadow-md shadow-slate-900/5 backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-sky-300/60 hover:shadow-lg dark:border-white/10 dark:from-white/[0.065] dark:via-white/[0.025] dark:to-sky-950/10">
                  <span className={`absolute inset-x-0 top-0 h-1 ${tone.line}`} />
                  <div className="flex h-full flex-col gap-2 p-3.5 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{code}</p>
                        <h2 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-foreground">{title}</h2>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${tone.badge}`}>{item.execution_status_display || item.execution_status || "Pendente"}</span>
                    </div>

                    <div className="grid gap-1 text-[10px] text-muted-foreground">
                      {item.patient_name ? <p className="flex min-w-0 items-center gap-1"><User size={10} className="shrink-0" /><span className="truncate">{item.patient_name}</span></p> : null}
                      <p className="truncate">{item.procedure_code || `Procedimento #${item.procedure || "—"}`}{item.ward_name ? ` · ${item.ward_name}` : ""}</p>
                    </div>

                    {item.observation || item.description ? <p className="line-clamp-1 text-[10px] text-muted-foreground">{item.observation || item.description}</p> : null}

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/35 pt-2 dark:border-white/10">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><PackageCheck size={10} /> Qtd. {Number(item.quantity || 0).toLocaleString("pt-PT")}</span>
                        <span className="inline-flex items-center gap-1"><Clock3 size={10} /> {formatDate(item.completed_at || item.executed_at || item.created_at)}</span>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">Detalhes <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" /></span>
                    </div>

                    <div className="flex gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${item.performed ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{item.performed ? <CheckCircle2 size={9} /> : <CircleDashed size={9} />} {item.performed ? "Realizado" : "Por realizar"}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${item.billed ? "bg-violet-50 text-violet-700 dark:bg-violet-950/45 dark:text-violet-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{item.billed ? "Faturado" : "Não faturado"}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-muted-foreground">Página {page} de {totalPages} · até {pageSize} itens</p>
            <div className="flex gap-1">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="h-7 rounded-lg border border-white/40 bg-white/20 px-3 text-xs text-foreground backdrop-blur-xl transition hover:bg-white/35 disabled:opacity-40 dark:border-white/10 dark:bg-white/5">← Anterior</button>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="h-7 rounded-lg border border-white/40 bg-white/20 px-3 text-xs text-foreground backdrop-blur-xl transition hover:bg-white/35 disabled:opacity-40 dark:border-white/10 dark:bg-white/5">Seguinte →</button>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
