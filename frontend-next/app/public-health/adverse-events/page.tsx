"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  Syringe,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const LIST_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.ENFERMAGEM,
  GROUPS.LABORATORIO,
  GROUPS.SAUDE_PUBLICA,
];

const PAGE_SIZE = 24;

interface AEFIRecord {
  id: number;
  custom_id: string;
  patient_name: string;
  vaccine_name: string;
  lot_number: string | null;
  record_label: string;
  reported_by_name: string | null;
  severity: string;
  status: string;
  onset_at: string;
  reported_at: string;
  symptoms: string;
  serious: boolean;
  outcome: string;
}

const STATUS_META: Record<string, { label: string; bar: string; chip: string }> = {
  REPORTED:            { label: "Reportado",           bar: "bg-amber-500",   chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"          },
  UNDER_INVESTIGATION: { label: "Em investigação",     bar: "bg-blue-500",    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300"                },
  RESOLVED:            { label: "Resolvido",           bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300"},
  DISCARDED:           { label: "Descartado",          bar: "bg-slate-400",   chip: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/40 dark:bg-slate-800/20 dark:text-slate-400"          },
  SENT_TO_AUTHORITY:   { label: "Enviado à autoridade",bar: "bg-violet-500",  chip: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300"    },
};

const SEVERITY_META: Record<string, { label: string; dot: string; text: string }> = {
  MILD:     { label: "Leve",     dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  MODERATE: { label: "Moderado", dot: "bg-amber-500",   text: "text-amber-600 dark:text-amber-400"     },
  SEVERE:   { label: "Grave",    dot: "bg-orange-500",  text: "text-orange-600 dark:text-orange-400"   },
  CRITICAL: { label: "Crítico",  dot: "bg-red-500",     text: "text-red-600 dark:text-red-400"         },
};

const OUTCOME_LABELS: Record<string, string> = {
  RECOVERED:    "Recuperado",
  RECOVERING:   "Em recuperação",
  HOSPITALIZED: "Hospitalizado",
  DEATH:        "Óbito",
  UNKNOWN:      "Desconhecido",
};

const STATUS_FILTERS = [
  { value: "",                    label: "Todos os estados"        },
  { value: "REPORTED",            label: "Reportado"               },
  { value: "UNDER_INVESTIGATION", label: "Em investigação"         },
  { value: "RESOLVED",            label: "Resolvido"               },
  { value: "DISCARDED",           label: "Descartado"              },
  { value: "SENT_TO_AUTHORITY",   label: "Enviado à autoridade"    },
];

const SEVERITY_FILTERS = [
  { value: "",         label: "Todas as gravidades" },
  { value: "MILD",     label: "Leve"                },
  { value: "MODERATE", label: "Moderado"            },
  { value: "SEVERE",   label: "Grave"               },
  { value: "CRITICAL", label: "Crítico"             },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AEFIListPage() {
  useAuthGuard();

  const [items, setItems]                   = useState<AEFIRecord[]>([]);
  const [total, setTotal]                   = useState(0);
  const [page, setPage]                     = useState(1);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState("");
  const [filterStatus, setFilterStatus]     = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (p: number, q: string, st: string, sv: string) => {
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (q.trim()) query.search   = q.trim();
      if (st)       query.status   = st;
      if (sv)       query.severity = sv;
      const { items: rows, meta } = await apiFetchList<AEFIRecord>(
        "/public_health/adverse_event/",
        { page: p, pageSize: PAGE_SIZE, query }
      );
      setItems(rows);
      setTotal(meta.total ?? 0);
    } catch {
      setItems([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page, search, filterStatus, filterSeverity); }, [page, load, filterStatus, filterSeverity]);

  function handleSearch(v: string) {
    setSearch(v); setPage(1);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => load(1, v, filterStatus, filterSeverity), 300);
  }
  function handleStatus(v: string)   { setFilterStatus(v);   setPage(1); load(1, search, v, filterSeverity); }
  function handleSeverity(v: string) { setFilterSeverity(v); setPage(1); load(1, search, filterStatus, v);   }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-orange-500 to-amber-600" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-md shadow-orange-500/30">
              <AlertTriangle size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">Saúde Pública</div>
              <h1 className="text-base font-bold text-foreground">Eventos Adversos (AEFI)</h1>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{total} registos encontrados</div>
            </div>
            <Link href="/public-health/adverse-events/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 px-4 text-xs font-semibold text-white shadow-md shadow-orange-500/30 transition hover:from-orange-700 hover:to-amber-700">
              <Plus size={13} /> Novo evento
            </Link>
          </div>

          {/* Filters inside hero */}
          <div className="border-t border-white/20 px-4 py-2 dark:border-white/10">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-40 flex-1">
                <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Pesquisar por paciente, vacina ou sintomas…"
                  className="w-full rounded-lg border border-white/30 bg-white/40 py-1.5 pl-7 pr-3 text-xs outline-none transition placeholder:text-muted-foreground focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 dark:border-white/10 dark:bg-white/5" />
              </div>
              <div className="relative">
                <Activity size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select value={filterStatus} onChange={(e) => handleStatus(e.target.value)}
                  className="appearance-none rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs text-foreground outline-none transition focus:border-orange-400">
                  {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div className="relative">
                <AlertTriangle size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select value={filterSeverity} onChange={(e) => handleSeverity(e.target.value)}
                  className="appearance-none rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs text-foreground outline-none transition focus:border-orange-400">
                  {SEVERITY_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Grid ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            Nenhum evento adverso encontrado.
          </div>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const sm = STATUS_META[item.status]   ?? { label: item.status,   bar: "bg-slate-400", chip: "border-slate-200 bg-slate-50 text-slate-700" };
              const sv = SEVERITY_META[item.severity] ?? { label: item.severity, dot: "bg-slate-400", text: "text-muted-foreground" };

              return (
                <Link key={item.id} href={`/public-health/adverse-events/${item.id}`}
                  className="relative z-0 block overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:bg-white/35 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                  <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${sm.bar}`} />

                  <div className="space-y-1.5 px-3 py-2.5 pl-4">
                    {/* header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold leading-tight text-foreground">{item.patient_name || "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{item.custom_id}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${sm.chip}`}>{sm.label}</span>
                    </div>

                    {/* vacina */}
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <Syringe size={10} className="shrink-0 text-orange-500" />
                      <span className="truncate font-medium text-foreground">{item.vaccine_name || "—"}</span>
                      {item.lot_number && <span className="ml-auto shrink-0 font-mono text-muted-foreground">{item.lot_number}</span>}
                    </div>

                    {/* gravidade + grave */}
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className={`inline-flex items-center gap-1 font-semibold ${sv.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${sv.dot}`} />
                        {sv.label}
                      </span>
                      {item.serious && (
                        <span className="rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
                          ⚠ Grave
                        </span>
                      )}
                      <span className="ml-auto text-muted-foreground">{OUTCOME_LABELS[item.outcome] ?? item.outcome}</span>
                    </div>

                    {/* sintomas */}
                    {item.symptoms && (
                      <p className="truncate text-[10px] text-muted-foreground">{item.symptoms}</p>
                    )}

                    {/* datas */}
                    <div className="flex justify-between border-t border-border/30 pt-1 text-[10px] text-muted-foreground">
                      <span>Início: {fmtDate(item.onset_at)}</span>
                      <span>Reportado: {fmtDate(item.reported_at)}</span>
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
            <span className="text-[11px] text-muted-foreground">Página {page} de {totalPages} · {total} eventos</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card transition hover:bg-muted disabled:opacity-40">
                <ChevronLeft size={13} />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card transition hover:bg-muted disabled:opacity-40">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
