"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  Repeat,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import useDebounce from "@/hooks/useDebounce";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { ApiListMeta, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type Movement = Record<string, any>;
type MovementType = "ALL" | "ENT" | "SAI" | "AJU";
type ListResponse = { items: Movement[]; meta: ApiListMeta; raw: any };

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

function fmtDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function movementCode(movement: Movement) {
  return movement.id_custom || movement.custom_id || movement.codigo || movement.id || "—";
}

function movementType(movement: Movement): string {
  return movement.tipo || movement.type || "";
}

function movementInfo(type: string) {
  if (type === "ENT") {
    return {
      label: "Entrada",
      Icon: TrendingUp,
      accent: "bg-emerald-500",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    };
  }
  if (type === "SAI") {
    return {
      label: "Saída",
      Icon: TrendingDown,
      accent: "bg-rose-500",
      badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
    };
  }
  return {
    label: type === "AJU" ? "Ajuste" : type || "Movimento",
    Icon: Repeat,
    accent: "bg-violet-500",
    badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-300",
  };
}

function lotLabel(movement: Movement) {
  if (typeof movement.lot === "object" && movement.lot) return movement.lot.lot_number || movement.lot.custom_id || `Lote ${movement.lot.id}`;
  return movement.lote_numero || movement.lot_number || movement.lote || movement.lot || "Lote não informado";
}

function productLabel(movement: Movement) {
  if (typeof movement.product === "object" && movement.product) return movement.product.name || movement.product.custom_id || `Produto ${movement.product.id}`;
  return movement.produto_nome || movement.product_name || movement.produto || movement.product || movement.name || "Produto não informado";
}

function originLabel(origin?: string) {
  if (origin === "VEND") return "Venda";
  if (origin === "PROC") return "Procedimento";
  if (origin === "AJUS") return "Ajuste";
  if (origin === "REQ") return "Requisição";
  return origin || "Origem não informada";
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

function MovementCard({ movement }: { movement: Movement }) {
  const type = movementType(movement);
  const info = movementInfo(type);
  const Icon = info.Icon;
  const quantity = Number(movement.quantidade ?? movement.quantity ?? 0);
  const signed = type === "SAI" ? -quantity : quantity;

  return (
    <Link href={`/pharmacy/inventory-movements/${movement.id}`} className={`${GLASS} group relative block overflow-hidden transition hover:shadow-md`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${info.accent}`} />
      <div className="space-y-2 px-3 py-2 pl-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/12 text-violet-600 dark:text-violet-300">
              <Icon size={15} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-300">
                {movement.name || movement.nome || movementCode(movement)}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">{productLabel(movement)}</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${info.badge}`}>{info.label}</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
          <div className="rounded-md border border-border/60 bg-background/45 px-2 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Qtd.</p>
            <p className={`text-xs font-bold ${type === "SAI" ? "text-rose-600 dark:text-rose-300" : "text-emerald-600 dark:text-emerald-300"}`}>
              {signed > 0 ? "+" : ""}
              {signed}
            </p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-2 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Origem</p>
            <p className="truncate text-xs font-semibold text-foreground">{originLabel(movement.origem ?? movement.origin)}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-2 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Data</p>
            <p className="truncate text-xs font-semibold text-foreground">{fmtDate(movement.criado_em || movement.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
          <span className="truncate">{lotLabel(movement)}</span>
          <span className="shrink-0">{movementCode(movement)}</span>
        </div>
      </div>
    </Link>
  );
}

export default function PharmacyInventoryMovementsListPage() {
  useAuthGuard();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<MovementType>("ALL");
  const [limit, setLimit] = useState(40);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const query: Record<string, string> = {};
        if (activeType !== "ALL") query.type = activeType;
        if (debouncedSearch.trim()) query.search = debouncedSearch.trim();
        const response: ListResponse = await apiFetchList<Movement>("/pharmacy/inventory_movement/", {
          page: 1,
          pageSize: 500,
          query,
          clientPaginate: true,
          clientCache: safeRefreshToken === 0,
        });
        if (mounted) setMovements(response.items ?? []);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Falha ao carregar movimentos.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [activeType, debouncedSearch, safeRefreshToken]);

  const visible = movements.slice(0, limit);
  const entries = movements.filter((row) => movementType(row) === "ENT").reduce((total, row) => total + Number(row.quantidade ?? row.quantity ?? 0), 0);
  const exits = movements.filter((row) => movementType(row) === "SAI").reduce((total, row) => total + Number(row.quantidade ?? row.quantity ?? 0), 0);
  const adjustments = movements.filter((row) => movementType(row) === "AJU").reduce((total, row) => total + Number(row.quantidade ?? row.quantity ?? 0), 0);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA]}>
      <div className="w-full space-y-2 px-1">
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-violet-500" />
          <div className="space-y-2 px-3 py-2 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/12 text-violet-600 dark:text-violet-300">
                  <Repeat size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">Gestão de movimentos</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {loading ? "A carregar..." : `${visible.length} de ${movements.length} movimentos`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Link href="/pharmacy/movements" className="inline-flex h-8 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
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
                    aria-label="Número de movimentos"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
              <MetricCard icon={BarChart3} label="Total" value={movements.length} />
              <MetricCard icon={TrendingUp} label="Entradas" value={entries} />
              <MetricCard icon={TrendingDown} label="Saídas" value={exits} />
              <MetricCard icon={Repeat} label="Ajustes" value={adjustments} />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Pesquisar código, produto, lote..."
                  className="h-8 w-full rounded-md border border-border bg-background/70 pl-8 pr-7 text-xs text-foreground outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {search ? (
                  <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Limpar pesquisa">
                    <X size={12} />
                  </button>
                ) : null}
              </div>
              {[
                ["ALL", "Todos"],
                ["ENT", "Entradas"],
                ["SAI", "Saídas"],
                ["AJU", "Ajustes"],
              ].map(([key, label]) => {
                const active = activeType === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveType(key as MovementType)}
                    className={`inline-flex h-8 items-center rounded-md border px-2.5 text-[11px] font-semibold transition ${
                      active
                        ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-700 dark:text-cyan-200"
                        : "border-border/70 bg-background/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
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
        ) : visible.length === 0 ? (
          <section className={`${GLASS} flex min-h-[180px] items-center justify-center text-sm text-muted-foreground`}>
            Nenhum movimento encontrado.
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {visible.map((movement) => (
              <MovementCard key={movement.id} movement={movement} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
