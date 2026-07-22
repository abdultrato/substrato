"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Loader2,
  Package,
  Pill,
  Plus,
  Search,
  X,
  XCircle,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import useDebounce from "@/hooks/useDebounce";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { ApiListMeta, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type ProductType = "ALL" | "MED" | "MAT" | "OUT" | "ACTIVE" | "INACTIVE";

type Product = {
  id: number;
  custom_id?: string;
  name?: string;
  description?: string;
  type?: string;
  sale_price?: string | number;
  vat_percentage?: string | number;
  applies_vat_by_default?: boolean;
  active?: boolean;
  category?: number | { id?: number; name?: string; custom_id?: string };
};

type ListResponse = { items: Product[]; meta: ApiListMeta; raw: any };

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const FILTERS: { key: ProductType; label: string; dot: string }[] = [
  { key: "ALL", label: "Todos", dot: "bg-cyan-400" },
  { key: "MED", label: "Medicamentos", dot: "bg-emerald-400" },
  { key: "MAT", label: "Materiais", dot: "bg-blue-400" },
  { key: "OUT", label: "Outros", dot: "bg-slate-400" },
  { key: "ACTIVE", label: "Activos", dot: "bg-teal-400" },
  { key: "INACTIVE", label: "Inactivos", dot: "bg-rose-400" },
];

function typeInfo(product: Product) {
  const type = product.type || "OUT";
  if (type === "MED") {
    return {
      key: "MED" as const,
      label: "Medicamento",
      Icon: Pill,
      accent: "bg-emerald-500",
      iconClass: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    };
  }
  if (type === "MAT") {
    return {
      key: "MAT" as const,
      label: "Material",
      Icon: Package,
      accent: "bg-blue-500",
      iconClass: "bg-blue-500/12 text-blue-600 dark:text-blue-300",
      badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300",
    };
  }
  return {
    key: "OUT" as const,
    label: "Outro",
    Icon: Boxes,
    accent: "bg-slate-500",
    iconClass: "bg-slate-500/12 text-slate-600 dark:text-slate-300",
    badge: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/50 dark:bg-slate-900/30 dark:text-slate-300",
  };
}

function formatMoney(value?: string | number) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(amount);
}

function categoryLabel(product: Product) {
  if (typeof product.category === "object" && product.category) {
    return product.category.name || product.category.custom_id || `Categoria ${product.category.id}`;
  }
  if (product.category) return `Categoria ${product.category}`;
  return "Sem categoria";
}

