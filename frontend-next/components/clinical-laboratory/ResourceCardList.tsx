"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Loader2, Plus, Search, type LucideIcon } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetchList } from "@/lib/api";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

// ── Shared visual helpers (padrão do catálogo: tests/panels) ────────────────────

type Tone = "violet" | "gray" | "emerald" | "red" | "amber" | "blue" | "indigo";

const TONE_CLASSES: Record<Tone, string> = {
  violet: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-400",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700/30 dark:bg-indigo-900/20 dark:text-indigo-400",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400",
  red: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-400",
  amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-400",
  blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-400",
  gray: "border-border bg-muted text-muted-foreground",
};

export function Pill({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}

export function StatusPill({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}

export function CardTitle({ code, name }: { code?: string; name?: string }) {
  return (
    <div className="min-w-0">
      {code ? <p className="text-[10px] font-mono text-muted-foreground">{code}</p> : null}
      <p className="font-semibold text-sm text-foreground leading-snug">{name || "—"}</p>
    </div>
  );
}

export function CardFooter({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-1.5">
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">{left}</span>
      {right ? <span className="text-xs font-semibold text-foreground">{right}</span> : null}
    </div>
  );
}

export function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

// ── List shell ──────────────────────────────────────────────────────────────────

export type SelectFilter = {
  key: string;
  allLabel: string;
  options: { value: string; label: string }[];
};

export type ResourceCardListProps<T extends { id: number }> = {
  endpoint: string;
  basePath: string;
  title: string;
  icon: LucideIcon;
  countNoun: [string, string];
  searchPlaceholder: string;
  newLabel?: string;
  filters?: SelectFilter[];
  pageSize?: number;
  getActive?: (item: T) => boolean | undefined;
  renderCard: (item: T) => ReactNode;
  emptyText?: string;
};

export default function ResourceCardList<T extends { id: number }>({
  endpoint,
  basePath,
  title,
  icon: Icon,
  countNoun,
  searchPlaceholder,
  newLabel,
  filters = [],
  pageSize = 24,
  getActive,
  renderCard,
  emptyText = "Nenhum registo encontrado.",
}: ResourceCardListProps<T>) {
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
  }, [search]);

  const filtersKey = JSON.stringify(filterValues);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, any> = { page, page_size: pageSize };
      if (debouncedSearch) query.search = debouncedSearch;
      for (const [k, v] of Object.entries(filterValues)) {
        if (v) query[k] = v;
      }
      const res = await apiFetchList<T>(endpoint, {
        page, pageSize, query,
        clientCache: safeRefreshToken === 0, clientCacheTtlMs: 20000,
      });
      setItems(res.items);
      setTotal(res.meta.total ?? res.items.length);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, page, pageSize, debouncedSearch, filtersKey, safeRefreshToken]);

  useEffect(() => { setPage(1); }, [debouncedSearch, filtersKey]);
  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [singular, plural] = countNoun;

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="space-y-3">

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                <Icon size={16} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">{title}</h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? "Carregando…" : `${total} ${total !== 1 ? plural : singular}`}
                </p>
              </div>
            </div>
            {newLabel && (
              <Link href={`${basePath}/new`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700">
                <Plus size={13} /> {newLabel}
              </Link>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 w-full rounded-lg border border-border bg-card pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25" />
          </div>
          {filters.map((f) => (
            <select key={f.key} value={filterValues[f.key] ?? ""}
              onChange={(e) => setFilterValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground outline-none transition focus:border-violet-500">
              <option value="">{f.allLabel}</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> Carregando…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Icon size={28} className="text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{emptyText}</p>
            {newLabel && (
              <Link href={`${basePath}/new`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white">
                <Plus size={13} /> {newLabel}
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const active = getActive ? getActive(item) : undefined;
              return (
                <Link key={item.id} href={`${basePath}/${item.id}`}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:border-violet-300/50 hover:shadow-md dark:bg-white/5 dark:border-white/10 dark:hover:border-violet-500/30">
                  {active !== undefined && (
                    <span className={`absolute left-0 top-0 h-full w-1 ${active ? "bg-emerald-400" : "bg-red-300 dark:bg-red-600"}`} />
                  )}
                  <div className={`flex flex-1 flex-col gap-2 px-4 py-3 ${active !== undefined ? "pl-5" : ""}`}>
                    {renderCard(item)}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-muted-foreground">
              Página {page} de {totalPages} · {total} {plural}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="h-7 rounded-lg border border-border bg-card px-3 text-xs text-foreground transition hover:bg-muted disabled:opacity-40">
                ← Anterior
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="h-7 rounded-lg border border-border bg-card px-3 text-xs text-foreground transition hover:bg-muted disabled:opacity-40">
                Seguinte →
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
