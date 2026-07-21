"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Package,
  PackageCheck,
  Search,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import useDebounce from "@/hooks/useDebounce";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { ApiListMeta, apiFetchList } from "@/lib/api";
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

type ListResponse = { items: Lot[]; meta: ApiListMeta; raw: any };
type FilterKey = "ALL" | "OK" | "SOON" | "EXPIRED" | "LOW" | "QUARANTINE" | "DAMAGED" | "CONTAMINATED" | "RECALLED" | "DEPLETED";

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const FILTERS: { key: FilterKey; label: string; dot: string }[] = [
  { key: "ALL", label: "Todos", dot: "bg-cyan-400" },
  { key: "OK", label: "Válidos", dot: "bg-emerald-400" },
  { key: "SOON", label: "A vencer", dot: "bg-amber-400" },
  { key: "EXPIRED", label: "Vencidos", dot: "bg-rose-400" },
  { key: "LOW", label: "Stock baixo", dot: "bg-orange-400" },
  { key: "QUARANTINE", label: "Quarentena", dot: "bg-amber-500" },
  { key: "DAMAGED", label: "Danificados", dot: "bg-orange-500" },
  { key: "CONTAMINATED", label: "Contaminados", dot: "bg-red-500" },
  { key: "RECALLED", label: "Recolhidos", dot: "bg-violet-500" },
  { key: "DEPLETED", label: "Esgotados", dot: "bg-slate-500" },
];

function productName(lot: Lot) {
  if (lot.product_name) return lot.product_name;
  if (typeof lot.product === "object" && lot.product) return lot.product.name || lot.product.custom_id || `Produto ${lot.product.id}`;
  if (lot.name?.includes(" - ")) return lot.name.split(" - ").slice(1).join(" - ");
  return lot.name || "Produto não informado";
}

function balanceOf(lot: Lot) {
  const value = lot.saldo ?? lot.balance;
  if (typeof value === "number") return value;
  return Number(lot.initial_quantity || 0);
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

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatMoney(value?: string | number) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(amount);
}

