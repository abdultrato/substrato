"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Box, CheckCircle2, ClipboardList, Loader2, Package, Search, X } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

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
      <span className={`absolute left-0 top-0 h-full w-0.5 rounded-l-xl ${COLS.find(c=>c.key===col)!.dot}`} />
      <div className="px-2 py-1 pl-3">
        <div className="flex items-start justify-between gap-1">
          <div className="flex min-w-0 items-center gap-1">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-500/10 text-violet-500">
              <Package size={10} />
            </span>
            <p className="max-w-[115px] truncate text-[11px] font-bold text-foreground group-hover:text-violet-500 transition">
              {name}
            </p>
          </div>
          <span className={`shrink-0 rounded-full border px-1.5 py-0 text-[8px] font-semibold ${BADGE[col]}`}>
            {col === "fulfilled" ? "Aviada" : col === "partial" ? "Parcial" : col === "archived" ? "Arquivada" : "Pendente"}
          </span>
        </div>
        <div className="mt-0.5 grid gap-0.5 text-[10px] text-muted-foreground">
          {item.lot_number && (
            <div className="flex items-center gap-1">
              <ClipboardList size={9} className="shrink-0" />
              <span className="truncate">{item.lot_number}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="flex items-center gap-0.5"><Box size={8} />Req:<strong className="text-foreground ml-0.5">{req}</strong></span>
            <span>Disp:<strong className="text-foreground ml-0.5">{avail ?? "—"}</strong></span>
            <span className="flex items-center gap-0.5"><CheckCircle2 size={8} /><strong className="text-foreground">{sup}</strong></span>
          </div>
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
  const [limit, setLimit] = useState(60);

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
  const visibleGrouped: Record<ColKey, ReqItem[]> = {
    pending: grouped.pending.slice(0, limit),
    partial: grouped.partial.slice(0, limit),
    fulfilled: grouped.fulfilled.slice(0, limit),
    archived: grouped.archived.slice(0, limit),
  };
  const visibleColumns = COLS.filter((col) => (!colFilter || col.key === colFilter) && visibleGrouped[col.key].length > 0);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="w-full space-y-1.5 px-0.5">

        {/* ── Cabeçalho ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="space-y-1.5 px-2.5 py-1.5 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-sm shadow-violet-500/20">
                <Package size={17} />
              </span>
              <div>
                <h1 className="text-base font-bold leading-tight text-foreground">Itens de requisição</h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? "A carregar…" : `${Math.min(limit, filtered.length)} de ${filtered.length} · ${total} no total`}
                </p>
              </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Link href="/pharmacy/material-requisitions"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
                  <ArrowLeft size={13} /> Voltar
                </Link>
                <label className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-1.5 text-[11px] font-semibold text-muted-foreground">
                  <span>Mostrar</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={limit}
                    onChange={(event) => setLimit(Math.min(999, Math.max(1, Number(event.target.value || 1))))}
                    className="h-5 w-12 rounded border border-border bg-background px-1 text-center text-xs font-bold text-foreground outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
                    aria-label="Número de itens"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Produto, lote, código…"
                className="h-7 w-full rounded-md border border-border bg-background/60 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
                value={search} onChange={e => setSearch(e.target.value)} />
              {search && (
                <button type="button" onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={12} />
                </button>
              )}
              </div>
            <select className="h-7 rounded-md border border-border bg-background/60 px-2 text-xs font-semibold text-foreground outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
              value={colFilter} onChange={e => setColFilter(e.target.value as ColKey | "")}>
              <option value="">Todos os estados</option>
              {COLS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            {(search || colFilter) && (
              <button type="button" onClick={() => { setSearch(""); setColFilter(""); }}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2 text-xs text-muted-foreground backdrop-blur-sm transition hover:bg-white/20 hover:text-foreground">
                <X size={11} /> Limpar
              </button>
            )}
            </div>
          </div>
        </section>

        {/* ── Kanban ── */}
        {loading ? (
          <div className="flex h-24 items-center justify-center text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : visibleColumns.length === 0 ? (
          <div className={`${GLASS} flex min-h-[120px] items-center justify-center text-sm text-muted-foreground`}>
            Nenhum item de requisição encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-4">
            {visibleColumns.map(col => (
              <div key={col.key} className={`flex flex-col gap-1 ${colFilter ? "md:col-span-2 xl:col-span-4" : ""}`}>
                {/* Cabeçalho coluna */}
                <div className={`flex h-7 items-center justify-between rounded-md border px-2 ${col.header}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/70">{col.label}</span>
                  </div>
                  <span className="text-[10px] font-bold text-foreground/60">{visibleGrouped[col.key].length}</span>
                </div>
                {/* Cards */}
                {colFilter ? (
                  <div className="grid grid-cols-2 gap-1 md:grid-cols-4 xl:grid-cols-6">
                    {visibleGrouped[col.key].map(item => <ItemCard key={item.id} item={item} col={col.key} />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1">
                    {visibleGrouped[col.key].map(item => <ItemCard key={item.id} item={item} col={col.key} />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
