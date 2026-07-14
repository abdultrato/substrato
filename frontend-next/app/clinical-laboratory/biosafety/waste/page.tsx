"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useDebounce from "@/hooks/useDebounce";
import { apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const LIST_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];
const PAGE_SIZE = 24;

interface WasteRecord {
  id: number;
  custom_id: string;
  waste_type: string;
  status: string;
  department: string;
  quantity: string;
  container_type: string;
  container_code: string;
  fill_level: string;
  generated_at: string;
  storage_location: string;
  disposal_method: string;
  disposal_date: string | null;
}

const TYPE_META: Record<string, { label: string; emoji: string; bar: string; badge: string }> = {
  BIOLOGICO:        { label: "Biológico",        emoji: "🧫", bar: "bg-violet-500",  badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300"   },
  PERFUROCORTANTE:  { label: "Perfurocortante",  emoji: "🩺", bar: "bg-red-500",     badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300"                     },
  QUIMICO:          { label: "Químico",           emoji: "⚗️",  bar: "bg-amber-500",  badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"          },
  GERAL:            { label: "Geral",             emoji: "🗑️",  bar: "bg-slate-400",  badge: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-300"          },
  INFECCIOSO:       { label: "Infeccioso",        emoji: "☣️",  bar: "bg-orange-500", badge: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300"    },
  ANATOMICO:        { label: "Anatómico",         emoji: "🫀", bar: "bg-pink-500",   badge: "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-700/40 dark:bg-pink-900/20 dark:text-pink-300"                 },
  CULTURA:          { label: "Cultura",           emoji: "🔬", bar: "bg-teal-500",   badge: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300"                 },
  REAGENTE_VENCIDO: { label: "Reagente vencido",  emoji: "🧪", bar: "bg-yellow-500", badge: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-700/40 dark:bg-yellow-900/20 dark:text-yellow-300"    },
};

const STATUS_META: Record<string, { label: string; chip: string }> = {
  GERADO:     { label: "Gerado",              chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300"         },
  ARMAZENADO: { label: "Armazenado",          chip: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300" },
  RECOLHIDO:  { label: "Recolhido",           chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"   },
  TRATADO:    { label: "Tratado",             chip: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300"         },
  DESCARTADO: { label: "Descartado",          chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" },
  INCIDENTE:  { label: "Incidente reportado", chip: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300"               },
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

export default function WasteListPage() {
  useAuthGuard();

  const [items,   setItems]   = useState<WasteRecord[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);

  const [search,      setSearch]      = useState("");
  const [filterType,  setFilterType]  = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async (p: number, q: string, type: string, status: string) => {
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (q.trim()) query.search      = q.trim();
      if (type)     query.waste_type  = type;
      if (status)   query.status      = status;
      const { items: rows, meta } = await apiFetchList<WasteRecord>(
        "/clinical_laboratory/waste/",
        { page: p, pageSize: PAGE_SIZE, query }
      );
      setItems(rows);
      setTotal(meta.total ?? 0);
    } catch { setItems([]); setTotal(0); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(page, debouncedSearch, filterType, filterStatus); }, [page, debouncedSearch, filterType, filterStatus, load]);

  function handleSearch(v: string) {
    setSearch(v); setPage(1);
  }

  const totalPages    = Math.ceil(total / PAGE_SIZE);
  const incidentCount = items.filter((i) => i.status === "INCIDENTE").length;
  const pendingCount  = items.filter((i) => ["GERADO","ARMAZENADO"].includes(i.status)).length;

  return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-teal-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-emerald-500 to-teal-500" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/30">
              <Trash2 size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">Biossegurança</div>
              <h1 className="text-base font-bold text-foreground">Gestão de Resíduos</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span>{total} registos</span>
                {pendingCount > 0 && (
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {pendingCount} por recolher
                  </span>
                )}
                {incidentCount > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                    <AlertTriangle size={9} /> {incidentCount} com incidente
                  </span>
                )}
              </div>
            </div>

            <Link href="/clinical-laboratory/biosafety/waste/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-xs font-semibold text-white shadow-md shadow-emerald-500/30 transition hover:from-emerald-700 hover:to-teal-700">
              <Plus size={13} /> Novo resíduo
            </Link>
          </div>
        </div>

        {/* ── Filters ───────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Pesquisar por sector, contentor…"
              className="w-full rounded-lg border border-border bg-card py-1.5 pl-7 pr-3 text-xs outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20" />
          </div>
          <div className="relative">
            <Filter size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs outline-none transition focus:border-blue-400 appearance-none">
              <option value="">Todos os tipos</option>
              {Object.entries(TYPE_META).map(([v, m]) => (
                <option key={v} value={v}>{m.emoji} {m.label}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Filter size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs outline-none transition focus:border-blue-400 appearance-none">
              <option value="">Todos os estados</option>
              {Object.entries(STATUS_META).map(([v, m]) => (
                <option key={v} value={v}>{m.label}</option>
              ))}
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
            Nenhum registo de resíduo encontrado.
          </div>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const tm = TYPE_META[item.waste_type] ?? { label: item.waste_type, emoji: "♻️", bar: "bg-slate-400", badge: "border-slate-200 bg-slate-50 text-slate-600" };
              const sm = STATUS_META[item.status]   ?? { label: item.status, chip: "border-slate-200 bg-slate-50 text-slate-600" };
              const isIncident = item.status === "INCIDENTE";

              return (
                <Link key={item.id} href={`/clinical-laboratory/biosafety/waste/${item.id}`}
                  className="relative z-0 overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:shadow-md hover:bg-white/35 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/8 block">
                  <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${tm.bar}`} />

                  <div className="px-3 py-2.5 pl-4 space-y-1.5">
                    {/* header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm leading-none">{tm.emoji}</span>
                        <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${tm.badge}`}>
                          {tm.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isIncident && <AlertTriangle size={10} className="text-red-500" />}
                        <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${sm.chip}`}>
                          {sm.label}
                        </span>
                      </div>
                    </div>

                    {/* dept */}
                    <p className="text-[11px] font-semibold text-foreground leading-tight">{item.department}</p>

                    {/* details */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      {item.quantity && <span>Qtd: <span className="font-medium text-foreground">{item.quantity}</span></span>}
                      {item.container_type && <span className="truncate max-w-[120px]">{item.container_type.split(" (")[0]}</span>}
                      {item.container_code && <span className="font-mono">{item.container_code}</span>}
                    </div>

                    {/* fill level for sharps */}
                    {item.fill_level && (
                      <div className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                        Enchimento: {item.fill_level}
                      </div>
                    )}

                    {/* storage */}
                    {item.storage_location && (
                      <div className="text-[10px] text-muted-foreground truncate">
                        📍 {item.storage_location}
                      </div>
                    )}

                    {/* date */}
                    <div className="border-t border-border/30 pt-1 text-[10px] text-muted-foreground">
                      {fmtDate(item.generated_at)}
                      {item.disposal_date && (
                        <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                          → descarte {fmtDate(item.disposal_date)}
                        </span>
                      )}
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
