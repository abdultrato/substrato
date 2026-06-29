"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Calendar, ClipboardList, Loader2, Plus, Search, User, X } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const STATUS_MAP: Record<string, { label: string; badge: string; dot: string }> = {
  RASCUNHO: {
    label: "Rascunho",
    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
    dot: "bg-amber-400",
  },
  FINALIZADO: {
    label: "Finalizado",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    dot: "bg-emerald-400",
  },
  CANCELADO: {
    label: "Cancelado",
    badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300",
    dot: "bg-red-400",
  },
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

type Record_ = {
  id: number;
  custom_id?: string;
  patient_name?: string;
  doctor_name?: string;
  status?: string;
  care_start_at?: string;
  diagnosis?: string;
};

function CardexCard({ rec }: { rec: Record_ }) {
  const status = STATUS_MAP[rec.status ?? ""] ?? STATUS_MAP.RASCUNHO;
  return (
    <Link href={`/medical-records/records/${rec.id}`}
      className={`group relative block ${GLASS} transition hover:border-violet-500/30 hover:shadow-md`}>
      <span className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${status.dot}`} />
      <div className="px-4 py-3 pl-5">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
              <ClipboardList size={13} />
            </span>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-violet-500 transition">
                {rec.custom_id || `PRT-${rec.id}`}
              </p>
              <p className="text-[10px] text-muted-foreground">ID {rec.id}</p>
            </div>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${status.badge}`}>
            {status.label}
          </span>
        </div>
        <div className="space-y-0.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <User size={10} className="shrink-0" />
            <span className="truncate">{rec.patient_name || "—"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen size={10} className="shrink-0" />
            <span className="truncate">{rec.doctor_name || "Sem médico"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={10} className="shrink-0" />
            <span>{fmtDate(rec.care_start_at)}</span>
          </div>
          {rec.diagnosis && (
            <p className="truncate text-foreground/70 pt-0.5">
              {rec.diagnosis.slice(0, 60)}{rec.diagnosis.length > 60 ? "…" : ""}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function ProntuarioCardexPage() {
  const [items, setItems] = useState<Record_[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const data = await apiFetch<{ results: Record_[]; count: number } | Record_[]>(
        `/medical_records/record/?${params}`
      );
      if (Array.isArray(data)) {
        setItems(data); setTotal(data.length);
      } else {
        setItems(data.results ?? []); setTotal(data.count ?? 0);
      }
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="w-full space-y-3 px-1">

        {/* ── Cabeçalho ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20">
                <ClipboardList size={17} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">Cardex</h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? "A carregar…" : `${total} registo${total !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <Link href="/medical-records/records/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-gradient-to-br from-violet-600 to-purple-600 px-4 text-sm font-semibold text-white shadow-sm shadow-violet-500/20 transition hover:opacity-90">
              <Plus size={15} /> Novo cardex
            </Link>
          </div>
        </section>

        {/* ── Filtros ── */}
        <section className={`relative ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-slate-400" />
          <div className="flex flex-wrap items-end gap-3 px-4 py-3 pl-5">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Pesquisar</label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="Código, paciente, estado…"
                  className="w-full rounded-lg border border-border bg-background/60 py-2 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition"
                  value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                {search && (
                  <button type="button" onClick={() => { setSearch(""); setPage(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="w-44">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Estado</label>
              <select className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition"
                value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">Todos</option>
                <option value="RASCUNHO">Rascunho</option>
                <option value="FINALIZADO">Finalizado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
            {(search || statusFilter) && (
              <button type="button" onClick={() => { setSearch(""); setStatusFilter(""); setPage(1); }}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 text-sm text-muted-foreground backdrop-blur-sm transition hover:bg-white/20 hover:text-foreground">
                <X size={13} /> Limpar
              </button>
            )}
          </div>
        </section>

        {/* ── Cards ── */}
        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <section className={`relative overflow-hidden ${GLASS}`}>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                <ClipboardList size={22} />
              </span>
              <p className="text-sm font-medium text-foreground">Nenhum cardex encontrado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {search || statusFilter ? "Tente ajustar os filtros." : "Crie o primeiro cardex clicando em «Novo cardex»."}
              </p>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {items.map(rec => <CardexCard key={rec.id} rec={rec} />)}
          </div>
        )}

        {/* ── Paginação ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-1">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="inline-flex h-8 items-center rounded-md border border-white/20 bg-white/10 px-3 text-xs font-medium text-foreground backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-40">
              ← Anterior
            </button>
            <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="inline-flex h-8 items-center rounded-md border border-white/20 bg-white/10 px-3 text-xs font-medium text-foreground backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-40">
              Seguinte →
            </button>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
