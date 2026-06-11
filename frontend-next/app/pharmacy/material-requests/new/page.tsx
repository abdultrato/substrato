"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import Card from "@/components/ui/Card"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useSafeDataRefresh, useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchAll, extractResults } from "@/lib/api"
import { MATERIAL_REQUISITION_PAGE_GROUPS } from "@/lib/material-requisition-rbac"

type LotDisponivel = {
  id: number
  product?: number
  product_name?: string
  lot_number?: string
  expiration_date?: string
  saldo?: number
}

type WarehouseStockRow = {
  id: number
  sku?: string
  name?: string
  unit_of_measure?: string
  available: number
}

type ProductStockRow = {
  key: string
  productName: string
  totalStock: number
}

type DraftItem = {
  lotId: number | null
  warehouseItemId: number | null
  requestedQuantity: number
}

type RequesterSectorOption = {
  value: string
  label: string
  source?: string
  source_label?: string
}

type RequesterContextResponse = {
  is_admin: boolean
  can_create: boolean
  sector_locked: boolean
  requester_sector: string | null
  requester_sector_label: string
  requester_source?: string | null
  requester_source_label?: string
  requested_by_department: string
  available_sectors: RequesterSectorOption[]
}

const SOURCE_PHARMACY = "PHA"
const SOURCE_WAREHOUSE = "WHS"

function emptyItem(): DraftItem {
  return { lotId: null, warehouseItemId: null, requestedQuantity: 1 }
}

function formatLotLabel(l: LotDisponivel) {
  const saldo = typeof l.saldo === "number" ? l.saldo : Number(l.saldo || 0)
  return `${l.product_name || "Produto"} — Lote ${l.lot_number || l.id} (disp.: ${saldo})`
}

function formatWarehouseItemLabel(item: WarehouseStockRow) {
  const unit = item.unit_of_measure ? ` ${item.unit_of_measure}` : ""
  return `${item.name || "Item"}${item.sku ? ` [${item.sku}]` : ""} (disp.: ${item.available}${unit})`
}

