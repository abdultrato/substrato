"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  Loader2,
  Package,
  Repeat,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type Movement = {
  id: number;
  custom_id?: string;
  id_custom?: string;
  name?: string;
  nome?: string;
  lot?: number | { id?: number; lot_number?: string; custom_id?: string; product_name?: string; product?: any };
  lote?: number | string;
  lot_number?: string;
  lote_numero?: string;
  product?: number | { id?: number; name?: string; custom_id?: string };
  product_name?: string;
  produto_nome?: string;
  type?: string;
  tipo?: string;
  origin?: string;
  origem?: string;
  quantity?: number;
  quantidade?: number;
  sale_item?: number;
  material_request_item?: number;
  created_at?: string;
  updated_at?: string;
};

type Lot = {
  id: number;
  custom_id?: string;
  lot_number?: string;
  product_name?: string;
  product?: number | { id?: number; name?: string; custom_id?: string };
  expiration_date?: string;
  saldo?: number;
  balance?: number;
  status?: string;
};

type RequisitionItem = {
  id: number;
  custom_id?: string;
  product_name?: string;
  warehouse_item_name?: string;
  warehouse_item_sku?: string;
  lot_number?: string;
  requested_quantity?: number;
  supplied_quantity?: number;
};

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

function movementCode(movement?: Movement | null) {
  return movement?.id_custom || movement?.custom_id || movement?.id || "—";
}

function lotId(movement?: Movement | null) {
  if (!movement) return null;
  if (typeof movement.lot === "object" && movement.lot) return movement.lot.id ? String(movement.lot.id) : null;
  if (movement.lot) return String(movement.lot);
  return null;
}

function lotLabel(movement?: Movement | null, lot?: Lot | null) {
  if (lot) return lot.lot_number || lot.custom_id || `Lote ${lot.id}`;
  if (typeof movement?.lot === "object" && movement.lot) return movement.lot.lot_number || movement.lot.custom_id || `Lote ${movement.lot.id}`;
  if (movement?.lote_numero || movement?.lot_number || movement?.lote) return String(movement.lote_numero || movement.lot_number || movement.lote);
  if (typeof movement?.lot === "number") return `Lote ${movement.lot}`;
  return "Lote não informado";
}

function productLabel(movement?: Movement | null, lot?: Lot | null) {
  if (lot?.product_name) return lot.product_name;
  if (typeof lot?.product === "object" && lot.product) return lot.product.name || lot.product.custom_id || `Produto ${lot.product.id}`;
  if (typeof movement?.product === "object" && movement.product) return movement.product.name || movement.product.custom_id || `Produto ${movement.product.id}`;
  if (typeof movement?.product === "number") return `Produto ${movement.product}`;
  if (typeof movement?.lot === "object" && movement.lot?.product_name) return movement.lot.product_name;
  return movement?.produto_nome || movement?.product_name || movement?.name || "Produto não informado";
}

function movementType(movement?: Movement | null) {
  return movement?.tipo || movement?.type || "";
}

