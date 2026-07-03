"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Filter,
  FlaskConical,
  Loader2,
  MapPin,
  Plus,
  Search,
  Settings,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const LIST_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];
const PAGE_SIZE = 20;

// ── Types ─────────────────────────────────────────────────────────────────────

interface NamedRef { id: number; name: string }
interface DecontRecord {
  id: number;
  custom_id: string;
  area: string;
  equipment: string;
  disinfectant: string;
  concentration: string;
  reason: string;
  performed_at: string;
  performed_by: number;
  performed_by_detail: NamedRef | null;
  verified_by: number | null;
  verified_by_detail: NamedRef | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleString("pt-PT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Assign a deterministic accent colour to each area name
const AREA_COLORS = [
  "bg-cyan-500", "bg-sky-500", "bg-indigo-500", "bg-violet-500",
  "bg-teal-500", "bg-blue-500", "bg-emerald-500", "bg-purple-500",
];
const areaColorCache: Record<string, string> = {};
let colorIdx = 0;
function areaColor(area: string): string {
  if (!areaColorCache[area]) {
    areaColorCache[area] = AREA_COLORS[colorIdx % AREA_COLORS.length];
    colorIdx++;
  }
  return areaColorCache[area];
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DecontaminationListPage() {
  useAuthGuard();

  const [items,   setItems]   = useState<DecontRecord[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (q.trim()) query.search = q.trim();
      const { items: rows, meta } = await apiFetchList<DecontRecord>(
        "/clinical_laboratory/decontamination/",
        { page: p, pageSize: PAGE_SIZE, query }
      );
      setItems(rows);
      setTotal(meta.total ?? 0);
    } catch { setItems([]); setTotal(0); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(page, search); }, [page, load]);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => load(1, v), 300);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const verified   = items.filter((i) => i.verified_by !== null).length;

  return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-sky-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-cyan-500 to-sky-500" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 shadow-md shadow-cyan-500/30">
              <Droplets size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">Biossegurança</div>
              <h1 className="text-base font-bold text-foreground">Registos de descontaminação</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span>{total} registos</span>
                {verified > 0 && (
                  <span className="flex items-center gap-1">
                    <CheckCircle size={9} className="text-emerald-500" />
                    {verified} verificado{verified !== 1 ? "s" : ""}
                  </span>
                )}
                {items.length - verified > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    {items.length - verified} por verificar
                  </span>
                )}
              </div>
            </div>

            <Link href="/clinical-laboratory/biosafety/decontamination/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 px-4 text-xs font-semibold text-white shadow-md shadow-cyan-500/30 transition hover:from-cyan-700 hover:to-sky-700">
              <Plus size={13} /> Registar descontaminação
            </Link>
          </div>
        </div>

        {/* ── Search ────────────────────────────────────────────── */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Pesquisar por área, desinfectante, motivo…"
              className="w-full rounded-lg border border-border bg-card py-1.5 pl-7 pr-3 text-xs outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20" />
          </div>
        </div>

        {/* ── Grid ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            Nenhum registo encontrado.
          </div>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {items.map((rec) => {
              const bar = areaColor(rec.area);
              const hasVerifier = rec.verified_by !== null;

              return (
                <Link key={rec.id} href={`/clinical-laboratory/biosafety/decontamination/${rec.id}`}
                  className="relative z-0 overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:shadow-md hover:bg-white/35 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/8 block">
                  <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${bar}`} />

                  <div className="px-3 py-2.5 pl-4 space-y-1.5">

                    {/* top row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {hasVerifier ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                            <CheckCircle size={8} /> Verificado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
                            Por verificar
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0">{rec.custom_id}</span>
                    </div>

                    {/* area */}
                    <div className="flex items-center gap-1.5">
                      <MapPin size={11} className="shrink-0 text-cyan-600 dark:text-cyan-400" />
                      <span className="text-[12px] font-semibold text-foreground leading-tight">{rec.area}</span>
                    </div>

                    {/* equipment */}
                    {rec.equipment && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Settings size={9} className="shrink-0" />
                        <span className="line-clamp-1">{rec.equipment}</span>
                      </div>
                    )}

                    {/* disinfectant + concentration */}
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <FlaskConical size={9} className="shrink-0 text-sky-500" />
                      <span className="font-medium text-foreground">{rec.disinfectant}</span>
                      {rec.concentration && (
                        <span className="text-muted-foreground">· {rec.concentration}</span>
                      )}
                    </div>

                    {/* reason */}
                    {rec.reason && (
                      <p className="text-[10px] text-muted-foreground italic line-clamp-1">{rec.reason}</p>
                    )}

                    {/* bottom */}
                    <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-border/30">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <User size={9} />
                        {rec.performed_by_detail?.name ?? `Utilizador #${rec.performed_by}`}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <CalendarDays size={9} />
                        {fmtDateTime(rec.performed_at)}
                      </div>
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
