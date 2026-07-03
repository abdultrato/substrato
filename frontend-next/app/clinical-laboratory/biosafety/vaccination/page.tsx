"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Hash,
  Loader2,
  Plus,
  Search,
  Shield,
  Syringe,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const LIST_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];
const PAGE_SIZE = 20;

// ── Choices ───────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; badge: string; bar: string; dot: string }> = {
  EM_DIA:   { label: "Em dia",   bar: "bg-emerald-500", dot: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" },
  A_VENCER: { label: "A vencer", bar: "bg-amber-400",   dot: "bg-amber-400",   badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300" },
  VENCIDA:  { label: "Vencida",  bar: "bg-red-500",     dot: "bg-red-500",     badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300" },
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface NamedRef { id: number; name: string }
interface VaccRecord {
  id: number;
  custom_id: string;
  vaccine: string;
  dose_number: number;
  vaccination_date: string;
  next_dose_due: string | null;
  document: string;
  status: string;
  staff: number;
  staff_detail: NamedRef | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(s: string | null | undefined): number | null {
  if (!s) return null;
  return Math.ceil((new Date(s).getTime() - Date.now()) / 86_400_000);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VaccinationListPage() {
  useAuthGuard();

  const [items,   setItems]   = useState<VaccRecord[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);

  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (p: number, q: string, status: string) => {
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (q.trim()) query.search = q.trim();
      if (status)   query.status = status;
      const { items: rows, meta } = await apiFetchList<VaccRecord>(
        "/clinical_laboratory/vaccination/",
        { page: p, pageSize: PAGE_SIZE, query }
      );
      setItems(rows);
      setTotal(meta.total ?? 0);
    } catch { setItems([]); setTotal(0); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(page, search, filterStatus); }, [page, filterStatus, load]);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => load(1, v, filterStatus), 300);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // hero status counts
  const counts = Object.fromEntries(
    Object.keys(STATUS_META).map((s) => [s, items.filter((i) => i.status === s).length])
  );

  return (
    <AppLayout requiredGroups={LIST_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-teal-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-teal-500 to-emerald-500" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-md shadow-teal-500/30">
              <Syringe size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">Biossegurança</div>
              <h1 className="text-base font-bold text-foreground">Vacinação de colaboradores</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span>{total} registos</span>
                {Object.entries(STATUS_META).map(([key, m]) =>
                  counts[key] ? (
                    <span key={key} className="flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                      {m.label}: <strong>{counts[key]}</strong>
                    </span>
                  ) : null
                )}
              </div>
            </div>

            <Link href="/clinical-laboratory/biosafety/vaccination/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 px-4 text-xs font-semibold text-white shadow-md shadow-teal-500/30 transition hover:from-teal-700 hover:to-emerald-700">
              <Plus size={13} /> Registar vacinação
            </Link>
          </div>
        </div>

        {/* ── Filters ───────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Pesquisar vacina ou colaborador…"
              className="w-full rounded-lg border border-border bg-card py-1.5 pl-7 pr-3 text-xs outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20" />
          </div>
          <div className="relative">
            <Filter size={10} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-card py-1.5 pl-7 pr-6 text-xs outline-none transition focus:border-teal-400 appearance-none">
              <option value="">Todos os estados</option>
              {Object.entries(STATUS_META).map(([v, m]) => (
                <option key={v} value={v}>{m.label}</option>
              ))}
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
            Nenhum registo encontrado.
          </div>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {items.map((rec) => {
              const sm = STATUS_META[rec.status] ?? STATUS_META.EM_DIA;
              const dtu = daysUntil(rec.next_dose_due);
              const isOverdue  = rec.status === "VENCIDA";
              const isUrgent   = dtu !== null && dtu >= 0 && dtu <= 30;

              return (
                <Link key={rec.id} href={`/clinical-laboratory/biosafety/vaccination/${rec.id}`}
                  className="relative z-0 overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:shadow-md hover:bg-white/35 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/8 block">
                  <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${sm.bar}`} />

                  <div className="px-3 py-2.5 pl-4 space-y-1.5">

                    {/* top row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sm.badge}`}>
                          <Shield size={8} />{sm.label}
                        </span>
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300">
                          <Hash size={8} />Dose {rec.dose_number}
                        </span>
                        {isOverdue && (
                          <span className="rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold text-red-600 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
                            Vencida
                          </span>
                        )}
                        {isUrgent && !isOverdue && (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
                            {dtu === 0 ? "Hoje" : `${dtu}d`}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0">{rec.custom_id}</span>
                    </div>

                    {/* vaccine name */}
                    <div className="flex items-center gap-1.5">
                      <Syringe size={12} className="shrink-0 text-teal-600 dark:text-teal-400" />
                      <span className="text-[12px] font-semibold text-foreground leading-tight">{rec.vaccine}</span>
                    </div>

                    {/* staff */}
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <User size={9} className="shrink-0" />
                      {rec.staff_detail?.name ?? `Utilizador #${rec.staff}`}
                    </div>

                    {/* dates */}
                    <div className="flex flex-wrap items-center gap-3 pt-0.5 border-t border-border/30">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <CalendarDays size={9} />
                        <span>Vacinado: {fmtDate(rec.vaccination_date)}</span>
                      </div>
                      {rec.next_dose_due && (
                        <div className={`flex items-center gap-1 text-[10px] ${isUrgent || isOverdue ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                          <CalendarDays size={9} />
                          <span>Próxima: {fmtDate(rec.next_dose_due)}</span>
                        </div>
                      )}
                      {rec.document && (
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                          <FileText size={8} />
                          <span className="font-mono">{rec.document}</span>
                        </div>
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
