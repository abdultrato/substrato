"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ClipboardList,
  Clock,
  HeartPulse,
  Loader2,
  Plus,
  Search,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetchList } from "@/lib/api";
import { formatCount } from "@/lib/i18n/plural";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS } from "@/lib/rbac";

type ProcedureRow = {
  id: number;
  custom_id?: string | null;
  patient_name?: string;
  ward_name?: string;
  professional_name?: string;
  professional_names?: string | string[];
  workflow_status?: string | null;
  workflow_status_display?: string;
  billing_status?: string | null;
  billing_status_display?: string;
  items_count?: number;
  performed_date?: string | null;
  created_at?: string | null;
  notes?: string | null;
  selected_catalogs?: Array<number | string> | null;
};

type CatalogRow = {
  id?: number;
  name?: string;
  nome?: string;
};

const PAGE_SIZE = 24;

const WORKFLOW_OPTIONS = [
  { value: "", label: "Todos os fluxos" },
  { value: "REQ", label: "Requisitados" },
  { value: "EXE", label: "Em execução" },
  { value: "CON", label: "Concluídos" },
  { value: "PAR", label: "Parciais" },
  { value: "NCO", label: "Não concluídos" },
  { value: "BIL", label: "Faturados" },
];

const BILLING_OPTIONS = [
  { value: "", label: "Toda faturação" },
  { value: "PEN", label: "Pendentes" },
  { value: "PAR", label: "Parciais" },
  { value: "BIL", label: "Faturados" },
];

type ProcedureColumn = "pending" | "partial" | "completed";

const PROCEDURE_COLUMNS: Array<{
  key: ProcedureColumn;
  label: string;
  headerClass: string;
  countClass: string;
}> = [
  {
    key: "pending",
    label: "Pendentes",
    headerClass: "border-violet-200/70 bg-violet-50/70 dark:border-violet-800/40 dark:bg-violet-950/20",
    countClass: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  },
  {
    key: "partial",
    label: "Parciais",
    headerClass: "border-amber-200/70 bg-amber-50/70 dark:border-amber-800/40 dark:bg-amber-950/20",
    countClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  {
    key: "completed",
    label: "Concluídos",
    headerClass: "border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-800/40 dark:bg-emerald-950/20",
    countClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
];

function procedureColumn(status: string | null | undefined): ProcedureColumn {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "PAR") return "partial";
  if (normalized === "CON" || normalized === "BIL") return "completed";
  return "pending";
}

function normalizeProfessionalNames(value: ProcedureRow["professional_names"], fallback?: string): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return fallback ? [fallback] : [];
}

function normalizeCatalogIds(value: ProcedureRow["selected_catalogs"]): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function fmtDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
}

function workflowStripe(status: string | null | undefined) {
  switch (String(status || "").toUpperCase()) {
    case "CON":
    case "BIL":
      return "bg-emerald-400";
    case "EXE":
      return "bg-sky-400";
    case "PAR":
      return "bg-amber-400";
    case "NCO":
      return "bg-red-300 dark:bg-red-600";
    default:
      return "bg-violet-300 dark:bg-violet-600";
  }
}

function workflowBadge(status: string | null | undefined) {
  switch (String(status || "").toUpperCase()) {
    case "CON":
    case "BIL":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400";
    case "EXE":
      return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-400";
    case "PAR":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-400";
    case "NCO":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-400";
    default:
      return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-400";
  }
}

