"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  FileWarning,
  Hash,
  Loader2,
  Plus,
  Search,
  User,
  Wrench,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import {
  ACTION_TYPES,
  BASE_PATH,
  EDIT_GROUPS,
  ENDPOINT,
  STATUS_CHOICES,
  T_NONCONFORMITY,
  T_RESPONSIBLE,
  type CorrectiveAction,
  pickLabel,
} from "./_form";

const TERMINAL_STATUSES = new Set(["CONCLUIDA", "VERIFICADA", "FECHADA"]);

function fmtDate(value: string | null | undefined) {
  if (!value) return "Sem prazo";
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("pt-MZ", { day: "2-digit", month: "short", year: "numeric" });
}

function isOverdue(row: CorrectiveAction) {
  if (!row.due_date || TERMINAL_STATUSES.has(row.status || "")) return false;
  const due = new Date(`${String(row.due_date).slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return !Number.isNaN(due.getTime()) && due < today;
}

function labelFor(value: string | undefined, choices: typeof ACTION_TYPES) {
  return choices.find((item) => item.value === value) ?? choices[0];
}

function statusFor(value: string | undefined) {
  return STATUS_CHOICES.find((item) => item.value === value) ?? STATUS_CHOICES[0];
}

function shortText(value: string | null | undefined, fallback = "Ação corretiva/preventiva") {
  const text = String(value || "").trim();
  return text || fallback;
}

function normalizeCapaNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const number = Math.min(999, Math.max(1, Number(digits)));
  return String(number);
}

function capaNumberToCustomId(value: string) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 999) return "";
  return `QCA-${String(number).padStart(4, "0")}`;
}

function normalizePositiveNumber(value: string, max = 999) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const number = Math.min(max, Math.max(1, Number(digits)));
  return String(number);
}

function unwrapRelationRow(row: Record<string, any>) {
  if (row?.data && typeof row.data === "object" && !Array.isArray(row.data)) return row.data;
  if (row?.result && typeof row.result === "object" && !Array.isArray(row.result)) return row.result;
  if (Array.isArray(row?.results) && row.results[0]) return row.results[0];
  return row;
}

function userLabel(row: Record<string, any>, fallback: string) {
  const data = unwrapRelationRow(row);
  const fullName = [data?.first_name, data?.last_name].filter(Boolean).join(" ").trim();
  const pieces = [
    data?.full_name,
    data?.display_name,
    data?.name,
    data?.nome,
    fullName,
    data?.username,
    data?.email,
    data?.phone,
  ];
  return pieces.map((item) => String(item || "").trim()).find(Boolean) || fallback;
}

function relationLabel(row: Record<string, any>, target: typeof T_RESPONSIBLE, fallback: string) {
  const data = unwrapRelationRow(row);
  return pickLabel(data, target) || fallback;
}

export default function CorrectiveActionsListPage() {
  const [rows, setRows] = useState<CorrectiveAction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCustomId, setFilterCustomId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSizeInput, setPageSizeInput] = useState("24");
  const pageSize = Number(pageSizeInput) || 24;

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedCustomId, setDebouncedCustomId] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const labelCache = useRef(new Map<string, string>());
  const [relationLabels, setRelationLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setDebouncedCustomId(filterCustomId);
    }, 300);
  }, [search, filterCustomId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string> = {};
      const capaSearch = debouncedCustomId ? capaNumberToCustomId(debouncedCustomId) : "";
      const searchTerms = [debouncedSearch.trim(), capaSearch].filter(Boolean);
      if (searchTerms.length > 0) query.search = searchTerms.join(" ");
      if (filterStatus) query.status = filterStatus;
      if (filterType) query.action_type = filterType;

      const { items, meta } = await apiFetchList<CorrectiveAction>(ENDPOINT, { page, pageSize, query });
      setRows(items);
      setTotal(meta.total ?? items.length);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar ações corretivas.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterStatus, filterType, debouncedCustomId, page, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [debouncedSearch, filterStatus, filterType, debouncedCustomId, pageSize]);

  useEffect(() => {
    const missing: Array<{ key: string; endpoint: string; target: typeof T_RESPONSIBLE }> = [];
    for (const row of rows) {
      if (row.responsible) {
        const key = `responsible:${row.responsible}`;
        if (!labelCache.current.has(key)) missing.push({ key, endpoint: `/identity/user/${row.responsible}/`, target: T_RESPONSIBLE });
      }
      if (row.nonconformity) {
        const key = `nonconformity:${row.nonconformity}`;
        if (!labelCache.current.has(key)) missing.push({ key, endpoint: `/clinical_laboratory/nonconformity/${row.nonconformity}/`, target: T_NONCONFORMITY });
      }
    }
    if (missing.length === 0) return;

    let cancelled = false;
    Promise.all(
      missing.map(async ({ key, endpoint, target }) => {
        try {
          const row = await apiFetch<Record<string, any>>(endpoint);
          const fallback = key.startsWith("responsible:") ? `Responsável #${key.split(":")[1]}` : `Não conformidade #${key.split(":")[1]}`;
          const label = key.startsWith("responsible:") ? userLabel(row, fallback) : relationLabel(row, target, fallback);
          return [key, label] as const;
        } catch {
          return [key, key.startsWith("responsible:") ? `Responsável #${key.split(":")[1]}` : `Não conformidade #${key.split(":")[1]}`] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      for (const [key, label] of entries) labelCache.current.set(key, label);
      setRelationLabels(Object.fromEntries(labelCache.current));
    });

    return () => { cancelled = true; };
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = Boolean(search || filterStatus || filterType || filterCustomId);
  const openCount = useMemo(() => rows.filter((row) => !TERMINAL_STATUSES.has(row.status || "")).length, [rows]);
  const overdueCount = useMemo(() => rows.filter(isOverdue).length, [rows]);

  function clearFilters() {
    setSearch("");
    setFilterStatus("");
    setFilterType("");
    setFilterCustomId("");
    setPage(1);
  }

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <div className="mx-auto w-[90%] space-y-3">
        <div className="relative overflow-hidden rounded-xl border border-white/25 bg-white/35 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-orange-500 to-amber-600" />
          <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-orange-400/10 blur-2xl" />
          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3 pl-5">
            <Link href="/clinical-laboratory/quality-management" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card/80 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Voltar">
              <ArrowLeft size={13} />
            </Link>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/25">
              <Wrench size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground">
                Gestão da qualidade <span className="mx-0.5">/</span> <span className="font-medium text-foreground">CAPA</span>
              </p>
              <h1 className="text-base font-bold leading-tight text-foreground">
                Ações corretivas/preventivas
                {total > 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">({total})</span>}
              </h1>
              <div className="mt-0.5 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300">{openCount} abertas nesta página</span>
                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:border-red-700/40 dark:bg-red-900/15 dark:text-red-300">{overdueCount} atrasadas</span>
              </div>
            </div>
            <Link href={`${BASE_PATH}/new`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 px-4 text-xs font-semibold text-white shadow-md shadow-orange-500/25 transition hover:from-orange-700 hover:to-amber-700">
              <Plus size={13} /> Nova CAPA
            </Link>
          </div>

          <div className="relative flex flex-nowrap items-center gap-1.5 border-t border-white/20 bg-white/20 px-3 py-2 pl-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="relative min-w-0 flex-[1.4_1_180px]">
              <Search size={10} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar plano, código..." className="w-full rounded-md border border-border bg-card/85 py-1 pl-6 pr-6 text-[11px] text-foreground outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" />
              {search && <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground" aria-label="Limpar pesquisa"><X size={10} /></button>}
            </div>

            <div className="relative min-w-[86px] flex-[0.45_1_108px]">
              <Hash size={10} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={filterCustomId} onChange={(event) => setFilterCustomId(normalizeCapaNumber(event.target.value))} inputMode="numeric" pattern="[0-9]*" min={1} max={999} placeholder="1-999" className="w-full rounded-md border border-border bg-card/85 py-1 pl-6 pr-6 text-[11px] text-foreground outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" />
              {filterCustomId && <button type="button" onClick={() => setFilterCustomId("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground" aria-label="Limpar código"><X size={10} /></button>}
            </div>

            <select value={filterType} onChange={(event) => setFilterType(event.target.value)} className="min-w-[104px] flex-[0.5_1_118px] rounded-md border border-border bg-card/85 py-1 pl-2 pr-5 text-[11px] text-foreground outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20">
              <option value="">Todos os tipos</option>
              {ACTION_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>

            <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="min-w-[112px] flex-[0.55_1_128px] rounded-md border border-border bg-card/85 py-1 pl-2 pr-5 text-[11px] text-foreground outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20">
              <option value="">Todos os estados</option>
              {STATUS_CHOICES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>

            <input value={pageSizeInput} onChange={(event) => setPageSizeInput(normalizePositiveNumber(event.target.value))} inputMode="numeric" pattern="[0-9]*" min={1} max={999} aria-label="Itens por página" placeholder="Itens/pág." className="min-w-[82px] flex-[0.3_1_92px] rounded-md border border-border bg-card/85 py-1 pl-2 pr-2 text-[11px] text-foreground outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" />

            {hasFilters && (
              <button type="button" onClick={clearFilters} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card/85 px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <X size={10} /> Limpar
              </button>
            )}
            {loading && <Loader2 size={13} className="shrink-0 animate-spin text-muted-foreground" />}
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">{error}</div>}

        {!loading && !error && rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
            <ClipboardCheck size={28} className="mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Nenhuma CAPA encontrada.</p>
            {hasFilters && <button type="button" onClick={clearFilters} className="mt-1.5 text-xs text-orange-600 underline dark:text-orange-400">Limpar filtros</button>}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {rows.map((row) => {
            const typeMeta = labelFor(row.action_type, ACTION_TYPES);
            const statusMeta = statusFor(row.status);
            const dueLabel = fmtDate(row.due_date);
            const late = isOverdue(row);
            const responsibleLabel = row.responsible ? relationLabels[`responsible:${row.responsible}`] || `Responsável #${row.responsible}` : "Sem responsável";
            const nonconformityLabel = row.nonconformity ? relationLabels[`nonconformity:${row.nonconformity}`] || `Não conformidade #${row.nonconformity}` : "Sem vínculo";

            return (
              <Link key={row.id} href={`${BASE_PATH}/${row.id}`} className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/80 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-orange-300/60 hover:shadow-md dark:hover:border-orange-700/40">
                <span className={`absolute inset-x-0 top-0 h-0.5 ${late ? "bg-red-500" : statusMeta.bar}`} />
                <div className="flex flex-col gap-2 p-3 pt-3.5">
                  <div className="flex items-start gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300">
                      <Wrench size={13} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${typeMeta.chip}`}>{typeMeta.label}</span>
                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${late ? "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/15 dark:text-red-300" : statusMeta.chip}`}>{late ? "Atrasada" : statusMeta.label}</span>
                    </div>
                  </div>

                  <p className="line-clamp-3 text-[11px] font-semibold leading-snug text-foreground group-hover:text-orange-700 dark:group-hover:text-orange-300">
                    {shortText(row.description)}
                  </p>

                  <div className="space-y-0.5">
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <CalendarDays size={9} className="shrink-0" /> {dueLabel}
                      {row.completion_date && <span className="truncate text-muted-foreground/70">/ concluída {fmtDate(row.completion_date)}</span>}
                    </p>
                    <p className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                      <User size={9} className="shrink-0" /> {responsibleLabel}
                    </p>
                    <p className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                      <FileWarning size={9} className="shrink-0" /> {nonconformityLabel}
                    </p>
                  </div>

                  <span className="self-start font-mono text-[9px] text-muted-foreground/60">{row.custom_id || `#${row.id}`}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-[10px] text-muted-foreground">Página {page} de {totalPages} · {total} registos</p>
            <div className="flex flex-wrap items-center gap-1">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">
                Anterior
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, index) => {
                const pg = totalPages <= 7 ? index + 1 : page <= 4 ? index + 1 : page >= totalPages - 3 ? totalPages - 6 + index : page - 3 + index;
                return (
                  <button key={pg} type="button" onClick={() => setPage(pg)} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${pg === page ? "border-orange-500 bg-orange-600 text-white" : "border-border bg-card text-foreground hover:bg-muted"}`}>
                    {pg}
                  </button>
                );
              })}
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