export default function CriarRequisicaoMateriaisPage() {
  useAuthGuard()
  const router = useRouter()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const { hasUnsavedInput } = useSafeDataRefresh()

  const requiredGroups = useMemo(() => [...MATERIAL_REQUISITION_PAGE_GROUPS], [])

  const [lots, setLots] = useState<LotDisponivel[]>([])
  const [stockLots, setStockLots] = useState<LotDisponivel[]>([])
  const [warehouseStock, setWarehouseStock] = useState<WarehouseStockRow[]>([])
  const [loadingLots, setLoadingLots] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [productQuery, setProductQuery] = useState("")
  const [requesterContext, setRequesterContext] = useState<RequesterContextResponse | null>(null)
  const [requesterSector, setRequesterSector] = useState("")

  const [items, setItems] = useState<DraftItem[]>([emptyItem()])

  const sectorSource = useMemo(() => {
    if (!requesterContext) return SOURCE_PHARMACY
    const option = (requesterContext.available_sectors || []).find((s) => s.value === requesterSector)
    if (option?.source) return option.source
    if (requesterContext.requester_source) return requesterContext.requester_source
    return SOURCE_PHARMACY
  }, [requesterContext, requesterSector])
  const isWarehouseSource = sectorSource === SOURCE_WAREHOUSE

  useEffect(() => {
    if (safeRefreshToken > 0 && hasUnsavedInput) return
    let mounted = true
    async function loadContextAndStock() {
      try {
        setLoadingLots(true)
        setError(null)
        const requesterContextRes = await apiFetch<RequesterContextResponse>(
          "/pharmacy/material_requisition/requester-context/",
          { clientCache: safeRefreshToken === 0 }
        )
        if (!mounted) return
        setRequesterContext(requesterContextRes)
        setRequesterSector(requesterContextRes?.requester_sector || "")

        const sectors = requesterContextRes?.available_sectors || []
        const needsPharmacy =
          requesterContextRes?.is_admin || sectors.some((s) => (s.source || SOURCE_PHARMACY) === SOURCE_PHARMACY)
        const needsWarehouse =
          requesterContextRes?.is_admin || sectors.some((s) => s.source === SOURCE_WAREHOUSE)

        const [availableRes, allLotsRes, warehouseRes] = await Promise.all([
          needsPharmacy
            ? apiFetch<any>("/pharmacy/lot/available/", { clientCache: safeRefreshToken === 0 })
            : Promise.resolve(null),
          needsPharmacy
            ? apiFetchAll<LotDisponivel>("/pharmacy/lot/", { pageSize: 200, maxPages: 25 })
            : Promise.resolve([]),
          needsWarehouse
            ? apiFetch<WarehouseStockRow[]>("/pharmacy/material_requisition/warehouse-stock/", {
                clientCache: safeRefreshToken === 0,
              })
            : Promise.resolve([]),
        ])
        if (!mounted) return
        setLots(availableRes ? extractResults<LotDisponivel>(availableRes) : [])
        setStockLots(Array.isArray(allLotsRes) ? allLotsRes : [])
        setWarehouseStock(Array.isArray(warehouseRes) ? warehouseRes : [])
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || "Falha ao carregar estoque disponível.")
      } finally {
        if (mounted) setLoadingLots(false)
      }
    }
    loadContextAndStock()
    return () => {
      mounted = false
    }
  }, [hasUnsavedInput, safeRefreshToken])

  const lotById = useMemo(() => new Map(lots.map((l) => [l.id, l])), [lots])
  const warehouseItemById = useMemo(
    () => new Map(warehouseStock.map((item) => [item.id, item])),
    [warehouseStock]
  )

  const productStocks = useMemo<ProductStockRow[]>(() => {
    if (isWarehouseSource) {
      return warehouseStock
        .filter((item) => Number(item.available || 0) > 0)
        .map((item) => ({
          key: String(item.id),
          productName: item.name || item.sku || "Item sem nome",
          totalStock: Number(item.available || 0),
        }))
        .sort((a, b) => a.productName.localeCompare(b.productName, undefined, { sensitivity: "base" }))
    }

    const source = stockLots.length ? stockLots : lots
    const byProduct = new Map<string, ProductStockRow>()
    for (const lot of source) {
      const stock = Number(lot.saldo || 0)
      if (stock <= 0) continue

      const rawKey = lot.product ? String(lot.product) : String(lot.product_name || "").trim().toLowerCase()
      const key = rawKey || `lot-${lot.id}`
      const name = (lot.product_name || "Produto sem nome").trim()

      const prev = byProduct.get(key)
      if (prev) {
        prev.totalStock += stock
      } else {
        byProduct.set(key, {
          key,
          productName: name,
          totalStock: stock,
        })
      }
    }

    return Array.from(byProduct.values()).sort((a, b) =>
      a.productName.localeCompare(b.productName, undefined, { sensitivity: "base" })
    )
  }, [isWarehouseSource, lots, stockLots, warehouseStock])

  const filteredProductStocks = useMemo(() => {
    const q = productQuery.trim().toLowerCase()
    if (!q) return productStocks
    return productStocks.filter((item) => item.productName.toLowerCase().includes(q))
  }, [productQuery, productStocks])

  const hasSelectableStock = isWarehouseSource ? warehouseStock.length > 0 : lots.length > 0

  function updateItem(idx: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function changeSector(nextSector: string) {
    const previousSource = sectorSource
    setRequesterSector(nextSector)
    const option = (requesterContext?.available_sectors || []).find((s) => s.value === nextSector)
    const nextSource = option?.source || SOURCE_PHARMACY
    if (nextSource !== previousSource) {
      setItems([emptyItem()])
    }
  }

  async function submit() {
    setError(null)

    if (!requesterSector) {
      setError("Não foi possível identificar o setor solicitante do utilizador atual.")
      return
    }

    const payloadItems = items
      .map((it) =>
        isWarehouseSource
          ? { warehouse_item: it.warehouseItemId, requested_quantity: it.requestedQuantity }
          : { lot: it.lotId, requested_quantity: it.requestedQuantity }
      )
      .filter((x: any) => !!(x.lot || x.warehouse_item) && Number(x.requested_quantity) > 0)

    if (!payloadItems.length) {
      setError(
        isWarehouseSource
          ? "Adicione pelo menos 1 item (item de armazém + quantidade)."
          : "Adicione pelo menos 1 item (lote + quantidade)."
      )
      return
    }

    try {
      setSubmitting(true)
      const res = await apiFetch<any>("/pharmacy/material_requisition/", {
        method: "POST",
        body: JSON.stringify({ sector: requesterSector, items_input: payloadItems }),
      })
      const id = res?.id ?? null
      if (id) {
        router.push(`/pharmacy/material-requests/${id}`)
      } else {
        router.push("/pharmacy/material-requests")
      }
    } catch (e: any) {
      setError(e?.message || "Falha ao criar requisição.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="space-y-6">
        <PageHeader
          title="Criar requisição de materiais"
          actions={
            <Link
              href="/pharmacy/material-requests"
              className="text-sm text-[var(--gray-700)] no-underline hover:underline"
            >
              Voltar
            </Link>
          }
        />

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <Card
          title="Dados do solicitante"
          subtitle="O setor requisitante será registado automaticamente para perfis não-admin."
        >
          {loadingLots ? (
            <div className="text-sm text-[var(--gray-600)]">Carregando contexto do solicitante…</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-12">
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-[var(--gray-700)]">
                  Setor solicitante
                </label>
                {requesterContext?.is_admin ? (
                  <select
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                    value={requesterSector}
                    onChange={(event) => changeSector(event.target.value)}
                    disabled={submitting}
                  >
                    <option value="">Selecione…</option>
                    {(requesterContext?.available_sectors || []).map((sectorOption) => (
                      <option key={sectorOption.value} value={sectorOption.value}>
                        {sectorOption.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--gray-100)] px-3 py-2 text-sm text-[var(--gray-700)]"
                    value={requesterContext?.requester_sector_label || ""}
                    readOnly
                  />
                )}
              </div>

              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-[var(--gray-700)]">
                  Fonte de abastecimento
                </label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--gray-100)] px-3 py-2 text-sm text-[var(--gray-700)]"
                  value={isWarehouseSource ? "Armazém central" : "Estoque da farmácia"}
                  readOnly
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-[var(--gray-700)]">
                  Departamento
                </label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--gray-100)] px-3 py-2 text-sm text-[var(--gray-700)]"
                  value={requesterContext?.requested_by_department || "—"}
                  readOnly
                />
              </div>
            </div>
          )}
        </Card>

        <Card
          title={isWarehouseSource ? "Produtos em estoque no armazém" : "Produtos em estoque na farmácia"}
          subtitle="Estoque atual agregado por produto (saldo real)."
        >
          {loadingLots ? (
            <div className="text-sm text-[var(--gray-600)]">Carregando produtos…</div>
          ) : productStocks.length ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder="Buscar produto por nome…"
                  className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                  disabled={submitting}
                />
                <div className="text-xs text-[var(--gray-500)]">
                  Produtos listados: {filteredProductStocks.length}
                </div>
              </div>

              <div className="overflow-auto rounded-xl border border-[var(--border)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--gray-100)] text-left text-[var(--gray-600)]">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Produto</th>
                      <th className="px-3 py-2 font-semibold">Estoque disponível</th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--text)]">
                    {filteredProductStocks.map((row) => (
                      <tr key={row.key} className="border-t border-[var(--border)]">
                        <td className="px-3 py-2">{row.productName}</td>
                        <td className="px-3 py-2">{row.totalStock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-sm text-[var(--gray-600)]">
              {isWarehouseSource
                ? "Nenhum item com saldo disponível no armazém."
                : "Nenhum produto com saldo em estoque na farmácia."}
            </div>
          )}
        </Card>

        <Card
          title="Itens"
          subtitle={
            isWarehouseSource
              ? "Selecione o item de armazém e informe a quantidade desejada."
              : "Selecione o produto/lote e informe a quantidade desejada."
          }
        >
          {loadingLots ? (
            <div className="text-sm text-[var(--gray-600)]">Carregando estoque disponível…</div>
          ) : hasSelectableStock ? (
            <div className="space-y-3">
              {items.map((it, idx) => {
                const lot = !isWarehouseSource && it.lotId ? lotById.get(it.lotId) : null
                const warehouseItem =
                  isWarehouseSource && it.warehouseItemId ? warehouseItemById.get(it.warehouseItemId) : null
                const available = lot
                  ? Number(lot.saldo || 0)
                  : warehouseItem
                    ? Number(warehouseItem.available || 0)
                    : null
                return (
                  <div key={idx} className="grid gap-3 md:grid-cols-12">
                    <div className="md:col-span-8">
                      <label className="block text-sm font-medium text-[var(--gray-700)]">
                        {isWarehouseSource ? "Item de armazém" : "Lote / Produto"}
                      </label>
                      {isWarehouseSource ? (
                        <select
                          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                          value={it.warehouseItemId ?? ""}
                          onChange={(e) =>
                            updateItem(idx, {
                              warehouseItemId: e.target.value ? Number(e.target.value) : null,
                              lotId: null,
                            })
                          }
                          disabled={submitting}
                        >
                          <option value="">Selecione…</option>
                          {warehouseStock.map((item) => (
                            <option key={item.id} value={item.id}>
                              {formatWarehouseItemLabel(item)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                          value={it.lotId ?? ""}
                          onChange={(e) =>
                            updateItem(idx, {
                              lotId: e.target.value ? Number(e.target.value) : null,
                              warehouseItemId: null,
                            })
                          }
                          disabled={submitting}
                        >
                          <option value="">Selecione…</option>
                          {lots.map((l) => (
                            <option key={l.id} value={l.id}>
                              {formatLotLabel(l)}
                            </option>
                          ))}
                        </select>
                      )}
                      {lot?.expiration_date ? (
                        <div className="mt-1 text-xs text-[var(--gray-500)]">
                          Validade: {String(lot.expiration_date)}
                        </div>
                      ) : null}
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-[var(--gray-700)]">
                        Quantidade
                      </label>
                      <input
                        type="number"
                        min={1}
                        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                        value={it.requestedQuantity}
                        onChange={(e) =>
                          updateItem(idx, { requestedQuantity: Math.max(1, Number(e.target.value || 1)) })
                        }
                        disabled={submitting}
                      />
                      {available !== null ? (
                        <div className="mt-1 text-xs text-[var(--gray-500)]">Disponível: {available}</div>
                      ) : null}
                    </div>

                    <div className="md:col-span-1 md:flex md:items-end">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={submitting || items.length <= 1}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-2 text-sm font-semibold text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60"
                        title="Remover"
                      >
                        —
                      </button>
                    </div>
                  </div>
                )
              })}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addItem}
                  disabled={submitting}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60"
                >
                  Adicionar item
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="rounded-lg bg-[var(--primary-600)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-700)] disabled:opacity-60"
                >
                  {submitting ? "Criando…" : "Criar requisição"}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-[var(--gray-600)]">
              {isWarehouseSource
                ? "Nenhum item de armazém disponível para requisição no momento."
                : "Nenhum lote disponível para requisição no momento."}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  )
}
