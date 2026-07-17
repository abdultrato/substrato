"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Archive,
  Box,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Loader2,
  PackageCheck,
  User,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useSafeDataRefresh, useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch } from "@/lib/api";
import {
  MATERIAL_REQUISITION_PAGE_GROUPS,
  isMaterialRequisitionPharmacyUser,
  materialRequisitionSectorLabel,
} from "@/lib/material-requisition-rbac";

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

type ReqItem = {
  id: number;
  lot: number | null;
  warehouse_item?: number | null;
  warehouse_item_sku?: string | null;
  warehouse_item_name?: string | null;
  product_name?: string;
  lot_number?: string | null;
  lot_expiration_date?: string | null;
  requested_quantity: number;
  supplied_quantity: number;
  available_quantity?: number;
};

type Requisition = {
  id: number;
  custom_id?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  sector?: string;
  sector_label?: string;
  source?: string;
  source_label?: string;
  requested_by_department?: string;
  created_by_name?: string;
  hold_reason?: string | null;
  fulfilled_at?: string | null;
  items?: ReqItem[];
};

const STATUS: Record<string, { label: string; badge: string; dot: string }> = {
  PEN: {
    label: "Pendente",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
    dot: "bg-amber-400",
  },
  PAR: {
    label: "Parcial",
    badge:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/50 dark:bg-orange-950/30 dark:text-orange-300",
    dot: "bg-orange-400",
  },
  FUL: {
    label: "Aviada",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    dot: "bg-emerald-400",
  },
  HLD: {
    label: "Arquivada",
    badge:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/50 dark:bg-slate-900/30 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};

const ITEM_STATUS = {
  done: {
    label: "Aviado",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  partial: {
    label: "Parcial",
    cls: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/50 dark:bg-orange-950/30 dark:text-orange-300",
  },
  pending: {
    label: "Pendente",
    cls: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
  },
};

function formatDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sourceLabel(row?: Requisition | null) {
  if (!row) return "—";
  if (row.source_label) return row.source_label;
  if (row.source === "WHS") return "Armazém central";
  if (row.source === "PHA") return "Farmácia";
  return row.source || "Origem interna";
}

function MetaCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/45 px-3 py-2">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon size={11} />
        {label}
      </div>
      <div className="text-sm font-semibold text-foreground">{value || "—"}</div>
    </div>
  );
}

