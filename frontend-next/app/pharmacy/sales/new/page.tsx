"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Loader2,
  Package,
  Plus,
  Save,
  ShoppingCart,
  Trash2,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type Patient = { id: number; custom_id?: string; name?: string; full_name?: string; nome?: string };
type Product = { id: number; custom_id?: string; name?: string; sale_price?: string | number };
type Lot = {
  id: number;
  custom_id?: string;
  lot_number?: string;
  product?: number | { id?: number };
  product_name?: string;
  expiration_date?: string;
  saldo?: number;
  balance?: number;
  initial_quantity?: number;
  status?: string;
};
type ProductLotOption = {
  key: string;
  productId: string;
  productName: string;
  productCode?: string;
  lotLabel: string;
  balance: number;
  price?: string | number;
};
type Sale = { id: number; number?: string; custom_id?: string };
type Line = { id: string; product: string; quantity: string };

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";
const INPUT =
  "h-9 w-full rounded-md border border-border bg-background/70 px-3 text-sm text-foreground outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-500/20 disabled:opacity-60";

function labelPatient(patient: Patient) {
  return patient.name || patient.full_name || patient.nome || patient.custom_id || `Cliente #${patient.id}`;
}

function labelProduct(product: Product) {
  return product.name || product.custom_id || `Produto #${product.id}`;
}

function labelLot(lot: Lot) {
  return lot.lot_number || lot.custom_id || `Lote ${lot.id}`;
}

function lotProductId(lot: Lot) {
  if (typeof lot.product === "object" && lot.product) return lot.product.id ? String(lot.product.id) : "";
  return lot.product ? String(lot.product) : "";
}

function lotBalance(lot: Lot) {
  const value = lot.saldo ?? lot.balance;
  if (typeof value === "number") return value;
  return Number(lot.initial_quantity || 0);
}

function lotIsUsable(lot: Lot) {
  if (lot.status && lot.status !== "AVAILABLE") return false;
  if (lotBalance(lot) <= 0) return false;
  if (!lot.expiration_date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(lot.expiration_date);
  exp.setHours(0, 0, 0, 0);
  return !Number.isNaN(exp.getTime()) && exp >= today;
}

function formatMoney(value?: string | number) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(amount);
}

function normalizeSearch(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/45 px-3 py-1.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon size={11} />
        {label}
      </div>
      <div className="truncate text-sm font-bold text-foreground">{value ?? "—"}</div>
    </div>
  );
}

