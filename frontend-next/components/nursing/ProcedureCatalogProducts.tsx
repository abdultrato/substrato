"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, Loader2, PackagePlus, Pencil, Pill, Save, Search, Trash2, X } from "lucide-react";

import { apiFetch, apiFetchAll, apiFetchList } from "@/lib/api";

type CatalogMaterial = {
  id: number;
  catalog: number;
  product: number;
  default_quantity?: string | number | null;
  observation?: string | null;
};

type PharmacyProduct = {
  id: number;
  custom_id?: string | null;
  name: string;
  type?: "MED" | "MAT" | "OUT" | string;
};

type Props = {
  catalogId: number;
  editable?: boolean;
};

const PRODUCT_TYPE_LABEL: Record<string, string> = {
  MED: "Medicamento",
  MAT: "Material",
  OUT: "Produto",
};

function productTypeLabel(type?: string) {
  return PRODUCT_TYPE_LABEL[String(type || "OUT").toUpperCase()] || "Produto";
}

export default function ProcedureCatalogProducts({ catalogId, editable = false }: Props) {
  const [materials, setMaterials] = useState<CatalogMaterial[]>([]);
  const [products, setProducts] = useState<PharmacyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PharmacyProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [observation, setObservation] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState("1");
  const [editObservation, setEditObservation] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [materialResponse, productResponse] = await Promise.all([
        apiFetchList<CatalogMaterial>("/nursing/procedure_catalog_material/", {
          page: 1,
          pageSize: 200,
          query: { catalog: catalogId },
          clientCache: false,
        }),
        apiFetchAll<PharmacyProduct>("/pharmacy/product/", {
          pageSize: 100,
          clientCache: false,
        }),
      ]);
      setMaterials(materialResponse.items || []);
      setProducts(productResponse || []);
    } catch (reason: any) {
      setError(reason?.message || "Não foi possível carregar os produtos associados.");
    } finally {
      setLoading(false);
    }
  }, [catalogId]);

  useEffect(() => {
    load();
  }, [load]);

  const productById = useMemo(() => {
    const map = new Map<number, PharmacyProduct>();
    for (const product of products) map.set(Number(product.id), product);
    return map;
  }, [products]);

  useEffect(() => {
    const query = productSearch.trim();
    if (selectedProduct || query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await apiFetchList<PharmacyProduct>("/pharmacy/product/", {
          page: 1,
          pageSize: 12,
          query: { search: query },
          clientCache: false,
        });
        if (!active) return;
        const assigned = new Set(materials.map((item) => Number(item.product)));
        setSearchResults((response.items || []).filter((product) => !assigned.has(Number(product.id))));
        setSearchOpen(true);
      } catch {
        if (active) setSearchResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [materials, productSearch, selectedProduct]);

  async function addProduct() {
    const productId = Number(selectedProduct);
    const parsedQuantity = Number(quantity);
    if (!productId) {
      setError("Selecione um produto da farmácia.");
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError("Informe uma quantidade superior a zero.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/nursing/procedure_catalog_material/", {
        method: "POST",
        body: JSON.stringify({
          catalog: catalogId,
          product: productId,
          default_quantity: parsedQuantity,
          observation: observation.trim(),
        }),
      });
      setSelectedProduct("");
      setProductSearch("");
      setSearchResults([]);
      setQuantity("1");
      setObservation("");
      await load();
    } catch (reason: any) {
      setError(reason?.message || "Não foi possível associar o produto.");
    } finally {
      setBusy(false);
    }
  }

  function startEditing(item: CatalogMaterial) {
    setEditingId(item.id);
    setEditQuantity(String(item.default_quantity || "1"));
    setEditObservation(item.observation || "");
  }

  async function saveEditing(item: CatalogMaterial) {
    const parsedQuantity = Number(editQuantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError("Informe uma quantidade superior a zero.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/nursing/procedure_catalog_material/${item.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          default_quantity: parsedQuantity,
          observation: editObservation.trim(),
        }),
      });
      setEditingId(null);
      await load();
    } catch (reason: any) {
      setError(reason?.message || "Não foi possível atualizar o produto.");
    } finally {
      setBusy(false);
    }
  }

  async function removeProduct(item: CatalogMaterial) {
    const product = productById.get(Number(item.product));
    if (!window.confirm(`Remover ${product?.name || "este produto"} do procedimento?`)) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/nursing/procedure_catalog_material/${item.id}/`, { method: "DELETE" });
      await load();
    } catch (reason: any) {
      setError(reason?.message || "Não foi possível remover o produto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="relative overflow-visible rounded-2xl border border-white/30 bg-gradient-to-br from-white/20 via-white/10 to-emerald-100/20 p-4 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:from-white/10 dark:via-white/5 dark:to-emerald-950/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/25">
            <Boxes size={17} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Produtos associados</h2>
            <p className="text-[10px] text-muted-foreground">Medicamentos, materiais e produtos fornecidos pela farmácia</p>
          </div>
        </div>
        <span className="rounded-full border border-white/50 bg-white/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground backdrop-blur dark:border-white/10 dark:bg-white/5">
          {materials.length} {materials.length === 1 ? "item" : "itens"}
        </span>
      </div>

      {editable ? (
        <div className="mt-4 grid gap-2 rounded-xl border border-white/30 bg-white/10 p-3 shadow-inner backdrop-blur-xl dark:border-white/10 dark:bg-black/5 md:grid-cols-[minmax(220px,1.4fr)_100px_minmax(160px,1fr)_auto]">
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={productSearch}
              onChange={(event) => {
                setProductSearch(event.target.value);
                setSelectedProduct("");
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
              placeholder="Pesquisar medicamento ou produto…"
              autoComplete="off"
              className="h-9 w-full rounded-lg border border-border/70 bg-white/50 pl-8 pr-8 text-xs text-foreground outline-none backdrop-blur transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:bg-white/5"
            />
            {searching ? <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-emerald-600" /> : null}
            {searchOpen && !selectedProduct && productSearch.trim().length >= 2 ? (
              <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-white/60 bg-white/90 p-1.5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90">
                {searchResults.length ? searchResults.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setSelectedProduct(String(product.id));
                      setProductSearch(product.name);
                      setSearchOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-foreground">{product.name}</span>
                      <span className="block text-[9px] uppercase tracking-wide text-muted-foreground">{product.custom_id || `Produto ${product.id}`}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">{productTypeLabel(product.type)}</span>
                  </button>
                )) : !searching ? (
                  <p className="px-3 py-4 text-center text-[11px] text-muted-foreground">Nenhum produto disponível encontrado.</p>
                ) : null}
              </div>
            ) : null}
          </div>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            aria-label="Quantidade padrão"
            placeholder="Qtd."
            className="h-9 rounded-lg border border-white/30 bg-white/10 px-2.5 text-xs text-foreground outline-none backdrop-blur-xl focus:border-emerald-500 dark:border-white/10 dark:bg-white/5"
          />
          <input
            value={observation}
            onChange={(event) => setObservation(event.target.value)}
            placeholder="Observação (opcional)"
            className="h-9 rounded-lg border border-white/30 bg-white/10 px-2.5 text-xs text-foreground outline-none backdrop-blur-xl focus:border-emerald-500 dark:border-white/10 dark:bg-white/5"
          />
          <button
            type="button"
            onClick={addProduct}
            disabled={busy || !selectedProduct}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <PackagePlus size={13} />} Associar
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-xs text-red-700 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-300">{error}</p> : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> A carregar produtos…
        </div>
      ) : materials.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-border/80 bg-white/20 py-8 text-center dark:bg-white/[0.02]">
          <Pill size={21} className="mx-auto text-muted-foreground/40" />
          <p className="mt-2 text-xs font-medium text-foreground">Nenhum produto associado</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{editable ? "Selecione acima os produtos necessários para este procedimento." : "Este procedimento ainda não possui materiais ou medicamentos definidos."}</p>
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {materials.map((item) => {
            const product = productById.get(Number(item.product));
            const isEditing = editingId === item.id;
            return (
              <article key={item.id} className="rounded-xl border border-white/30 bg-white/10 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <Pill size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-xs font-semibold text-foreground">{product?.name || `Produto #${item.product}`}</h3>
                        <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{productTypeLabel(product?.type)}{product?.custom_id ? ` · ${product.custom_id}` : ""}</p>
                      </div>
                      {editable && !isEditing ? (
                        <div className="flex shrink-0 gap-1">
                          <button type="button" onClick={() => startEditing(item)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/40" aria-label="Editar associação">
                            <Pencil size={12} />
                          </button>
                          <button type="button" onClick={() => removeProduct(item)} disabled={busy} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40" aria-label="Remover associação">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <input type="number" min="0.01" step="0.01" value={editQuantity} onChange={(event) => setEditQuantity(event.target.value)} aria-label="Editar quantidade" className="h-8 w-full rounded-md border border-white/30 bg-white/10 px-2 text-xs text-foreground backdrop-blur-xl dark:border-white/10 dark:bg-white/5" />
                        <input value={editObservation} onChange={(event) => setEditObservation(event.target.value)} placeholder="Observação" className="h-8 w-full rounded-md border border-white/30 bg-white/10 px-2 text-xs text-foreground backdrop-blur-xl dark:border-white/10 dark:bg-white/5" />
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => setEditingId(null)} className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[10px] text-muted-foreground"><X size={11} /> Cancelar</button>
                          <button type="button" onClick={() => saveEditing(item)} disabled={busy} className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-600 px-2 text-[10px] font-semibold text-white"><Save size={11} /> Guardar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-end justify-between gap-2">
                        <p className="line-clamp-2 text-[10px] leading-4 text-muted-foreground">{item.observation || "Sem observação adicional."}</p>
                        <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Qtd. {Number(item.default_quantity || 0).toLocaleString("pt-PT")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