export default function MaterialRequisitionsDetailPage() {
  useAuthGuard();
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const { hasUnsavedInput } = useSafeDataRefresh();

  const requiredGroups = useMemo(() => [...MATERIAL_REQUISITION_PAGE_GROUPS], []);
  const isPharmacy = isMaterialRequisitionPharmacyUser(user);

  const id = String((params as any)?.id || "");
  const [data, setData] = useState<Requisition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toSupply, setToSupply] = useState<Record<number, number>>({});
  const [supplyOpenItem, setSupplyOpenItem] = useState<number | null>(null);
  const [itemBusy, setItemBusy] = useState<Record<number, boolean>>({});
  const [skipDialog, setSkipDialog] = useState<{ itemId: number; itemName: string; reason: string } | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [archiving, setArchiving] = useState(false);

  async function reload() {
    setError(null);
    try {
      setLoading(true);
      const response = await apiFetch<Requisition>(`/pharmacy/material_requisition/${id}/`, {
        clientCache: safeRefreshToken === 0,
      });
      setData(response);
      setSupplyOpenItem(null);
      const defaults: Record<number, number> = {};
      for (const item of response?.items || []) {
        const remaining = Math.max(0, Number(item.requested_quantity) - Number(item.supplied_quantity || 0));
        if (remaining > 0) defaults[item.id] = remaining;
      }
      setToSupply(defaults);
    } catch (err: any) {
      setError(err?.message || "Falha ao carregar requisição.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (safeRefreshToken > 0 && hasUnsavedInput) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, safeRefreshToken, hasUnsavedInput]);

  async function fulfillItem(itemId: number) {
    const quantity = toSupply[itemId] ?? 0;
    if (quantity <= 0) {
      setError("Informe uma quantidade maior que zero.");
      return;
    }
    setError(null);
    setItemBusy((previous) => ({ ...previous, [itemId]: true }));
    try {
      const response = await apiFetch<Requisition>(`/pharmacy/material_requisition/${id}/fulfill/`, {
        method: "POST",
        body: JSON.stringify({ items: [{ id: itemId, quantity }] }),
      });
      setData(response);
      const defaults: Record<number, number> = {};
      for (const item of response?.items || []) {
        const remaining = Math.max(0, Number(item.requested_quantity) - Number(item.supplied_quantity || 0));
        if (remaining > 0) defaults[item.id] = remaining;
      }
      setToSupply(defaults);
    } catch (err: any) {
      setError(err?.message || "Falha ao aviar item.");
    } finally {
      setItemBusy((previous) => ({ ...previous, [itemId]: false }));
    }
  }

  async function skipItem(itemId: number, reason: string) {
    setError(null);
    setItemBusy((previous) => ({ ...previous, [itemId]: true }));
    setSkipDialog(null);
    try {
      const response = await apiFetch<Requisition>(`/pharmacy/material_requisition/${id}/skip-item/`, {
        method: "POST",
        body: JSON.stringify({ item_id: itemId, reason: reason || null }),
      });
      setData(response);
    } catch (err: any) {
      setError(err?.message || "Falha ao arquivar item.");
    } finally {
      setItemBusy((previous) => ({ ...previous, [itemId]: false }));
    }
  }

  async function archiveRequisition() {
    setError(null);
    setArchiving(true);
    try {
      await apiFetch(`/pharmacy/material_requisition/${id}/archive/`, {
        method: "POST",
        body: JSON.stringify({ reason: holdReason || null }),
      });
      setArchiveDialogOpen(false);
      router.push("/pharmacy/material-requisitions");
    } catch (err: any) {
      setError(err?.message || "Falha ao arquivar.");
    } finally {
      setArchiving(false);
    }
  }

  const status = STATUS[data?.status ?? ""] ?? STATUS.PEN;
  const items = data?.items ?? [];
  const totalRequested = items.reduce((total, item) => total + Number(item.requested_quantity || 0), 0);
  const totalSupplied = items.reduce((total, item) => total + Number(item.supplied_quantity || 0), 0);
  const requisitionActive = data && data.status !== "FUL" && data.status !== "HLD";

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="w-full space-y-2 px-1">
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className={`absolute inset-y-0 left-0 w-1 ${status.dot}`} />
          <div className="space-y-2 px-3 py-2 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/12 text-amber-600 dark:text-amber-300">
                  <PackageCheck size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">
                    {loading ? "Requisição..." : data?.custom_id || `REQ-MAT-${id}`}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {data?.status && (
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.badge}`}>
                        {status.label}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {items.length} itens · {totalSupplied}/{totalRequested} aviados
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  href="/pharmacy/material-requisitions"
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  <ArrowLeft size={13} />
                  Voltar
                </Link>
                {isPharmacy && requisitionActive && (
                  <button
                    type="button"
                    onClick={() => setArchiveDialogOpen(true)}
                    disabled={archiving || loading}
                    className="inline-flex h-8 items-center gap-1 rounded-md bg-rose-600 px-2.5 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                  >
                    <Archive size={13} />
                    Arquivar requisição
                  </button>
                )}
              </div>
            </div>

            {data && (
              <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
                <MetaCard icon={Calendar} label="Criada em" value={formatDateTime(data.created_at)} />
                <MetaCard icon={Building2} label="Sector" value={data.sector_label || materialRequisitionSectorLabel(data.sector)} />
                <MetaCard icon={Box} label="Fonte" value={sourceLabel(data)} />
                <MetaCard icon={User} label="Solicitante" value={data.created_by_name || data.requested_by_department} />
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
          <div className={`${GLASS} flex h-36 items-center justify-center text-muted-foreground`}>
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : data ? (
          <>
            <section className={`${GLASS} relative overflow-hidden`}>
              <span className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
              <div className="px-3 py-2 pl-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-300">
                      <ClipboardList size={14} />
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-foreground">Itens requisitados</h2>
                      <p className="text-[11px] text-muted-foreground">{items.length} itens no registo</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 text-[11px] font-semibold">
                    <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-200">Solicitado {totalRequested}</span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-200">Aviado {totalSupplied}</span>
                  </div>
                </div>

                {!items.length ? (
                  <div className="rounded-lg border border-dashed border-border/60 py-8 text-center text-sm text-muted-foreground">
                    Sem itens.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {items.map((item) => {
                      const available = typeof item.available_quantity === "number" ? item.available_quantity : null;
                      const remaining = Math.max(0, Number(item.requested_quantity) - Number(item.supplied_quantity || 0));
                      const itemStatus =
                        remaining <= 0 ? ITEM_STATUS.done : item.supplied_quantity > 0 ? ITEM_STATUS.partial : ITEM_STATUS.pending;
                      const busy = itemBusy[item.id] ?? false;
                      const canAct = isPharmacy;
                      const supplyOpen = supplyOpenItem === item.id;

                      return (
                        <div key={item.id} className="rounded-lg border border-border/60 bg-background/45 px-3 py-2">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-foreground">
                                {item.product_name || item.warehouse_item_name || `Item #${item.id}`}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {item.lot ? item.lot_number || `Lote #${item.lot}` : item.warehouse_item_sku || "Sem lote"}
                                {item.lot_expiration_date ? ` · Val: ${item.lot_expiration_date}` : ""}
                              </p>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${itemStatus.cls}`}>
                              {itemStatus.label}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                            <span>
                              Solicitado: <strong className="text-foreground">{item.requested_quantity}</strong>
                            </span>
                            <span>
                              Disponível: <strong className="text-foreground">{available ?? "—"}</strong>
                            </span>
                            <span>
                              Aviado: <strong className="text-foreground">{item.supplied_quantity || 0}</strong>
                            </span>
                          </div>

                          {canAct && remaining > 0 && (
                            <div className="mt-2 flex min-h-8 flex-wrap items-center justify-start gap-2 border-t border-border/50 pt-2">
                              {!supplyOpen ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSupplyOpenItem(item.id);
                                    setToSupply((previous) => ({ ...previous, [item.id]: previous[item.id] ?? remaining }));
                                  }}
                                  disabled={busy}
                                  className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  <CheckCircle2 size={12} />
                                  Aviar
                                </button>
                              ) : (
                                <>
                                  <input
                                    type="number"
                                    min={1}
                                    max={remaining}
                                    className="h-8 w-20 rounded-md border border-border bg-background/70 px-2 text-sm text-foreground outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
                                    value={toSupply[item.id] ?? remaining}
                                    onChange={(event) =>
                                      setToSupply((previous) => ({
                                        ...previous,
                                        [item.id]: Math.max(1, Math.min(remaining, Number(event.target.value || 1))),
                                      }))
                                    }
                                    disabled={busy}
                                  />
                                  <span className="text-[10px] text-muted-foreground">/ {remaining}</span>
                                  <button
                                    type="button"
                                    onClick={() => fulfillItem(item.id)}
                                    disabled={busy}
                                    className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                    Confirmar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSupplyOpenItem(null)}
                                    disabled={busy}
                                    className="inline-flex h-8 items-center rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              )}

                              {requisitionActive && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSkipDialog({
                                      itemId: item.id,
                                      itemName: item.product_name || item.warehouse_item_name || `Item #${item.id}`,
                                      reason: "",
                                    })
                                  }
                                  disabled={busy}
                                  className="inline-flex h-8 items-center gap-1 rounded-md bg-amber-600 px-3 text-xs font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
                                >
                                  <Archive size={12} />
                                  Arquivar
                                </button>
                              )}
                            </div>
                          )}
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
            Requisição não encontrada.
          </section>
        )}
      </div>

      {skipDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className={`${GLASS} w-full max-w-sm space-y-4 p-4`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">Arquivar item</p>
                <p className="truncate text-xs text-muted-foreground">{skipDialog.itemName}</p>
              </div>
              <button onClick={() => setSkipDialog(null)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              autoFocus
              value={skipDialog.reason}
              onChange={(event) => setSkipDialog((previous) => (previous ? { ...previous, reason: event.target.value } : null))}
              placeholder="Motivo opcional"
              className="h-9 w-full rounded-md border border-border bg-background/70 px-3 text-sm text-foreground outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
              onKeyDown={(event) => {
                if (event.key === "Enter") skipItem(skipDialog.itemId, skipDialog.reason);
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSkipDialog(null)}
                className="inline-flex h-8 items-center rounded-md border border-border/70 bg-background/60 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={() => skipItem(skipDialog.itemId, skipDialog.reason)}
                className="inline-flex h-8 items-center gap-1 rounded-md bg-amber-600 px-3 text-xs font-bold text-white hover:bg-amber-700"
              >
                <Archive size={12} />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {archiveDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className={`${GLASS} w-full max-w-md space-y-4 p-4`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">Arquivar requisição</p>
                <p className="truncate text-xs text-muted-foreground">{data?.custom_id || `REQ-MAT-${id}`}</p>
              </div>
              <button
                type="button"
                onClick={() => setArchiveDialogOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                disabled={archiving}
              >
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              autoFocus
              value={holdReason}
              onChange={(event) => setHoldReason(event.target.value)}
              placeholder="Motivo para arquivar requisição..."
              className="h-9 w-full rounded-md border border-border bg-background/70 px-3 text-sm text-foreground outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
              disabled={archiving}
              onKeyDown={(event) => {
                if (event.key === "Enter") archiveRequisition();
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setArchiveDialogOpen(false)}
                disabled={archiving}
                className="inline-flex h-8 items-center rounded-md border border-border/70 bg-background/60 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={archiveRequisition}
                disabled={archiving || loading}
                className="inline-flex h-8 items-center gap-1 rounded-md bg-rose-600 px-3 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {archiving ? <Loader2 size={12} className="animate-spin" /> : <Archive size={12} />}
                Confirmar arquivo
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
