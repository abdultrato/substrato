"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Package,
  Pill,
  Save,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type ProductType = "MED" | "MAT" | "OUT";

type Product = {
  id: number;
  custom_id?: string;
  name?: string;
  description?: string;
  type?: ProductType | string;
  sale_price?: string | number;
  vat_percentage?: string | number;
  applies_vat_by_default?: boolean;
  active?: boolean;
  category?: number | { id?: number; name?: string; custom_id?: string };
};

type Category = {
  id: number;
  custom_id?: string;
  name?: string;
};

type FormState = {
  name: string;
  type: ProductType;
  sale_price: string;
  vat_percentage: string;
  applies_vat_by_default: boolean;
  active: boolean;
  category: string;
  description: string;
};

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const INPUT =
  "h-9 w-full rounded-md border border-border bg-background/70 px-3 text-sm text-foreground outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60";

function typeInfo(type?: string) {
  if (type === "MED") {
    return {
      label: "Medicamento",
      Icon: Pill,
      accent: "bg-emerald-500",
      iconClass: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    };
  }
  if (type === "MAT") {
    return {
      label: "Material",
      Icon: Package,
      accent: "bg-blue-500",
      iconClass: "bg-blue-500/12 text-blue-600 dark:text-blue-300",
      badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300",
    };
  }
  return {
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

function categoryId(product: Product) {
  if (typeof product.category === "object" && product.category) return product.category.id ? String(product.category.id) : "";
  return product.category ? String(product.category) : "";
}

function categoryLabel(product: Product | null, categories: Category[]) {
  if (!product) return "—";
  const currentId = categoryId(product);
  const option = categories.find((category) => String(category.id) === currentId);
  if (option) return option.name || option.custom_id || `Categoria ${option.id}`;
  if (typeof product.category === "object" && product.category) {
    return product.category.name || product.category.custom_id || `Categoria ${product.category.id}`;
  }
  return currentId ? `Categoria ${currentId}` : "Sem categoria";
}

function normalizeDecimal(value: string) {
  const trimmed = value.trim().replace(/\s/g, "").replace(",", ".");
  return trimmed || "0";
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 md:grid-cols-[150px_minmax(0,1fr)] md:items-center">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export default function ProductsEditPage() {
  useAuthGuard();
  const params = useParams();
  const router = useRouter();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const id = String((params as any)?.id || "");

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>({
    name: "",
    type: "OUT",
    sale_price: "0",
    vat_percentage: "16",
    applies_vat_by_default: true,
    active: true,
    category: "",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [productResponse, categoriesResponse] = await Promise.all([
          apiFetch<Product>(`/pharmacy/product/${id}/`, { clientCache: safeRefreshToken === 0 }),
          apiFetchList<Category>("/pharmacy/product-categories/", {
            page: 1,
            pageSize: 300,
            clientPaginate: true,
            clientCache: safeRefreshToken === 0,
          }).catch(() => ({ items: [] as Category[], meta: {}, raw: null })),
        ]);
        if (!mounted) return;
        setProduct(productResponse);
        setCategories(categoriesResponse.items ?? []);
        setForm({
          name: productResponse.name || "",
          type: productResponse.type === "MED" || productResponse.type === "MAT" ? productResponse.type : "OUT",
          sale_price: String(productResponse.sale_price ?? "0"),
          vat_percentage: String(productResponse.vat_percentage ?? "16"),
          applies_vat_by_default: productResponse.applies_vat_by_default !== false,
          active: productResponse.active !== false,
          category: categoryId(productResponse),
          description: productResponse.description || "",
        });
      } catch (err: any) {
        if (mounted) setError(err?.message || "Falha ao carregar produto.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id, safeRefreshToken]);

  const info = typeInfo(form.type);
  const Icon = info.Icon;
  const finalPrice = useMemo(() => {
    const base = Number(normalizeDecimal(form.sale_price));
    const vat = form.applies_vat_by_default ? Number(normalizeDecimal(form.vat_percentage)) : 0;
    return base + (base * vat) / 100;
  }, [form.applies_vat_by_default, form.sale_price, form.vat_percentage]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        sale_price: normalizeDecimal(form.sale_price),
        vat_percentage: normalizeDecimal(form.vat_percentage),
        applies_vat_by_default: form.applies_vat_by_default,
        active: form.active,
        category: form.category ? Number(form.category) : null,
        description: form.description.trim(),
      };
      const updated = await apiFetch<Product>(`/pharmacy/product/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setProduct(updated);
      router.push(`/pharmacy/products/${id}`);
    } catch (err: any) {
      setError(err?.message || "Falha ao guardar produto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA]}>
      <div className="w-full space-y-1.5 px-1">
        <form onSubmit={handleSubmit} className="space-y-1.5">
          <section className={`${GLASS} relative overflow-hidden`}>
            <span className={`absolute inset-y-0 left-0 w-1 ${info.accent}`} />
            <div className="space-y-1.5 px-3 py-1.5 pl-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${info.iconClass}`}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <h1 className="truncate text-base font-bold leading-tight text-foreground">
                      {loading ? "Editar produto..." : product?.name || `Produto #${id}`}
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${info.badge}`}>
                        {info.label}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          form.active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                            : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300"
                        }`}
                      >
                        {form.active ? "Activo" : "Inactivo"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{product?.custom_id || `ID ${id}`}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Link
                    href={`/pharmacy/products/${id}`}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                  >
                    <ArrowLeft size={13} />
                    Voltar
                  </Link>
                  <button
                    type="submit"
                    disabled={saving || loading || !form.name.trim()}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-cyan-400/50 bg-cyan-600 px-2.5 text-xs font-bold text-white transition hover:bg-cyan-700 disabled:opacity-50"
                  >
                    <Save size={13} />
                    {saving ? "A guardar..." : `Guardar · final ${formatMoney(finalPrice)}`}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
                <MetricCard icon={ClipboardList} label="Base" value={formatMoney(form.sale_price)} />
                <MetricCard icon={CheckCircle2} label="IVA" value={form.applies_vat_by_default ? `${formatMoney(form.vat_percentage)}%` : "Isento"} />
                <MetricCard icon={Package} label="Final" value={formatMoney(finalPrice)} />
                <MetricCard icon={Boxes} label="Categoria" value={categoryLabel(product, categories)} />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <label className="inline-flex h-8 items-center gap-2 rounded-md border border-border/70 bg-background/60 px-2.5 text-[11px] font-semibold text-muted-foreground">
                  <span>Estado</span>
                  <select
                    className="h-6 rounded border border-border bg-background px-2 text-xs font-bold text-foreground outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                    value={form.active ? "ACTIVE" : "INACTIVE"}
                    onChange={(event) => setForm((current) => ({ ...current, active: event.target.value === "ACTIVE" }))}
                    disabled={saving}
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                  </select>
                </label>

                <label className="inline-flex h-8 items-center gap-2 rounded-md border border-border/70 bg-background/60 px-2.5 text-[11px] font-semibold text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.applies_vat_by_default}
                    onChange={(event) => setForm((current) => ({ ...current, applies_vat_by_default: event.target.checked }))}
                    disabled={saving}
                    className="h-4 w-4 rounded border-border text-cyan-600"
                  />
                  Aplicar IVA por padrão
                </label>
              </div>
            </div>
          </section>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className={`${GLASS} flex h-40 items-center justify-center text-muted-foreground`}>
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : product ? (
            <section className={`${GLASS} relative overflow-hidden`}>
              <span className={`absolute inset-y-0 left-0 w-1 ${info.accent}`} />
              <div className="space-y-1.5 px-3 py-2 pl-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
                    <Boxes size={14} />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Editar produto</h2>
                    <p className="text-[11px] text-muted-foreground">Actualize identificação, preço, IVA, categoria e disponibilidade.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                  <Field label="Nome">
                    <input
                      className={INPUT}
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      disabled={saving}
                      required
                    />
                  </Field>

                  <Field label="Tipo">
                    <select
                      className={INPUT}
                      value={form.type}
                      onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as ProductType }))}
                      disabled={saving}
                    >
                      <option value="MED">Medicamento</option>
                      <option value="MAT">Material</option>
                      <option value="OUT">Outro</option>
                    </select>
                  </Field>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3 xl:col-span-2">
                    <Field label="Preço base">
                      <input
                        className={INPUT}
                        value={form.sale_price}
                        onChange={(event) => setForm((current) => ({ ...current, sale_price: event.target.value }))}
                        disabled={saving}
                        inputMode="decimal"
                      />
                    </Field>

                    <Field label="IVA (%)">
                      <input
                        className={INPUT}
                        value={form.vat_percentage}
                        onChange={(event) => setForm((current) => ({ ...current, vat_percentage: event.target.value }))}
                        disabled={saving || !form.applies_vat_by_default}
                        inputMode="decimal"
                      />
                    </Field>
                  </div>

                  <Field label="Categoria">
                    <select
                      className={INPUT}
                      value={form.category}
                      onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                      disabled={saving}
                    >
                      <option value="">Sem categoria</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name || category.custom_id || `Categoria ${category.id}`}
                        </option>
                      ))}
                    </select>
                  </Field>

                </div>

                <Field label="Descrição">
                  <textarea
                    className="min-h-20 w-full rounded-md border border-border bg-background/70 px-3 py-1.5 text-sm text-foreground outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60"
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    disabled={saving}
                  />
                </Field>
              </div>
            </section>
          ) : (
            <section className={`${GLASS} flex h-40 items-center justify-center text-sm text-muted-foreground`}>
              Produto não encontrado.
            </section>
          )}
        </form>
      </div>
    </AppLayout>
  );
}
