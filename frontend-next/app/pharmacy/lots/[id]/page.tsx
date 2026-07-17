"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  Loader2,
  Package,
  PackageCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

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

const LOT_STATUS_OPTIONS = [
  { value: "QUARANTINE", label: "Quarentena", hint: "Isolar enquanto há investigação ou inspeção." },
  { value: "DAMAGED", label: "Danificado", hint: "Embalagem, integridade física ou selagem comprometida." },
  { value: "CONTAMINATED", label: "Contaminado", hint: "Suspeita ou confirmação de contaminação." },
  { value: "RECALLED", label: "Recolhido", hint: "Recall/recolha por fabricante, autoridade ou fornecedor." },
  { value: "EXPIRED", label: "Vencido", hint: "Marcar como vencido e indisponível." },
  { value: "DEPLETED", label: "Esgotado", hint: "Sem stock utilizável." },
  { value: "AVAILABLE", label: "Liberar", hint: "Voltar a disponibilizar o lote para uso." },
];

function productName(lot?: Lot | null) {
  if (!lot) return "Produto não informado";
  if (lot.product_name) return lot.product_name;
  if (typeof lot.product === "object" && lot.product) return lot.product.name || lot.product.custom_id || `Produto ${lot.product.id}`;
  if (lot.name?.includes(" - ")) return lot.name.split(" - ").slice(1).join(" - ");
  return lot.name || "Produto não informado";
}

function balanceOf(lot?: Lot | null) {
  if (!lot) return 0;
  const value = lot.saldo ?? lot.balance;
  if (typeof value === "number") return value;
  return Number(lot.initial_quantity || 0);
}

