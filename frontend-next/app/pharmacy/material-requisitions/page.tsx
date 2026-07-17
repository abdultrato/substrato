"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ClipboardList,
  Loader2,
  PackageCheck,
  Search,
  User,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import useDebounce from "@/hooks/useDebounce";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { ApiListMeta, apiFetchList } from "@/lib/api";
import {
  MATERIAL_REQUISITION_PAGE_GROUPS,
  materialRequisitionSectorLabel,
} from "@/lib/material-requisition-rbac";

type TabKey = "PEN" | "PAR" | "FUL" | "HLD" | "ALL";

const TABS: { key: TabKey; label: string; dot: string; statuses: string[] }[] = [
  { key: "PEN", label: "Pendentes", dot: "bg-amber-400", statuses: ["PEN"] },
  { key: "PAR", label: "Parciais", dot: "bg-orange-400", statuses: ["PAR"] },
  { key: "FUL", label: "Aviadas", dot: "bg-emerald-400", statuses: ["FUL"] },
  { key: "HLD", label: "Arquivadas", dot: "bg-slate-400", statuses: ["HLD"] },
  { key: "ALL", label: "Todas", dot: "bg-cyan-400", statuses: ["PEN", "PAR", "FUL", "HLD"] },
];

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

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

type MaterialRequisition = {
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
  fulfilled_at?: string;
};

type ListResponse = { items: MaterialRequisition[]; meta: ApiListMeta; raw: any };

function parseStatus(value: string | null): TabKey {
  return TABS.some((tab) => tab.key === value) ? (value as TabKey) : "PEN";
}

function clampLimit(value: number) {
  if (Number.isNaN(value)) return 20;
  return Math.min(999, Math.max(1, value));
}

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

function sourceLabel(row: MaterialRequisition) {
  if (row.source_label) return row.source_label;
  if (row.source === "WHS") return "Armazém central";
  if (row.source === "PHA") return "Farmácia";
  return row.source || "Origem interna";
}

function EmptyState({ search, tabLabel }: { search?: string; tabLabel?: string }) {
  return (
    <section className={`${GLASS} border-dashed`}>
      <div className="flex min-h-[120px] flex-col items-center justify-center px-3 py-5 text-center">
        <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
          <ClipboardList size={20} />
        </span>
        <p className="text-sm font-semibold text-foreground">
          {search ? "Nenhuma requisição encontrada" : `Sem requisições ${tabLabel?.toLowerCase() ?? ""}`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {search ? "Ajuste a pesquisa ou limpe o filtro." : "Quando houver registos, eles aparecerão neste quadro."}
        </p>
      </div>
    </section>
  );
}

function ReqCard({ row }: { row: MaterialRequisition }) {
  const status = STATUS[row.status ?? ""] ?? STATUS.PEN;
  const sector = row.sector_label || materialRequisitionSectorLabel(row.sector);
  const title = row.custom_id || `REQ-MAT-${row.id}`;

  return (
    <Link
      href={`/pharmacy/material-requisitions/${row.id}`}
      className={`${GLASS} group relative block overflow-hidden transition hover:border-amber-400/50 hover:shadow-md`}
    >
      <span className={`absolute inset-y-0 left-0 w-0.5 ${status.dot}`} />
      <div className="space-y-0.5 px-2 py-1 pl-3">
        <div className="flex items-start justify-between gap-1">
          <div className="flex min-w-0 items-center gap-1">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-500/10 text-amber-600 dark:text-amber-300">
              <PackageCheck size={11} />
            </span>
            <div className="min-w-0">
              <p className="max-w-[115px] truncate text-[11px] font-bold leading-tight text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-300">
                {title}
              </p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-1.5 py-0 text-[8px] font-semibold ${status.badge}`}>
            {status.label}
          </span>
        </div>

        <div className="grid gap-0.5 text-[10px] text-muted-foreground">
          <div className="flex min-w-0 items-center gap-1">
            <Building2 size={9} className="shrink-0" />
            <span className="truncate">{sector || row.requested_by_department || "Sector não informado"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={9} className="shrink-0" />
            <span className="truncate">{formatDateTime(row.created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function PharmacyMaterialRequisitionsContent() {
  useAuthGuard();
  const searchParams = useSearchParams();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const requiredGroups = useMemo(() => [...MATERIAL_REQUISITION_PAGE_GROUPS], []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<MaterialRequisition[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>(() => parseStatus(searchParams.get("status")));
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setActiveTab(parseStatus(searchParams.get("status")));
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
        const query = params.toString();
        const response: ListResponse = await apiFetchList<MaterialRequisition>(
          `/pharmacy/material_requisition/${query ? `?${query}` : ""}`,
          { page: 1, pageSize: 500, clientPaginate: true, clientCache: safeRefreshToken === 0 },
        );
        if (mounted) setItems(response.items ?? []);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Falha ao carregar requisições.");
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
    const result: Record<TabKey, number> = { PEN: 0, PAR: 0, FUL: 0, HLD: 0, ALL: items.length };
    for (const item of items) {
      if (item.status === "PEN" || item.status === "PAR" || item.status === "FUL" || item.status === "HLD") {
        result[item.status] += 1;
      }
    }
    return result;
  }, [items]);

  const filteredItems = useMemo(() => {
    const tab = TABS.find((entry) => entry.key === activeTab) ?? TABS[0];
    if (tab.key === "ALL") return items;
    return items.filter((item) => tab.statuses.includes(item.status ?? ""));
  }, [activeTab, items]);

  const visibleItems = useMemo(() => filteredItems.slice(0, limit), [filteredItems, limit]);
  const activeLabel = TABS.find((entry) => entry.key === activeTab)?.label;

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="w-full space-y-2 px-1">
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
          <div className="space-y-2 px-3 py-2 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/12 text-amber-600 dark:text-amber-300">
                  <ClipboardList size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">Requisições de material</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {loading ? "A carregar..." : `${visibleItems.length} de ${filteredItems.length} registos`}
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
                    onChange={(event) => setLimit(clampLimit(Number(event.target.value)))}
                    className="h-6 w-14 rounded border border-border bg-background px-1 text-center text-xs font-bold text-foreground outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
                    aria-label="Número de requisições"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  className="h-8 w-full rounded-md border border-border bg-background/70 pl-8 pr-7 text-xs text-foreground outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
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

              {TABS.map((tab) => {
                const active = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-semibold transition ${
                      active
                        ? "border-amber-400/60 bg-amber-500/15 text-amber-700 dark:text-amber-200"
                        : "border-border/70 bg-background/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${tab.dot}`} />
                    {tab.label}
                    <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px]">{counts[tab.key]}</span>
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
        ) : visibleItems.length === 0 ? (
          <EmptyState search={search} tabLabel={activeLabel} />
        ) : activeTab === "ALL" ? (
          <div className="space-y-3">
            {TABS.filter((tab) => tab.key !== "ALL").map((tab) => {
              const group = visibleItems.filter((item) => tab.statuses.includes(item.status ?? ""));
              if (!group.length) return null;
              return (
                <section key={tab.key} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className={`h-2.5 w-2.5 rounded-full ${tab.dot}`} />
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      {tab.label} ({group.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 gap-1 md:grid-cols-4 xl:grid-cols-6">
                    {group.map((row) => (
                      <ReqCard key={row.id} row={row} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1 md:grid-cols-4 xl:grid-cols-6">
            {visibleItems.map((row) => (
              <ReqCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function PharmacyMaterialRequisitionsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Carregando...</div>}>
      <PharmacyMaterialRequisitionsContent />
    </Suspense>
  );
}
