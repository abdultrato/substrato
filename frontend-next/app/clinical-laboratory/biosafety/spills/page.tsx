"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Filter,
  FlaskConical,
  Loader2,
  MapPin,
  Plus,
  Search,
  Zap,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useDebounce from "@/hooks/useDebounce";
import { apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const LIST_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];
const PAGE_SIZE = 20;

interface SpillRecord {
  id: number;
  custom_id: string;
  spill_type: "BIOLOGICO" | "QUIMICO";
  location: string;
  material_involved: string;
  estimated_volume: string;
  disinfection_method: string;
  staff_exposed: boolean;
  occurred_at: string;
  created_at: string;
}

const TYPE_META = {
  BIOLOGICO: {
    label: "Biológico",
    icon: FlaskConical,
    bar:   "bg-violet-500",
    badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300",
    grad:  "from-violet-500 to-purple-600",
    glow:  "shadow-violet-500/25",
  },
  QUIMICO: {
    label: "Químico",
    icon: Zap,
    bar:   "bg-amber-500",
    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
    grad:  "from-amber-500 to-orange-600",
    glow:  "shadow-amber-500/25",
  },
} as const;

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString("pt-PT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function SpillsListPage() {
  useAuthGuard();

  const [items,   setItems]   = useState<SpillRecord[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);

  const [search,      setSearch]      = useState("");
  const [filterType,  setFilterType]  = useState("");
  const [filterExposed, setFilterExposed] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async (p: number, q: string, type: string, exposed: string) => {
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (q.trim())  query.search      = q.trim();
      if (type)      query.spill_type  = type;
      if (exposed)   query.staff_exposed = exposed;
      const { items: rows, meta } = await apiFetchList<SpillRecord>(
        "/clinical_laboratory/spill/",
        { page: p, pageSize: PAGE_SIZE, query }
      );
      setItems(rows);
      setTotal(meta.total ?? 0);
    } catch { setItems([]); setTotal(0); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(page, debouncedSearch, filterType, filterExposed); }, [page, debouncedSearch, filterType, filterExposed, load]);

  function handleSearch(v: string) {
    setSearch(v); setPage(1);
  }

  const totalPages  = Math.ceil(total / PAGE_SIZE);
  const bioCount    = items.filter((i) => i.spill_type === "BIOLOGICO").length;
  const chemCount   = items.filter((i) => i.spill_type === "QUIMICO").length;
  const exposedCount = items.filter((i) => i.staff_exposed).length;

  return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-violet-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-violet-500 to-amber-500" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-amber-500 shadow-md shadow-violet-500/25">
              <Droplets size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">Biossegurança</div>
              <h1 className="text-base font-bold text-foreground">Registos de Derrame</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span>{total} registos</span>
                {bioCount > 0 && (
                  <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400">
                    <FlaskConical size={9} /> {bioCount} biológico{bioCount !== 1 ? "s" : ""}
                  </span>
                )}
                {chemCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Zap size={9} /> {chemCount} químico{chemCount !== 1 ? "s" : ""}
                  </span>
                )}
                {exposedCount > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                    <AlertTriangle size={9} /> {exposedCount} com exposição
                  </span>
                )}
              </div>
            </div>

            <Link href="/clinical-laboratory/biosafety/spills/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-amber-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/25 transition hover:from-violet-700 hover:to-amber-700">
              <Plus size={13} /> Novo derrame
            </Link>
          </div>
        </div>

        {/* ── Filters ───────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Pesquisar por local, material…"
              className="w-full rounded-lg border border-border bg-card py-1.5 pl-7 pr-3 text-xs outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20" />
          </div>
          <div className="relative">
            <Filter size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs outline-none transition focus:border-blue-400 appearance-none">
              <option value="">Todos os tipos</option>
              <option value="BIOLOGICO">Biológico</option>
              <option value="QUIMICO">Químico</option>
            </select>
          </div>
          <div className="relative">
            <AlertTriangle size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select value={filterExposed} onChange={(e) => { setFilterExposed(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs outline-none transition focus:border-blue-400 appearance-none">
              <option value="">Com e sem exposição</option>
              <option value="true">Com exposição</option>
              <option value="false">Sem exposição</option>
            </select>
          </div>
        </div>

        {/* ── List ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            Nenhum registo de derrame encontrado.
          </div>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {items.map((item) => {
              const tm = TYPE_META[item.spill_type];
              const Icon = tm.icon;
              return (
                <Link key={item.id} href={`/clinical-laboratory/biosafety/spills/${item.id}`}
                  className="relative z-0 overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:shadow-md hover:bg-white/35 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/8 block">
                  <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${tm.bar}`} />

                  <div className="px-3 py-2.5 pl-4 space-y-1.5">

                    {/* header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${tm.grad} shadow-sm ${tm.glow}`}>
                          <Icon size={12} className="text-white" />
                        </div>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tm.badge}`}>
                          {tm.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.staff_exposed && (
                          <span className="inline-flex items-center gap-0.5 rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
                            <AlertTriangle size={8} /> Exposição
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-muted-foreground">{item.custom_id}</span>
                      </div>
                    </div>

                    {/* location */}
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                      <MapPin size={10} className="shrink-0 text-muted-foreground" />
                      {item.location}
                    </div>

                    {/* material + volume */}
                    {(item.material_involved || item.estimated_volume) && (
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                        {item.material_involved && (
                          <span>Material: <span className="font-medium text-foreground">{item.material_involved}</span></span>
                        )}
                        {item.estimated_volume && (
                          <span>Vol: <span className="font-medium text-foreground">{item.estimated_volume}</span></span>
                        )}
                      </div>
                    )}

                    {/* disinfection */}
                    {item.disinfection_method && (
                      <div className="text-[10px] text-muted-foreground">
                        Desinfeção: <span className="font-medium text-foreground">{item.disinfection_method}</span>
                      </div>
                    )}

                    {/* date */}
                    <div className="border-t border-border/30 pt-1 text-[10px] text-muted-foreground">
                      {fmtDateTime(item.occurred_at)}
                    </div>
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
              Página {page} de {totalPages} · {total} registos
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
