"use client"

import { createPortal } from "react-dom"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Building2, ClipboardList, Loader2, PackageSearch, PlusCircle } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useSafeDataRefresh, useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchAll } from "@/lib/api"
import { MATERIAL_REQUISITION_PAGE_GROUPS } from "@/lib/material-requisition-rbac"

type LotDisponivel = {
  id: number
  product?: number
  product_name?: string
  lot_number?: string
  expiration_date?: string
  saldo?: number
}

type PharmacyProduct = {
  id: number
  name?: string
  custom_id?: string
}

type WarehouseStockRow = {
  id: number
  sku?: string
  name?: string
  unit_of_measure?: string
  available: number
}

type DraftItem = {
  productId: number | null
  warehouseItemId: number | null
  requestedQuantity: number
  searchQuery: string
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
const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
const FIELD =
  "mt-1 w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition"
const READONLY_FIELD =
  "mt-1 w-full rounded-lg border border-white/20 bg-white/20 px-3 py-2 text-sm text-foreground dark:border-white/10 dark:bg-white/[0.05]"

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  accent,
  children,
}: {
  title: string
  subtitle?: string
  icon: React.ElementType
  accent: string
  children: React.ReactNode
}) {
  return (
    <section className={`relative ${GLASS}`}>
      <span className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${accent}`} />
      <div className="px-4 py-3 pl-5">
        <div className="mb-3 flex items-start gap-2">
          <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accent} text-white shadow-sm`}>
            <Icon size={14} />
          </span>
          <div className="min-w-0">
            <h2 className="text-xs font-semibold leading-tight text-foreground">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {children}
      </div>
    </section>
  )
}

function emptyItem(): DraftItem {
  return { productId: null, warehouseItemId: null, requestedQuantity: 1, searchQuery: "" }
}

function formatWarehouseItemLabel(item: WarehouseStockRow) {
  return `${item.name || "Item"}${item.sku ? ` [${item.sku}]` : ""}`
}

function formatProductLabel(product: PharmacyProduct) {
  return product.name || product.custom_id || `Produto ${product.id}`
}

