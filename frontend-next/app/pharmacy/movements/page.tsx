"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import Pagination from "@/components/ui/Pagination"
import PdfActionLabel from "@/components/ui/PdfActionLabel"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

type MovimentoRow = Record<string, any>

function fmtDate(value: string | null | undefined): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

export default function FarmaciaMovimentosPage() {
  const { user } = useAuth()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<MovimentoRow[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [reportType, setReportType] = useState<"ALL" | "ENT" | "SAI" | "AJU">("ALL")
  const [reportSector, setReportSector] = useState<"ALL" | "LAB" | "ENF" | "REC" | "MED" | "MOC" | "OUT">("ALL")
  const [reportProductId, setReportProductId] = useState<string>("")
  const [reportLoading, setReportLoading] = useState<
    null | "moves" | "stock" | "sector" | "consumption" | "top" | "least" | "sector-product"
  >(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)
        const { items, meta } = await apiFetchList<MovimentoRow>("/pharmacy/inventory_movement/", {
          page,
          pageSize,
          clientCache: safeRefreshToken === 0,
          timeoutMs: 5000,
          retryOnTimeout: 0,
        })

        const total = meta.total ?? items.length
        const computedTotalPages =
          meta.totalPages ??
          (total && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1)

        if (!mounted) return
        setData(items)
        setTotalItems(total)
        setTotalPages(computedTotalPages)
        if (page > computedTotalPages) setPage(computedTotalPages)
      } catch (e: any) {
        if (!mounted) return
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar movimentos."))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [page, pageSize, safeRefreshToken])

  const downloadPdf = useCallback(async (url: string, filename: string) => {
    const blob = await apiFetch<Blob>(url, { responseType: "blob" })
    const href = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = href
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(href)
  }, [])

  const buildCommonParams = useCallback(() => {
    const params = new URLSearchParams()
    if (dateFrom) params.set("date_from", dateFrom)
    if (dateTo) params.set("date_to", dateTo)
    return params
  }, [dateFrom, dateTo])

  const generateEntryExitPdf = useCallback(async () => {
    try {
      setReportLoading("moves")
      const params = buildCommonParams()
      if (reportType !== "ALL") params.set("type", reportType)
      if (reportSector !== "ALL") params.set("sector", reportSector)
      params.set("limit", "1000")
      await downloadPdf(
        `/pharmacy/inventory_movement/history/pdf/?${params.toString()}`,
        "historico_entradas_saidas_farmacia.pdf"
      )
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao gerar PDF de entradas/saídas."))
    } finally {
      setReportLoading(null)
    }
  }, [downloadPdf, buildCommonParams, reportSector, reportType])

  const generateStockPdf = useCallback(async () => {
    try {
      setReportLoading("stock")
      const params = buildCommonParams()
      await downloadPdf(`/pharmacy/lot/stock/pdf/?${params.toString()}`, "estoque_existente_farmacia.pdf")
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao gerar PDF de estoque existente."))
    } finally {
      setReportLoading(null)
    }
  }, [downloadPdf, buildCommonParams])

  const generateSectorMovementsPdf = useCallback(async () => {
    try {
      setReportLoading("sector")
      const params = buildCommonParams()
      if (reportSector !== "ALL") params.set("sector", reportSector)
      await downloadPdf(
        `/pharmacy/material_requisition/movement-history/pdf/?${params.toString()}`,
        "historico_movimentos_por_setor_farmacia.pdf"
      )
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao gerar PDF por setor solicitante."))
    } finally {
      setReportLoading(null)
    }
  }, [downloadPdf, buildCommonParams, reportSector])

  const generateProductConsumptionPdf = useCallback(async () => {
    try {
      setReportLoading("consumption")
      const params = buildCommonParams()
      if (reportProductId) params.set("product_id", reportProductId)
      await downloadPdf(
        `/pharmacy/product/consumption/pdf/?${params.toString()}`,
        "consumo_farmaceutico_produtos.pdf"
      )
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao gerar PDF de consumo por produto."))
    } finally {
      setReportLoading(null)
    }
  }, [downloadPdf, buildCommonParams, reportProductId])

  const generateMostRequestedProductsPdf = useCallback(async () => {
    try {
      setReportLoading("top")
      const params = buildCommonParams()
      params.set("limit", "30")
      await downloadPdf(
        `/pharmacy/product/most-requested/pdf/?${params.toString()}`,
        "produtos_mais_requisitados_farmacia.pdf"
      )
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao gerar PDF de produtos mais requisitados."))
    } finally {
      setReportLoading(null)
    }
  }, [downloadPdf, buildCommonParams])

  const generateLeastRequestedProductsPdf = useCallback(async () => {
    try {
      setReportLoading("least")
      const params = buildCommonParams()
      params.set("limit", "30")
      await downloadPdf(
        `/pharmacy/product/least-requested/pdf/?${params.toString()}`,
        "produtos_menos_requisitados_farmacia.pdf"
      )
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao gerar PDF de produtos menos requisitados."))
    } finally {
      setReportLoading(null)
    }
  }, [downloadPdf, buildCommonParams])

  const generateProductSectorsPdf = useCallback(async () => {
    if (!reportProductId) {
      setErro("Selecione um produto para gerar relatório por setor.")
      return
    }
    try {
      setReportLoading("sector-product")
      const params = buildCommonParams()
      params.set("product_id", reportProductId)
      await downloadPdf(
        `/pharmacy/product/request-sectors/pdf/?${params.toString()}`,
        "setores_requisicao_produto_farmacia.pdf"
      )
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao gerar PDF de setores por produto."))
    } finally {
      setReportLoading(null)
    }
  }, [downloadPdf, buildCommonParams, reportProductId])

  const columns = useMemo(
    () => [
      {
        header: "Código",
        render: (m: MovimentoRow) => (
          <Link
            href={`/pharmacy/inventory-movements/${m.id}`}
            className="font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--gray-300)]"
          >
            {m.id_custom || m.id || "-"}
          </Link>
        ),
      },
      { header: "Lote", render: (m: MovimentoRow) => m.lote_numero || m.lot_number || m.lote || m.lot || "-" },
      {
        header: "Produto",
        render: (m: MovimentoRow) => m.produto_nome || m.product_name || m.produto || m.product || "-",
      },
      { header: "Tipo", render: (m: MovimentoRow) => m.tipo || m.type || "-" },
      { header: "Origem", render: (m: MovimentoRow) => m.origem ?? m.origin ?? "-" },
      { header: "Quantidade", render: (m: MovimentoRow) => m.quantidade ?? m.quantity ?? "-" },
      { header: "Data", render: (m: MovimentoRow) => fmtDate(m.criado_em || m.created_at) },
    ],
    []
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA]}>
      <div className="space-y-6">
        <PageHeader
          title="Movimentos de estoque"
          subtitle="Auditoria de entradas/saídas/ajustes."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/pharmacy/inventory-movements/new"
                className="inline-flex items-center rounded-xl bg-[var(--primary-600)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)]"
              >
                Criar movimento de estoque
              </Link>
              <Link
                href="/pharmacy/inventory-movements"
                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
              >
                Gerenciamento
              </Link>
              {podeVerAdmin ? (
                <Link
                  href="/admin/pharmacy/inventorymovement/"
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
                >
                  Admin
                </Link>
              ) : null}
            </div>
          }
        />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">Total: {totalItems}</div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <span>Por página</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPage(1)
                setPageSize(Number(e.target.value))
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-[var(--gray-600)]">
                De
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-[var(--gray-600)]">
                Até
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-[var(--gray-600)]">
                Tipo movimento
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="ALL">Todos</option>
                <option value="ENT">Entradas</option>
                <option value="SAI">Saídas</option>
                <option value="AJU">Ajustes</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-[var(--gray-600)]">
                Setor solicitante
              </label>
              <select
                value={reportSector}
                onChange={(e) => setReportSector(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="ALL">Todos</option>
                <option value="LAB">Laboratório</option>
                <option value="ENF">Enfermagem</option>
                <option value="REC">Recepção</option>
                <option value="MED">Medicina</option>
                <option value="MOC">Medicina Ocupacional</option>
                <option value="OUT">Outros setores</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setDateFrom("")
                  setDateTo("")
                  setReportType("ALL")
                  setReportSector("ALL")
                  setReportProductId("")
                }}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
              >
                Limpar filtros
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-[var(--gray-600)]">
                Produto (ID opcional)
              </label>
              <input
                type="number"
                value={reportProductId}
                onChange={(e) => setReportProductId(e.target.value)}
                placeholder="Ex.: 12"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={generateEntryExitPdf}
              disabled={reportLoading !== null}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <PdfActionLabel loading={reportLoading === "moves"} loadingLabel="Gerando...">
                PDF histórico entradas/saídas
              </PdfActionLabel>
            </button>
            <button
              type="button"
              onClick={generateStockPdf}
              disabled={reportLoading !== null}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <PdfActionLabel loading={reportLoading === "stock"} loadingLabel="Gerando...">
                PDF estoque existente
              </PdfActionLabel>
            </button>
            <button
              type="button"
              onClick={generateSectorMovementsPdf}
              disabled={reportLoading !== null}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <PdfActionLabel loading={reportLoading === "sector"} loadingLabel="Gerando...">
                PDF movimentos por setor solicitante
              </PdfActionLabel>
            </button>
            <button
              type="button"
              onClick={generateProductConsumptionPdf}
              disabled={reportLoading !== null}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <PdfActionLabel loading={reportLoading === "consumption"} loadingLabel="Gerando...">
                PDF consumo por produto
              </PdfActionLabel>
            </button>
            <button
              type="button"
              onClick={generateMostRequestedProductsPdf}
              disabled={reportLoading !== null}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <PdfActionLabel loading={reportLoading === "top"} loadingLabel="Gerando...">
                PDF produtos mais requisitados
              </PdfActionLabel>
            </button>
            <button
              type="button"
              onClick={generateLeastRequestedProductsPdf}
              disabled={reportLoading !== null}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <PdfActionLabel loading={reportLoading === "least"} loadingLabel="Gerando...">
                PDF produtos menos requisitados
              </PdfActionLabel>
            </button>
            <button
              type="button"
              onClick={generateProductSectorsPdf}
              disabled={reportLoading !== null}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <PdfActionLabel loading={reportLoading === "sector-product"} loadingLabel="Gerando...">
                PDF setores por produto
              </PdfActionLabel>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <>
            <DataTable<MovimentoRow>
              columns={columns as any}
              data={data}
              emptyMessage="Nenhum movimento encontrado."
            />
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </AppLayout>
  )
}