function statusFor(lot: Lot) {
  if (lot.status && lot.status !== "AVAILABLE") {
    const operational: Record<string, { key: FilterKey; label: string; accent: string; badge: string }> = {
      QUARANTINE: {
        key: "QUARANTINE",
        label: "Quarentena",
        accent: "bg-amber-500",
        badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
      },
      DAMAGED: {
        key: "DAMAGED",
        label: "Danificado",
        accent: "bg-orange-500",
        badge:
          "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/50 dark:bg-orange-950/30 dark:text-orange-300",
      },
      CONTAMINATED: {
        key: "CONTAMINATED",
        label: "Contaminado",
        accent: "bg-red-500",
        badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300",
      },
      RECALLED: {
        key: "RECALLED",
        label: "Recolhido",
        accent: "bg-violet-500",
        badge:
          "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-300",
      },
      EXPIRED: {
        key: "EXPIRED",
        label: "Vencido",
        accent: "bg-rose-500",
        badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
      },
      DEPLETED: {
        key: "DEPLETED",
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
      key: "EXPIRED" as const,
      label: "Vencido",
      accent: "bg-rose-500",
      badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
    };
  }
  if (balance <= 10) {
    return {
      key: "LOW" as const,
      label: "Stock baixo",
      accent: "bg-orange-500",
      badge:
        "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/50 dark:bg-orange-950/30 dark:text-orange-300",
    };
  }
  if (days !== null && days <= 90) {
    return {
      key: "SOON" as const,
      label: "A vencer",
      accent: "bg-amber-500",
      badge:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
    };
  }
  return {
    key: "OK" as const,
    label: "Válido",
    accent: "bg-emerald-500",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
  };
}

function LotCard({ lot }: { lot: Lot }) {
  const status = statusFor(lot);
  const days = daysToExpire(lot);
  const balance = balanceOf(lot);
  const daysLabel = days === null ? "Sem data" : days < 0 ? `${Math.abs(days)} dias vencido` : `${days} dias`;

  return (
    <Link href={`/pharmacy/lots/${lot.id}`} className={`${GLASS} group relative block overflow-hidden transition hover:shadow-md`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${status.accent}`} />
      <div className="space-y-1.5 px-2.5 py-1.5 pl-3">
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
              <Package size={12} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-300">
                {productName(lot)}
              </p>
              <p className="text-[9px] text-muted-foreground">{lot.lot_number || lot.custom_id || `Lote #${lot.id}`}</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${status.badge}`}>
            {status.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 text-[10px]">
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-0.5">
            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Saldo</p>
            <p className="text-xs font-bold text-foreground">{balance}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-0.5">
            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Validade</p>
            <p className="truncate text-[11px] font-semibold text-foreground">{formatDate(lot.expiration_date)}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-0.5">
            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Preço</p>
            <p className="truncate text-[11px] font-semibold text-foreground">{formatMoney(lot.sale_price)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/50 pt-1.5 text-[9px] text-muted-foreground">
          <span className="truncate">{lot.custom_id || `ID ${lot.id}`}</span>
          <span className="shrink-0">{daysLabel}</span>
        </div>
      </div>
    </Link>
  );
}

export default function PharmacyLotsPage() {
  useAuthGuard();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("ALL");
  const [limit, setLimit] = useState(40);
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
        const response: ListResponse = await apiFetchList<Lot>(`/pharmacy/lot/${query ? `?${query}` : ""}`, {
          page: 1,
          pageSize: 500,
          clientPaginate: true,
          clientCache: safeRefreshToken === 0,
        });
        if (mounted) setLots(response.items ?? []);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Falha ao carregar lotes.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [debouncedSearch, safeRefreshToken]);

  const counts = useMemo(() => {
    const result: Record<FilterKey, number> = {
      ALL: lots.length,
      OK: 0,
      SOON: 0,
      EXPIRED: 0,
      LOW: 0,
      QUARANTINE: 0,
      DAMAGED: 0,
      CONTAMINATED: 0,
      RECALLED: 0,
      DEPLETED: 0,
    };
    for (const lot of lots) result[statusFor(lot).key] += 1;
    return result;
  }, [lots]);

  const filtered = useMemo(() => {
    const rows = activeFilter === "ALL" ? lots : lots.filter((lot) => statusFor(lot).key === activeFilter);
    return rows.slice(0, limit);
  }, [activeFilter, limit, lots]);

  const totalBalance = lots.reduce((total, lot) => total + balanceOf(lot), 0);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA]}>
      <div className="w-full space-y-2 px-1">
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-cyan-500" />
          <div className="space-y-2 px-3 py-2 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/12 text-cyan-600 dark:text-cyan-300">
                  <PackageCheck size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">Lotes e validade</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {loading ? "A carregar..." : `${filtered.length} de ${lots.length} lotes · ${totalBalance} unidades`}
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
                <label className="inline-flex h-8 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-[11px] font-semibold text-muted-foreground">
                  <span>Mostrar</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={limit}
                    onChange={(event) => setLimit(Math.min(999, Math.max(1, Number(event.target.value || 1))))}
                    className="h-6 w-14 rounded border border-border bg-background px-1 text-center text-xs font-bold text-foreground outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                    aria-label="Número de lotes"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
              <div className="rounded-lg border border-border/60 bg-background/45 px-3 py-2">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <PackageCheck size={11} />
                  Total
                </div>
                <p className="text-sm font-bold text-foreground">{lots.length}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/45 px-3 py-2">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <AlertTriangle size={11} />
                  A vencer
                </div>
                <p className="text-sm font-bold text-foreground">{counts.SOON}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/45 px-3 py-2">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <CalendarClock size={11} />
                  Vencidos
                </div>
                <p className="text-sm font-bold text-foreground">{counts.EXPIRED}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/45 px-3 py-2">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <CheckCircle2 size={11} />
                  Stock baixo
                </div>
                <p className="text-sm font-bold text-foreground">{counts.LOW}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Pesquisar produto, lote..."
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
            Nenhum lote encontrado.
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {filtered.map((lot) => (
              <LotCard key={lot.id} lot={lot} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