export default function CriarRequisicaoMateriaisPage() {
  useAuthGuard()
  const router = useRouter()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const { hasUnsavedInput } = useSafeDataRefresh()

  const requiredGroups = useMemo(() => [...MATERIAL_REQUISITION_PAGE_GROUPS], [])

  const [products, setProducts] = useState<PharmacyProduct[]>([])
  const [stockLots, setStockLots] = useState<LotDisponivel[]>([])
  const [warehouseStock, setWarehouseStock] = useState<WarehouseStockRow[]>([])
  const [loadingLots, setLoadingLots] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [requesterContext, setRequesterContext] = useState<RequesterContextResponse | null>(null)
  const [requesterSector, setRequesterSector] = useState("")
  const [mounted, setMounted] = useState(false)
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null)
  const [searchDropdownStyle, setSearchDropdownStyle] = useState<React.CSSProperties>({})

  const [items, setItems] = useState<DraftItem[]>([emptyItem()])
  const searchInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const sectorSource = useMemo(() => {
    if (!requesterContext) return SOURCE_PHARMACY
    const option = (requesterContext.available_sectors || []).find((s) => s.value === requesterSector)
    if (option?.source) return option.source
    if (requesterContext.requester_source) return requesterContext.requester_source
    return SOURCE_PHARMACY
  }, [requesterContext, requesterSector])
  const isWarehouseSource = sectorSource === SOURCE_WAREHOUSE

  useEffect(() => {
    setMounted(true)
  }, [])

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

        const [productsRes, allLotsRes, warehouseRes] = await Promise.all([
          needsPharmacy
            ? apiFetchAll<PharmacyProduct>("/pharmacy/product/", { pageSize: 200, maxPages: 25 })
            : Promise.resolve([]),
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
        setProducts(Array.isArray(productsRes) ? productsRes : [])
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

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      if (target?.closest("[data-search-dropdown='true']")) return
      const currentInput = activeSearchIndex !== null ? searchInputRefs.current[activeSearchIndex] : null
      if (currentInput && target && currentInput.contains(target)) return
      setActiveSearchIndex(null)
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [activeSearchIndex])

  const warehouseItemById = useMemo(
    () => new Map(warehouseStock.map((item) => [item.id, item])),
    [warehouseStock]
  )

  // Saldo real por produto, agregado a partir dos lotes.
  const stockByProductId = useMemo(() => {
    const totals = new Map<number, number>()
    for (const lot of stockLots) {
      if (!lot.product) continue
      const stock = Number(lot.saldo || 0)
      if (stock <= 0) continue
      totals.set(lot.product, (totals.get(lot.product) || 0) + stock)
    }
    return totals
  }, [stockLots])

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const hasSelectableStock = isWarehouseSource ? warehouseStock.length > 0 : products.length > 0

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

  function openSearchDropdown(idx: number) {
    const input = searchInputRefs.current[idx]
    if (!input) return
    const rect = input.getBoundingClientRect()
    setSearchDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    })
    setActiveSearchIndex(idx)
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
          : { product: it.productId, requested_quantity: it.requestedQuantity }
      )
      .filter((x: any) => !!(x.product || x.warehouse_item) && Number(x.requested_quantity) > 0)

    if (!payloadItems.length) {
      setError(
        isWarehouseSource
          ? "Adicione pelo menos 1 item (item de armazém + quantidade)."
          : "Adicione pelo menos 1 item (produto + quantidade)."
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
      <div className="space-y-3 px-1">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-indigo-500" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/20">
                <PackageSearch size={17} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">Criar requisição de materiais</h1>
              </div>
            </div>
            <Link
              href="/pharmacy/material-requests"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/20 px-3 py-2 text-sm font-semibold text-foreground transition hover:border-indigo-500/30 hover:bg-white/30 dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
            >
              <ArrowLeft size={14} />
              Voltar
            </Link>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 backdrop-blur-sm dark:text-amber-200">
            {error}
          </div>
        ) : null}

        <SectionCard
          title="Dados do solicitante"
          icon={Building2}
          accent="bg-indigo-500"
        >
          {loadingLots ? (
            <div className="flex h-20 items-center justify-center text-muted-foreground">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Setor solicitante
                </label>
                {requesterContext?.is_admin ? (
                  <select
                    className={FIELD}
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
                    className={READONLY_FIELD}
                    value={requesterContext?.requester_sector_label || ""}
                    readOnly
                  />
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Departamento
                </label>
                <input
                  type="text"
                  className={READONLY_FIELD}
                  value={requesterContext?.requested_by_department || "—"}
                  readOnly
                />
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Itens da requisição"
          icon={ClipboardList}
          accent="bg-violet-500"
        >
          {loadingLots ? (
            <div className="flex h-20 items-center justify-center text-muted-foreground">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : hasSelectableStock ? (
            <div className="space-y-3">
              {items.map((it, idx) => {
                const product = !isWarehouseSource && it.productId ? productById.get(it.productId) : null
                const warehouseItem =
                  isWarehouseSource && it.warehouseItemId ? warehouseItemById.get(it.warehouseItemId) : null
                const searchNeedle = it.searchQuery.trim().toLowerCase()
                const filteredWarehouseOptions = warehouseStock
                  .filter((item) => {
                    const label = `${item.name || ""} ${item.sku || ""}`.toLowerCase()
                    return !searchNeedle || label.includes(searchNeedle)
                  })
                  .sort((a, b) =>
                    (a.name || a.sku || "Item sem nome").localeCompare(b.name || b.sku || "Item sem nome", undefined, { sensitivity: "base" })
                  )
                const filteredProductOptions = products
                  .filter((p) => {
                    const label = `${p.name || ""} ${p.custom_id || ""}`.toLowerCase()
                    return !searchNeedle || label.includes(searchNeedle)
                  })
                  .sort((a, b) =>
                    (a.name || a.custom_id || "Produto sem nome").localeCompare(b.name || b.custom_id || "Produto sem nome", undefined, { sensitivity: "base" })
                  )
                const available = product
                  ? stockByProductId.get(product.id) || 0
                  : warehouseItem
                    ? Number(warehouseItem.available || 0)
                    : null
                const selectedLabel = isWarehouseSource
                  ? (warehouseItem ? formatWarehouseItemLabel(warehouseItem) : "")
                  : (product ? formatProductLabel(product) : "")
                return (
                  <div key={idx} className="rounded-xl border border-white/20 bg-white/15 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="flex flex-nowrap items-end gap-3 overflow-x-auto">
                    <div className="relative min-w-[18rem] flex-[1.35]">
                      <input
                        ref={(node) => {
                          searchInputRefs.current[idx] = node
                        }}
                        type="text"
                        className={FIELD}
                        value={it.searchQuery}
                        onChange={(e) =>
                          {
                            updateItem(idx, {
                              searchQuery: e.target.value,
                              productId: isWarehouseSource ? it.productId : null,
                              warehouseItemId: isWarehouseSource ? null : it.warehouseItemId,
                            })
                            openSearchDropdown(idx)
                          }
                        }
                        onFocus={() => openSearchDropdown(idx)}
                        placeholder={isWarehouseSource ? "Pesquisar item por nome ou SKU…" : "Pesquisar produto por nome ou código…"}
                        disabled={submitting}
                      />
                      {mounted && activeSearchIndex === idx && it.searchQuery.trim() && !selectedLabel ? createPortal(
                        <div data-search-dropdown="true" style={searchDropdownStyle} className="max-h-56 overflow-auto rounded-lg border border-white/20 bg-white/95 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-950/95">
                          {(isWarehouseSource ? filteredWarehouseOptions : filteredProductOptions).slice(0, 8).map((option) => {
                            const optionId = option.id
                            const optionLabel = isWarehouseSource
                              ? formatWarehouseItemLabel(option as WarehouseStockRow)
                              : formatProductLabel(option as PharmacyProduct)
                            return (
                              <button
                                key={optionId}
                                type="button"
                                data-search-dropdown="true"
                                onClick={() =>
                                  {
                                    updateItem(idx, isWarehouseSource
                                      ? {
                                          warehouseItemId: optionId,
                                          productId: null,
                                          searchQuery: optionLabel,
                                        }
                                      : {
                                          productId: optionId,
                                          warehouseItemId: null,
                                          searchQuery: optionLabel,
                                        })
                                    setActiveSearchIndex(null)
                                  }
                                }
                                className="block w-full border-b border-white/10 px-3 py-2 text-left text-sm text-foreground transition hover:bg-white/60 last:border-b-0 dark:hover:bg-white/10"
                              >
                                {optionLabel}
                              </button>
                            )
                          })}
                          {(isWarehouseSource ? filteredWarehouseOptions : filteredProductOptions).length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado.</div>
                          ) : null}
                        </div>,
                        document.body
                      ) : null}
                    </div>
                    <div className="min-w-[20rem] flex-[1.55]">
                      <div className="rounded-lg border border-white/20 bg-white/20 px-3 py-2 dark:border-white/10 dark:bg-white/[0.05]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {isWarehouseSource ? "Item selecionado" : "Produto selecionado"}
                          </span>
                          {selectedLabel ? (
                            <button
                              type="button"
                              onClick={() =>
                                updateItem(idx, {
                                  productId: null,
                                  warehouseItemId: null,
                                  searchQuery: "",
                                })
                              }
                              className="shrink-0 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                            >
                              Limpar
                            </button>
                          ) : null}
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <div className={`min-w-0 text-sm ${selectedLabel ? "text-foreground" : "text-muted-foreground"}`}>
                            {selectedLabel || (isWarehouseSource ? "Nenhum item selecionado" : "Nenhum produto selecionado")}
                          </div>
                          {product && (stockByProductId.get(product.id) || 0) <= 0 ? (
                            <div className="shrink-0 text-xs font-medium text-amber-700">
                              Sem saldo em estoque
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="min-w-[5.5rem] w-[5.5rem] shrink-0">
                      <input
                        type="number"
                        min={1}
                        className={FIELD}
                        value={it.requestedQuantity}
                        onChange={(e) =>
                          updateItem(idx, { requestedQuantity: Math.max(1, Number(e.target.value || 1)) })
                        }
                        disabled={submitting}
                        placeholder="Quantidade"
                        aria-label="Quantidade"
                      />
                      {available !== null ? (
                        <div className="mt-1 text-xs text-[var(--gray-500)]">Disponível: {available}</div>
                      ) : null}
                    </div>

                    <div className="min-w-[3.5rem] shrink-0">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={submitting || items.length <= 1}
                        className="w-full rounded-lg border border-white/20 bg-white/20 px-2.5 py-2 text-sm font-semibold text-foreground transition hover:bg-white/30 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.1]"
                        title="Remover"
                      >
                        —
                      </button>
                    </div>
                    </div>
                  </div>
                )
              })}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={addItem}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/20 px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-white/30 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
                >
                  <PlusCircle size={14} />
                  Adicionar item
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:from-indigo-500 hover:to-blue-500 disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <PackageSearch size={14} />}
                  {submitting ? "Criando…" : "Criar requisição"}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {isWarehouseSource
                ? "Nenhum item de armazém disponível para requisição no momento."
                : "Nenhum produto registado na farmácia para requisição."}
            </div>
          )}
        </SectionCard>
      </div>
    </AppLayout>
  )
}
