"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Plus,
  Search,
  Snowflake,
  Syringe,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useDebounce from "@/hooks/useDebounce";
import { apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const LIST_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.RECEPCAO,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.ENFERMAGEM,
  GROUPS.LABORATORIO,
  GROUPS.SAUDE_PUBLICA,
];
const PAGE_SIZE = 24;

interface VaccineRecord {
  id: number;
  custom_id: string;
  name: string;
  code: string;
  disease: string;
  vaccine_type: string;
  manufacturer: string;
  dose_volume_ml: string;
  dose_count_required: number;
  booster_interval_days: number;
  minimum_age_months: number | null;
  maximum_age_months: number | null;
  cold_chain_min_c: string;
  cold_chain_max_c: string;
  official_code: string;
  active: boolean;
}

const TYPE_META: Record<string, { label: string; emoji: string; bar: string; chip: string }> = {
  LIVE_ATTENUATED: { label: "Viva atenuada", emoji: "🦠", bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" },
  INACTIVATED:     { label: "Inativada",     emoji: "💉", bar: "bg-blue-500",    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300"             },
  TOXOID:          { label: "Toxóide",       emoji: "☣️", bar: "bg-amber-500",   chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"         },
  SUBUNIT:         { label: "Subunidade",    emoji: "🧩", bar: "bg-teal-500",    chip: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300"             },
  MRNA:            { label: "mRNA",          emoji: "🧬", bar: "bg-violet-500",  chip: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300" },
  VIRAL_VECTOR:    { label: "Vetor viral",   emoji: "🧫", bar: "bg-pink-500",    chip: "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-700/40 dark:bg-pink-900/20 dark:text-pink-300"             },
  OTHER:           { label: "Outra",         emoji: "💊", bar: "bg-slate-400",   chip: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-300"      },
};

function ageLabel(min: number | null, max: number | null): string | null {
  const fmt = (m: number) => (m % 12 === 0 ? `${m / 12}a` : `${m}m`);
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)}`;
  if (min != null) return `≥ ${fmt(min)}`;
  if (max != null) return `≤ ${fmt(max)}`;
  return null;
}

export default function VaccineListPage() {
  useAuthGuard();

  const [items, setItems] = useState<VaccineRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async (p: number, q: string, type: string, active: string) => {
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (q.trim()) query.search = q.trim();
      if (type) query.vaccine_type = type;
      if (active) query.active = active;
      const { items: rows, meta } = await apiFetchList<VaccineRecord>(
        "/public_health/vaccine/",
        { page: p, pageSize: PAGE_SIZE, query }
      );
      setItems(rows);
      setTotal(meta.total ?? 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page, debouncedSearch, filterType, filterActive); }, [page, debouncedSearch, filterType, filterActive, load]);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const inactiveCount = items.filter((i) => !i.active).length;

  return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-fuchsia-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-violet-500 to-fuchsia-600" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-md shadow-violet-500/30">
              <Syringe size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">Saúde Pública</div>
              <h1 className="text-base font-bold text-foreground">Vacinas</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span>{total} produtos vacinais</span>
                {inactiveCount > 0 && (
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {inactiveCount} inativas
                  </span>
                )}
              </div>
            </div>

            <Link href="/public-health/vaccines/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-fuchsia-700">
              <Plus size={13} /> Nova vacina
            </Link>
          </div>
        </div>

        {/* ── Filters ───────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Pesquisar por vacina, doença, fabricante…"
              className="w-full rounded-lg border border-border bg-card py-1.5 pl-7 pr-3 text-xs outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20" />
          </div>
          <div className="relative">
            <Filter size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs outline-none transition focus:border-violet-400 appearance-none">
              <option value="">Todos os tipos</option>
              {Object.entries(TYPE_META).map(([v, m]) => (
                <option key={v} value={v}>{m.emoji} {m.label}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Filter size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select value={filterActive} onChange={(e) => { setFilterActive(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs outline-none transition focus:border-violet-400 appearance-none">
              <option value="">Ativas e inativas</option>
              <option value="true">✅ Ativas</option>
              <option value="false">🚫 Inativas</option>
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
            Nenhuma vacina encontrada.
          </div>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const tm = TYPE_META[item.vaccine_type] ?? { label: item.vaccine_type, emoji: "💊", bar: "bg-slate-400", chip: "border-slate-200 bg-slate-50 text-slate-600" };
              const age = ageLabel(item.minimum_age_months, item.maximum_age_months);

              return (
                <Link key={item.id} href={`/public-health/vaccines/${item.id}`}
                  className="relative z-0 block overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:bg-white/35 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                  <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${tm.bar}`} />

                  <div className="space-y-1.5 px-3 py-2.5 pl-4">
                    {/* header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm leading-none">{tm.emoji}</span>
                        <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${tm.chip}`}>
                          {tm.label}
                        </span>
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${item.active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                        : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-400"}`}>
                        {item.active ? "Ativa" : "Inativa"}
                      </span>
                    </div>

                    {/* name + disease */}
                    <p className="text-[11px] font-semibold leading-tight text-foreground">{item.name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      <span>🎯 {item.disease}</span>
                      {item.manufacturer && <span className="truncate max-w-[130px]">{item.manufacturer}</span>}
                      {item.code && <span className="font-mono">{item.code}</span>}
                    </div>

                    {/* schedule */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      <span>Doses: <span className="font-medium text-foreground">{item.dose_count_required}</span></span>
                      {item.booster_interval_days > 0 && <span>Reforço: {item.booster_interval_days}d</span>}
                      {age && <span>Idade: {age}</span>}
                    </div>

                    {/* cold chain */}
                    <div className="border-t border-border/30 pt-1 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Snowflake size={9} className="text-sky-500" />
                        {item.cold_chain_min_c}°C a {item.cold_chain_max_c}°C
                      </span>
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
              Página {page} de {totalPages} · {total} vacinas
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
