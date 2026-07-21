"use client";

import { isNotFoundLikeError } from "@/lib/errors/api-error";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  Download,
  FileText,
  Loader2,
  Package,
  Repeat,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import Pagination from "@/components/ui/Pagination";
import PdfActionLabel from "@/components/ui/PdfActionLabel";
import { useAuth } from "@/hooks/useAuth";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS, userHasAnyGroup } from "@/lib/rbac";

type MovimentoRow = Record<string, any>;

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const CONTROL =
  "h-8 rounded-md border border-border bg-background/70 px-2 text-xs font-semibold text-foreground outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20";

function fmtDate(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function movementCode(m: MovimentoRow): string {
  return m.id_custom || m.custom_id || m.codigo || m.id || "-";
}

function lotLabel(m: MovimentoRow): string {
  if (typeof m.lot === "object" && m.lot) return m.lot.lot_number || m.lot.custom_id || `Lote ${m.lot.id}`;
  return m.lote_numero || m.lot_number || m.lote || m.lot || "-";
}

function productLabel(m: MovimentoRow): string {
  if (typeof m.product === "object" && m.product) return m.product.name || m.product.custom_id || `Produto ${m.product.id}`;
  return m.produto_nome || m.product_name || m.produto || m.product || "-";
}

function movementType(m: MovimentoRow): "ENT" | "SAI" | "AJU" | string {
  return m.tipo || m.type || "";
}

function movementTypeInfo(type: string) {
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

function originLabel(origin?: string): string {
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

function MovementCard({ movement }: { movement: MovimentoRow }) {
  const type = movementType(movement);
  const info = movementTypeInfo(type);
  const Icon = info.Icon;
  const quantity = Number(movement.quantidade ?? movement.quantity ?? 0);
  const signed = type === "SAI" ? -quantity : quantity;

  return (
    <Link
      href={`/pharmacy/inventory-movements/${movement.id}`}
      className={`${GLASS} group relative block overflow-hidden transition hover:shadow-md`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${info.accent}`} />
      <div className="space-y-2 px-3 py-2 pl-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/12 text-cyan-600 dark:text-cyan-300">
              <Icon size={15} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-300">
                {movement.name || movement.nome || movementCode(movement)}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">{productLabel(movement)}</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${info.badge}`}>
            {info.label}
          </span>
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

export default function FarmaciaMovimentosPage() {
  const { user } = useAuth();
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN]);
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MovimentoRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<{
    count_entries: number;
    count_exits: number;
    count_adjustments: number;
  } | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportType, setReportType] = useState<"ALL" | "ENT" | "SAI" | "AJU">(
    "ALL",
  );
  const [reportSector, setReportSector] = useState<
    "ALL" | "LAB" | "ENF" | "REC" | "MED" | "MOC" | "OUT"
  >("ALL");
  const [reportProductId, setReportProductId] = useState<string>("");
  const [showReports, setShowReports] = useState(false);
  const [reportLoading, setReportLoading] = useState<
    | null
    | "moves"
    | "stock"
    | "sector"
    | "consumption"
    | "top"
    | "least"
    | "sector-product"
  >(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setErro(null);
        const query: Record<string, string> = {};
        if (reportType !== "ALL") query.type = reportType;
        if (reportSector !== "ALL") query.sector = reportSector;
        if (dateFrom) query.date_from = dateFrom;
        if (dateTo) query.date_to = dateTo;
        if (reportProductId.trim()) query.product = reportProductId.trim();
        const { items, meta } = await apiFetchList<MovimentoRow>("/pharmacy/inventory_movement/", {
          page,
          pageSize,
          query: Object.keys(query).length ? query : undefined,
          clientPaginate: true,
          clientCache: safeRefreshToken === 0,
          timeoutMs: 5000,
          retryOnTimeout: 0,
        });

        const total = meta.total ?? items.length;
        const computedTotalPages =
          meta.totalPages ??
          (total && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1);

        if (!mounted) return;
        setData(items);
        setTotalItems(total);
        setTotalPages(computedTotalPages);
        if (page > computedTotalPages) setPage(computedTotalPages);
      } catch (e: any) {
        if (!mounted) return;
        setErro(
          isNotFoundLikeError(e)
            ? null
            : e?.message || "Falha ao carregar movimentos.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [page, pageSize, reportType, reportSector, dateFrom, dateTo, reportProductId, safeRefreshToken]);

  useEffect(() => {
    let mounted = true;
    async function loadSummary() {
      try {
        const params = new URLSearchParams();
        if (reportType !== "ALL") params.set("type", reportType);
        if (reportSector !== "ALL") params.set("sector", reportSector);
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo) params.set("date_to", dateTo);
        if (reportProductId.trim()) params.set("product", reportProductId.trim());
        const qs = params.toString();
        const url = `/pharmacy/inventory_movement/summary/${qs ? `?${qs}` : ""}`;
        const result = await apiFetch<{
          count_entries?: number;
          count_exits?: number;
          count_adjustments?: number;
        }>(url, {
          clientCache: safeRefreshToken === 0,
        });
        if (!mounted) return;
        setSummary({
          count_entries: Number(result?.count_entries ?? 0),
          count_exits: Number(result?.count_exits ?? 0),
          count_adjustments: Number(result?.count_adjustments ?? 0),
        });
      } catch {
        if (mounted) setSummary(null);
      }
    }
    loadSummary();
    return () => {
      mounted = false;
    };
  }, [reportType, reportSector, dateFrom, dateTo, reportProductId, safeRefreshToken]);

  const downloadPdf = useCallback(async (url: string, filename: string) => {
    const blob = await apiFetch<Blob>(url, { responseType: "blob" });
    const href = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(href);
  }, []);

  const buildCommonParams = useCallback(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    return params;
  }, [dateFrom, dateTo]);

  const generateEntryExitPdf = useCallback(async () => {
    try {
      setReportLoading("moves");
      const params = buildCommonParams();
      if (reportType !== "ALL") params.set("type", reportType);
      if (reportSector !== "ALL") params.set("sector", reportSector);
      params.set("limit", "1000");
      await downloadPdf(
        `/pharmacy/inventory_movement/history/pdf/?${params.toString()}`,
        "historico_entradas_saidas_farmacia.pdf",
      );
    } catch (e: any) {
      setErro(
        isNotFoundLikeError(e)
          ? null
          : e?.message || "Falha ao gerar PDF de entradas/saídas.",
      );
    } finally {
      setReportLoading(null);
    }
  }, [downloadPdf, buildCommonParams, reportSector, reportType]);

  const generateStockPdf = useCallback(async () => {
    try {
      setReportLoading("stock");
      const params = buildCommonParams();
      await downloadPdf(
        `/pharmacy/lot/stock/pdf/?${params.toString()}`,
        "estoque_existente_farmacia.pdf",
      );
    } catch (e: any) {
      setErro(
        isNotFoundLikeError(e)
          ? null
          : e?.message || "Falha ao gerar PDF de estoque existente.",
      );
    } finally {
      setReportLoading(null);
    }
  }, [downloadPdf, buildCommonParams]);

  const generateSectorMovementsPdf = useCallback(async () => {
    try {
      setReportLoading("sector");
      const params = buildCommonParams();
      if (reportSector !== "ALL") params.set("sector", reportSector);
      await downloadPdf(
        `/pharmacy/material_requisition/movement-history/pdf/?${params.toString()}`,
        "historico_movimentos_por_setor_farmacia.pdf",
      );
    } catch (e: any) {
      setErro(
        isNotFoundLikeError(e)
          ? null
          : e?.message || "Falha ao gerar PDF por setor solicitante.",
      );
    } finally {
      setReportLoading(null);
    }
  }, [downloadPdf, buildCommonParams, reportSector]);

  const generateProductConsumptionPdf = useCallback(async () => {
    try {
      setReportLoading("consumption");
      const params = buildCommonParams();
      if (reportProductId) params.set("product_id", reportProductId);
      await downloadPdf(
        `/pharmacy/product/consumption/pdf/?${params.toString()}`,
        "consumo_farmaceutico_produtos.pdf",
      );
    } catch (e: any) {
      setErro(
        isNotFoundLikeError(e)
          ? null
          : e?.message || "Falha ao gerar PDF de consumo por produto.",
      );
    } finally {
      setReportLoading(null);
    }
  }, [downloadPdf, buildCommonParams, reportProductId]);

  const generateMostRequestedProductsPdf = useCallback(async () => {
    try {
      setReportLoading("top");
      const params = buildCommonParams();
      params.set("limit", "30");
      await downloadPdf(
        `/pharmacy/product/most-requested/pdf/?${params.toString()}`,
        "produtos_mais_requisitados_farmacia.pdf",
      );
    } catch (e: any) {
      setErro(
        isNotFoundLikeError(e)
          ? null
          : e?.message || "Falha ao gerar PDF de produtos mais requisitados.",
      );
    } finally {
      setReportLoading(null);
    }
  }, [downloadPdf, buildCommonParams]);

  const generateLeastRequestedProductsPdf = useCallback(async () => {
    try {
      setReportLoading("least");
      const params = buildCommonParams();
      params.set("limit", "30");
      await downloadPdf(
        `/pharmacy/product/least-requested/pdf/?${params.toString()}`,
        "produtos_menos_requisitados_farmacia.pdf",
      );
    } catch (e: any) {
      setErro(
        isNotFoundLikeError(e)
          ? null
          : e?.message || "Falha ao gerar PDF de produtos menos requisitados.",
      );
    } finally {
      setReportLoading(null);
    }
  }, [downloadPdf, buildCommonParams]);

  const generateProductSectorsPdf = useCallback(async () => {
    if (!reportProductId) {
      setErro("Selecione um produto para gerar relatório por setor.");
      return;
    }
    try {
      setReportLoading("sector-product");
      const params = buildCommonParams();
      params.set("product_id", reportProductId);
      await downloadPdf(
        `/pharmacy/product/request-sectors/pdf/?${params.toString()}`,
        "setores_requisicao_produto_farmacia.pdf",
      );
    } catch (e: any) {
      setErro(
        isNotFoundLikeError(e)
          ? null
          : e?.message || "Falha ao gerar PDF de setores por produto.",
      );
    } finally {
      setReportLoading(null);
    }
  }, [downloadPdf, buildCommonParams, reportProductId]);

  // Contagem de movimentos por tipo em TODOS os registos (via endpoint),
  // coerente com o card "Total". Fallback para a contagem da página atual
  // enquanto o resumo ainda não carregou.
  const pageEntries = data.filter((row) => movementType(row) === "ENT").length;
  const pageExits = data.filter((row) => movementType(row) === "SAI").length;
  const pageAdjustments = data.filter((row) => movementType(row) === "AJU").length;
  const currentEntries = summary?.count_entries ?? pageEntries;
  const currentExits = summary?.count_exits ?? pageExits;
  const currentAdjustments = summary?.count_adjustments ?? pageAdjustments;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA]} fullWidth>
      {/* Margens negativas anulam o padding horizontal do <main> do AppLayout,
          aproximando a página da largura total (~99vw) apenas aqui. w-auto (não
          w-full) evita overflow horizontal ao combinar com as margens negativas. */}
      <div className="w-auto space-y-1 -mx-2 px-0.5 sm:-mx-3 md:-mx-4">
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-violet-500" />
          <div className="space-y-2 px-3 py-2 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/12 text-violet-600 dark:text-violet-300">
                  <Repeat size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">Movimentos de stock</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {loading ? "A carregar..." : `${data.length} de ${totalItems} movimentos`}
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
                {podeVerAdmin ? (
                  <Link
                    href="/pharmacy/inventory-movements"
                    className="inline-flex h-8 items-center rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                  >
                    Gestão
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowReports((current) => !current)}
                  className={`inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-semibold transition ${
                    showReports
                      ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-700 dark:text-cyan-200"
                      : "border-border/70 bg-background/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText size={13} />
                  Relatórios
                </button>
                <label className="inline-flex h-8 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-[11px] font-semibold text-muted-foreground">
                  <span>Mostrar</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={pageSize}
                    onChange={(event) => {
                      setPage(1);
                      setPageSize(Math.min(999, Math.max(1, Number(event.target.value || 1))));
                    }}
                    className="h-6 w-14 rounded border border-border bg-background px-1 text-center text-xs font-bold text-foreground outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                    aria-label="Número de movimentos"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
              <MetricCard icon={BarChart3} label="Total" value={totalItems} />
              <MetricCard icon={TrendingUp} label="Entradas" value={currentEntries} />
              <MetricCard icon={TrendingDown} label="Saídas" value={currentExits} />
              <MetricCard icon={Repeat} label="Ajustes" value={currentAdjustments} />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <input type="date" value={dateFrom} onChange={(e) => { setPage(1); setDateFrom(e.target.value); }} className={CONTROL} aria-label="Data inicial" />
              <input type="date" value={dateTo} onChange={(e) => { setPage(1); setDateTo(e.target.value); }} className={CONTROL} aria-label="Data final" />
              <select
                value={reportType}
                onChange={(e) => {
                  setPage(1);
                  setReportType(e.target.value as any);
                }}
                className={CONTROL}
                aria-label="Tipo de movimento"
              >
                <option value="ALL">Todos</option>
                <option value="ENT">Entradas</option>
                <option value="SAI">Saídas</option>
                <option value="AJU">Ajustes</option>
              </select>
              <select value={reportSector} onChange={(e) => { setPage(1); setReportSector(e.target.value as any); }} className={CONTROL} aria-label="Setor solicitante">
                <option value="ALL">Todos setores</option>
                <option value="LAB">Laboratório</option>
                <option value="ENF">Enfermagem</option>
                <option value="REC">Recepção</option>
                <option value="MED">Medicina</option>
                <option value="MOC">Medicina Ocupacional</option>
                <option value="OUT">Outros setores</option>
              </select>
              <input
                type="number"
                value={reportProductId}
                onChange={(e) => { setPage(1); setReportProductId(e.target.value); }}
                placeholder="Produto ID"
                className={`${CONTROL} w-28`}
              />
              <button
                type="button"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setReportType("ALL");
                  setReportSector("ALL");
                  setReportProductId("");
                  setPage(1);
                }}
                className="inline-flex h-8 items-center rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
              >
                Limpar
              </button>
            </div>
          </div>
        </section>

        {erro ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        {showReports ? (
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-cyan-500" />
          <div className="space-y-2 px-3 py-2 pl-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
                <FileText size={14} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-foreground">Relatórios</h2>
                <p className="text-[11px] text-muted-foreground">PDFs com os filtros do cabeçalho.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={generateEntryExitPdf}
              disabled={reportLoading !== null}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-60"
            >
              <Download size={12} />
              <PdfActionLabel
                loading={reportLoading === "moves"}
                loadingLabel="Gerando..."
              >
                PDF histórico entradas/saídas
              </PdfActionLabel>
            </button>
            <button
              type="button"
              onClick={generateStockPdf}
              disabled={reportLoading !== null}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-60"
            >
              <Download size={12} />
              <PdfActionLabel
                loading={reportLoading === "stock"}
                loadingLabel="Gerando..."
              >
                PDF estoque existente
              </PdfActionLabel>
            </button>
            <button
              type="button"
              onClick={generateSectorMovementsPdf}
              disabled={reportLoading !== null}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-60"
            >
              <Download size={12} />
              <PdfActionLabel
                loading={reportLoading === "sector"}
                loadingLabel="Gerando..."
              >
                PDF movimentos por setor solicitante
              </PdfActionLabel>
            </button>
            <button
              type="button"
              onClick={generateProductConsumptionPdf}
              disabled={reportLoading !== null}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-60"
            >
              <Download size={12} />
              <PdfActionLabel
                loading={reportLoading === "consumption"}
                loadingLabel="Gerando..."
              >
                PDF consumo por produto
              </PdfActionLabel>
            </button>
            <button
              type="button"
              onClick={generateMostRequestedProductsPdf}
              disabled={reportLoading !== null}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-60"
            >
              <Download size={12} />
              <PdfActionLabel
                loading={reportLoading === "top"}
                loadingLabel="Gerando..."
              >
                PDF produtos mais requisitados
              </PdfActionLabel>
            </button>
            <button
              type="button"
              onClick={generateLeastRequestedProductsPdf}
              disabled={reportLoading !== null}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-60"
            >
              <Download size={12} />
              <PdfActionLabel
                loading={reportLoading === "least"}
                loadingLabel="Gerando..."
              >
                PDF produtos menos requisitados
              </PdfActionLabel>
            </button>
            <button
              type="button"
              onClick={generateProductSectorsPdf}
              disabled={reportLoading !== null}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-60"
            >
              <Download size={12} />
              <PdfActionLabel
                loading={reportLoading === "sector-product"}
                loadingLabel="Gerando..."
              >
                PDF setores por produto
              </PdfActionLabel>
            </button>
            </div>
          </div>
        </section>
        ) : null}

        {loading ? (
          <div className={`${GLASS} flex h-40 items-center justify-center text-muted-foreground`}>
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <section className={`${GLASS} flex min-h-[180px] flex-col items-center justify-center gap-1 px-4 text-center text-sm text-muted-foreground`}>
            <span>Nenhum movimento encontrado.</span>
            {reportSector !== "ALL" ? (
              <span className="text-xs text-muted-foreground/80">
                Só movimentos de saída ligados a requisições têm setor. Movimentos
                de venda, entrada e ajuste não são associados a nenhum setor.
              </span>
            ) : null}
          </section>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.map((movement) => (
                <MovementCard key={movement.id} movement={movement} />
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}