function billingBadge(status: string | null | undefined) {
  switch (String(status || "").toUpperCase()) {
    case "BIL":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400";
    case "PAR":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-400";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export default function NursingProceduresPage() {
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [procedures, setProcedures] = useState<ProcedureRow[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState("");
  const [billingStatus, setBillingStatus] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
  }, [search]);

  useEffect(() => {
    let mounted = true;

    async function loadCatalogs() {
      try {
        const res = await apiFetchList<CatalogRow>("/nursing/procedure_catalog/", {
          page: 1,
          pageSize: 200,
          clientPaginate: true,
          clientCache: safeRefreshToken === 0,
        });
        if (!mounted) return;
        setCatalogs(res.items || []);
      } catch {
        if (!mounted) return;
        setCatalogs([]);
      }
    }

    loadCatalogs();
    return () => {
      mounted = false;
    };
  }, [safeRefreshToken]);

  const catalogNameById = useMemo(() => {
    const next = new Map<number, string>();
    for (const catalog of catalogs) {
      const id = Number(catalog?.id);
      const name = String(catalog?.name || catalog?.nome || "").trim();
      if (Number.isInteger(id) && id > 0 && name) next.set(id, name);
    }
    return next;
  }, [catalogs]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string | number | boolean> = { page, page_size: PAGE_SIZE };
      if (debouncedSearch) query.search = debouncedSearch;
      if (workflowStatus) query.workflow_status = workflowStatus;
      if (billingStatus) query.billing_status = billingStatus;

      const res = await apiFetchList<ProcedureRow>("/nursing/procedure/", {
        page,
        pageSize: PAGE_SIZE,
        query,
        clientCache: safeRefreshToken === 0,
        clientCacheTtlMs: 20000,
      });

      setProcedures(res.items);
      setTotal(res.meta.total ?? res.items.length);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar procedimentos.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, workflowStatus, billingStatus, safeRefreshToken]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, workflowStatus, billingStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const proceduresByColumn = useMemo(() => {
    const grouped: Record<ProcedureColumn, ProcedureRow[]> = {
      pending: [],
      partial: [],
      completed: [],
    };

    for (const procedure of procedures) {
      grouped[procedureColumn(procedure.workflow_status)].push(procedure);
    }

    return grouped;
  }, [procedures]);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-1.5">
        <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/[0.04] dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-1 px-3 py-2 pl-4">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                <HeartPulse size={14} />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold leading-tight text-foreground">Procedimentos de enfermagem</h1>
                <p className="truncate text-[10px] text-muted-foreground">
                  {loading ? "Carregando…" : formatCount(total, { one: "procedimento na listagem", other: "procedimentos na listagem" })}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <div className="relative">
                <Search size={11} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar…"
                  className="h-8 w-36 rounded-lg border border-border bg-background/60 pl-6 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:w-52 focus:ring-2 focus:ring-violet-500/40 transition-all"
                />
              </div>
              <select
                value={workflowStatus}
                onChange={(event) => setWorkflowStatus(event.target.value)}
                className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground outline-none transition focus:border-violet-500"
              >
                {WORKFLOW_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={billingStatus}
                onChange={(event) => setBillingStatus(event.target.value)}
                className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground outline-none transition focus:border-violet-500"
              >
                {BILLING_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {(search || workflowStatus || billingStatus) && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setWorkflowStatus(""); setBillingStatus(""); }}
                  className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground transition hover:bg-muted"
                >
                  Limpar
                </button>
              )}
            </div>

            <Link
              href="/nursing/procedures/new"
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-2.5 text-xs font-semibold text-white shadow-sm shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700"
            >
              <Plus size={12} /> Novo procedimento
            </Link>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> Carregando…
          </div>
        ) : procedures.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <ClipboardList size={28} className="text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhum procedimento encontrado.</p>
            <Link
              href="/nursing/procedures/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white"
            >
              <Plus size={13} /> Criar primeiro procedimento
            </Link>
          </div>
        ) : (
          <div className="grid items-start gap-3 lg:grid-cols-3">
            {PROCEDURE_COLUMNS.map((column) => (
              <section
                key={column.key}
                className={`overflow-hidden rounded-xl border ${column.headerClass}`}
              >
                <div className="flex items-center justify-between border-b border-inherit px-3 py-2.5">
                  <h2 className="text-xs font-bold uppercase tracking-wide text-foreground">{column.label}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${column.countClass}`}>
                    {proceduresByColumn[column.key].length}
                  </span>
                </div>

                <div className="space-y-2 bg-background/35 p-2">
                  {proceduresByColumn[column.key].length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/70 px-3 py-8 text-center text-xs text-muted-foreground">
                      Nenhum procedimento nesta coluna.
                    </p>
                  ) : null}

                  {proceduresByColumn[column.key].map((procedure) => {
                    const code = procedure.custom_id || `PROC-${procedure.id}`;
                    const professionals = normalizeProfessionalNames(procedure.professional_names, procedure.professional_name);
                    const catalogNames = normalizeCatalogIds(procedure.selected_catalogs)
                      .map((catalogId) => catalogNameById.get(catalogId))
                      .filter((item): item is string => Boolean(item));

                    return (
                      <Link
                        key={procedure.id}
                        href={`/nursing/procedures/${procedure.id}`}
                        className="group relative flex flex-col overflow-hidden rounded-xl border border-white/20 bg-white/70 shadow-sm backdrop-blur-sm transition hover:border-violet-300/50 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:border-violet-500/30"
                      >
                  <span className={`absolute left-0 top-0 h-full w-1 ${workflowStripe(procedure.workflow_status)}`} />

                  <div className="flex flex-1 flex-col gap-2 px-4 py-3 pl-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono text-muted-foreground">{code}</p>
                        <p className="text-sm font-semibold leading-snug text-foreground">
                          {procedure.patient_name || "Paciente sem nome"}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${workflowBadge(procedure.workflow_status)}`}>
                          {procedure.workflow_status_display || procedure.workflow_status || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {procedure.ward_name ? (
                        <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-400">
                          {procedure.ward_name}
                        </span>
                      ) : null}
                      {catalogNames.slice(0, 2).map((catalogName) => (
                        <span
                          key={`${procedure.id}-${catalogName}`}
                          className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {catalogName}
                        </span>
                      ))}
                      {catalogNames.length > 2 ? (
                        <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          +{catalogNames.length - 2}
                        </span>
                      ) : null}
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${billingBadge(procedure.billing_status)}`}>
                        {procedure.billing_status_display || procedure.billing_status || "Sem faturação"}
                      </span>
                    </div>

                    {(professionals.length || procedure.notes) && (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {professionals.length
                          ? professionals.join(", ")
                          : procedure.notes || "Sem observações"}
                      </p>
                    )}

                    <div className="flex items-center justify-between border-t border-border/40 pt-1.5">
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock size={10} /> {fmtDate(procedure.performed_date || procedure.created_at)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        {procedure.items_count ?? 0} item(ns)
                        <ChevronRight size={13} className="opacity-0 transition group-hover:opacity-100" />
                      </span>
                    </div>
                  </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-muted-foreground">
              Página {page} de {totalPages} · {total} procedimentos
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="h-7 rounded-lg border border-border bg-card px-3 text-xs text-foreground transition hover:bg-muted disabled:opacity-40"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                className="h-7 rounded-lg border border-border bg-card px-3 text-xs text-foreground transition hover:bg-muted disabled:opacity-40"
              >
                Seguinte →
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
