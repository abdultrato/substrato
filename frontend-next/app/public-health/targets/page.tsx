"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Plus,
  Search,
  Target,
  Users,
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

interface TargetRecord {
  id: number;
  custom_id: string;
  campaign: number;
  campaign_name: string;
  region: string;
  district: string;
  age_min_months: number | null;
  age_max_months: number | null;
  target_population: number;
  target_doses: number;
  administered_doses: number;
  coverage_percent: string;
}

const COVERAGE_FILTERS = [
  { value: "", label: "Toda a cobertura" },
  { value: "high", label: "🟢 ≥ 80%" },
  { value: "mid", label: "🔵 50–79%" },
  { value: "low", label: "🟠 < 50%" },
];

function ageLabel(min: number | null, max: number | null): string | null {
  const fmt = (m: number) => (m % 12 === 0 ? `${m / 12}a` : `${m}m`);
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)}`;
  if (min != null) return `≥ ${fmt(min)}`;
  if (max != null) return `≤ ${fmt(max)}`;
  return null;
}

function coverageMeta(pct: number): { bar: string; text: string } {
  if (pct >= 80) return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
  if (pct >= 50) return { bar: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" };
  if (pct > 0) return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
  return { bar: "bg-slate-400", text: "text-muted-foreground" };
}

export default function TargetListPage() {
  useAuthGuard();

  const [items, setItems] = useState<TargetRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterCoverage, setFilterCoverage] = useState("");

  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (q.trim()) query.search = q.trim();
      const { items: rows, meta } = await apiFetchList<TargetRecord>(
        "/public_health/target/",
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

  useEffect(() => { load(page, search); }, [page, load]);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => load(1, v), 300);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const visible = items.filter((i) => {
    if (!filterCoverage) return true;
    const pct = Number(i.coverage_percent) || 0;
    if (filterCoverage === "high") return pct >= 80;
    if (filterCoverage === "mid") return pct >= 50 && pct < 80;
    if (filterCoverage === "low") return pct < 50;
    return true;
  });

  return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-teal-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-teal-500 to-cyan-600" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-md shadow-teal-500/30">
              <Target size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">Saúde Pública</div>
              <h1 className="text-base font-bold text-foreground">Metas por Região</h1>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {total} metas de cobertura
              </div>
            </div>

            <Link href="/public-health/targets/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-4 text-xs font-semibold text-white shadow-md shadow-teal-500/30 transition hover:from-teal-700 hover:to-cyan-700">
              <Plus size={13} /> Nova meta
            </Link>
          </div>
        </div>

        {/* ── Filters ───────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Pesquisar por campanha, região ou distrito…"
              className="w-full rounded-lg border border-border bg-card py-1.5 pl-7 pr-3 text-xs outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20" />
          </div>
          <div className="relative">
            <Target size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select value={filterCoverage} onChange={(e) => setFilterCoverage(e.target.value)}
              className="rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs outline-none transition focus:border-teal-400 appearance-none">
              {COVERAGE_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Grid ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            Nenhuma meta encontrada.
          </div>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => {
              const pct = Math.min(100, Math.max(0, Number(item.coverage_percent) || 0));
              const cm = coverageMeta(pct);
              const age = ageLabel(item.age_min_months, item.age_max_months);
              const region = [item.region, item.district].filter(Boolean).join(" / ") || item.custom_id;

              return (
                <Link key={item.id} href={`/public-health/targets/${item.id}`}
                  className="relative z-0 block overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:bg-white/35 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                  <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${cm.bar}`} />

                  <div className="space-y-1.5 px-3 py-2.5 pl-4">
                    {/* region */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="inline-flex items-center gap-1 text-[11px] font-semibold leading-tight text-foreground">
                        <MapPin size={11} className="shrink-0 text-teal-500" /> {region}
                      </p>
                      <span className={`shrink-0 text-[11px] font-bold ${cm.text}`}>{pct.toFixed(1)}%</span>
                    </div>

                    {/* campaign + age */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      {item.campaign_name && <span className="truncate max-w-[170px]">📣 {item.campaign_name}</span>}
                      {age && <span>Idade: {age}</span>}
                    </div>

                    {/* coverage bar */}
                    <div className="h-1.5 overflow-hidden rounded-full bg-border">
                      <div className={cm.bar} style={{ width: `${pct}%`, height: "100%" }} />
                    </div>

                    {/* numbers */}
                    <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 border-t border-border/30 pt-1 text-[10px] text-muted-foreground">
                      <span>Doses: <span className="font-medium text-foreground">{item.administered_doses ?? 0}</span>/{item.target_doses ?? 0}</span>
                      {item.target_population > 0 && (
                        <span className="inline-flex items-center gap-0.5"><Users size={9} /> {item.target_population.toLocaleString("pt-PT")}</span>
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
              Página {page} de {totalPages} · {total} metas
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
