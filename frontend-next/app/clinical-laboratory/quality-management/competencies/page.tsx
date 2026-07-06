"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  Clock,
  FlaskConical,
  Hash,
  Loader2,
  Plus,
  Search,
  User,
  UserCheck,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Status metadata ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  AGENDADA:           "Agendada",
  AVALIADA:           "Avaliada",
  COMPETENTE:         "Competente",
  NECESSITA_FORMACAO: "Necessita formação",
  RESTRINGIDA:        "Restringida",
  EXPIRADA:           "Expirada",
};

const STATUS_BADGE: Record<string, string> = {
  AGENDADA:           "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  AVALIADA:           "bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300",
  COMPETENTE:         "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
  NECESSITA_FORMACAO: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300",
  RESTRINGIDA:        "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300",
  EXPIRADA:           "bg-red-50 text-red-700 dark:bg-red-900/15 dark:text-red-300",
};

const STATUS_DOT: Record<string, string> = {
  AGENDADA:           "bg-amber-400",
  AVALIADA:           "bg-sky-500",
  COMPETENTE:         "bg-emerald-500",
  NECESSITA_FORMACAO: "bg-orange-500",
  RESTRINGIDA:        "bg-rose-500",
  EXPIRADA:           "bg-red-500",
};

const STATUS_TOP = STATUS_DOT;