function ProductPicker({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: ProductLotOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.productId === value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const needle = normalizeSearch(query || "");
  const filtered = options
    .filter((option) => {
      if (!needle) return true;
      return normalizeSearch(`${option.productName} ${option.productCode || ""} ${option.productId} ${option.lotLabel}`).includes(needle);
    })
    .slice(0, 20);
  const selectedLabel = selected ? `${selected.productName} - ${selected.lotLabel}` : "";

  return (
    <div className="relative min-w-[260px]">
      <input
        className={INPUT}
        value={open ? query : selectedLabel || query}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setOpen(false);
            setQuery("");
          }, 120);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (!event.target.value) onChange("");
        }}
        disabled={disabled}
        placeholder="Pesquisar produto com stock disponível"
        autoComplete="off"
        required
      />
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[9999] max-h-64 overflow-auto rounded-lg border border-border bg-background p-1 shadow-xl">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum produto disponível.</div>
          ) : (
            filtered.map((option) => (
              <button
                key={option.key}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(option.productId);
                  setQuery("");
                  setOpen(false);
                  (event.currentTarget.ownerDocument.activeElement as HTMLElement | null)?.blur();
                }}
                className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-xs transition hover:bg-foreground/10"
              >
                <span className="min-w-0 truncate font-semibold text-foreground">
                  {option.productName} - {option.lotLabel}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  Stock {option.balance} · {formatMoney(option.price)}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function ClientPicker({
  value,
  clients,
  disabled,
  onChange,
}: {
  value: string;
  clients: Patient[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const selected = clients.find((client) => String(client.id) === value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const needle = normalizeSearch(query || "");
  const filtered = clients
    .filter((client) => {
      if (!needle) return true;
      return normalizeSearch(`${client.name || ""} ${client.full_name || ""} ${client.nome || ""} ${client.custom_id || ""} ${client.id}`).includes(needle);
    })
    .slice(0, 20);

  return (
    <div className="relative min-w-[260px]">
      <input
        className={INPUT}
        value={open ? query : selected ? labelPatient(selected) : query}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setOpen(false);
            setQuery("");
          }, 120);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (!event.target.value) onChange("");
        }}
        disabled={disabled}
        placeholder="Pesquisar cliente"
        autoComplete="off"
      />
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[9999] max-h-64 overflow-auto rounded-lg border border-border bg-background p-1 shadow-xl">
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              onChange("");
              setQuery("");
              setOpen(false);
              (event.currentTarget.ownerDocument.activeElement as HTMLElement | null)?.blur();
            }}
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-xs font-semibold text-muted-foreground transition hover:bg-foreground/10"
          >
            Sem cliente
          </button>
          {filtered.map((client) => (
            <button
              key={client.id}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(String(client.id));
                setQuery("");
                setOpen(false);
                (event.currentTarget.ownerDocument.activeElement as HTMLElement | null)?.blur();
              }}
              className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-xs transition hover:bg-foreground/10"
            >
              <span className="min-w-0 truncate font-semibold text-foreground">{labelPatient(client)}</span>
              <span className="shrink-0 text-muted-foreground">{client.custom_id || `#${client.id}`}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function CreateSalePage() {
  useAuthGuard();
  const router = useRouter();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [patient, setPatient] = useState("");
  const [lines, setLines] = useState<Line[]>([{ id: crypto.randomUUID(), product: "", quantity: "1" }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [patientsResponse, productsResponse, lotsResponse] = await Promise.all([
          apiFetchList<Patient>("/clinical/patients/", { page: 1, pageSize: 500, clientPaginate: true, clientCache: safeRefreshToken === 0 }),
          apiFetchList<Product>("/pharmacy/product/", { page: 1, pageSize: 500, clientPaginate: true, clientCache: safeRefreshToken === 0 }),
          apiFetchList<Lot>("/pharmacy/lot/", { page: 1, pageSize: 1000, clientPaginate: true, clientCache: safeRefreshToken === 0 }),
        ]);
        if (!mounted) return;
        setPatients(patientsResponse.items ?? []);
        setProducts(productsResponse.items ?? []);
        setLots(lotsResponse.items ?? []);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Falha ao carregar dados da venda.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [safeRefreshToken]);

  const productMap = useMemo(() => new Map(products.map((product) => [String(product.id), product])), [products]);
  const availableOptions = useMemo(() => {
    const options: ProductLotOption[] = [];
    for (const lot of lots) {
      if (!lotIsUsable(lot)) continue;
      const productId = lotProductId(lot);
      if (!productId) continue;
      const product = productMap.get(productId);
      const productName = lot.product_name || (product ? labelProduct(product) : `Produto #${productId}`);
      options.push({
        key: `${productId}-${lot.id}`,
        productId,
        productName,
        productCode: product?.custom_id,
        lotLabel: labelLot(lot),
        balance: lotBalance(lot),
        price: product?.sale_price,
      });
    }
    return options.sort((a, b) => `${a.productName} ${a.lotLabel}`.localeCompare(`${b.productName} ${b.lotLabel}`));
  }, [lots, productMap]);
  const validLines = lines.filter((line) => line.product && Number(line.quantity || 0) > 0);
  const totalPreview = lines.reduce((total, line) => {
    const product = productMap.get(line.product);
    return total + Number(product?.sale_price || 0) * Math.max(0, Number(line.quantity || 0));
  }, 0);
  const totalQuantity = lines.reduce((total, line) => total + Math.max(0, Number(line.quantity || 0)), 0);

  function updateLine(id: string, patch: Partial<Line>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (validLines.length === 0) {
      setError("Adicione pelo menos um produto à venda.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const sale = await apiFetch<Sale>("/pharmacy/sale/", {
        method: "POST",
        body: JSON.stringify({ patient: patient ? Number(patient) : null }),
      });

      for (const line of validLines) {
        await apiFetch("/pharmacy/sale_item/", {
          method: "POST",
          body: JSON.stringify({
            sale: sale.id,
            product: Number(line.product),
            quantity: Math.max(1, Number(line.quantity || 1)),
          }),
        });
      }

      router.push(`/pharmacy/sales/${sale.id}`);
    } catch (err: any) {
      setError(err?.message || "Falha ao criar venda.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA]}>
      <div className="w-full space-y-2 px-1">
        <form onSubmit={handleSubmit} className="space-y-2">
          <section className={`${GLASS} relative overflow-visible`}>
            <span className="absolute inset-y-0 left-0 w-1 bg-green-500" />
            <div className="space-y-2 px-3 py-2 pl-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-500/12 text-green-600 dark:text-green-300">
                    <ShoppingCart size={18} />
                  </span>
                  <div className="min-w-0">
                    <h1 className="truncate text-base font-bold leading-tight text-foreground">Vender</h1>
                    <p className="text-[11px] text-muted-foreground">Venda com baixa automática de stock por FEFO.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link href="/pharmacy/sales" className="inline-flex h-8 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
                    <ArrowLeft size={13} />
                    Voltar
                  </Link>
                  <button
                    type="submit"
                    disabled={saving || loading || validLines.length === 0}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-green-400/50 bg-green-600 px-2.5 text-xs font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                  >
                    <Save size={13} />
                    {saving ? "A vender..." : "Guardar venda"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
                <MetricCard icon={Banknote} label="Total previsto" value={formatMoney(totalPreview)} />
                <MetricCard icon={Package} label="Itens" value={validLines.length} />
                <MetricCard icon={ShoppingCart} label="Quantidade" value={totalQuantity} />
                <MetricCard icon={User} label="Cliente" value={patient ? labelPatient(patients.find((p) => String(p.id) === patient) || { id: Number(patient) }) : "Sem cliente"} />
              </div>
            </div>
          </section>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className={`${GLASS} flex h-40 items-center justify-center text-muted-foreground`}>
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : (
            <section className={`${GLASS} relative overflow-visible`}>
              <span className="absolute inset-y-0 left-0 w-1 bg-green-500" />
              <div className="space-y-2 px-3 py-2 pl-4">
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(220px,320px)_1fr]">
                  <label className="grid gap-1">
                    <span className="text-xs font-bold text-muted-foreground">Cliente</span>
                    <ClientPicker value={patient} clients={patients} disabled={saving} onChange={setPatient} />
                  </label>
                </div>

                <div className="overflow-visible pb-1">
                  <div className="mb-1 hidden min-w-[560px] grid-cols-[minmax(260px,1fr)_90px_110px_36px_36px] gap-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground lg:grid">
                    <span>Produto</span>
                    <span>Qtd.</span>
                    <span>Subtotal</span>
                    <span />
                    <span />
                  </div>
                  <div className="space-y-1.5 overflow-visible">
                  {lines.map((line, index) => {
                    const selected = productMap.get(line.product);
                    const subtotal = Number(selected?.sale_price || 0) * Math.max(0, Number(line.quantity || 0));
                    return (
                      <div key={line.id} className="grid min-w-[560px] grid-cols-[minmax(260px,1fr)_90px_110px_36px_36px] items-end gap-2 rounded-lg border border-border/60 bg-background/45 px-3 py-2">
                        <label className="grid gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground lg:hidden">Produto {index + 1}</span>
                          <ProductPicker
                            value={line.product}
                            options={availableOptions}
                            disabled={saving}
                            onChange={(value) => updateLine(line.id, { product: value })}
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground lg:hidden">Qtd.</span>
                          <input className={INPUT} type="number" min={1} value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} disabled={saving} required />
                        </label>
                        <div className="grid gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground lg:hidden">Subtotal</span>
                          <div className="flex h-9 items-center rounded-md border border-border bg-background/45 px-3 text-sm font-bold text-foreground">
                            {formatMoney(subtotal)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLines((current) => current.length > 1 ? current.filter((item) => item.id !== line.id) : current)}
                          disabled={saving || lines.length === 1}
                          className="inline-flex h-9 items-center justify-center self-end rounded-md border border-border/70 bg-background/60 text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                          aria-label="Remover item"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLines((current) => {
                            const next = [...current];
                            next.splice(index + 1, 0, { id: crypto.randomUUID(), product: "", quantity: "1" });
                            return next;
                          })}
                          disabled={saving}
                          className="inline-flex h-9 items-center justify-center self-end rounded-md border border-green-400/50 bg-green-500/15 text-green-700 transition hover:bg-green-500/20 disabled:opacity-50 dark:text-green-200"
                          aria-label="Adicionar item abaixo"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    );
                  })}
                  </div>
                </div>

              </div>
            </section>
          )}
        </form>
      </div>
    </AppLayout>
  );
}
