"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  Plus,
  Search,
  User,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Metadata ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PLANEADA:  "Planeada",
  CONCLUIDA: "Concluída",
  EXPIRADA:  "Expirada",
};

const STATUS_COLOR: Record<string, string> = {
  PLANEADA:  "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  CONCLUIDA: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  EXPIRADA:  "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
};

const STATUS_DOT: Record<string, string> = {
  PLANEADA:  "bg-amber-400",
  CONCLUIDA: "bg-emerald-500",
  EXPIRADA:  "bg-red-500",
};

const STATUS_BAR: Record<string, string> = {
  PLANEADA:  "bg-amber-400",
  CONCLUIDA: "bg-emerald-500",
  EXPIRADA:  "bg-red-500",
};

const STATUSES = Object.entries(STATUS_LABEL);

// ── Types ─────────────────────────────────────────────────────────────────────

type Training = {
  id: number;
  custom_id: string;
  title: string;
  training_type: string;
  trainer: string;
  training_date: string | null;
  expiry_date: string | null;
  certificate: string;
  competency_verified: boolean;
  status: string;
  staff_display?: string;
  staff?: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d + "T00:00:00").toLocaleDateString("pt-MZ", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function isExpiringSoon(expiry: string | null): boolean {
  if (!expiry) return false;
  const exp = new Date(expiry);
  const today = new Date();
  const diff = (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 30;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TrainingRecordListPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const q: Record<string, string> = {};
      if (debouncedSearch) q.search = debouncedSearch;
      if (filterStatus) q.status = filterStatus;
      const { items, meta } = await apiFetchList<Training>(
        "/clinical_laboratory/training_record/",
        { page, pageSize: PAGE_SIZE, query: q },
      );
      setTrainings(items); setTotal(meta.total ?? 0);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar registos de formação.");
    } finally { setLoading(false); }
  }, [debouncedSearch, filterStatus, page]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [debouncedSearch, filterStatus]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function clearFilters() { setSearch(""); setFilterStatus(""); setPage(1); }
  const hasFilters = !!(search || filterStatus);

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-violet-500 to-indigo-600" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <Link
              href="/clinical-laboratory/quality-management"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card/80 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft size={13} />
            </Link>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-500/30">
              <BookOpen size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground">
                Gestão da qualidade <span className="mx-0.5">/</span>{" "}
                <span className="font-medium text-foreground">Formação</span>
              </p>
              <h1 className="text-base font-bold leading-tight text-foreground">
                Registos de formação
                {total > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({total})</span>
                )}
              </h1>
            </div>

            <Link
              href="/clinical-laboratory/quality-management/trainings/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700"
            >
              <Plus size={13} /> Nova formação
            </Link>
          </div>
        </div>

        {/* ── Filtros ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar título, formador, colaborador…"
              className="w-full rounded-lg border border-border bg-card py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={10} />
              </button>
            )}
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-border bg-card py-1.5 pl-2.5 pr-6 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          >
            <option value="">Todos os estados</option>
            {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
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
        {!loading && !error && trainings.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
            <BookOpen size={28} className="mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum registo de formação encontrado.</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-1.5 text-xs text-violet-600 underline dark:text-violet-400">
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* ── Lista ─────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          {trainings.map((t) => {
            const bar  = STATUS_BAR[t.status]   ?? "bg-slate-400";
            const sClr = STATUS_COLOR[t.status] ?? "border-border bg-muted text-foreground";
            const sDot = STATUS_DOT[t.status]   ?? "bg-slate-400";
            const sLbl = STATUS_LABEL[t.status] ?? t.status;
            const trainDate = fmtDate(t.training_date);
            const expiryDate = fmtDate(t.expiry_date);
            const expiringSoon = isExpiringSoon(t.expiry_date);

            return (
              <Link
                key={t.id}
                href={`/clinical-laboratory/quality-management/trainings/${t.id}`}
                className="group relative flex items-start gap-3 overflow-hidden rounded-xl border border-white/20 bg-white/25 px-4 py-3 shadow-sm backdrop-blur-sm transition hover:bg-white/40 hover:shadow-md dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10"
              >
                <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${bar} transition-all group-hover:w-[3px]`} />

                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${sClr}`}>
                  <BookOpen size={14} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${sClr}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${sDot}`} />
                      {sLbl}
                    </span>

                    {t.training_type && (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/30 dark:text-slate-300">
                        {t.training_type}
                      </span>
                    )}

                    {t.competency_verified && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                        <CheckCircle2 size={9} /> Competência verificada
                      </span>
                    )}

                    {expiringSoon && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[9px] font-medium text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300">
                        <Clock size={9} /> A expirar em breve
                      </span>
                    )}

                    <span className="font-mono text-[9px] text-muted-foreground">{t.custom_id}</span>
                  </div>

                  <p className="mt-0.5 truncate text-xs font-semibold text-foreground group-hover:text-violet-700 dark:group-hover:text-violet-300">
                    {t.title}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    {t.staff_display && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <User size={9} /> {t.staff_display}
                      </span>
                    )}
                    {t.trainer && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Award size={9} /> {t.trainer}
                      </span>
                    )}
                    {trainDate && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <CalendarDays size={9} /> {trainDate}
                      </span>
                    )}
                    {expiryDate && (
                      <span className={`flex items-center gap-1 text-[10px] ${expiringSoon ? "font-semibold text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>
                        <Clock size={9} /> Validade: {expiryDate}
                      </span>
                    )}
                    {t.certificate && (
                      <span className="font-mono text-[9px] text-muted-foreground">Cert: {t.certificate}</span>
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
              Página {page} de {totalPages} · {total} registos
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Anterior
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pg = totalPages <= 7 ? i + 1
                  : page <= 4 ? i + 1
                  : page >= totalPages - 3 ? totalPages - 6 + i
                  : page - 3 + i;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${pg === page ? "border-violet-500 bg-violet-600 text-white" : "border-border bg-card text-foreground hover:bg-muted"}`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
