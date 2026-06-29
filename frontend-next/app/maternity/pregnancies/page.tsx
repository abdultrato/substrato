"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Baby, BedDouble, Calendar, Heart, Loader2, Plus, Search, Stethoscope, User, X } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const STATUS_MAP: Record<string, { label: string; badge: string; dot: string }> = {
  ACOMP: {
    label: "Em acompanhamento",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    dot: "bg-emerald-400",
  },
  PARTO: {
    label: "Parto",
    badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300",
    dot: "bg-blue-400",
  },
  ENCERR: {
    label: "Encerrada",
    badge: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/50 dark:bg-slate-900/30 dark:text-slate-400",
    dot: "bg-slate-400",
  },
  CANCEL: {
    label: "Cancelada",
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

type Pregnancy = {
  id: number;
  custom_id?: string;
  patient_name?: string;
  responsible_doctor_name?: string;
  status?: string;
  expected_delivery_date?: string;
  nursery?: string;
  maternity_bed?: string;
  total_deliveries?: number;
  notes?: string;
};

function PregnancyCard({ item }: { item: Pregnancy }) {
  const status = STATUS_MAP[item.status ?? ""] ?? STATUS_MAP.ACOMP;
  return (
    <Link href={`/maternity/pregnancies/${item.id}`}
      className={`group relative block ${GLASS} transition hover:border-pink-500/30 hover:shadow-md`}>
      <span className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${status.dot}`} />
      <div className="px-4 py-3 pl-5">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-pink-500/10 text-pink-500">
              <Baby size={13} />
            </span>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-pink-500 transition">
                {item.custom_id || `MAT-${item.id}`}
              </p>
              <p className="text-[10px] text-muted-foreground">ID {item.id}</p>
            </div>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${status.badge}`}>
            {status.label}
          </span>
        </div>

        <div className="space-y-0.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <User size={10} className="shrink-0" />
            <span className="truncate">{item.patient_name || "—"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Stethoscope size={10} className="shrink-0" />
            <span className="truncate">{item.responsible_doctor_name || "Sem médico"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={10} className="shrink-0" />
            <span>DPP: {fmtDate(item.expected_delivery_date)}</span>
          </div>
          {(item.nursery || item.maternity_bed) && (
            <div className="flex items-center gap-1.5">
              <BedDouble size={10} className="shrink-0" />
              <span className="truncate">
                {[item.nursery, item.maternity_bed].filter(Boolean).join(" · ")}
              </span>
            </div>
          )}
          {item.total_deliveries != null && item.total_deliveries > 0 && (
            <div className="flex items-center gap-1.5">
              <Heart size={10} className="shrink-0" />
              <span>{item.total_deliveries} parto{item.total_deliveries !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function MaternityPregnanciesListPage() {
  const [items, setItems] = useState<Pregnancy[]>([]);
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
      const data = await apiFetch<{ results: Pregnancy[]; count: number } | Pregnancy[]>(
        `/maternity/gestacao/?${params}`
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
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]}>
      <div className="w-full space-y-3 px-1">

        {/* ── Cabeçalho ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-pink-500" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/20">
                <Baby size={17} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">Gestações</h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? "A carregar…" : `${total} registo${total !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <Link href="/maternity/pregnancies/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-gradient-to-br from-pink-500 to-rose-600 px-4 text-sm font-semibold text-white shadow-sm shadow-pink-500/20 transition hover:opacity-90">
              <Plus size={15} /> Nova gestação
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
                <input type="text" placeholder="Código, paciente…"
                  className="w-full rounded-lg border border-border bg-background/60 py-2 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-pink-500/40 transition"
                  value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                {search && (
                  <button type="button" onClick={() => { setSearch(""); setPage(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="w-48">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Estado</label>
              <select className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-pink-500/40 transition"
                value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">Todos</option>
                <option value="ACOMP">Em acompanhamento</option>
                <option value="PARTO">Parto</option>
                <option value="ENCERR">Encerrada</option>
                <option value="CANCEL">Cancelada</option>
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
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-pink-500/10 text-pink-500">
                <Baby size={22} />
              </span>
              <p className="text-sm font-medium text-foreground">Nenhuma gestação encontrada</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {search || statusFilter ? "Tente ajustar os filtros." : "Registe a primeira gestação clicando em «Nova gestação»."}
              </p>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {items.map(item => <PregnancyCard key={item.id} item={item} />)}
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
