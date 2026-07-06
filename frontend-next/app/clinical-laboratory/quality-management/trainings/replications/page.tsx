"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarDays, Copy, Loader2, Search, Users } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

type Replication = {
  id: number;
  custom_id: string;
  original: number;
  replicator_display?: string;
  participants_display?: { id: number; label: string }[];
  replication_date: string | null;
  created_at: string;
};

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d.includes("T") ? d : d + "T00:00:00").toLocaleDateString("pt-MZ", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function ReplicationsListPage() {
  const [items, setItems] = useState<Replication[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 24;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    const query: Record<string, string> = {};
    if (debouncedSearch.trim()) query.search = debouncedSearch.trim();
    apiFetchList<Replication>("/clinical_laboratory/training_replication/", {
      page, pageSize: PAGE_SIZE, query,
    })
      .then(({ items: rows, meta }) => {
        setItems(rows);
        setTotal(meta.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, debouncedSearch]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-[90%] space-y-3">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <nav className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Link href="/clinical-laboratory/quality-management/trainings" className="hover:underline">
                Registos de formação
              </Link>
              <span>/</span>
              <span>Réplicas</span>
            </nav>
            <h1 className="mt-0.5 text-lg font-bold text-foreground">Réplicas de formação</h1>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar…"
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 size={20} className="animate-spin text-violet-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            <Copy size={32} className="opacity-30" />
            Nenhuma réplica encontrada.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((rep) => (
              <Link key={rep.id}
                href={`/clinical-laboratory/quality-management/trainings/replications/${rep.id}`}
                className="group relative overflow-hidden rounded-xl border border-white/20 bg-white/25 p-4 shadow-sm backdrop-blur-sm transition hover:border-violet-300 hover:shadow-md dark:bg-white/5 dark:border-white/10 dark:hover:border-violet-700/50">
                <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-violet-500 opacity-60 transition group-hover:opacity-100" />
                <div className="pl-2 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Copy size={13} className="shrink-0 text-violet-600 dark:text-violet-400" />
                      <span className="font-mono text-[9px] text-muted-foreground">{rep.custom_id}</span>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-medium text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                      Réplica
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-snug line-clamp-1">
                    Réplica #{rep.id}
                  </p>
                  <div className="space-y-0.5">
                    {rep.replicator_display && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Users size={9} className="shrink-0" />
                        <span className="truncate">{rep.replicator_display}</span>
                      </div>
                    )}
                    {rep.replication_date && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <CalendarDays size={9} className="shrink-0" />
                        {fmtDate(rep.replication_date)}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <BookOpen size={9} className="shrink-0" />
                      Formação #{rep.original}
                    </div>
                  </div>
                  {(rep.participants_display ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-0.5 pt-0.5">
                      {(rep.participants_display ?? []).slice(0, 3).map((p) => (
                        <span key={p.id} className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[9px] font-medium text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300">
                          {p.label}
                        </span>
                      ))}
                      {(rep.participants_display ?? []).length > 3 && (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] text-slate-500 dark:border-slate-700/40 dark:bg-slate-900/20">
                          +{(rep.participants_display ?? []).length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="inline-flex h-7 items-center rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40">
              Anterior
            </button>
            <span className="text-[11px] text-muted-foreground">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="inline-flex h-7 items-center rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40">
              Próxima
            </button>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
