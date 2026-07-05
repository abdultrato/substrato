"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  Loader2,
  MapPin,
  Plus,
  Search,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
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

interface CampaignRecord {
  id: number;
  custom_id: string;
  name: string;
  vaccine_name: string;
  manager_name: string;
  campaign_type: string;
  status: string;
  target_region: string;
  target_population: number;
  target_doses: number;
  administered_doses: number;
  coverage_percent: string;
  start_date: string;
  end_date: string | null;
  official_program_code: string;
}

const TYPE_META: Record<string, { label: string; emoji: string }> = {
  ROUTINE:      { label: "Rotina",       emoji: "🔁" },
  MASS:         { label: "Massiva",      emoji: "📣" },
  OUTBREAK:     { label: "Surto",        emoji: "🚨" },
  SCHOOL:       { label: "Escolar",      emoji: "🏫" },
  OCCUPATIONAL: { label: "Ocupacional",  emoji: "🏭" },
  OTHER:        { label: "Outra",        emoji: "📋" },
};

const STATUS_META: Record<string, { label: string; emoji: string; bar: string; chip: string }> = {
  PLANNED:   { label: "Planeada",  emoji: "📅", bar: "bg-blue-500",    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300"             },
  ACTIVE:    { label: "Ativa",     emoji: "▶️", bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" },
  PAUSED:    { label: "Pausada",   emoji: "⏸️", bar: "bg-amber-500",   chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"         },
  COMPLETED: { label: "Concluída", emoji: "✅", bar: "bg-teal-500",    chip: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300"             },
  CANCELLED: { label: "Cancelada", emoji: "✖️", bar: "bg-red-500",     chip: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300"                 },
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

function coverageTone(pct: number): string {
  if (pct >= 80) return "bg-emerald-500";
  if (pct < 50) return "bg-amber-500";
  return "bg-blue-500";
}

export default function CampaignListPage() {
  useAuthGuard();

  const [items, setItems] = useState<CampaignRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (p: number, q: string, status: string, type: string) => {
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (q.trim()) query.search = q.trim();
      if (status) query.status = status;
      if (type) query.campaign_type = type;
      const { items: rows, meta } = await apiFetchList<CampaignRecord>(
        "/public_health/campaign/",
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

  useEffect(() => { load(page, search, filterStatus, filterType); }, [page, filterStatus, filterType, load]);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => load(1, v, filterStatus, filterType), 300);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const activeCount = items.filter((i) => i.status === "ACTIVE").length;

  return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-indigo-500 to-blue-600" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-md shadow-indigo-500/30">
              <ClipboardList size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">Saúde Pública</div>
              <h1 className="text-base font-bold text-foreground">Campanhas de Vacinação</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span>{total} campanhas</span>
                {activeCount > 0 && (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {activeCount} ativas
                  </span>
                )}
              </div>
            </div>

            <Link href="/public-health/campaigns/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:from-indigo-700 hover:to-blue-700">
              <Plus size={13} /> Nova campanha
            </Link>
          </div>
        </div>

        {/* ── Filters ───────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Pesquisar por campanha, vacina, região…"
              className="w-full rounded-lg border border-border bg-card py-1.5 pl-7 pr-3 text-xs outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20" />
          </div>
          <div className="relative">
            <Filter size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs outline-none transition focus:border-indigo-400 appearance-none">
              <option value="">Todos os estados</option>
              {Object.entries(STATUS_META).map(([v, m]) => (
                <option key={v} value={v}>{m.emoji} {m.label}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Filter size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs outline-none transition focus:border-indigo-400 appearance-none">
              <option value="">Todos os tipos</option>
              {Object.entries(TYPE_META).map(([v, m]) => (
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
            Nenhuma campanha encontrada.
          </div>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const sm = STATUS_META[item.status] ?? { label: item.status, emoji: "📋", bar: "bg-slate-400", chip: "border-slate-200 bg-slate-50 text-slate-600" };
              const tm = TYPE_META[item.campaign_type] ?? { label: item.campaign_type, emoji: "📋" };
              const pct = Math.min(100, Math.max(0, Number(item.coverage_percent) || 0));

              return (
                <Link key={item.id} href={`/public-health/campaigns/${item.id}`}
                  className="relative z-0 block overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:bg-white/35 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                  <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${sm.bar}`} />

                  <div className="space-y-1.5 px-3 py-2.5 pl-4">
                    {/* header */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className="text-sm leading-none">{tm.emoji}</span>
                        {tm.label}
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${sm.chip}`}>
                        {sm.emoji} {sm.label}
                      </span>
                    </div>

                    {/* name */}
                    <p className="text-[11px] font-semibold leading-tight text-foreground">{item.name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      {item.vaccine_name && <span>💉 {item.vaccine_name}</span>}
                      {item.target_region && (
                        <span className="inline-flex items-center gap-0.5"><MapPin size={9} /> {item.target_region}</span>
                      )}
                    </div>

                    {/* coverage */}
                    <div>
                      <div className="mb-0.5 flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Cobertura</span>
                        <span className="font-semibold text-foreground">
                          {pct.toFixed(1)}% · {item.administered_doses ?? 0}/{item.target_doses ?? 0}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-border">
                        <div className={coverageTone(pct)} style={{ width: `${pct}%`, height: "100%" }} />
                      </div>
                    </div>

                    {/* dates */}
                    <div className="border-t border-border/30 pt-1 text-[10px] text-muted-foreground">
                      {fmtDate(item.start_date)}{item.end_date ? ` → ${fmtDate(item.end_date)}` : ""}
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
              Página {page} de {totalPages} · {total} campanhas
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