function movementInfo(type: string) {
  if (type === "ENT") {
    return {
      label: "Entrada",
      Icon: TrendingUp,
      accent: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-300",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    };
  }
  if (type === "SAI") {
    return {
      label: "Saída",
      Icon: TrendingDown,
      accent: "bg-rose-500",
      text: "text-rose-600 dark:text-rose-300",
      badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
    };
  }
  return {
    label: type === "AJU" ? "Ajuste" : type || "Movimento",
    Icon: Repeat,
    accent: "bg-violet-500",
    text: "text-violet-600 dark:text-violet-300",
    badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-300",
  };
}

function originLabel(origin?: string) {
  if (origin === "VEND") return "Venda";
  if (origin === "PROC") return "Procedimento";
  if (origin === "AJUS") return "Ajuste";
  if (origin === "REQ") return "Requisição";
  return origin || "Origem não informada";
}

function fmtDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function balanceOf(lot?: Lot | null) {
  if (!lot) return "—";
  const value = lot.saldo ?? lot.balance;
  return typeof value === "number" ? value : "—";
}

function requisitionItemLabel(item?: RequisitionItem | null, fallbackId?: number) {
  if (!item) return fallbackId ? `#${fallbackId}` : "—";
  const name = item.product_name || item.warehouse_item_name || item.lot_number || item.custom_id || "Item de requisição";
  return `${name} · #${item.id}`;
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

function DetailCard({ icon: Icon, title, accent, children }: { icon: React.ElementType; title: string; accent: string; children: React.ReactNode }) {
  return (
    <section className={`${GLASS} relative overflow-hidden`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="space-y-2 px-3 py-2 pl-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground/10 text-foreground">
            <Icon size={14} />
          </span>
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

export default function PharmacyInventoryMovementsDetailPage() {
  useAuthGuard();
  const params = useParams();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const id = String((params as any)?.id || "");

  const [movement, setMovement] = useState<Movement | null>(null);
  const [lot, setLot] = useState<Lot | null>(null);
  const [requisitionItem, setRequisitionItem] = useState<RequisitionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const movementResponse = await apiFetch<Movement>(`/pharmacy/inventory_movement/${id}/`, {
          clientCache: safeRefreshToken === 0,
        });
        if (!mounted) return;
        setMovement(movementResponse);
        setRequisitionItem(null);

        const linkedLotId = lotId(movementResponse);
        const linkedRequisitionItemId = movementResponse.material_request_item;
        await Promise.all([
          linkedLotId
            ? apiFetch<Lot>(`/pharmacy/lot/${linkedLotId}/`, { clientCache: safeRefreshToken === 0 })
                .then((lotResponse) => {
                  if (mounted) setLot(lotResponse);
                })
                .catch(() => {
                  if (mounted) setLot(null);
                })
            : Promise.resolve().then(() => {
                if (mounted) setLot(null);
              }),
          linkedRequisitionItemId
            ? apiFetch<RequisitionItem>(`/pharmacy/material_requisition_item/${linkedRequisitionItemId}/`, {
                clientCache: safeRefreshToken === 0,
              })
                .then((itemResponse) => {
                  if (mounted) setRequisitionItem(itemResponse);
                })
                .catch(() => {
                  if (mounted) setRequisitionItem(null);
                })
            : Promise.resolve(),
        ]);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Falha ao carregar movimento.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id, safeRefreshToken]);

  const type = movementType(movement);
  const info = movementInfo(type);
  const Icon = info.Icon;
  const quantity = Number(movement?.quantidade ?? movement?.quantity ?? 0);
  const signed = type === "SAI" ? -quantity : quantity;
  const linkedLotId = lotId(movement);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA]} fullWidth>
      {/* Margens negativas anulam o padding horizontal do <main> do AppLayout,
          aproximando a página da largura total (~99vw) apenas aqui. */}
      <div className="w-auto space-y-1 -mx-2 px-0.5 sm:-mx-3 md:-mx-4">
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className={`absolute inset-y-0 left-0 w-1 ${info.accent}`} />
          <div className="space-y-2 px-3 py-2 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/12 text-violet-600 dark:text-violet-300">
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">
                    {loading ? "Movimento..." : movement?.name || movement?.nome || `Movimento ${movementCode(movement)}`}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${info.badge}`}>
                      {info.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{movementCode(movement)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Link href="/pharmacy/inventory-movements" className="inline-flex h-8 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
                  <ArrowLeft size={13} />
                  Voltar
                </Link>
              </div>
            </div>

            {movement ? (
              <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
                <MetricCard icon={ClipboardList} label="Quantidade" value={<span className={info.text}>{signed > 0 ? "+" : ""}{signed}</span>} />
                <MetricCard icon={Repeat} label="Origem" value={originLabel(movement.origem ?? movement.origin)} />
                <MetricCard icon={CalendarClock} label="Criado em" value={fmtDate(movement.created_at)} />
                <MetricCard icon={CalendarClock} label="Actualizado em" value={fmtDate(movement.updated_at)} />
              </div>
            ) : null}
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
        ) : movement ? (
          <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
            <DetailCard icon={Package} title="Produto e lote" accent="bg-cyan-500">
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                <MetricCard icon={Package} label="Produto" value={productLabel(movement, lot)} />
                <MetricCard
                  icon={ClipboardList}
                  label="Lote"
                  value={
                    linkedLotId ? (
                      <Link href={`/pharmacy/lots/${linkedLotId}`} className="text-cyan-700 hover:underline dark:text-cyan-200">
                        {lotLabel(movement, lot)}
                      </Link>
                    ) : (
                      lotLabel(movement, lot)
                    )
                  }
                />
                <MetricCard icon={CalendarClock} label="Validade" value={lot?.expiration_date || "—"} />
                <MetricCard icon={Package} label="Saldo actual do lote" value={balanceOf(lot)} />
              </div>
            </DetailCard>

            <DetailCard icon={ShoppingCart} title="Vínculos operacionais" accent="bg-indigo-500">
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                <MetricCard icon={ShoppingCart} label="Item de venda" value={movement.sale_item ? `#${movement.sale_item}` : "—"} />
                <MetricCard
                  icon={ClipboardList}
                  label="Item de requisição"
                  value={
                    movement.material_request_item ? (
                      <Link
                        href={`/pharmacy/material-requisition-items/${movement.material_request_item}`}
                        className="text-cyan-700 hover:underline dark:text-cyan-200"
                      >
                        {requisitionItemLabel(requisitionItem, movement.material_request_item)}
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />
                <MetricCard icon={Repeat} label="Tipo" value={info.label} />
                <MetricCard icon={ClipboardList} label="ID interno" value={movement.id} />
              </div>
            </DetailCard>
          </div>
        ) : (
          <section className={`${GLASS} flex h-40 items-center justify-center text-sm text-muted-foreground`}>
            Movimento não encontrado.
          </section>
        )}
      </div>
    </AppLayout>
  );
}
