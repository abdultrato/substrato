"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Box, Calendar, CheckCircle2, ClipboardList, Loader2, Package, Plus, Search, X } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

type ReqItem = {
  id: number;
  custom_id?: string;
  requisition?: number;
  product_name?: string;
  warehouse_item_name?: string;
  lot_number?: string;
  lot_expiration_date?: string;
  requested_quantity?: number;
  supplied_quantity?: number;
  available_quantity?: number;
  notes?: string;
};

function itemStatus(item: ReqItem) {
  const req = Number(item.requested_quantity ?? 0);
  const sup = Number(item.supplied_quantity ?? 0);
  const remaining = Math.max(0, req - sup);
  if (remaining <= 0) return { label: "Aviado", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300", dot: "bg-emerald-400" };
  if (sup > 0) return { label: "Parcial", badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300", dot: "bg-blue-400" };
  return { label: "Pendente", badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300", dot: "bg-amber-400" };
}

function ItemCard({ item }: { item: ReqItem }) {
  const st = itemStatus(item);
  const name = item.product_name || item.warehouse_item_name || `Item #${item.id}`;
  const req = Number(item.requested_quantity ?? 0);
  const sup = Number(item.supplied_quantity ?? 0);
  const avail = item.available_quantity;

  return (
    <Link href={`/pharmacy/material-requisition-items/${item.id}`}
      className={`group relative block ${GLASS} transition hover:border-violet-500/30 hover:shadow-md`}>
      <span className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${st.dot}`} />
      <div className="px-4 py-3 pl-5">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
              <Package size={13} />
            </span>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-violet-500 transition truncate max-w-[130px]">
                {name}
              </p>
              <p className="text-[10px] text-muted-foreground">{item.custom_id || `MREI-${item.id}`}</p>
            </div>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${st.badge}`}>
            {st.label}
          </span>
        </div>

        <div className="space-y-0.5 text-[11px] text-muted-foreground">
          {item.lot_number && (
            <div className="flex items-center gap-1.5">
              <ClipboardList size={10} className="shrink-0" />
              <span>Lote: {item.lot_number}</span>
            </div>
          )}
          {item.lot_expiration_date && (
            <div className="flex items-center gap-1.5">
              <Calendar size={10} className="shrink-0" />
              <span>Val: {item.lot_expiration_date}</span>
            </div>
          )}
          <div className="flex items-center gap-3 pt-0.5">
            <span className="flex items-center gap-1">
              <Box size={9} className="shrink-0" />
              Req: <strong className="text-foreground ml-0.5">{req}</strong>
            </span>
            <span>Disp: <strong className="text-foreground">{avail ?? "—"}</strong></span>
            <span className="flex items-center gap-1">
              <CheckCircle2 size={9} className="shrink-0" />
              Aviado: <strong className="text-foreground ml-0.5">{sup}</strong>
            </span>
          </div>
          {item.requisition && (
            <p className="text-[10px] text-muted-foreground/70">Requisição #{item.requisition}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function PharmacyMaterialRequisitionItemsPage() {
  const [items, setItems] = useState<ReqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (search) params.set("search", search);
      const data = await apiFetch<{ results: ReqItem[]; count: number } | ReqItem[]>(
        `/pharmacy/material_requisition_item/?${params}`
      );
      if (Array.isArray(data)) { setItems(data); setTotal(data.length); }
      else { setItems(data.results ?? []); setTotal(data.count ?? 0); }
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="w-full space-y-3 px-1">

        {/* ── Cabeçalho ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20">
                <Package size={17} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">Itens de requisição</h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? "A carregar…" : `${total} ${total !== 1 ? "itens" : "item"}`}
                </p>
              </div>
            </div>
            <Link href="/pharmacy/material-requisition-items/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-gradient-to-br from-violet-600 to-purple-600 px-4 text-sm font-semibold text-white shadow-sm shadow-violet-500/20 transition hover:opacity-90">
              <Plus size={15} /> Novo item
            </Link>
          </div>
        </section>

        {/* ── Filtro ── */}
        <section className={`relative ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-slate-400" />
          <div className="px-4 py-3 pl-5">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Pesquisar</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Produto, lote, código…"
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
                <Package size={22} />
              </span>
              <p className="text-sm font-medium text-foreground">Nenhum item encontrado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {search ? "Tente ajustar a pesquisa." : "Ainda não existem itens de requisição."}
              </p>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {items.map(item => <ItemCard key={item.id} item={item} />)}
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
