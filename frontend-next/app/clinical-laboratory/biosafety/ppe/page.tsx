"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Package,
  Plus,
  Search,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useDebounce from "@/hooks/useDebounce";
import { apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const LIST_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];
const PAGE_SIZE = 24;

interface PPEItem {
  id: number;
  custom_id: string;
  name: string;
  category: string;
  size: string;
  unit: string;
  stock_controlled: boolean;
  minimum_stock: number;
  current_stock: number;
  active: boolean;
}

// Deterministic colour per category
const CAT_COLORS: Record<string, { bar: string; badge: string; icon: string }> = {
  "Proteção corporal":          { bar: "bg-blue-500",    badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",     icon: "from-blue-500 to-indigo-600" },
  "Proteção respiratória":      { bar: "bg-violet-500",  badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300", icon: "from-violet-500 to-purple-600" },
  "Proteção ocular":            { bar: "bg-sky-500",     badge: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300",           icon: "from-sky-500 to-cyan-600" },
  "Proteção das mãos":          { bar: "bg-teal-500",    badge: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300",     icon: "from-teal-500 to-emerald-600" },
  "Proteção dos pés":           { bar: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300", icon: "from-emerald-500 to-green-600" },
  "Proteção da cabeça":         { bar: "bg-amber-500",   badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300", icon: "from-amber-500 to-orange-500" },
};
const DEFAULT_CAT = { bar: "bg-slate-400", badge: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/30 dark:text-slate-300", icon: "from-slate-500 to-slate-600" };

function catMeta(cat: string) { return CAT_COLORS[cat] ?? DEFAULT_CAT; }

function stockStatus(item: PPEItem): "ok" | "low" | "out" | "uncontrolled" {
  if (!item.stock_controlled) return "uncontrolled";
  if (item.current_stock <= 0) return "out";
  if (item.current_stock <= item.minimum_stock) return "low";
  return "ok";
}

const STOCK_BADGE: Record<string, string> = {
  ok:           "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  low:          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  out:          "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
  uncontrolled: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-400",
};

export default function PPEListPage() {
  useAuthGuard();

  const [items,   setItems]   = useState<PPEItem[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);

  const [search,       setSearch]       = useState("");
  const [filterActive, setFilterActive] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async (p: number, q: string, active: string) => {
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (q.trim()) query.search = q.trim();
      if (active)   query.active = active;
      const { items: rows, meta } = await apiFetchList<PPEItem>(
        "/clinical_laboratory/ppe/",
        { page: p, pageSize: PAGE_SIZE, query }
      );
      setItems(rows);
      setTotal(meta.total ?? 0);
    } catch { setItems([]); setTotal(0); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(page, debouncedSearch, filterActive); }, [page, debouncedSearch, filterActive, load]);

  function handleSearch(v: string) {
    setSearch(v); setPage(1);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const lowCount   = items.filter((i) => stockStatus(i) === "low").length;
  const outCount   = items.filter((i) => stockStatus(i) === "out").length;

  return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-blue-500 to-indigo-500" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/30">
              <ShieldCheck size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">Biossegurança</div>
              <h1 className="text-base font-bold text-foreground">Equipamentos de Protecção Individual</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span>{total} artigos</span>
                {outCount > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                    <AlertTriangle size={9} /> {outCount} sem stock
                  </span>
                )}
                {lowCount > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                    <TrendingDown size={9} /> {lowCount} stock baixo
                  </span>
                )}
              </div>
            </div>

            <Link href="/clinical-laboratory/biosafety/ppe/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-blue-500/30 transition hover:from-blue-700 hover:to-indigo-700">
              <Plus size={13} /> Novo EPI
            </Link>
          </div>
        </div>

        {/* ── Filters ───────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Pesquisar EPI…"
              className="w-full rounded-lg border border-border bg-card py-1.5 pl-7 pr-3 text-xs outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20" />
          </div>
          <div className="relative">
            <Filter size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select value={filterActive} onChange={(e) => { setFilterActive(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs outline-none transition focus:border-blue-400 appearance-none">
              <option value="">Activos e inactivos</option>
              <option value="true">Apenas activos</option>
              <option value="false">Apenas inactivos</option>
            </select>
          </div>
        </div>

        {/* ── Grid ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            Nenhum EPI encontrado.
          </div>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const cm   = catMeta(item.category);
              const ss   = stockStatus(item);
              const pct  = item.stock_controlled && item.minimum_stock > 0
                ? Math.min(100, Math.round((item.current_stock / (item.minimum_stock * 2)) * 100))
                : null;
              const barColor = ss === "ok" ? "bg-emerald-500" : ss === "low" ? "bg-amber-400" : ss === "out" ? "bg-red-500" : "bg-slate-300";

              return (
                <Link key={item.id} href={`/clinical-laboratory/biosafety/ppe/${item.id}`}
                  className="relative z-0 overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:shadow-md hover:bg-white/35 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/8 block">
                  <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${cm.bar}`} />

                  <div className="px-3 py-2.5 pl-4 space-y-1.5">

                    {/* top */}
                    <div className="flex items-start justify-between gap-2">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cm.badge}`}>
                        {item.category}
                      </span>
                      <div className="flex items-center gap-1">
                        {!item.active && (
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-400">
                            Inactivo
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-muted-foreground">{item.custom_id}</span>
                      </div>
                    </div>

                    {/* name */}
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck size={11} className="shrink-0 text-blue-600 dark:text-blue-400" />
                      <span className="text-[12px] font-semibold text-foreground leading-tight">{item.name}</span>
                    </div>

                    {/* size + unit */}
                    {(item.size || item.unit) && (
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {item.size && <span>Tam: <span className="font-medium text-foreground">{item.size}</span></span>}
                        {item.unit && <span>Unid: <span className="font-medium text-foreground">{item.unit}</span></span>}
                      </div>
                    )}

                    {/* stock */}
                    {item.stock_controlled ? (
                      <div className="space-y-0.5 pt-0.5 border-t border-border/30">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">Stock</span>
                          <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${STOCK_BADGE[ss]}`}>
                            {ss === "out" && <AlertTriangle size={8} />}
                            {ss === "low" && <TrendingDown size={8} />}
                            {ss === "ok"  && <Package size={8} />}
                            {item.current_stock} / {item.minimum_stock} mín.
                          </span>
                        </div>
                        {pct !== null && (
                          <div className="h-1 w-full overflow-hidden rounded-full bg-border/40">
                            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="border-t border-border/30 pt-0.5">
                        <span className="text-[10px] text-muted-foreground italic">Stock não controlado</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">
              Página {page} de {totalPages} · {total} artigos
            </span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card transition hover:bg-muted disabled:opacity-40">
                <ChevronLeft size={13} />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card transition hover:bg-muted disabled:opacity-40">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
