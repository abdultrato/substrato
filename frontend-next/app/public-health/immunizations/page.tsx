"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  Syringe,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const LIST_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.RECEPCAO,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.ENFERMAGEM,
  GROUPS.LABORATORIO,
  GROUPS.SAUDE_PUBLICA,
];

const PAGE_SIZE = 24;

interface ImmunizationRecord {
  id: number;
  custom_id: string;
  patient_name: string;
  vaccine_name: string;
  lot_number: string | null;
  campaign_name: string | null;
  administered_by_name: string | null;
  status: string;
  source: string;
  dose_number: number;
  administered_at: string;
  next_due_date: string | null;
  route: string;
}

const STATUS_META: Record<string, { label: string; bar: string; chip: string }> = {
  ADMINISTERED: {
    label: "Aplicada",
    bar: "bg-emerald-500",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  },
  REPORTED: {
    label: "Notificada",
    bar: "bg-blue-500",
    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",
  },
  SCHEDULED: {
    label: "Agendada",
    bar: "bg-violet-500",
    chip: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300",
  },
  EXEMPT: {
    label: "Isenta",
    bar: "bg-amber-500",
    chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  },
  CANCELLED: {
    label: "Cancelada",
    bar: "bg-rose-500",
    chip: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300",
  },
};

const SOURCE_META: Record<string, { label: string; icon: string }> = {
  ROUTINE: { label: "Rotina", icon: "🩺" },
  CAMPAIGN: { label: "Campanha", icon: "📣" },
  CATCH_UP: { label: "Recuperação", icon: "🔁" },
  OFFICIAL_IMPORT: { label: "Importação oficial", icon: "📥" },
};

const ROUTE_LABELS: Record<string, string> = {
  IM: "IM",
  SC: "SC",
  ID: "ID",
  ORAL: "Oral",
  IN: "Nasal",
  OTHER: "Outra",
};

const STATUS_FILTERS = [
  { value: "", label: "Todos os estados" },
  { value: "ADMINISTERED", label: "Aplicada" },
  { value: "REPORTED", label: "Notificada" },
  { value: "SCHEDULED", label: "Agendada" },
  { value: "EXEMPT", label: "Isenta" },
  { value: "CANCELLED", label: "Cancelada" },
];

const SOURCE_FILTERS = [
  { value: "", label: "Todas as origens" },
  { value: "ROUTINE", label: "Rotina" },
  { value: "CAMPAIGN", label: "Campanha" },
  { value: "CATCH_UP", label: "Recuperação" },
  { value: "OFFICIAL_IMPORT", label: "Importação oficial" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ImmunizationsPage() {
  useAuthGuard();

  const [items, setItems] = useState<ImmunizationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");

  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (p: number, q: string, st: string, src: string) => {
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (q.trim()) query.search = q.trim();
      if (st) query.status = st;
      if (src) query.source = src;
      const { items: rows, meta } = await apiFetchList<ImmunizationRecord>(
        "/public_health/immunization/",
        { page: p, pageSize: PAGE_SIZE, query }
      );
      setItems(rows);
      setTotal(meta.total ?? 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page, search, filterStatus, filterSource); }, [page, load, filterStatus, filterSource]);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => load(1, v, filterStatus, filterSource), 300);
  }

  function handleStatusFilter(v: string) {
    setFilterStatus(v);
    setPage(1);
    load(1, search, v, filterSource);
  }

  function handleSourceFilter(v: string) {
    setFilterSource(v);
    setPage(1);
    load(1, search, filterStatus, v);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-green-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-emerald-500 to-green-600" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-md shadow-emerald-500/30">
              <Syringe size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">Saúde Pública</div>
              <h1 className="text-base font-bold text-foreground">Registos de Imunização</h1>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {total} registos encontrados
              </div>
            </div>

            <Link
              href="/public-health/immunizations/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 px-4 text-xs font-semibold text-white shadow-md shadow-emerald-500/30 transition hover:from-emerald-700 hover:to-green-700"
            >
              <Plus size={13} /> Novo registo
            </Link>
          </div>

          {/* ── Filters (inside hero) ──────────────────────────── */}
          <div className="relative border-t border-white/20 px-4 py-2 dark:border-white/10">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-40 flex-1">
                <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Pesquisar por paciente, vacina ou campanha…"
                  className="w-full rounded-lg border border-white/30 bg-white/40 py-1.5 pl-7 pr-3 text-xs outline-none transition placeholder:text-muted-foreground focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-white/10 dark:bg-white/5"
                />
              </div>

              <div className="relative">
                <Activity size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={filterStatus}
                  onChange={(e) => handleStatusFilter(e.target.value)}
                  className="appearance-none rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs text-foreground outline-none transition focus:border-emerald-400"
                >
                  {STATUS_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Syringe size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={filterSource}
                  onChange={(e) => handleSourceFilter(e.target.value)}
                  className="appearance-none rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs text-foreground outline-none transition focus:border-emerald-400"
                >
                  {SOURCE_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
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
            Nenhum registo de imunização encontrado.
          </div>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const sm = STATUS_META[item.status] ?? {
                label: item.status,
                bar: "bg-slate-400",
                chip: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/40 dark:bg-slate-900/20 dark:text-slate-300",
              };
              const src = SOURCE_META[item.source] ?? { label: item.source, icon: "💉" };

              return (
                <Link
                  key={item.id}
                  href={`/public-health/immunizations/${item.id}`}
                  className="relative z-0 block overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:bg-white/35 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${sm.bar}`} />

                  <div className="space-y-1.5 px-3 py-2.5 pl-4">
                    {/* header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold leading-tight text-foreground">
                          <User size={10} className="mr-0.5 inline text-emerald-500" />
                          {item.patient_name || "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{item.custom_id}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${sm.chip}`}>
                        {sm.label}
                      </span>
                    </div>

                    {/* vaccine row */}
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <Syringe size={10} className="shrink-0 text-emerald-500" />
                      <span className="truncate font-medium text-foreground">{item.vaccine_name || "—"}</span>
                      <span className="ml-auto shrink-0 text-muted-foreground">Dose {item.dose_number}</span>
                    </div>

                    {/* meta row */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      <span>{src.icon} {src.label}</span>
                      {item.route && (
                        <span className="rounded bg-muted/60 px-1 text-[9px]">{ROUTE_LABELS[item.route] ?? item.route}</span>
                      )}
                      {item.lot_number && <span>Lote: {item.lot_number}</span>}
                    </div>

                    {/* footer row */}
                    <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 border-t border-border/30 pt-1 text-[10px] text-muted-foreground">
                      <span>📅 {fmtDate(item.administered_at)}</span>
                      {item.next_due_date && (
                        <span className="text-violet-600 dark:text-violet-400">
                          Reforço: {fmtDate(item.next_due_date)}
                        </span>
                      )}
                      {item.campaign_name && (
                        <span className="w-full truncate">📣 {item.campaign_name}</span>
                      )}
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
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card transition hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card transition hover:bg-muted disabled:opacity-40"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
