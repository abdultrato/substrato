"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Boxes, ChevronRight, Clock3, Loader2, PackageCheck, Plus, Search, Stethoscope } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import PageSizeInput from "@/components/ui/PageSizeInput";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetchList } from "@/lib/api";
import { formatCount } from "@/lib/i18n/plural";
import { GROUPS } from "@/lib/rbac";

type ProcedureMaterial = {
  id: number;
  custom_id?: string | null;
  procedure?: number | null;
  procedure_code?: string | null;
  procedure_item?: number | null;
  product?: number | null;
  product_name?: string | null;
  product_type?: string | null;
  lot?: number | null;
  lot_number?: string | null;
  ward_name?: string | null;
  quantity?: number | null;
  position?: number | null;
  inventory_movement?: number | null;
  value_unitario?: string | number | null;
  observation?: string | null;
  created_at?: string | null;
};

const DEFAULT_PAGE_SIZE = 50;

function formatDate(value?: string | null) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

function formatMoney(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return amount.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function NursingProcedureMaterialsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [materials, setMaterials] = useState<ProcedureMaterial[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string | number> = { page, page_size: pageSize };
      if (debouncedSearch) query.search = debouncedSearch;

      const response = await apiFetchList<ProcedureMaterial>("/nursing/procedure_material/", {
        page,
        pageSize,
        query,
        clientPaginate: true,
        clientCache: safeRefreshToken === 0,
        clientCacheTtlMs: 20000,
      });
      setMaterials(response.items || []);
      setTotal(response.meta.total ?? response.items.length);
    } catch (reason: any) {
      setError(reason?.message || "Não foi possível carregar os materiais dos procedimentos.");
      setMaterials([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, pageSize, safeRefreshToken]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-1.5">
        <section className="relative overflow-hidden rounded-xl border border-emerald-200/30 bg-gradient-to-br from-emerald-100/[0.07] via-white/[0.02] to-teal-100/[0.04] shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-emerald-800/20 dark:from-emerald-950/[0.06] dark:via-white/[0.015] dark:to-teal-950/[0.04]">
          <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-1 px-3 py-2 pl-4">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-500/25">
                <Boxes size={14} />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold leading-tight text-foreground">Materiais dos procedimentos</h1>
                <p className="truncate text-[10px] text-muted-foreground">
                  {loading ? "A carregar…" : formatCount(total, { one: "material encontrado", other: "materiais encontrados" })}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <div className="relative">
                <Search size={11} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar…"
                  className="h-8 w-36 rounded-lg border border-border bg-background/60 pl-6 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:w-52 focus:ring-2 focus:ring-violet-500/40 transition-all"
                />
              </div>
              <label className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/30 bg-white/[0.06] px-2 text-[10px] font-medium text-muted-foreground backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
                Mostrar
                <PageSizeInput value={pageSize} onChange={setPageSize} ariaLabel="Número de materiais por página, de 1 a 999" />
                /pág
              </label>
              {search && (
                <button type="button" onClick={() => setSearch("")} className="inline-flex h-8 items-center rounded-lg border border-white/30 bg-white/[0.06] px-2 text-xs font-medium text-foreground backdrop-blur-xl transition hover:bg-white/10 dark:border-white/10 dark:bg-white/[0.03]">
                  Limpar
                </button>
              )}
            </div>

            <Link href="/nursing/procedure-materials/new" className="inline-flex h-8 items-center gap-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-2.5 text-xs font-semibold text-white shadow-sm shadow-emerald-500/25 transition hover:from-emerald-700 hover:to-teal-700">
              <Plus size={12} /> Novo material
            </Link>
          </div>
        </section>

        {error ? <div className="rounded-xl border border-red-200/60 bg-red-50/30 px-4 py-3 text-sm text-red-800 backdrop-blur-xl dark:border-red-800/40 dark:bg-red-950/15 dark:text-red-300">{error}</div> : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> A carregar materiais…</div>
        ) : materials.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/30 bg-white/[0.03] py-16 text-center backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.015]">
            <PackageCheck size={26} className="text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">Nenhum material encontrado</p>
            <p className="text-xs text-muted-foreground">Altere a pesquisa ou registe um novo material.</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {materials.map((material) => {
              const allocated = Boolean(material.inventory_movement);
              const quantity = Number(material.quantity || 0);
              const unitCost = Number(material.value_unitario);
              const totalCost = Number.isFinite(unitCost) ? quantity * unitCost : null;
              return (
                <Link key={material.id} href={`/nursing/procedure-materials/${material.id}`} className="group relative min-h-[166px] overflow-hidden rounded-xl border border-emerald-200/30 bg-gradient-to-br from-emerald-100/[0.06] via-white/[0.02] to-teal-100/[0.035] shadow-md shadow-slate-900/5 backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-emerald-300/60 hover:shadow-lg dark:border-emerald-800/20 dark:from-emerald-950/[0.05] dark:via-white/[0.015] dark:to-teal-950/[0.03]">
                  <span className={`absolute inset-x-0 top-0 h-1 ${allocated ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <div className="flex h-full flex-col gap-2 p-3.5 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[9px] font-semibold tracking-wider text-muted-foreground">{material.custom_id || `MAT-${material.id}`}</p>
                        <h2 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-foreground">{material.product_name || `Produto #${material.product || "—"}`}</h2>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${allocated ? "border-emerald-200/60 bg-emerald-50/50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-amber-200/60 bg-amber-50/50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-950/30 dark:text-amber-300"}`}>
                        {allocated ? "Movimentado" : "Pendente"}
                      </span>
                    </div>

                    <div className="grid gap-1 text-[10px] text-muted-foreground">
                      <p className="flex min-w-0 items-center gap-1"><Stethoscope size={10} className="shrink-0" /><span className="truncate">{material.procedure_code || `Procedimento #${material.procedure || "—"}`}{material.ward_name ? ` · ${material.ward_name}` : ""}</span></p>
                      <p className="truncate">{material.product_type || "Material"}{material.lot_number ? ` · Lote ${material.lot_number}` : " · Lote automático"}</p>
                    </div>

                    {material.observation ? <p className="line-clamp-1 text-[10px] text-muted-foreground">{material.observation}</p> : null}

                    <div className="mt-auto grid grid-cols-3 gap-1.5 border-t border-white/20 pt-2 text-[9px] dark:border-white/[0.06]">
                      <div><p className="text-muted-foreground">Quantidade</p><p className="font-semibold text-foreground">{quantity.toLocaleString("pt-PT")}</p></div>
                      <div><p className="text-muted-foreground">Custo unit.</p><p className="font-semibold text-foreground">{formatMoney(material.value_unitario)}</p></div>
                      <div><p className="text-muted-foreground">Total</p><p className="font-semibold text-foreground">{formatMoney(totalCost)}</p></div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock3 size={10} /> {formatDate(material.created_at)}</span>
                      <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-700 dark:text-emerald-300">Detalhes <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" /></span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-muted-foreground">Página {page} de {totalPages} · {total} materiais</p>
            <div className="flex gap-1">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="h-7 rounded-lg border border-white/30 bg-white/[0.05] px-3 text-xs text-foreground backdrop-blur-xl transition hover:bg-white/10 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.03]">← Anterior</button>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="h-7 rounded-lg border border-white/30 bg-white/[0.05] px-3 text-xs text-foreground backdrop-blur-xl transition hover:bg-white/10 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.03]">Seguinte →</button>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
