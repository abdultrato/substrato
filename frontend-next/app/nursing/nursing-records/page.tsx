"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Clipboard, Clock3, FileHeart, FlaskConical, Loader2, MapPin, Plus, Search, User } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import PageSizeInput from "@/components/ui/PageSizeInput";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetchList } from "@/lib/api";
import { formatCount } from "@/lib/i18n/plural";
import { GROUPS } from "@/lib/rbac";

type NursingRecord = {
  id: number;
  custom_id?: string | null;
  name?: string | null;
  patient?: number | null;
  patient_name?: string | null;
  ward_name?: string | null;
  record_kind?: "MANUAL" | "LAB_COLLECTION_REQUEST" | string | null;
  origin_role?: string | null;
  priority?: "URG" | "NOR" | "BAI" | string | null;
  observation?: string | null;
  lab_request_code?: string | null;
  lab_request_status?: string | null;
  record_date?: string | null;
  created_at?: string | null;
};

const DEFAULT_PAGE_SIZE = 50;

const priorityDetails: Record<string, { label: string; bar: string; badge: string }> = {
  URG: {
    label: "Urgente",
    bar: "bg-red-400",
    badge: "border-red-200/60 bg-red-50/50 text-red-700 dark:border-red-700/30 dark:bg-red-950/30 dark:text-red-300",
  },
  NOR: {
    label: "Normal",
    bar: "bg-emerald-400",
    badge: "border-emerald-200/60 bg-emerald-50/50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  BAI: {
    label: "Baixa",
    bar: "bg-sky-400",
    badge: "border-sky-200/60 bg-sky-50/50 text-sky-700 dark:border-sky-700/30 dark:bg-sky-950/30 dark:text-sky-300",
  },
};

function formatDate(value?: string | null) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

export default function NursingNursingRecordsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [records, setRecords] = useState<NursingRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string | number> = { page, page_size: pageSize };
      if (debouncedSearch) query.search = debouncedSearch;

      const response = await apiFetchList<NursingRecord>("/nursing/nursing_record/", {
        page,
        pageSize,
        query,
        clientPaginate: true,
        clientCache: safeRefreshToken === 0,
        clientCacheTtlMs: 20000,
      });
      setRecords(response.items || []);
      setTotal(response.meta.total ?? response.items.length);
    } catch (reason: any) {
      setError(reason?.message || "Não foi possível carregar os registos de enfermagem.");
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, pageSize, safeRefreshToken]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-3">
        <section className="relative overflow-hidden rounded-xl border border-emerald-200/30 bg-gradient-to-br from-emerald-100/[0.07] via-white/[0.02] to-teal-100/[0.04] px-4 py-3 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-emerald-800/20 dark:from-emerald-950/[0.06] dark:via-white/[0.015] dark:to-teal-950/[0.04]">
          <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25">
                <FileHeart size={17} />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-foreground">Registos de enfermagem</h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? "A carregar…" : formatCount(total, { one: "registo encontrado", other: "registos encontrados" })}
                </p>
              </div>
            </div>
            <Link href="/nursing/nursing-records/new" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 text-xs font-semibold text-white shadow-md shadow-emerald-500/25 transition hover:from-emerald-700 hover:to-teal-700">
              <Plus size={13} /> Novo registo
            </Link>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Pesquisar registos</span>
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar por paciente, enfermaria, requisição, observação ou código…"
              className="h-8 w-full rounded-lg border border-white/30 bg-white/[0.06] pl-7 pr-3 text-xs text-foreground outline-none backdrop-blur-xl transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-white/10 dark:bg-white/[0.03]"
            />
          </label>
          <label className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/30 bg-white/[0.06] px-2.5 text-[10px] font-medium text-muted-foreground backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
            Mostrar
            <PageSizeInput value={pageSize} onChange={setPageSize} ariaLabel="Número de registos por página, de 1 a 999" />
            por página
          </label>
        </div>

        {error ? <div className="rounded-xl border border-red-200/60 bg-red-50/30 px-4 py-3 text-sm text-red-800 backdrop-blur-xl dark:border-red-800/40 dark:bg-red-950/15 dark:text-red-300">{error}</div> : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> A carregar registos…</div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/30 bg-white/[0.03] py-16 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.015]">
            <Clipboard size={26} className="text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">Nenhum registo encontrado</p>
            <p className="text-xs text-muted-foreground">Altere a pesquisa ou crie um novo registo.</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {records.map((record) => {
              const priority = priorityDetails[record.priority || ""] || priorityDetails.NOR;
              const isLabRequest = record.record_kind === "LAB_COLLECTION_REQUEST";
              return (
                <Link key={record.id} href={`/nursing/nursing-records/${record.id}`} className="group relative min-h-[166px] overflow-hidden rounded-xl border border-emerald-200/30 bg-gradient-to-br from-emerald-100/[0.06] via-white/[0.02] to-teal-100/[0.035] shadow-md shadow-slate-900/5 backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-emerald-300/60 hover:shadow-lg dark:border-emerald-800/20 dark:from-emerald-950/[0.05] dark:via-white/[0.015] dark:to-teal-950/[0.03]">
                  <span className={`absolute inset-x-0 top-0 h-1 ${priority.bar}`} />
                  <div className="flex h-full flex-col gap-2 p-3.5 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{record.custom_id || `REG-${record.id}`}</p>
                        <h2 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-foreground">{record.name || "Registo de enfermagem"}</h2>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${priority.badge}`}>{priority.label}</span>
                    </div>

                    <div className="grid gap-1 text-[10px] text-muted-foreground">
                      <p className="flex min-w-0 items-center gap-1"><User size={10} className="shrink-0" /><span className="truncate">{record.patient_name || `Paciente #${record.patient || "—"}`}</span></p>
                      <p className="flex min-w-0 items-center gap-1"><MapPin size={10} className="shrink-0" /><span className="truncate">{record.ward_name || "Sem enfermaria associada"}</span></p>
                      <p className="flex min-w-0 items-center gap-1">{isLabRequest ? <FlaskConical size={10} className="shrink-0" /> : <FileHeart size={10} className="shrink-0" />}<span className="truncate">{isLabRequest ? `Coleta laboratorial${record.lab_request_code ? ` · ${record.lab_request_code}` : ""}` : "Registo manual"}</span></p>
                    </div>

                    {record.observation ? <p className="line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">{record.observation}</p> : null}

                    <div className="mt-auto flex items-center justify-between border-t border-white/20 pt-2 text-[10px] text-muted-foreground dark:border-white/[0.06]">
                      <span className="inline-flex items-center gap-1"><Clock3 size={10} /> {formatDate(record.record_date || record.created_at)}</span>
                      <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-700 dark:text-emerald-300">Detalhes <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" /></span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-muted-foreground">Página {page} de {totalPages} · {total} registos</p>
            <div className="flex gap-1">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="h-7 rounded-lg border border-white/30 bg-white/[0.05] px-3 text-xs text-foreground backdrop-blur-xl transition hover:bg-white/10 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.03]">← Anterior</button>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="h-7 rounded-lg border border-white/30 bg-white/[0.05] px-3 text-xs text-foreground backdrop-blur-xl transition hover:bg-white/10 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.03]">Seguinte →</button>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
