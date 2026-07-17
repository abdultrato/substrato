"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  ClipboardList,
  Layers,
  PackageCheck,
  Pill,
  Repeat,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import WorkspaceHub from "@/components/workspace/WorkspaceHub";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetchList } from "@/lib/api";
import { isNotFoundLikeError } from "@/lib/errors/api-error";
import { GROUPS } from "@/lib/rbac";

function isAbortLikeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    (error as any)?.name === "AbortError" ||
    message.toLowerCase().includes("requisição abortada") ||
    message.toLowerCase().includes("request aborted")
  );
}

async function countWithFallback(endpoint: string): Promise<number> {
  try {
    const { meta } = await apiFetchList(endpoint, {
      page: 1,
      pageSize: 1,
      clientCache: false,
      timeoutMs: 15000,
      retryOnTimeout: 1,
    });
    return meta.total ?? 0;
  } catch (error) {
    if (isNotFoundLikeError(error) || isAbortLikeError(error)) return 0;
    throw error;
  }
}

export default function FarmaciaPage() {
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [produtos, setProdutos] = useState(0);
  const [medicamentos, setMedicamentos] = useState(0);
  const [lotes, setLotes] = useState(0);
  const [movimentos, setMovimentos] = useState(0);
  const [entradas, setEntradas] = useState(0);
  const [saidas, setSaidas] = useState(0);
  const [vendas, setVendas] = useState(0);
  const [requisicoes, setRequisicoes] = useState(0);
  const [requisicoesPendentes, setRequisicoesPendentes] = useState(0);
  const [requisicoesParciais, setRequisicoesParciais] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setErro(null);

        const [
          produtosCount,
          medicamentosCount,
          lotesCount,
          movimentosCount,
          entradasCount,
          saidasCount,
          vendasCount,
          requisicoesCount,
          pendentesCount,
          parciaisCount,
        ] = await Promise.all([
          countWithFallback("/pharmacy/product/"),
          countWithFallback("/pharmacy/product/?type=MED"),
          countWithFallback("/pharmacy/lot/"),
          countWithFallback("/pharmacy/inventory_movement/"),
          countWithFallback("/pharmacy/inventory_movement/?type=ENT"),
          countWithFallback("/pharmacy/inventory_movement/?type=SAI"),
          countWithFallback("/pharmacy/sale/"),
          countWithFallback("/pharmacy/material_requisition/"),
          countWithFallback("/pharmacy/material_requisition/?status=PEN"),
          countWithFallback("/pharmacy/material_requisition/?status=PAR"),
        ]);

        if (!mounted) return;
        setProdutos(produtosCount);
        setMedicamentos(medicamentosCount);
        setLotes(lotesCount);
        setMovimentos(movimentosCount);
        setEntradas(entradasCount);
        setSaidas(saidasCount);
        setVendas(vendasCount);
        setRequisicoes(requisicoesCount);
        setRequisicoesPendentes(pendentesCount);
        setRequisicoesParciais(parciaisCount);
      } catch (e: any) {
        if (!mounted) return;
        setErro(
          isNotFoundLikeError(e)
            ? null
            : e?.message || "Falha ao carregar o workspace da farmácia.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [safeRefreshToken]);

  const metricValue = useMemo(() => (loading ? "..." : null), [loading]);
  const queueValue = useMemo(() => (loading ? "..." : null), [loading]);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA]}>
      <div className="space-y-1">
        {erro ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
            {erro}
          </div>
        ) : null}

        <WorkspaceHub
          title="Farmácia"
          subtitle="Dispensação, lotes, vendas, avio de requisições e movimentos de stock."
          dense
          actionsNowrap
          backHref="/healthcare"
          icon={Pill}
          iconClass="bg-teal-500/15 text-teal-600 dark:text-teal-300"
          barClass="bg-teal-500"
          metrics={[
            { label: "Pendentes", value: metricValue || requisicoesPendentes, href: "/pharmacy/material-requisitions?status=PEN", icon: ClipboardList, accentClass: "border-l-amber-500", iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
            { label: "Parciais", value: metricValue || requisicoesParciais, href: "/pharmacy/material-requisitions?status=PAR", icon: PackageCheck, accentClass: "border-l-orange-500", iconClass: "bg-orange-500/15 text-orange-600 dark:text-orange-300" },
            { label: "Produtos", value: metricValue || produtos, href: "/pharmacy/products", icon: Boxes, accentClass: "border-l-blue-500", iconClass: "bg-blue-500/15 text-blue-600 dark:text-blue-300" },
            { label: "Medicamentos", value: metricValue || medicamentos, href: "/pharmacy/products?type=MED", icon: Pill, accentClass: "border-l-emerald-500", iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
            { label: "Lotes", value: metricValue || lotes, href: "/pharmacy/lots", icon: Layers, accentClass: "border-l-cyan-500", iconClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300" },
            { label: "Movimentos", value: metricValue || movimentos, href: "/pharmacy/movements", icon: Repeat, accentClass: "border-l-violet-500", iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
            { label: "Entradas", value: metricValue || entradas, href: "/pharmacy/movements?type=ENT", icon: TrendingUp, accentClass: "border-l-sky-500", iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
            { label: "Saídas", value: metricValue || saidas, href: "/pharmacy/movements?type=SAI", icon: TrendingDown, accentClass: "border-l-rose-500", iconClass: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
            { label: "Vendas", value: metricValue || vendas, href: "/pharmacy/sales", icon: ShoppingCart, accentClass: "border-l-green-500", iconClass: "bg-green-500/15 text-green-600 dark:text-green-300" },
          ]}
          actions={[
            {
              title: "Produtos",
              description: "Catálogo de medicamentos, materiais e preços de venda.",
              href: "/pharmacy/products",
              icon: Boxes,
              accentClass: "border-l-blue-500",
              iconClass: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
            },
            {
              title: "Lotes e validade",
              description: "Rastreio FEFO por lote, validade e saldo disponível.",
              href: "/pharmacy/lots",
              icon: Layers,
              accentClass: "border-l-cyan-500",
              iconClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
            },
            {
              title: "Movimentos de stock",
              description: "Entradas, saídas, ajustes, vendas e requisições.",
              href: "/pharmacy/movements",
              icon: Repeat,
              accentClass: "border-l-violet-500",
              iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
            },
            {
              title: "Avio de requisições",
              description: "Atender pedidos internos pendentes ou parcialmente aviados.",
              href: "/pharmacy/material-requisitions",
              icon: PackageCheck,
              accentClass: "border-l-amber-500",
              iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
            },
            {
              title: "Vendas",
              description: "Registar vendas, dispensação e itens associados ao paciente.",
              href: "/pharmacy/sales",
              icon: ShoppingCart,
              accentClass: "border-l-green-500",
              iconClass: "bg-green-500/15 text-green-600 dark:text-green-300",
            },
          ]}
          headerPanels={
            <div className="flex flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap rounded-lg border border-white/20 bg-white/20 px-1.5 py-1 dark:border-white/10 dark:bg-white/[0.04]">
              <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md bg-amber-500/15 px-2 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-200">
                <ClipboardList size={11} /> Fila de avio
              </span>
              {[
                { label: "Total", value: requisicoes, href: "/pharmacy/material-requisitions", tone: "text-slate-800 dark:text-slate-200" },
                { label: "Pendentes", value: requisicoesPendentes, href: "/pharmacy/material-requisitions?status=PEN", tone: "text-amber-700 dark:text-amber-200" },
                { label: "Parciais", value: requisicoesParciais, href: "/pharmacy/material-requisitions?status=PAR", tone: "text-orange-700 dark:text-orange-200" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-white/20 bg-white/35 px-2 text-[11px] font-semibold transition hover:bg-white/50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 ${item.tone}`}>
                  <span>{item.label}</span>
                  <strong className="tabular-nums">{queueValue || item.value}</strong>
                </Link>
              ))}
              <span className="mx-0.5 h-5 w-px shrink-0 bg-border/70" />
              <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md bg-violet-500/15 px-2 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-200">
                <Repeat size={11} /> Fluxo de stock
              </span>
              {[
                { label: "Entradas", value: entradas, href: "/pharmacy/movements?type=ENT" },
                { label: "Saídas", value: saidas, href: "/pharmacy/movements?type=SAI" },
                { label: "Vendas", value: vendas, href: "/pharmacy/sales" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-white/20 bg-white/35 px-2 text-[11px] font-semibold text-foreground transition hover:bg-white/50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                  <span>{item.label}</span>
                  <strong className="tabular-nums">{queueValue || item.value}</strong>
                </Link>
              ))}
            </div>
          }
        />
      </div>
    </AppLayout>
  );
}