function ProductCard({ product }: { product: Product }) {
  const info = typeInfo(product);
  const Icon = info.Icon;
  const active = product.active !== false;
  const iva = Number(product.vat_percentage ?? 0);

  return (
    <Link
      href={`/pharmacy/products/${product.id}`}
      className={`${GLASS} group relative block overflow-hidden transition hover:shadow-md`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${info.accent}`} />
      <div className="space-y-1.5 px-2.5 py-1.5 pl-3">
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${info.iconClass}`}>
              <Icon size={12} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-300">
                {product.name || `Produto #${product.id}`}
              </p>
              <p className="truncate text-[9px] text-muted-foreground">{product.custom_id || `ID ${product.id}`}</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${info.badge}`}>
            {info.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 text-[10px]">
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-0.5">
            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Preço</p>
            <p className="truncate text-[11px] font-bold text-foreground">{formatMoney(product.sale_price)}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-0.5">
            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted-foreground">IVA</p>
            <p className="truncate text-[11px] font-semibold text-foreground">
              {product.applies_vat_by_default === false ? "Isento" : `${formatMoney(iva)}%`}
            </p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-0.5">
            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Estado</p>
            <p className={`truncate text-[11px] font-semibold ${active ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}>
              {active ? "Activo" : "Inactivo"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-1.5 border-t border-border/50 pt-1.5 text-[9px] text-muted-foreground">
          <span className="truncate">{categoryLabel(product)}</span>
          <span className="shrink-0">{product.description ? "Com descrição" : "Sem descrição"}</span>
        </div>
      </div>
    </Link>
  );
}

export default function PharmacyProductsPage() {
  useAuthGuard();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ProductType>("ALL");
  const [limit, setLimit] = useState(40);
  const debouncedSearch = useDebounce(search, 300);
  const searchParams = useSearchParams();
  // Filtro por categoria: aceita ?category=<id> ou ?parent_category=<id> na URL
  // (ex.: vindo da página de uma categoria) e permite escolher no dropdown.
  const initialCategory = searchParams?.get("category") || "";
  const initialParentCategory = searchParams?.get("parent_category") || "";
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [parentCategoryFilter] = useState(initialParentCategory);
  const [categories, setCategories] = useState<
    { id: number; name?: string; parent_category_name?: string }[]
  >([]);

  useEffect(() => {
    let mounted = true;
    async function loadCategories() {
      const response = await apiFetchList<any>("/pharmacy/product-categories/", {
        page: 1,
        pageSize: 500,
        clientPaginate: true,
        clientCache: safeRefreshToken === 0,
      }).catch(() => ({ items: [] as any[], meta: {}, raw: null }));
      if (mounted) setCategories(response.items ?? []);
    }
    loadCategories();
    return () => {
      mounted = false;
    };
  }, [safeRefreshToken]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
        if (categoryFilter) params.set("category", categoryFilter);
        if (parentCategoryFilter) params.set("parent_category", parentCategoryFilter);
        const query = params.toString();
        const response: ListResponse = await apiFetchList<Product>(`/pharmacy/product/${query ? `?${query}` : ""}`, {
          page: 1,
          pageSize: 500,
          clientPaginate: true,
          clientCache: safeRefreshToken === 0,
        });
        if (mounted) setProducts(response.items ?? []);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Falha ao carregar produtos.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [debouncedSearch, categoryFilter, parentCategoryFilter, safeRefreshToken]);

  const counts = useMemo(() => {
    const result: Record<ProductType, number> = { ALL: products.length, MED: 0, MAT: 0, OUT: 0, ACTIVE: 0, INACTIVE: 0 };
    for (const product of products) {
      const type = typeInfo(product).key;
      result[type] += 1;
      if (product.active === false) result.INACTIVE += 1;
      else result.ACTIVE += 1;
    }
    return result;
  }, [products]);

  const filtered = useMemo(() => {
    const rows = products.filter((product) => {
      if (activeFilter === "ALL") return true;
      if (activeFilter === "ACTIVE") return product.active !== false;
      if (activeFilter === "INACTIVE") return product.active === false;
      return typeInfo(product).key === activeFilter;
    });
    return rows.slice(0, limit);
  }, [activeFilter, limit, products]);

  const totalValue = products.reduce((total, product) => total + Number(product.sale_price || 0), 0);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA]}>
      <div className="w-full space-y-2 px-1">
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-cyan-500" />
          <div className="space-y-2 px-3 py-2 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/12 text-cyan-600 dark:text-cyan-300">
                  <Boxes size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">Produtos farmacêuticos</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {loading ? "A carregar..." : `${filtered.length} de ${products.length} produtos · valor catálogo ${formatMoney(totalValue)}`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  href="/pharmacy"
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  <ArrowLeft size={13} />
                  Voltar
                </Link>
                <Link
                  href="/pharmacy/products/new"
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-cyan-400/50 bg-cyan-500/15 px-2.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-500/20 dark:text-cyan-200"
                >
                  <Plus size={13} />
                  Novo
                </Link>
                <label className="inline-flex h-8 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-[11px] font-semibold text-muted-foreground">
                  <span>Mostrar</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={limit}
                    onChange={(event) => setLimit(Math.min(999, Math.max(1, Number(event.target.value || 1))))}
                    className="h-6 w-14 rounded border border-border bg-background px-1 text-center text-xs font-bold text-foreground outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                    aria-label="Número de produtos"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
              <div className="rounded-lg border border-border/60 bg-background/45 px-3 py-2">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <Boxes size={11} />
                  Total
                </div>
                <p className="text-sm font-bold text-foreground">{products.length}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/45 px-3 py-2">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <Pill size={11} />
                  Medicamentos
                </div>
                <p className="text-sm font-bold text-foreground">{counts.MED}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/45 px-3 py-2">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <Package size={11} />
                  Materiais
                </div>
                <p className="text-sm font-bold text-foreground">{counts.MAT}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/45 px-3 py-2">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <CheckCircle2 size={11} />
                  Activos
                </div>
                <p className="text-sm font-bold text-foreground">{counts.ACTIVE}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Pesquisar produto, código..."
                  className="h-8 w-full rounded-md border border-border bg-background/70 pl-8 pr-7 text-xs text-foreground outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Limpar pesquisa"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-8 rounded-md border border-border bg-background/70 px-2 text-xs font-semibold text-foreground outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                aria-label="Filtrar por categoria"
              >
                <option value="">Todas as categorias</option>
                {categories.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.parent_category_name
                      ? `${category.parent_category_name} / ${category.name}`
                      : category.name || `Categoria ${category.id}`}
                  </option>
                ))}
              </select>

              {FILTERS.map((filter) => {
                const active = filter.key === activeFilter;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setActiveFilter(filter.key)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-semibold transition ${
                      active
                        ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-700 dark:text-cyan-200"
                        : "border-border/70 bg-background/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${filter.dot}`} />
                    {filter.label}
                    <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px]">{counts[filter.key]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className={`${GLASS} flex h-40 items-center justify-center text-muted-foreground`}>
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <section className={`${GLASS} flex min-h-[180px] items-center justify-center text-sm text-muted-foreground`}>
            Nenhum produto encontrado.
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