const TONES = [
  { icon: "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-300" },
  { icon: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300" },
  { icon: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300" },
  { icon: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300" },
  { icon: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300" },
  { icon: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300" },
];

const STATUSES = Object.entries(STATUS_LABEL);
const PAGE_SIZE_OPTS = [12, 24, 48, 96];

// ── Types ─────────────────────────────────────────────────────────────────────

type Competency = {
  id: number;
  custom_id: string;
  area: string;
  status: string;
  staff_display?: string | null;
  assessed_by_display?: string | null;
  related_test_display?: string | null;
  assessment_date: string | null;
  expiry_date: string | null;
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

export default function CompetencyListPage() {
  const [rows, setRows] = useState<Competency[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch]                 = useState("");
  const [filterStatus, setFilterStatus]     = useState("");
  const [filterCustomId, setFilterCustomId] = useState("");
  const [page, setPage]                     = useState(1);
  const [pageSize, setPageSize]             = useState(24);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch]     = useState("");
  const [debouncedCustomId, setDebouncedCustomId] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setDebouncedCustomId(filterCustomId);
    }, 300);
  }, [search, filterCustomId]);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const q: Record<string, string> = {};
      if (debouncedSearch)   q.search    = debouncedSearch;
      if (filterStatus)      q.status    = filterStatus;
      if (debouncedCustomId) q.custom_id = debouncedCustomId;
      const { items, meta } = await apiFetchList<Competency>(
        "/clinical_laboratory/competency/",
        { page, pageSize, query: q },
      );
      setRows(items); setTotal(meta.total ?? 0);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar avaliações de competência.");
    } finally { setLoading(false); }
  }, [debouncedSearch, filterStatus, debouncedCustomId, page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [debouncedSearch, filterStatus, debouncedCustomId, pageSize]);

  const totalPages = Math.ceil(total / pageSize);
  const hasFilters = !!(search || filterStatus || filterCustomId);
  function clearFilters() { setSearch(""); setFilterStatus(""); setFilterCustomId(""); setPage(1); }

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-[90%] space-y-3">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-fuchsia-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-fuchsia-500 to-purple-600" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <Link
              href="/clinical-laboratory/quality-management"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card/80 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft size={13} />
            </Link>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-md shadow-fuchsia-500/30">
              <Award size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground">
                Gestão da qualidade <span className="mx-0.5">/</span>{" "}
                <span className="font-medium text-foreground">Competências</span>
              </p>
              <h1 className="text-base font-bold leading-tight text-foreground">
                Avaliações de competência
                {total > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({total})</span>
                )}
              </h1>
            </div>

            <Link
              href="/clinical-laboratory/quality-management/competencies/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-purple-600 px-4 text-xs font-semibold text-white shadow-md shadow-fuchsia-500/30 transition hover:from-fuchsia-700 hover:to-purple-700"
            >
              <Plus size={13} /> Nova avaliação
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
              placeholder="Pesquisar atividade / competência…"
              className="w-full rounded-lg border border-border bg-card py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={10} />
              </button>
            )}
          </div>

          <div className="relative w-36">
            <Hash size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={filterCustomId}
              onChange={(e) => setFilterCustomId(e.target.value)}
              placeholder="Nº  ex: QCMP-0001"
              className="w-full rounded-lg border border-border bg-card py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
            />
            {filterCustomId && (
              <button onClick={() => setFilterCustomId("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={10} />
              </button>
            )}
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-border bg-card py-1.5 pl-2.5 pr-6 text-xs text-foreground outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
          >
            <option value="">Todos os estados</option>
            {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-lg border border-border bg-card py-1.5 pl-2.5 pr-6 text-xs text-foreground outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
          >
            {PAGE_SIZE_OPTS.map((n) => (
              <option key={n} value={n}>{n} / página</option>
            ))}
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
        {!loading && !error && rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
            <Award size={28} className="mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Nenhuma avaliação de competência encontrada.</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-1.5 text-xs text-fuchsia-600 underline dark:text-fuchsia-400">
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* ── Grid de cards ─────────────────────────────────────── */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6">
          {rows.map((c, idx) => {
            const tone     = TONES[idx % TONES.length];
            const topBar   = STATUS_TOP[c.status]   ?? "bg-slate-400";
            const badgeCls = STATUS_BADGE[c.status] ?? "bg-muted text-foreground";
            const dotCls   = STATUS_DOT[c.status]   ?? "bg-slate-400";
            const sLbl     = STATUS_LABEL[c.status] ?? c.status;
            const aDate    = fmtDate(c.assessment_date);
            const eDate    = fmtDate(c.expiry_date);
            const expiring = isExpiringSoon(c.expiry_date);

            return (
              <Link
                key={c.id}
                href={`/clinical-laboratory/quality-management/competencies/${c.id}`}
                className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/80 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-fuchsia-300/60 dark:hover:border-fuchsia-700/40"
              >
                <span className={`absolute inset-x-0 top-0 h-0.5 ${topBar}`} />

                <div className="flex flex-col gap-2 p-3 pt-3.5">
                  <div className="flex items-start gap-2">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone.icon}`}>
                      <Award size={13} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                      <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${badgeCls}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />
                        {sLbl}
                      </span>
                    </div>
                  </div>

                  <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-foreground group-hover:text-fuchsia-700 dark:group-hover:text-fuchsia-300">
                    {c.area}
                  </p>

                  <div className="space-y-0.5">
                    {c.staff_display && (
                      <p className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                        <User size={9} className="shrink-0" /> {c.staff_display}
                      </p>
                    )}
                    {c.assessed_by_display && (
                      <p className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                        <UserCheck size={9} className="shrink-0" /> Avaliador: {c.assessed_by_display}
                      </p>
                    )}
                    {c.related_test_display && (
                      <p className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                        <FlaskConical size={9} className="shrink-0" /> {c.related_test_display}
                      </p>
                    )}
                    {aDate && (
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <CalendarDays size={9} className="shrink-0" /> {aDate}
                      </p>
                    )}
                    {eDate && (
                      <p className={`flex items-center gap-1 text-[10px] ${expiring ? "font-semibold text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>
                        <Clock size={9} className="shrink-0" /> Validade: {eDate}
                      </p>
                    )}
                  </div>

                  <span className="self-start font-mono text-[9px] text-muted-foreground/60">{c.custom_id}</span>
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
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${pg === page ? "border-fuchsia-500 bg-fuchsia-600 text-white" : "border-border bg-card text-foreground hover:bg-muted"}`}>
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
