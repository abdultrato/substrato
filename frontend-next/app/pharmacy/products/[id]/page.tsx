"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Package,
  Pill,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

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
  created_at?: string;
  updated_at?: string;
};

type Lot = {
  id: number;
  custom_id?: string;
  name?: string;
  product?: number | { id?: number; name?: string; custom_id?: string };
  product_name?: string;
  lot_number?: string;
  expiration_date?: string;
  initial_quantity?: number;
  sale_price?: string | number;
  saldo?: number;
  balance?: number;
  status?: string;
  status_reason?: string;
};

type Movement = {
  id: number;
  custom_id?: string;
  name?: string;
  lot?: number | { id?: number };
  type?: string;
  origin?: string;
  quantity?: number;
  created_at?: string;
};

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

function typeInfo(product?: Product | null) {
  const type = product?.type || "OUT";
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

function balanceOf(lot: Lot) {
  const value = lot.saldo ?? lot.balance;
  if (typeof value === "number") return value;
  return Number(lot.initial_quantity || 0);
}

function lotProductId(lot: Lot) {
  if (typeof lot.product === "object" && lot.product) return lot.product.id;
  return lot.product;
}

function movementLotId(movement: Movement) {
  if (typeof movement.lot === "object" && movement.lot) return movement.lot.id;
  return movement.lot;
}

function signedQuantity(movement: Movement) {
  const quantity = Number(movement.quantity || 0);
  return movement.type === "SAI" ? -quantity : quantity;
}

function formatMoney(value?: string | number) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(amount);
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function categoryLabel(product?: Product | null) {
  if (!product) return "—";
  if (typeof product.category === "object" && product.category) {
    return product.category.name || product.category.custom_id || `Categoria ${product.category.id}`;
  }
  if (product.category) return `Categoria ${product.category}`;
  return "Sem categoria";
}

function movementTypeLabel(type?: string) {
  if (type === "ENT") return "Entrada";
  if (type === "SAI") return "Saída";
  if (type === "AJU") return "Ajuste";
  return type || "Movimento";
}

function originLabel(origin?: string) {
  if (origin === "VEND") return "Venda";
  if (origin === "PROC") return "Procedimento";
  if (origin === "AJUS") return "Ajuste";
  if (origin === "REQ") return "Requisição";
  return origin || "Origem não informada";
}

function daysToExpire(lot: Lot) {
  if (!lot.expiration_date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(lot.expiration_date);
  exp.setHours(0, 0, 0, 0);
  if (Number.isNaN(exp.getTime())) return null;
  return Math.ceil((exp.getTime() - today.getTime()) / 86400000);
}

function lotStatus(lot: Lot) {
  if (lot.status && lot.status !== "AVAILABLE") {
    const labels: Record<string, { label: string; badge: string; accent: string }> = {
      QUARANTINE: { label: "Quarentena", badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300", accent: "bg-amber-500" },
      DAMAGED: { label: "Danificado", badge: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/50 dark:bg-orange-950/30 dark:text-orange-300", accent: "bg-orange-500" },
      CONTAMINATED: { label: "Contaminado", badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300", accent: "bg-red-500" },
      RECALLED: { label: "Recolhido", badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-300", accent: "bg-violet-500" },
      EXPIRED: { label: "Vencido", badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300", accent: "bg-rose-500" },
      DEPLETED: { label: "Esgotado", badge: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/50 dark:bg-slate-900/30 dark:text-slate-300", accent: "bg-slate-500" },
    };
    return labels[lot.status] || labels.QUARANTINE;
  }
  const days = daysToExpire(lot);
  if (days !== null && days < 0) return { label: "Vencido", badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300", accent: "bg-rose-500" };
  if (balanceOf(lot) <= 10) return { label: "Stock baixo", badge: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/50 dark:bg-orange-950/30 dark:text-orange-300", accent: "bg-orange-500" };
  if (days !== null && days <= 90) return { label: "A vencer", badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300", accent: "bg-amber-500" };
  return { label: "Válido", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300", accent: "bg-emerald-500" };
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/45 px-3 py-2">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon size={11} />
        {label}
      </div>
      <div className="text-sm font-bold text-foreground">{value ?? "—"}</div>
    </div>
  );
}

export default function ProductsDetailPage() {
  useAuthGuard();
  const params = useParams();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const id = String((params as any)?.id || "");

  const [product, setProduct] = useState<Product | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [productResponse, lotsResponse, movementResponse] = await Promise.all([
          apiFetch<Product>(`/pharmacy/product/${id}/`, { clientCache: safeRefreshToken === 0 }),
          apiFetchList<Lot>(`/pharmacy/lot/?product=${id}`, {
            page: 1,
            pageSize: 500,
            clientPaginate: true,
            clientCache: safeRefreshToken === 0,
          }),
          apiFetchList<Movement>("/pharmacy/inventory_movement/", {
            page: 1,
            pageSize: 500,
            clientPaginate: true,
            clientCache: safeRefreshToken === 0,
          }),
        ]);
        if (!mounted) return;
        const linkedLots = (lotsResponse.items ?? []).filter((lot) => String(lotProductId(lot)) === id);
        const lotIds = new Set(linkedLots.map((lot) => String(lot.id)));
        setProduct(productResponse);
        setLots(linkedLots);
        setMovements((movementResponse.items ?? []).filter((movement) => lotIds.has(String(movementLotId(movement)))));
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

  const info = typeInfo(product);
  const Icon = info.Icon;
  const active = product?.active !== false;
  const totalStock = lots.reduce((total, lot) => total + balanceOf(lot), 0);
  const validLots = lots.filter((lot) => lotStatus(lot).label === "Válido").length;
  const entries = movements.filter((movement) => movement.type === "ENT").reduce((total, movement) => total + Number(movement.quantity || 0), 0);
  const exits = movements.filter((movement) => movement.type === "SAI").reduce((total, movement) => total + Number(movement.quantity || 0), 0);
  const chronology = useMemo(
    () =>
      [...movements].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA;
        return b.id - a.id;
      }),
    [movements],
  );

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA]}>
      <div className="w-full space-y-2 px-1">
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className={`absolute inset-y-0 left-0 w-1 ${info.accent}`} />
          <div className="space-y-2 px-3 py-2 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${info.iconClass}`}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">
                    {loading ? "Produto..." : product?.name || `Produto #${id}`}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${info.badge}`}>
                      {info.label}
                    </span>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                          : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300"
                      }`}
                    >
                      {active ? "Activo" : "Inactivo"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{product?.custom_id || `ID ${id}`}</span>
                  </div>
                </div>
              </div>

              <Link
                href="/pharmacy/products"
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
              >
                <ArrowLeft size={13} />
                Voltar
              </Link>
              <Link
                href={`/pharmacy/products/${id}/edit`}
                className="inline-flex h-8 items-center rounded-md border border-cyan-400/50 bg-cyan-500/15 px-2.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-500/20 dark:text-cyan-200"
              >
                Editar
              </Link>
            </div>

            {product && (
              <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
                <MetricCard icon={ClipboardList} label="Preço de venda" value={formatMoney(product.sale_price)} />
                <MetricCard
                  icon={CheckCircle2}
                  label="IVA"
                  value={product.applies_vat_by_default === false ? "Isento" : `${formatMoney(product.vat_percentage)}%`}
                />
                <MetricCard icon={Package} label="Stock actual" value={totalStock} />
                <MetricCard icon={Boxes} label="Categoria" value={categoryLabel(product)} />
              </div>
            )}

            {product && (
              <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
                <MetricCard icon={Package} label="Lotes" value={lots.length} />
                <MetricCard icon={CheckCircle2} label="Lotes válidos" value={validLots} />
                <MetricCard icon={TrendingUp} label="Entradas registadas" value={entries} />
                <MetricCard icon={TrendingDown} label="Saídas registadas" value={exits} />
              </div>
            )}
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
        ) : product ? (
          <>
            {product.description ? (
              <section className={`${GLASS} relative overflow-hidden`}>
                <span className="absolute inset-y-0 left-0 w-1 bg-cyan-500" />
                <div className="px-3 pb-2 pl-4">
                  <div className="rounded-lg border border-border/60 bg-background/45 px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">Descrição:</span> {product.description}
                  </div>
                </div>
              </section>
            ) : null}

            <section className={`${GLASS} relative overflow-hidden`}>
              <span className="absolute inset-y-0 left-0 w-1 bg-blue-500" />
              <div className="px-3 py-2 pl-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-300">
                      <Package size={14} />
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-foreground">Lotes vinculados</h2>
                      <p className="text-[11px] text-muted-foreground">{lots.length} lotes para este produto</p>
                    </div>
                  </div>
                </div>

                {lots.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 py-8 text-center text-sm text-muted-foreground">
                    Sem lotes registados para este produto.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {lots.map((lot) => {
                      const status = lotStatus(lot);
                      const days = daysToExpire(lot);
                      const daysLabel = days === null ? "Sem validade" : days < 0 ? `${Math.abs(days)} dias vencido` : `${days} dias restantes`;
                      return (
                        <Link key={lot.id} href={`/pharmacy/lots/${lot.id}`} className="relative rounded-lg border border-border/60 bg-background/45 px-3 py-2 pl-4 transition hover:shadow-md">
                          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-lg ${status.accent}`} />
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-foreground">{lot.lot_number || lot.custom_id || `Lote #${lot.id}`}</p>
                              <p className="text-[11px] text-muted-foreground">Validade {formatDate(lot.expiration_date)}</p>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.badge}`}>
                              {status.label}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-1 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                            <span>Saldo <b className="text-foreground">{balanceOf(lot)}</b></span>
                            <span className="text-right">{daysLabel}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <section className={`${GLASS} relative overflow-hidden`}>
              <span className="absolute inset-y-0 left-0 w-1 bg-indigo-500" />
              <div className="px-3 py-2 pl-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                    <CalendarClock size={14} />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Movimentos recentes</h2>
                    <p className="text-[11px] text-muted-foreground">{chronology.length} movimentos ligados ao produto</p>
                  </div>
                </div>

                {chronology.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 py-8 text-center text-sm text-muted-foreground">
                    Sem movimentos registados para este produto.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {chronology.slice(0, 16).map((movement) => {
                      const isExit = movement.type === "SAI";
                      const delta = signedQuantity(movement);
                      return (
                        <div key={movement.id} className="relative rounded-lg border border-border/60 bg-background/45 px-3 py-2">
                          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-lg ${isExit ? "bg-rose-500" : "bg-emerald-500"}`} />
                          <div className="flex items-start justify-between gap-2 pl-1">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-foreground">{movement.name || movement.custom_id || `Movimento #${movement.id}`}</p>
                              <p className="text-[11px] text-muted-foreground">{formatDateTime(movement.created_at)}</p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                isExit
                                  ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                              }`}
                            >
                              {movementTypeLabel(movement.type)}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-1 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                            <span>{originLabel(movement.origin)}</span>
                            <span className={`text-right font-bold ${isExit ? "text-rose-600 dark:text-rose-300" : "text-emerald-600 dark:text-emerald-300"}`}>
                              {delta > 0 ? "+" : ""}
                              {delta}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <section className={`${GLASS} flex h-40 items-center justify-center text-sm text-muted-foreground`}>
            Produto não encontrado.
          </section>
        )}
      </div>
    </AppLayout>
  );
}
