"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Loader2,
  MapPin,
  Plus,
  Search,
  Shield,
  User,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Metadata ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PLANEADA:            "Planeada",
  CONCLUIDA:           "Concluída",
  ACHADOS_ABERTOS:     "Achados em aberto",
  CORRETIVA_REQUERIDA: "Ação corretiva requerida",
  FECHADA:             "Fechada",
};

const STATUS_BAR: Record<string, string> = {
  PLANEADA:            "bg-sky-400",
  CONCLUIDA:           "bg-emerald-500",
  ACHADOS_ABERTOS:     "bg-amber-400",
  CORRETIVA_REQUERIDA: "bg-orange-500",
  FECHADA:             "bg-slate-400",
};

const STATUS_COLOR: Record<string, string> = {
  PLANEADA:            "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300",
  CONCLUIDA:           "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  ACHADOS_ABERTOS:     "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  CORRETIVA_REQUERIDA: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300",
  FECHADA:             "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-400",
};

const STATUS_DOT: Record<string, string> = {
  PLANEADA:            "bg-sky-400",
  CONCLUIDA:           "bg-emerald-500",
  ACHADOS_ABERTOS:     "bg-amber-400",
  CORRETIVA_REQUERIDA: "bg-orange-500",
  FECHADA:             "bg-slate-400",
};

const STATUSES = Object.entries(STATUS_LABEL);

// ── Types ─────────────────────────────────────────────────────────────────────

type ChecklistItem = { label: string; checked: boolean };

type Inspection = {
  id: number;
  custom_id: string;
  area: string;
  status: string;
  inspection_date: string;
  checklist: ChecklistItem[];
  findings: string;
  inspector: number | null;
  inspector_detail: { id: number; name: string } | null;
  version: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-MZ", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function checklistProgress(items: ChecklistItem[]) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const checked = items.filter((i) => i.checked).length;
  return { checked, total: items.length, pct: Math.round((checked / items.length) * 100) };
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function BiosafetyInspectionListPage() {
  const [items,   setItems]   = useState<Inspection[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [page,    setPage]    = useState(1);

  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [debouncedQ,   setDebouncedQ]   = useState("");
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => setDebouncedQ(search), 300);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedQ, filterStatus]);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const q: Record<string, string> = {};
      if (debouncedQ)   q.search = debouncedQ;
      if (filterStatus) q.status = filterStatus;
      const { items: rows, meta } = await apiFetchList<Inspection>(
        "/clinical_laboratory/biosafety_inspection/",
        { page, pageSize: PAGE_SIZE, query: q },
      );
      setItems(rows); setTotal(meta.total ?? 0);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar inspecções.");
    } finally { setLoading(false); }
  }, [debouncedQ, filterStatus, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = !!(search || filterStatus);

  function clearFilters() { setSearch(""); setFilterStatus(""); setPage(1); }

  // summary counts (from current page — gives rough overview)
  const statusCounts = items.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1; return acc;
  }, {});

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-teal-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-emerald-500 to-teal-600" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/30">
              <Shield size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground">
                Biossegurança <span className="mx-0.5">/</span>
                <span className="font-medium text-foreground">Inspecções</span>
              </p>
              <h1 className="text-base font-bold leading-tight text-foreground">
                Inspecções de biossegurança
                {total > 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">({total})</span>}
              </h1>
              {/* mini status summary */}
              {Object.keys(statusCounts).length > 0 && (
                <div className="mt-0.5 flex flex-wrap gap-1.5">
                  {STATUSES.filter(([v]) => statusCounts[v]).map(([value, label]) => (
                    <span key={value}
                      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${STATUS_COLOR[value]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[value]}`} />
                      {label} · {statusCounts[value]}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Link href="/clinical-laboratory/biosafety/inspections/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-xs font-semibold text-white shadow-md shadow-emerald-500/30 transition hover:from-emerald-700 hover:to-teal-700">
              <Plus size={13} /> Nova inspecção
            </Link>
          </div>
        </div>

        {/* ── Filtros ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar área, código…"
              className="w-full rounded-lg border border-border bg-card py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={10} />
              </button>
            )}
          </div>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-border bg-card py-1.5 pl-2.5 pr-6 text-xs text-foreground outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20">
            <option value="">Todos os estados</option>
            {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          {hasFilters && (
            <button onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <X size={10} /> Limpar
            </button>
          )}
          {loading && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
        </div>

        {/* ── Error ─────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {/* ── Empty ─────────────────────────────────────────────── */}
        {!loading && !error && items.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
            <Shield size={28} className="mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Nenhuma inspecção encontrada.</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-1.5 text-xs text-emerald-600 underline dark:text-emerald-400">
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* ── List ──────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          {items.map((insp) => {
            const bar   = STATUS_BAR[insp.status]   ?? "bg-slate-400";
            const sClr  = STATUS_COLOR[insp.status] ?? "border-border bg-muted text-foreground";
            const sDot  = STATUS_DOT[insp.status]   ?? "bg-slate-400";
            const sLbl  = STATUS_LABEL[insp.status] ?? insp.status;
            const prog  = checklistProgress(insp.checklist);
            const hasFindings = !!insp.findings?.trim();

            return (
              <Link key={insp.id}
                href={`/clinical-laboratory/biosafety/inspections/${insp.id}`}
                className="group relative flex items-start gap-3 overflow-hidden rounded-xl border border-white/20 bg-white/25 px-4 py-3 shadow-sm backdrop-blur-sm transition hover:bg-white/40 hover:shadow-md dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10">
                <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${bar}`} />

                {/* ícone estado */}
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${sClr}`}>
                  <Shield size={14} />
                </div>

                <div className="min-w-0 flex-1">
                  {/* linha de badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${sClr}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${sDot}`} />
                      {sLbl}
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground">{insp.custom_id}</span>
                    <span className="ml-auto font-mono text-[9px] text-muted-foreground">
                      v{insp.version}
                    </span>
                  </div>

                  {/* área */}
                  <p className="mt-0.5 truncate text-xs font-semibold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                    <MapPin size={9} className="mr-0.5 inline-block -mt-0.5 text-muted-foreground" />
                    {insp.area}
                  </p>

                  {/* meta row */}
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    {/* data */}
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <CalendarDays size={9} /> {fmtDate(insp.inspection_date)}
                    </span>

                    {/* inspector */}
                    {insp.inspector_detail && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <User size={9} /> {insp.inspector_detail.name}
                      </span>
                    )}

                    {/* checklist progress */}
                    {prog && (
                      <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <CheckSquare size={9} />
                        <span>{prog.checked}/{prog.total}</span>
                        <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-border/60">
                          <span
                            className={`absolute inset-y-0 left-0 rounded-full transition-all ${prog.pct === 100 ? "bg-emerald-500" : prog.pct >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                            style={{ width: `${prog.pct}%` }}
                          />
                        </span>
                        <span>{prog.pct}%</span>
                      </span>
                    )}

                    {/* achados badge */}
                    {hasFindings && (
                      <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
                        <AlertTriangle size={8} /> Achados
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── Paginação ─────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-[10px] text-muted-foreground">
              Página {page} de {totalPages} · {total} inspecções
            </p>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">
                ← Anterior
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pg = totalPages <= 7 ? i + 1
                  : page <= 4 ? i + 1
                  : page >= totalPages - 3 ? totalPages - 6 + i
                  : page - 3 + i;
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${pg === page ? "border-emerald-500 bg-emerald-600 text-white" : "border-border bg-card text-foreground hover:bg-muted"}`}>
                    {pg}
                  </button>
                );
              })}
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">
                Próxima →
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
