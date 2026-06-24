"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  FlaskConical,
  Loader2,
  Plus,
  Search,
  XCircle,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetchList } from "@/lib/api";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

// ── Types ─────────────────────────────────────────────────────────────────────

type LabTest = {
  id: number;
  custom_id: string;
  code: string;
  name: string;
  sector: number;
  sector_name: string;
  sector_code: string;
  sample_type: string;
  sample_type_display?: string;
  method: string;
  unit: string;
  price: string;
  turnaround_hours: number;
  requires_fasting: boolean;
  requires_consent: boolean;
  active: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const SAMPLE_LABELS: Record<string, string> = {
  SANGUE_TOTAL: "Sangue total", SORO: "Soro", PLASMA: "Plasma", URINA: "Urina",
  FEZES: "Fezes", ESCARRO: "Escarro", LCR: "Líquor", ZARAGATOA: "Swab",
  SEMEN: "Sémen", MEDULA: "Medula", LIQUIDO: "Líquido", OUTRO: "Outro",
};

function fmtPrice(val: string | number) {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return n.toLocaleString("pt-PT", { style: "currency", currency: "MZN" });
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 24;

export default function LabTestsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [tests, setTests] = useState<LabTest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"" | "true" | "false">("");
  const [filterSampleType, setFilterSampleType] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, any> = { page, page_size: PAGE_SIZE };
      if (debouncedSearch) query.search = debouncedSearch;
      if (filterActive !== "") query.active = filterActive;
      if (filterSampleType) query.sample_type = filterSampleType;
      const res = await apiFetchList<LabTest>("/clinical_laboratory/test/", {
        page, pageSize: PAGE_SIZE, query,
        clientCache: safeRefreshToken === 0, clientCacheTtlMs: 20000,
      });
      setTests(res.items);
      setTotal(res.meta.total ?? res.items.length);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar exames.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filterActive, filterSampleType, safeRefreshToken]);

  useEffect(() => { setPage(1); }, [debouncedSearch, filterActive, filterSampleType]);
  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="space-y-3">

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                <FlaskConical size={16} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">Catálogo de exames</h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? "Carregando…" : `${total} exame${total !== 1 ? "s" : ""} no catálogo`}
                </p>
              </div>
            </div>
            <Link href="/clinical-laboratory/tests/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700">
              <Plus size={13} /> Novo exame
            </Link>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por nome, código ou método…"
              className="h-8 w-full rounded-lg border border-border bg-card pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25" />
          </div>
          <select value={filterSampleType} onChange={(e) => setFilterSampleType(e.target.value)}
            className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground outline-none transition focus:border-violet-500">
            <option value="">Todos os tipos</option>
            {Object.entries(SAMPLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filterActive} onChange={(e) => setFilterActive(e.target.value as any)}
            className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground outline-none transition focus:border-violet-500">
            <option value="">Todos os estados</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
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
        ) : tests.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <FlaskConical size={28} className="text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhum exame encontrado.</p>
            <Link href="/clinical-laboratory/tests/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white">
              <Plus size={13} /> Criar primeiro exame
            </Link>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {tests.map((t) => (
              <Link key={t.id} href={`/clinical-laboratory/tests/${t.id}`}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:border-violet-300/50 hover:shadow-md dark:bg-white/5 dark:border-white/10 dark:hover:border-violet-500/30">

                {/* Active indicator */}
                <span className={`absolute left-0 top-0 h-full w-1 ${t.active ? "bg-emerald-400" : "bg-red-300 dark:bg-red-600"}`} />

                <div className="flex flex-1 flex-col gap-2 px-4 py-3 pl-5">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono text-muted-foreground">{t.code || t.custom_id}</p>
                      <p className="font-semibold text-sm text-foreground leading-snug">{t.name || "—"}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        t.active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400"
                          : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-400"
                      }`}>
                        {t.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>

                  {/* Sector + sample type */}
                  <div className="flex flex-wrap gap-1.5">
                    {t.sector_name && (
                      <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-400">
                        {t.sector_name}
                      </span>
                    )}
                    {t.sample_type && (
                      <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {SAMPLE_LABELS[t.sample_type] ?? t.sample_type}
                      </span>
                    )}
                    {t.requires_fasting && (
                      <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-400">
                        Jejum
                      </span>
                    )}
                  </div>

                  {/* Method + unit */}
                  {(t.method || t.unit) && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {[t.method, t.unit ? `(${t.unit})` : ""].filter(Boolean).join(" ")}
                    </p>
                  )}

                  {/* Footer: price + turnaround */}
                  <div className="flex items-center justify-between border-t border-border/40 pt-1.5">
                    <span className="text-xs font-semibold text-foreground">{fmtPrice(t.price)}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock size={10} /> {t.turnaround_hours}h
                    </span>
                    <ChevronRight size={13} className="text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-muted-foreground">
              Página {page} de {totalPages} · {total} exames
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
