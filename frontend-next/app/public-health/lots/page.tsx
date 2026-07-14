"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  PackageCheck,
  Plus,
  Search,
  Snowflake,
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

interface LotRecord {
  id: number;
  custom_id: string;
  vaccine_name: string;
  lot_number: string;
  official_batch_code: string;
  status: string;
  expiration_date: string;
  received_at: string;
  doses_received: number;
  doses_available: number;
  reserved_doses: number;
  storage_location: string;
  storage_temperature_c: string | null;
  cold_chain_status: string;
  is_expired: boolean;
}

const STATUS_META: Record<string, { label: string; emoji: string; bar: string; chip: string }> = {
  RECEIVED:    { label: "Recebido",   emoji: "📦", bar: "bg-blue-500",   chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300"           },
  ACTIVE:      { label: "Ativo",      emoji: "✅", bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" },
  QUARANTINED: { label: "Quarentena", emoji: "🚧", bar: "bg-amber-500",  chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"       },
  DEPLETED:    { label: "Esgotado",   emoji: "🔻", bar: "bg-slate-400",  chip: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-300"      },
  EXPIRED:     { label: "Expirado",   emoji: "⌛", bar: "bg-red-500",    chip: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300"               },
  RECALLED:    { label: "Recolhido",  emoji: "↩️", bar: "bg-rose-500",   chip: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300"           },
};

const COLD_CHAIN_META: Record<string, { label: string; emoji: string; chip: string }> = {
  OK:      { label: "Conforme",   emoji: "❄️", chip: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300"           },
  WARNING: { label: "Atenção",    emoji: "⚠️", chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300" },
  BREACH:  { label: "Quebra",     emoji: "🔥", chip: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300"             },
  UNKNOWN: { label: "Desconhec.", emoji: "❓", chip: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-300" },
};

function fmtDate(s: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

function daysToExpiry(s: string): number | null {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export default function LotsListPage() {
  useAuthGuard();

  const [items, setItems] = useState<LotRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCold, setFilterCold] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async (p: number, q: string, status: string, cold: string) => {
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (q.trim()) query.search = q.trim();
      if (status) query.status = status;
      if (cold) query.cold_chain_status = cold;
      const { items: rows, meta } = await apiFetchList<LotRecord>(
        "/public_health/lot/",
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

  useEffect(() => { load(page, debouncedSearch, filterStatus, filterCold); }, [page, debouncedSearch, filterStatus, filterCold, load]);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const breachCount = items.filter((i) => i.cold_chain_status === "BREACH").length;
  const riskCount = items.filter((i) => {
    if (i.is_expired || i.status === "EXPIRED") return true;
    const d = daysToExpiry(i.expiration_date);
    return d !== null && d <= 30;
  }).length;

  return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-sky-500 to-blue-600" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-md shadow-sky-500/30">
              <PackageCheck size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">Saúde Pública</div>
              <h1 className="text-base font-bold text-foreground">Lotes de Vacina</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span>{total} lotes</span>
                {riskCount > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                    <AlertTriangle size={9} /> {riskCount} em risco de validade
                  </span>
                )}
                {breachCount > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                    <Snowflake size={9} /> {breachCount} com quebra de cadeia fria
                  </span>
                )}
              </div>
            </div>

            <Link href="/public-health/lots/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 px-4 text-xs font-semibold text-white shadow-md shadow-sky-500/30 transition hover:from-sky-700 hover:to-blue-700">
              <Plus size={13} /> Novo lote
            </Link>
          </div>
        </div>

        {/* ── Filters ───────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Pesquisar por lote, vacina, local…"
              className="w-full rounded-lg border border-border bg-card py-1.5 pl-7 pr-3 text-xs outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20" />
          </div>
          <div className="relative">
            <Filter size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs outline-none transition focus:border-blue-400 appearance-none">
              <option value="">Todos os estados</option>
              {Object.entries(STATUS_META).map(([v, m]) => (
                <option key={v} value={v}>{m.emoji} {m.label}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Snowflake size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select value={filterCold} onChange={(e) => { setFilterCold(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs outline-none transition focus:border-blue-400 appearance-none">
              <option value="">Toda a cadeia fria</option>
              {Object.entries(COLD_CHAIN_META).map(([v, m]) => (
                <option key={v} value={v}>{m.emoji} {m.label}</option>
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
            Nenhum lote encontrado.
          </div>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const sm = STATUS_META[item.status] ?? { label: item.status, emoji: "💉", bar: "bg-slate-400", chip: "border-slate-200 bg-slate-50 text-slate-600" };
              const cm = COLD_CHAIN_META[item.cold_chain_status] ?? null;
              const expired = item.is_expired || item.status === "EXPIRED";
              const days = daysToExpiry(item.expiration_date);
              const soon = !expired && days !== null && days <= 30;
              const available = item.doses_available ?? 0;

              return (
                <Link key={item.id} href={`/public-health/lots/${item.id}`}
                  className="relative z-0 block overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:bg-white/35 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                  <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${sm.bar}`} />

                  <div className="space-y-1.5 px-3 py-2.5 pl-4">
                    {/* header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm leading-none">{sm.emoji}</span>
                        <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${sm.chip}`}>
                          {sm.label}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {(expired || item.cold_chain_status === "BREACH") && <AlertTriangle size={10} className="text-red-500" />}
                        {cm && (
                          <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${cm.chip}`}>
                            {cm.emoji} {cm.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* vaccine + lot */}
                    <p className="text-[11px] font-semibold leading-tight text-foreground">
                      {item.vaccine_name || "Vacina"}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      <span className="font-mono">{item.lot_number || item.custom_id}</span>
                      {item.official_batch_code && <span className="font-mono">· {item.official_batch_code}</span>}
                    </div>

                    {/* doses */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      <span>Disp.: <span className="font-medium text-foreground">{available}</span>/{item.doses_received ?? 0}</span>
                      {item.reserved_doses > 0 && <span>Reserv.: <span className="font-medium text-foreground">{item.reserved_doses}</span></span>}
                      {item.storage_temperature_c != null && <span>{item.storage_temperature_c}°C</span>}
                    </div>

                    {/* storage */}
                    {item.storage_location && (
                      <div className="truncate text-[10px] text-muted-foreground">
                        📍 {item.storage_location}
                      </div>
                    )}

                    {/* expiry */}
                    <div className="border-t border-border/30 pt-1 text-[10px]">
                      <span className={expired ? "font-semibold text-red-600 dark:text-red-400" : soon ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
                        {expired ? "Expirado" : "Validade"}: {fmtDate(item.expiration_date)}
                        {soon && days !== null && ` · ${days}d`}
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
              Página {page} de {totalPages} · {total} lotes
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
