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
  // requisition status if available
  requisition_status?: string;
};

type ColKey = "pending" | "partial" | "fulfilled" | "archived";

const COLS: { key: ColKey; label: string; dot: string; header: string; empty: string }[] = [
  { key: "pending",   label: "Pendentes",          dot: "bg-amber-400",   header: "border-amber-400/40 bg-amber-400/10",   empty: "Sem itens pendentes" },
  { key: "partial",   label: "Parcialmente aviadas", dot: "bg-blue-400",   header: "border-blue-400/40 bg-blue-400/10",     empty: "Sem itens parciais" },
  { key: "fulfilled", label: "Totalmente aviadas",  dot: "bg-emerald-400", header: "border-emerald-400/40 bg-emerald-400/10", empty: "Sem itens aviados" },
  { key: "archived",  label: "Arquivadas",          dot: "bg-slate-400",   header: "border-slate-400/40 bg-slate-400/10",   empty: "Sem itens arquivados" },
];

const BADGE: Record<ColKey, string> = {
  pending:   "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
  partial:   "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300",
  fulfilled: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
  archived:  "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/50 dark:bg-slate-900/30 dark:text-slate-400",
};

function classify(item: ReqItem): ColKey {
  if (item.requisition_status === "HLD") return "archived";
  const req = Number(item.requested_quantity ?? 0);
  const sup = Number(item.supplied_quantity ?? 0);
  if (sup >= req && req > 0) return "fulfilled";
  if (sup > 0) return "partial";
  return "pending";
}

function ItemCard({ item, col }: { item: ReqItem; col: ColKey }) {
  const name = item.product_name || item.warehouse_item_name || `Item #${item.id}`;
  const req = Number(item.requested_quantity ?? 0);
  const sup = Number(item.supplied_quantity ?? 0);
  const avail = item.available_quantity;

  return (
    <Link href={`/pharmacy/material-requisition-items/${item.id}`}
      className={`group relative block ${GLASS} transition hover:border-violet-500/30 hover:shadow-md`}>
      <span className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${COLS.find(c=>c.key===col)!.dot}`} />
      <div className="px-3 py-2.5 pl-4">
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-500">
              <Package size={11} />
            </span>
            <p className="truncate text-xs font-bold text-foreground group-hover:text-violet-500 transition">
              {name}
            </p>
          </div>
        </div>
        <div className="space-y-0.5 text-[10px] text-muted-foreground">
          <p className="text-[9px] text-muted-foreground/70">{item.custom_id || `MREI-${item.id}`}</p>
          {item.lot_number && (
            <div className="flex items-center gap-1">
              <ClipboardList size={9} className="shrink-0" />
              <span>{item.lot_number}</span>
              {item.lot_expiration_date && <span className="text-muted-foreground/60">· {item.lot_expiration_date}</span>}
            </div>
          )}
          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
            <span className="flex items-center gap-0.5"><Box size={8} />Req:<strong className="text-foreground ml-0.5">{req}</strong></span>
            <span>Disp:<strong className="text-foreground ml-0.5">{avail ?? "—"}</strong></span>
            <span className="flex items-center gap-0.5"><CheckCircle2 size={8} /><strong className="text-foreground">{sup}</strong></span>
          </div>
          {item.requisition && (
            <p className="text-[9px] text-muted-foreground/60">Req. #{item.requisition}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function PharmacyMaterialRequisitionItemsPage() {
  const [allItems, setAllItems] = useState<ReqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [colFilter, setColFilter] = useState<ColKey | "">("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // fetch up to 200 items (no server-side status filter available)
      const params = new URLSearchParams({ page_size: "200" });
      const data = await apiFetch<{ results: ReqItem[]; count: number } | ReqItem[]>(
        `/pharmacy/material_requisition_item/?${params}`
      );
      setAllItems(Array.isArray(data) ? data : (data.results ?? []));
    } catch { setAllItems([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search.trim()
    ? allItems.filter(i => {
        const q = search.toLowerCase();
        return (
          (i.product_name || "").toLowerCase().includes(q) ||
          (i.warehouse_item_name || "").toLowerCase().includes(q) ||
          (i.lot_number || "").toLowerCase().includes(q) ||
          (i.custom_id || "").toLowerCase().includes(q)
        );
      })
    : allItems;

  const grouped: Record<ColKey, ReqItem[]> = { pending: [], partial: [], fulfilled: [], archived: [] };
  for (const item of filtered) grouped[classify(item)].push(item);

  const total = allItems.length;

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

        {/* ── Filtros inline ── */}
        <section className={`relative ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-slate-400" />
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 pl-5">
            <div className="relative min-w-[180px] flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Produto, lote, código…"
                className="w-full rounded-lg border border-border bg-background/60 py-1.5 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition"
                value={search} onChange={e => setSearch(e.target.value)} />
              {search && (
                <button type="button" onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>
            <select className="rounded-lg border border-border bg-background/60 px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition"
              value={colFilter} onChange={e => setColFilter(e.target.value as ColKey | "")}>
              <option value="">Todos os estados</option>
              {COLS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            {(search || colFilter) && (
              <button type="button" onClick={() => { setSearch(""); setColFilter(""); }}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-white/20 bg-white/10 px-3 text-xs text-muted-foreground backdrop-blur-sm transition hover:bg-white/20 hover:text-foreground">
                <X size={11} /> Limpar
              </button>
            )}
          </div>
        </section>

        {/* ── Kanban ── */}
        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {COLS.filter(col => !colFilter || col.key === colFilter).map(col => (
              <div key={col.key} className={`flex flex-col gap-2 ${colFilter ? "col-span-2 xl:col-span-4" : ""}`}>
                {/* Cabeçalho coluna */}
                <div className={`flex items-center justify-between rounded-lg border px-3 py-1.5 ${col.header}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/70">{col.label}</span>
                  </div>
                  <span className="text-[10px] font-bold text-foreground/60">{grouped[col.key].length}</span>
                </div>
                {/* Cards */}
                {grouped[col.key].length === 0 ? (
                  <div className="flex items-center justify-center rounded-xl border border-dashed border-white/10 py-8 text-[10px] text-muted-foreground/50">
                    {col.empty}
                  </div>
                ) : colFilter ? (
                  <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                    {grouped[col.key].map(item => <ItemCard key={item.id} item={item} col={col.key} />)}
                  </div>
                ) : (
                  grouped[col.key].map(item => <ItemCard key={item.id} item={item} col={col.key} />)
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
