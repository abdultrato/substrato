"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  Loader2,
  Package,
  Receipt,
  Search,
  ShoppingCart,
  User,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import useDebounce from "@/hooks/useDebounce";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { ApiListMeta, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type Sale = {
  id: number;
  custom_id?: string;
  number?: string;
  patient?: number | { id?: number; name?: string; custom_id?: string };
  patient_name?: string;
  total?: string | number;
  created_at?: string;
  updated_at?: string;
};

type SaleItem = {
  id: number;
  sale?: number | { id?: number };
  product?: number;
  product_name?: string;
  quantity?: number;
  unit_price?: string | number;
};

type Patient = {
  id: number;
  custom_id?: string;
  name?: string;
  full_name?: string;
  nome?: string;
};

type ListResponse<T> = { items: T[]; meta: ApiListMeta; raw: any };

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

function saleCode(sale: Sale) {
  return sale.number || sale.custom_id || `Venda #${sale.id}`;
}

function patientId(sale: Sale) {
  if (typeof sale.patient === "object" && sale.patient) return sale.patient.id ? String(sale.patient.id) : "";
  return sale.patient ? String(sale.patient) : "";
}

function saleItemSaleId(item: SaleItem) {
  if (typeof item.sale === "object" && item.sale) return item.sale.id ? String(item.sale.id) : "";
  return item.sale ? String(item.sale) : "";
}

function patientLabel(sale: Sale, patients: Map<string, Patient>) {
  if (sale.patient_name) return sale.patient_name;
  if (typeof sale.patient === "object" && sale.patient) return sale.patient.name || sale.patient.custom_id || `Paciente ${sale.patient.id}`;
  const id = patientId(sale);
  const patient = id ? patients.get(id) : null;
  return patient?.name || patient?.full_name || patient?.nome || patient?.custom_id || (id ? `Paciente #${id}` : "Sem paciente");
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

function SaleCard({
  sale,
  itemsCount,
  patient,
}: {
  sale: Sale;
  itemsCount: number;
  patient: string;
}) {
  return (
    <Link href={`/pharmacy/sales/${sale.id}`} className={`${GLASS} group relative block overflow-hidden transition hover:shadow-md`}>
      <span className="absolute inset-y-0 left-0 w-1 bg-green-500" />
      <div className="space-y-1.5 px-2.5 py-1.5 pl-4">
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-green-500/12 text-green-600 dark:text-green-300">
              <ShoppingCart size={15} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-300">
                {saleCode(sale)}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">{patient}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300">
            Venda
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 text-[11px]">
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-0.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Total</p>
            <p className="truncate text-xs font-bold text-foreground">{formatMoney(sale.total)}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-0.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Itens</p>
            <p className="truncate text-xs font-semibold text-foreground">{itemsCount}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-0.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Data</p>
            <p className="truncate text-xs font-semibold text-foreground">{formatDate(sale.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-1.5 border-t border-border/50 pt-1 text-[10px] text-muted-foreground">
          <span className="truncate">{sale.custom_id || `ID ${sale.id}`}</span>
          <span className="shrink-0">{patientId(sale) ? `Paciente #${patientId(sale)}` : "Sem paciente"}</span>
        </div>
      </div>
    </Link>
  );
}

export default function PharmacySalesPage() {
  useAuthGuard();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
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
        const [salesResponse, itemsResponse, patientsResponse] = await Promise.all([
          apiFetchList<Sale>(`/pharmacy/sale/${query ? `?${query}` : ""}`, {
            page: 1,
            pageSize: 500,
            clientPaginate: true,
            clientCache: safeRefreshToken === 0,
          }),
          apiFetchList<SaleItem>("/pharmacy/sale_item/", {
            page: 1,
            pageSize: 1000,
            clientPaginate: true,
            clientCache: safeRefreshToken === 0,
          }),
          apiFetchList<Patient>("/clinical/patients/", {
            page: 1,
            pageSize: 500,
            clientPaginate: true,
            clientCache: safeRefreshToken === 0,
          }).catch(() => ({ items: [] as Patient[], meta: {}, raw: null })),
        ]);
        if (!mounted) return;
        setSales((salesResponse as ListResponse<Sale>).items ?? []);
        setItems((itemsResponse as ListResponse<SaleItem>).items ?? []);
        setPatients((patientsResponse as ListResponse<Patient>).items ?? []);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Falha ao carregar vendas.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [debouncedSearch, safeRefreshToken]);

  const patientsMap = useMemo(() => new Map(patients.map((patient) => [String(patient.id), patient])), [patients]);
  const itemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const key = saleItemSaleId(item);
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [items]);
  const visible = sales.slice(0, limit);
  const totalValue = sales.reduce((total, sale) => total + Number(sale.total || 0), 0);
  const totalItems = items.reduce((total, item) => total + Number(item.quantity || 0), 0);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA]}>
      <div className="w-full space-y-1.5 px-0.5">
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-green-500" />
          <div className="space-y-1.5 px-2.5 py-1.5 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-green-500/12 text-green-600 dark:text-green-300">
                  <ShoppingCart size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">Vendas da farmácia</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {loading ? "A carregar..." : `${visible.length} de ${sales.length} vendas`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <Link href="/pharmacy" className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
                  <ArrowLeft size={13} />
                  Voltar
                </Link>
                <Link href="/pharmacy/sales/new" className="inline-flex h-7 items-center gap-1 rounded-md border border-green-400/50 bg-green-500/15 px-2 text-xs font-semibold text-green-700 transition hover:bg-green-500/20 dark:text-green-200">
                  <ShoppingCart size={13} />
                  Vender
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
                    aria-label="Número de vendas"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
              <MetricCard icon={Receipt} label="Vendas" value={sales.length} />
              <MetricCard icon={Banknote} label="Total vendido" value={formatMoney(totalValue)} />
              <MetricCard icon={Package} label="Itens vendidos" value={totalItems} />
              <MetricCard icon={User} label="Com paciente" value={sales.filter((sale) => patientId(sale)).length} />
            </div>

            <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Pesquisar número, paciente..."
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
            Nenhuma venda encontrada.
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-4">
            {visible.map((sale) => (
              <SaleCard
                key={sale.id}
                sale={sale}
                itemsCount={itemCounts.get(String(sale.id)) || 0}
                patient={patientLabel(sale, patientsMap)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
