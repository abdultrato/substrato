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

// ── Status metadata ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PLANEADA:  "Planeada",
  CONCLUIDA: "Concluída",
  EXPIRADA:  "Expirada",
};

const STATUS_BADGE: Record<string, string> = {
  PLANEADA:  "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  CONCLUIDA: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
  EXPIRADA:  "bg-red-50 text-red-700 dark:bg-red-900/15 dark:text-red-300",
};

const STATUS_DOT: Record<string, string> = {
  PLANEADA:  "bg-amber-400",
  CONCLUIDA: "bg-emerald-500",
  EXPIRADA:  "bg-red-500",
};

const STATUS_TOP: Record<string, string> = {
  PLANEADA:  "bg-amber-400",
  CONCLUIDA: "bg-emerald-500",
  EXPIRADA:  "bg-red-500",
};

// Rotating accent tones for card icons
const TONES = [
  { icon: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300" },
  { icon: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300" },
  { icon: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300" },
  { icon: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300" },
  { icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" },
  { icon: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" },
];

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
  const diff = (new Date(expiry).getTime() - Date.now()) / 86400000;
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
  const PAGE_SIZE = 30;

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
  const hasFilters = !!(search || filterStatus);
  function clearFilters() { setSearch(""); setFilterStatus(""); setPage(1); }

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-[90%] space-y-3">

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
              placeholder="Pesquisar título, formador…"
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

        {/* ── Grid de cards ─────────────────────────────────────── */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6">
          {trainings.map((t, idx) => {
            const tone       = TONES[idx % TONES.length];
            const topBar     = STATUS_TOP[t.status]   ?? "bg-slate-400";
            const badgeCls   = STATUS_BADGE[t.status] ?? "bg-muted text-foreground";
            const dotCls     = STATUS_DOT[t.status]   ?? "bg-slate-400";
            const sLbl       = STATUS_LABEL[t.status] ?? t.status;
            const trainDate  = fmtDate(t.training_date);
            const expiryDate = fmtDate(t.expiry_date);
            const expiring   = isExpiringSoon(t.expiry_date);

            return (
              <Link
                key={t.id}
                href={`/clinical-laboratory/quality-management/trainings/${t.id}`}
                className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/80 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-violet-300/60 dark:hover:border-violet-700/40"
              >
                {/* top accent bar */}
                <span className={`absolute inset-x-0 top-0 h-0.5 ${topBar}`} />

                <div className="flex flex-col gap-2 p-3 pt-3.5">
                  {/* icon + badges row */}
                  <div className="flex items-start gap-2">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone.icon}`}>
                      <BookOpen size={13} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                      <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${badgeCls}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />
                        {sLbl}
                      </span>
                      {t.competency_verified && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                          <CheckCircle2 size={8} /> Verificada
                        </span>
                      )}
                    </div>
                  </div>

                  {/* title */}
                  <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-foreground group-hover:text-violet-700 dark:group-hover:text-violet-300">
                    {t.title}
                  </p>

                  {/* meta */}
                  <div className="space-y-0.5">
                    {t.training_type && (
                      <p className="truncate text-[10px] text-muted-foreground">
                        <span className="font-medium">Tipo:</span> {t.training_type}
                      </p>
                    )}
                    {t.trainer && (
                      <p className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                        <Award size={9} className="shrink-0" /> {t.trainer}
                      </p>
                    )}
                    {trainDate && (
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <CalendarDays size={9} className="shrink-0" /> {trainDate}
                      </p>
                    )}
                    {expiryDate && (
                      <p className={`flex items-center gap-1 text-[10px] ${expiring ? "font-semibold text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>
                        <Clock size={9} className="shrink-0" /> Validade: {expiryDate}
                      </p>
                    )}
                  </div>

                  {/* id chip */}
                  <span className="self-start font-mono text-[9px] text-muted-foreground/60">{t.custom_id}</span>
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
                  <button key={pg} onClick={() => setPage(pg)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${pg === page ? "border-violet-500 bg-violet-600 text-white" : "border-border bg-card text-foreground hover:bg-muted"}`}>
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
