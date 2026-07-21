"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Boxes,
  FileText,
  Loader2,
  Package,
  Pill,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import useDebounce from "@/hooks/useDebounce";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { ApiListMeta, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type SaleItem = {
  id: number;
  custom_id?: string | null;
  name?: string;
  sale?: number | { id?: number; number?: string; custom_id?: string };
  product?: number | { id?: number; name?: string; type?: string; custom_id?: string };
  product_name?: string;
  quantity?: number;
  unit_price?: string | number;
  created_at?: string;
  updated_at?: string;
};

type Product = {
  id: number;
  custom_id?: string | null;
  name?: string;
  type?: string;
  sale_price?: string | number;
};

type Sale = {
  id: number;
  custom_id?: string | null;
  number?: string;
  patient_name?: string;
  patient?: number | { id?: number; name?: string; custom_id?: string };
  total?: string | number;
};

type ListResponse<T> = { items: T[]; meta: ApiListMeta; raw: any };

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

function toId(value: unknown) {
  if (typeof value === "object" && value && "id" in value) {
    const parsed = Number((value as any).id);
    return Number.isFinite(parsed) ? String(parsed) : "";
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : "";
}

function itemCode(item: SaleItem) {
  return item.custom_id || item.name || `Item #${item.id}`;
}

function saleCode(sale?: Sale | null, item?: SaleItem) {
  if (sale) return sale.number || sale.custom_id || `Venda #${sale.id}`;
  if (typeof item?.sale === "object" && item.sale) return item.sale.number || item.sale.custom_id || `Venda #${item.sale.id}`;
  const id = toId(item?.sale);
  return id ? `Venda #${id}` : "Sem venda";
}

function productLabel(item: SaleItem, products: Map<string, Product>) {
  if (item.product_name) return item.product_name;
  if (typeof item.product === "object" && item.product) return item.product.name || item.product.custom_id || `Produto #${item.product.id}`;
  const id = toId(item.product);
  const product = id ? products.get(id) : null;
  return product?.name || product?.custom_id || (id ? `Produto #${id}` : "Sem produto");
}

function productType(item: SaleItem, products: Map<string, Product>) {
  const raw = typeof item.product === "object" && item.product ? item.product.type : products.get(toId(item.product))?.type;
  if (raw === "MED") return { label: "Medicação", Icon: Pill, tone: "text-cyan-700 bg-cyan-500/10 border-cyan-300/60 dark:text-cyan-200 dark:border-cyan-800/60" };
  if (raw === "MAT") return { label: "Material", Icon: Package, tone: "text-emerald-700 bg-emerald-500/10 border-emerald-300/60 dark:text-emerald-200 dark:border-emerald-800/60" };
  return { label: "Item", Icon: Boxes, tone: "text-muted-foreground bg-muted/50 border-border/70" };
}

function formatMoney(value?: string | number) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(amount);
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function subtotal(item: SaleItem) {
  return Number(item.quantity || 0) * Number(item.unit_price || 0);
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/45 px-2 py-1">
      <div className="mb-0.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        <Icon size={11} />
        {label}
      </div>
      <div className="truncate text-sm font-bold text-foreground">{value ?? "—"}</div>
    </div>
  );
}

function SaleItemCard({
  item,
  product,
  sale,
  products,
}: {
  item: SaleItem;
  product: string;
  sale?: Sale | null;
  products: Map<string, Product>;
}) {
  const type = productType(item, products);
  const TypeIcon = type.Icon;
  return (
    <Link href={`/pharmacy/sale-items/${item.id}`} className={`${GLASS} group relative block overflow-hidden transition hover:shadow-md`}>
      <span className="absolute inset-y-0 left-0 w-1 bg-cyan-500" />
      <div className="space-y-1.5 px-2.5 py-1.5 pl-4">
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cyan-500/12 text-cyan-600 dark:text-cyan-300">
              <ShoppingCart size={15} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-300">
                {product}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">{itemCode(item)}</p>
            </div>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${type.tone}`}>
            <TypeIcon size={11} />
            {type.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 text-[11px]">
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-0.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Qtd.</p>
            <p className="truncate text-xs font-bold text-foreground">{item.quantity || 0}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-0.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Unitário</p>
            <p className="truncate text-xs font-semibold text-foreground">{formatMoney(item.unit_price)} MT</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-0.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Subtotal</p>
            <p className="truncate text-xs font-semibold text-foreground">{formatMoney(subtotal(item))} MT</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-1.5 border-t border-border/50 pt-1 text-[10px] text-muted-foreground">
          <span className="truncate">{saleCode(sale, item)}</span>
          <span className="shrink-0">{formatDate(item.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}

export default function PharmacySaleItemsPage() {
  useAuthGuard();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(40);
  const [typeFilter, setTypeFilter] = useState<"ALL" | "MED" | "MAT" | "OUT">("ALL");
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
        const query = params.toString();

        const [itemResponse, productResponse, saleResponse] = await Promise.all([
          apiFetchList<SaleItem>(`/pharmacy/sale_item/${query ? `?${query}` : ""}`, {
            page: 1,
            pageSize: 1000,
            clientPaginate: true,
            clientCache: safeRefreshToken === 0,
          }),
          apiFetchList<Product>("/pharmacy/product/", {
            page: 1,
            pageSize: 500,
            clientPaginate: true,
            clientCache: safeRefreshToken === 0,
          }),
          apiFetchList<Sale>("/pharmacy/sale/", {
            page: 1,
            pageSize: 500,
            clientPaginate: true,
            clientCache: safeRefreshToken === 0,
          }),
        ]);

        if (!mounted) return;
        setItems((itemResponse as ListResponse<SaleItem>).items ?? []);
        setProducts((productResponse as ListResponse<Product>).items ?? []);
        setSales((saleResponse as ListResponse<Sale>).items ?? []);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Falha ao carregar itens de venda.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [debouncedSearch, safeRefreshToken]);

  const productMap = useMemo(() => new Map(products.map((product) => [String(product.id), product])), [products]);
  const saleMap = useMemo(() => new Map(sales.map((sale) => [String(sale.id), sale])), [sales]);

  const filtered = useMemo(() => {
    if (typeFilter === "ALL") return items;
    return items.filter((item) => {
      const raw = typeof item.product === "object" && item.product ? item.product.type : productMap.get(toId(item.product))?.type;
      return raw === typeFilter;
    });
  }, [items, productMap, typeFilter]);

  const visible = filtered.slice(0, limit);
  const totalValue = filtered.reduce((total, item) => total + subtotal(item), 0);
  const totalQuantity = filtered.reduce((total, item) => total + Number(item.quantity || 0), 0);
  const medicationCount = filtered.filter((item) => {
    const raw = typeof item.product === "object" && item.product ? item.product.type : productMap.get(toId(item.product))?.type;
    return raw === "MED";
  }).length;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA]}>
      <div className="w-full space-y-1.5 px-0.5">
        <section className={`${GLASS} relative overflow-visible`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-cyan-500" />
          <div className="space-y-1.5 px-2.5 py-1.5 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan-500/12 text-cyan-600 dark:text-cyan-300">
                  <ShoppingCart size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">Itens de venda</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {loading ? "A carregar..." : `${visible.length} de ${filtered.length} itens`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <Link href="/pharmacy/sales" className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
                  <ArrowLeft size={13} />
                  Voltar
                </Link>
                <label className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-1.5 text-[11px] font-semibold text-muted-foreground">
                  <span>Mostrar</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={limit}
                    onChange={(event) => setLimit(Math.min(999, Math.max(1, Number(event.target.value || 1))))}
                    className="h-5 w-12 rounded border border-border bg-background px-1 text-center text-xs font-bold text-foreground outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                    aria-label="Número de itens"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
              <MetricCard icon={ShoppingCart} label="Itens" value={filtered.length} />
              <MetricCard icon={Boxes} label="Quantidade" value={totalQuantity} />
              <MetricCard icon={Banknote} label="Total" value={`${formatMoney(totalValue)} MT`} />
              <MetricCard icon={Pill} label="Medicação" value={medicationCount} />
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Pesquisar item, produto, venda..."
                  className="h-7 w-full rounded-md border border-border bg-background/70 pl-8 pr-7 text-xs text-foreground outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {search ? (
                  <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Limpar pesquisa">
                    <X size={12} />
                  </button>
                ) : null}
              </div>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
                className="h-7 rounded-md border border-border bg-background/70 px-2 text-xs font-semibold text-foreground outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                aria-label="Filtrar por tipo"
              >
                <option value="ALL">Todos</option>
                <option value="MED">Medicação</option>
                <option value="MAT">Material</option>
                <option value="OUT">Outros</option>
              </select>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className={`${GLASS} flex h-28 items-center justify-center text-muted-foreground`}>
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <section className={`${GLASS} flex min-h-[120px] items-center justify-center text-sm text-muted-foreground`}>
            Nenhum item de venda encontrado.
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-4">
            {visible.map((item) => (
              <SaleItemCard
                key={item.id}
                item={item}
                product={productLabel(item, productMap)}
                sale={saleMap.get(toId(item.sale))}
                products={productMap}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