function daysToExpire(lot?: Lot | null) {
  if (!lot?.expiration_date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(lot.expiration_date);
  exp.setHours(0, 0, 0, 0);
  if (Number.isNaN(exp.getTime())) return null;
  return Math.ceil((exp.getTime() - today.getTime()) / 86400000);
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

function formatMoney(value?: string | number) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(amount);
}

function statusFor(lot?: Lot | null) {
  if (lot?.status && lot.status !== "AVAILABLE") {
    const operational: Record<string, { label: string; accent: string; badge: string }> = {
      QUARANTINE: {
        label: "Quarentena",
        accent: "bg-amber-500",
        badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
      },
      DAMAGED: {
        label: "Danificado",
        accent: "bg-orange-500",
        badge:
          "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/50 dark:bg-orange-950/30 dark:text-orange-300",
      },
      CONTAMINATED: {
        label: "Contaminado",
        accent: "bg-red-500",
        badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300",
      },
      RECALLED: {
        label: "Recolhido",
        accent: "bg-violet-500",
        badge:
          "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-300",
      },
      EXPIRED: {
        label: "Vencido",
        accent: "bg-rose-500",
        badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
      },
      DEPLETED: {
        label: "Esgotado",
        accent: "bg-slate-500",
        badge:
          "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/50 dark:bg-slate-900/30 dark:text-slate-300",
      },
    };
    return operational[lot.status] || operational.QUARANTINE;
  }

  const days = daysToExpire(lot);
  const balance = balanceOf(lot);
  if (days !== null && days < 0) {
    return {
      label: "Vencido",
      accent: "bg-rose-500",
      badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
    };
  }
  if (balance <= 10) {
    return {
      label: "Stock baixo",
      accent: "bg-orange-500",
      badge:
        "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/50 dark:bg-orange-950/30 dark:text-orange-300",
    };
  }
  if (days !== null && days <= 90) {
    return {
      label: "A vencer",
      accent: "bg-amber-500",
      badge:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
    };
  }
  return {
    label: "Válido",
    accent: "bg-emerald-500",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
  };
}

function movementLotId(movement: Movement) {
  if (typeof movement.lot === "object" && movement.lot) return movement.lot.id;
  return movement.lot;
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

function signedQuantity(movement: Movement) {
  const quantity = Number(movement.quantity || 0);
  return movement.type === "SAI" ? -quantity : quantity;
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

export default function LotsDetailPage() {
  useAuthGuard();
  const params = useParams();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const id = String((params as any)?.id || "");

  const [lot, setLot] = useState<Lot | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusDialog, setStatusDialog] = useState<{ status: string; label: string } | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [lotResponse, movementResponse] = await Promise.all([
          apiFetch<Lot>(`/pharmacy/lot/${id}/`, { clientCache: safeRefreshToken === 0 }),
          apiFetchList<Movement>("/pharmacy/inventory_movement/", {
            page: 1,
            pageSize: 500,
            clientPaginate: true,
            clientCache: safeRefreshToken === 0,
          }),
        ]);
        if (!mounted) return;
        setLot(lotResponse);
        setMovements((movementResponse.items ?? []).filter((movement) => String(movementLotId(movement)) === id));
      } catch (err: any) {
        if (mounted) setError(err?.message || "Falha ao carregar lote.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id, safeRefreshToken]);

  const status = statusFor(lot);
  const balance = balanceOf(lot);
  const days = daysToExpire(lot);
  const daysLabel = days === null ? "Sem data" : days < 0 ? `${Math.abs(days)} dias vencido` : `${days} dias restantes`;
  const entries = useMemo(() => movements.filter((movement) => movement.type === "ENT").reduce((total, movement) => total + Number(movement.quantity || 0), 0), [movements]);
  const exits = useMemo(() => movements.filter((movement) => movement.type === "SAI").reduce((total, movement) => total + Number(movement.quantity || 0), 0), [movements]);
  const chronology = useMemo(() => {
    let runningBalance = 0;
    return [...movements]
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (dateA !== dateB) return dateA - dateB;
        return a.id - b.id;
      })
      .map((movement) => {
        runningBalance += signedQuantity(movement);
        return { movement, runningBalance };
      });
  }, [movements]);

  async function updateLotStatus(nextStatus: string, reason: string) {
    setStatusSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<Lot>(`/pharmacy/lot/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, status_reason: reason }),
      });
      setLot(updated);
      setStatusDialog(null);
      setStatusReason("");
    } catch (err: any) {
      setError(err?.message || "Falha ao actualizar estado do lote.");
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA]}>
      <div className="w-full space-y-2 px-1">
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className={`absolute inset-y-0 left-0 w-1 ${status.accent}`} />
          <div className="space-y-2 px-3 py-2 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/12 text-cyan-600 dark:text-cyan-300">
                  <Package size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">
                    {loading ? "Lote..." : lot?.lot_number || lot?.custom_id || `Lote #${id}`}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.badge}`}>
                      {status.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{productName(lot)}</span>
                  </div>
                </div>
              </div>

              <Link
                href="/pharmacy/lots"
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
              >
                <ArrowLeft size={13} />
                Voltar
              </Link>
            </div>

            {lot && (
              <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
                <MetricCard icon={PackageCheck} label="Saldo actual" value={balance} />
                <MetricCard icon={CalendarClock} label="Validade" value={formatDate(lot.expiration_date)} />
                <MetricCard icon={ClipboardList} label="Preço unitário" value={formatMoney(lot.sale_price)} />
                <MetricCard icon={Package} label="Qtd. cadastrada" value={lot.initial_quantity ?? "—"} />
              </div>
            )}

            {lot && (
              <div className="flex flex-wrap gap-1.5">
                {LOT_STATUS_OPTIONS.filter((option) => option.value !== lot.status).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setStatusDialog({ status: option.value, label: option.label });
                      setStatusReason(option.value === "AVAILABLE" ? "" : lot.status_reason || "");
                    }}
                    className={`inline-flex h-8 items-center rounded-md border px-2.5 text-[11px] font-semibold transition ${
                      option.value === "AVAILABLE"
                        ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-200"
                        : "border-border/70 bg-background/50 text-muted-foreground hover:text-foreground"
                    }`}
                    title={option.hint}
                  >
                    {option.label}
                  </button>
                ))}
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
        ) : lot ? (
          <>
            <section className={`${GLASS} relative overflow-hidden`}>
              <span className="absolute inset-y-0 left-0 w-1 bg-cyan-500" />
              <div className="grid grid-cols-1 gap-2 px-3 py-2 pl-4 md:grid-cols-3">
                <MetricCard icon={CalendarClock} label="Tempo até validade" value={daysLabel} />
                <MetricCard icon={TrendingUp} label="Entradas registadas" value={entries} />
                <MetricCard icon={TrendingDown} label="Saídas registadas" value={exits} />
              </div>
              {lot.status_reason ? (
                <div className="px-3 pb-2 pl-4">
                  <div className="rounded-lg border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                    <span className="font-bold">Motivo do estado:</span> {lot.status_reason}
                  </div>
                </div>
              ) : null}
            </section>

            <section className={`${GLASS} relative overflow-hidden`}>
              <span className="absolute inset-y-0 left-0 w-1 bg-indigo-500" />
              <div className="px-3 py-2 pl-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                      <ClipboardList size={14} />
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-foreground">Cronologia de movimentos</h2>
                      <p className="text-[11px] text-muted-foreground">{chronology.length} movimentos ligados a este lote</p>
                    </div>
                  </div>
                </div>

                {chronology.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 py-8 text-center text-sm text-muted-foreground">
                    Sem movimentos registados para este lote.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {chronology.map(({ movement, runningBalance }, index) => {
                      const isExit = movement.type === "SAI";
                      const delta = signedQuantity(movement);
                      return (
                        <div key={movement.id} className="relative rounded-lg border border-border/60 bg-background/45 px-3 py-2">
                          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-lg ${isExit ? "bg-rose-500" : "bg-emerald-500"}`} />
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 gap-2 pl-1">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-bold text-foreground">
                                {index + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-foreground">{movement.name || movement.custom_id || `Movimento #${movement.id}`}</p>
                                <p className="text-[11px] text-muted-foreground">{formatDateTime(movement.created_at)}</p>
                              </div>
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
                          <div className="mt-2 grid grid-cols-3 gap-1 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                            <span>{originLabel(movement.origin)}</span>
                            <span className={`text-center font-bold ${isExit ? "text-rose-600 dark:text-rose-300" : "text-emerald-600 dark:text-emerald-300"}`}>
                              {delta > 0 ? "+" : ""}
                              {delta}
                            </span>
                            <span className="text-right font-bold text-foreground">
                              Saldo {runningBalance}
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
            Lote não encontrado.
          </section>
        )}
      </div>

      {statusDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className={`${GLASS} w-full max-w-md space-y-4 p-4`}>
            <div>
              <p className="text-sm font-bold text-foreground">Alterar estado do lote</p>
              <p className="text-xs text-muted-foreground">
                {lot?.lot_number || `Lote #${id}`} → {statusDialog.label}
              </p>
            </div>
            <textarea
              autoFocus
              value={statusReason}
              onChange={(event) => setStatusReason(event.target.value)}
              placeholder={statusDialog.status === "AVAILABLE" ? "Motivo da liberação (opcional)" : "Motivo da alteração do estado"}
              className="min-h-24 w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
              disabled={statusSaving}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStatusDialog(null)}
                disabled={statusSaving}
                className="inline-flex h-8 items-center rounded-md border border-border/70 bg-background/60 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => updateLotStatus(statusDialog.status, statusReason)}
                disabled={statusSaving || (statusDialog.status !== "AVAILABLE" && !statusReason.trim())}
                className="inline-flex h-8 items-center rounded-md bg-cyan-600 px-3 text-xs font-bold text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {statusSaving ? "A guardar..." : "Guardar estado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
