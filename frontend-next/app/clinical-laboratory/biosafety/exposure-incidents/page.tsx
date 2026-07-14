"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  MapPin,
  Plus,
  Search,
  Stethoscope,
  User,
  Zap,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useDebounce from "@/hooks/useDebounce";
import { apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const LIST_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];
const PAGE_SIZE = 20;

// ── Choices ───────────────────────────────────────────────────────────────────

const EXPOSURE_TYPE_LABELS: Record<string, string> = {
  PICADA:   "Picada de agulha",
  MUCOSA:   "Contacto com mucosa",
  PELE:     "Contacto com pele",
  CORTE:    "Corte c/ material",
  AEROSSOL: "Inalação de aerossol",
  CULTURA:  "Contacto c/ cultura",
  OUTRO:    "Outro",
};

const EXPOSURE_TYPE_COLOR: Record<string, { bar: string; badge: string }> = {
  PICADA:   { bar: "bg-red-500",     badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300" },
  MUCOSA:   { bar: "bg-orange-500",  badge: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300" },
  PELE:     { bar: "bg-amber-400",   badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300" },
  CORTE:    { bar: "bg-rose-600",    badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300" },
  AEROSSOL: { bar: "bg-violet-500",  badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300" },
  CULTURA:  { bar: "bg-indigo-500",  badge: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300" },
  OUTRO:    { bar: "bg-slate-400",   badge: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/30 dark:text-slate-300" },
};

const STATUS_LABELS: Record<string, string> = {
  REPORTADO:  "Reportado",
  EM_ANALISE: "Em análise",
  SAUDE_OCUP: "Saúde ocupacional",
  SEGUIMENTO: "Seguimento",
  FECHADO:    "Fechado",
};

const STATUS_COLOR: Record<string, string> = {
  REPORTADO:  "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",
  EM_ANALISE: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  SAUDE_OCUP: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",
  SEGUIMENTO: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300",
  FECHADO:    "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700/40 dark:bg-slate-800/20 dark:text-slate-400",
};

const STATUS_DOT: Record<string, string> = {
  REPORTADO:  "bg-red-500",
  EM_ANALISE: "bg-amber-400",
  SAUDE_OCUP: "bg-blue-500",
  SEGUIMENTO: "bg-violet-500",
  FECHADO:    "bg-slate-400",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface NamedRef { id: number; name: string }
interface Incident {
  id: number;
  custom_id: string;
  incident_at: string;
  exposure_type: string;
  status: string;
  material_involved: string;
  body_site: string;
  activity: string;
  requires_medical_followup: boolean;
  staff: number;
  staff_detail: NamedRef | null;
  investigated_by: number | null;
  investigator_detail: NamedRef | null;
  conclusion: string;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExposureIncidentListPage() {
  useAuthGuard();

  const [items,   setItems]   = useState<Incident[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);

  const [search,       setSearch]       = useState("");
  const [filterType,   setFilterType]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async (p: number, q: string, type: string, status: string) => {
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (q.trim())  query.search = q.trim();
      if (type)      query.exposure_type = type;
      if (status)    query.status = status;
      const { items: rows, meta } = await apiFetchList<Incident>(
        "/clinical_laboratory/exposure_incident/",
        { page: p, pageSize: PAGE_SIZE, query }
      );
      setItems(rows);
      setTotal(meta.total ?? 0);
    } catch { setItems([]); setTotal(0); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(page, debouncedSearch, filterType, filterStatus); }, [page, debouncedSearch, filterType, filterStatus, load]);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  function handleFilter(type: string, status: string) {
    setFilterType(type);
    setFilterStatus(status);
    setPage(1);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // hero counts
  const counts = Object.fromEntries(
    ["REPORTADO","EM_ANALISE","SAUDE_OCUP","SEGUIMENTO","FECHADO"].map((s) => [
      s, items.filter((i) => i.status === s).length,
    ])
  );

  return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-red-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-red-500 to-orange-500" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-600 shadow-md shadow-red-500/30">
              <Zap size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">Biossegurança</div>
              <h1 className="text-base font-bold text-foreground">Incidentes de exposição</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span>{total} registos</span>
                {(["REPORTADO","EM_ANALISE","SAUDE_OCUP","SEGUIMENTO","FECHADO"]).map((s) => (
                  counts[s] ? (
                    <span key={s} className="flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s]}`} />
                      {STATUS_LABELS[s]}: <strong>{counts[s]}</strong>
                    </span>
                  ) : null
                ))}
              </div>
            </div>

            <Link href="/clinical-laboratory/biosafety/exposure-incidents/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 px-4 text-xs font-semibold text-white shadow-md shadow-red-500/30 transition hover:from-red-700 hover:to-orange-700">
              <Plus size={13} /> Registar incidente
            </Link>
          </div>
        </div>

        {/* ── Filters ───────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Pesquisar incidentes…"
              className="w-full rounded-lg border border-border bg-card py-1.5 pl-7 pr-3 text-xs outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-400/20" />
          </div>
          <div className="relative">
            <Filter size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select value={filterType} onChange={(e) => handleFilter(e.target.value, filterStatus)}
              className="rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs outline-none transition focus:border-red-400 appearance-none">
              <option value="">Todos os tipos</option>
              {Object.entries(EXPOSURE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="relative">
            <Filter size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select value={filterStatus} onChange={(e) => handleFilter(filterType, e.target.value)}
              className="rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs outline-none transition focus:border-red-400 appearance-none">
              <option value="">Todos os estados</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* ── Grid ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            Nenhum incidente encontrado.
          </div>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {items.map((inc) => {
              const expColor = EXPOSURE_TYPE_COLOR[inc.exposure_type] ?? EXPOSURE_TYPE_COLOR.OUTRO;
              const incidentDate = inc.incident_at
                ? new Date(inc.incident_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })
                : "—";
              const incidentTime = inc.incident_at
                ? new Date(inc.incident_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
                : "";

              return (
                <Link key={inc.id} href={`/clinical-laboratory/biosafety/exposure-incidents/${inc.id}`}
                  className="relative z-0 overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:shadow-md hover:bg-white/35 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/8 block">
                  <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${expColor.bar}`} />

                  <div className="px-3 py-2.5 pl-4 space-y-2">

                    {/* top row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${expColor.badge}`}>
                          <Zap size={8} className="mr-0.5" />
                          {EXPOSURE_TYPE_LABELS[inc.exposure_type] ?? inc.exposure_type}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[inc.status] ?? ""}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[inc.status] ?? "bg-slate-400"}`} />
                          {STATUS_LABELS[inc.status] ?? inc.status}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0">{inc.custom_id}</span>
                    </div>

                    {/* staff */}
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                      <User size={11} className="text-muted-foreground shrink-0" />
                      {inc.staff_detail?.name ?? `Utilizador #${inc.staff}`}
                    </div>

                    {/* material + body site */}
                    <div className="grid gap-1 sm:grid-cols-2">
                      {inc.material_involved && (
                        <div className="flex items-start gap-1 text-[10px] text-muted-foreground">
                          <Activity size={9} className="mt-0.5 shrink-0" />
                          <span className="line-clamp-1">{inc.material_involved}</span>
                        </div>
                      )}
                      {inc.body_site && (
                        <div className="flex items-start gap-1 text-[10px] text-muted-foreground">
                          <MapPin size={9} className="mt-0.5 shrink-0" />
                          <span className="line-clamp-1">{inc.body_site}</span>
                        </div>
                      )}
                    </div>

                    {/* activity */}
                    {inc.activity && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1 italic">
                        {inc.activity}
                      </p>
                    )}

                    {/* bottom row */}
                    <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-border/30">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <CalendarDays size={9} />
                        {incidentDate}{incidentTime && <span className="ml-0.5 opacity-70">{incidentTime}</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {inc.requires_medical_followup && (
                          <span className="inline-flex items-center gap-0.5 rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300">
                            <Stethoscope size={8} /> Acompanhamento médico
                          </span>
                        )}
                        {inc.investigator_detail && (
                          <span className="text-[9px] text-muted-foreground">
                            Inv: {inc.investigator_detail.name.split(" ")[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">
              Página {page} de {totalPages} · {total} registos
            </span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:bg-muted disabled:opacity-40">
                <ChevronLeft size={13} />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:bg-muted disabled:opacity-40">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
