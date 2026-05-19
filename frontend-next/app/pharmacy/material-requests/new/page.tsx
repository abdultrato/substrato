"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import Card from "@/components/ui/Card"
import useAuthGuard from "@/hooks/useAuthGuard"
import { apiFetch, apiFetchAll, extractResults } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type LotDisponivel = {
  id: number
  product?: number
  product_name?: string
  lot_number?: string
  expiration_date?: string
  saldo?: number
}

type ProductStockRow = {
  key: string
  productName: string
  totalStock: number
}

type DraftItem = {
  lotId: number | null
  requestedQuantity: number
}

type RequesterSectorOption = {
  value: string
  label: string
}

type RequesterContextResponse = {
  is_admin: boolean
  can_create: boolean
  sector_locked: boolean
  requester_sector: string | null
  requester_sector_label: string
  requested_by_department: string
  available_sectors: RequesterSectorOption[]
}

function formatLotLabel(l: LotDisponivel) {
  const saldo = typeof l.saldo === "number" ? l.saldo : Number(l.saldo || 0)
  return `${l.product_name || "Produto"} — Lote ${l.lot_number || l.id} (disp.: ${saldo})`
}

export default function NovaRequisicaoMateriaisPage() {
  useAuthGuard()
  const router = useRouter()

  const requiredGroups = useMemo(
    () => [
      GROUPS.ADMIN,
      GROUPS.LABORATORIO,
      GROUPS.ENFERMAGEM,
      GROUPS.RECEPCAO,
      GROUPS.MEDICINA,
      GROUPS.MEDICINA_OCUPACIONAL,
      GROUPS.CONTABILIDADE,
      GROUPS.MANUTENCAO,
      GROUPS.RECURSOS_HUMANOS,
    ],
    []
  )

  const [lots, setLots] = useState<LotDisponivel[]>([])
  const [stockLots, setStockLots] = useState<LotDisponivel[]>([])
  const [loadingLots, setLoadingLots] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [productQuery, setProductQuery] = useState("")
  const [requesterContext, setRequesterContext] = useState<RequesterContextResponse | null>(null)
  const [requesterSector, setRequesterSector] = useState("")

  const [items, setItems] = useState<DraftItem[]>([{ lotId: null, requestedQuantity: 1 }])

  useEffect(() => {
    let mounted = true
    async function loadLots() {
      try {
        setLoadingLots(true)
        setError(null)
        const [availableRes, allLotsRes, requesterContextRes] = await Promise.all([
          apiFetch<any>("/pharmacy/lot/disponiveis/"),
          apiFetchAll<LotDisponivel>("/pharmacy/lot/", { pageSize: 200, maxPages: 25 }),
          apiFetch<RequesterContextResponse>("/pharmacy/requisicaomaterial/requester_context/"),
        ])
        if (!mounted) return
        setLots(extractResults<LotDisponivel>(availableRes))
        setStockLots(Array.isArray(allLotsRes) ? allLotsRes : [])
        setRequesterContext(requesterContextRes)
        setRequesterSector(requesterContextRes?.requester_sector || "")
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || "Falha ao carregar lotes disponíveis.")
      } finally {
        if (mounted) setLoadingLots(false)
      }
    }
    loadLots()
    return () => {
      mounted = false
    }
  }, [])

  const lotById = useMemo(() => new Map(lots.map((l) => [l.id, l])), [lots])
  const productStocks = useMemo<ProductStockRow[]>(() => {
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
  }, [lots, stockLots])
  const filteredProductStocks = useMemo(() => {
    const q = productQuery.trim().toLowerCase()
    if (!q) return productStocks
    return productStocks.filter((item) => item.productName.toLowerCase().includes(q))
  }, [productQuery, productStocks])

  function updateItem(idx: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function addItem() {
    setItems((prev) => [...prev, { lotId: null, requestedQuantity: 1 }])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function submit() {
    setError(null)

    if (!requesterSector) {
      setError("Não foi possível identificar o setor solicitante do utilizador atual.")
      return
    }

    const payloadItems = items
      .map((it) => ({
        lot: it.lotId,
        requested_quantity: it.requestedQuantity,
      }))
      .filter((x) => !!x.lot && Number(x.requested_quantity) > 0)

    if (!payloadItems.length) {
      setError("Adicione pelo menos 1 item (lote + quantidade).")
      return
    }

    try {
      setSubmitting(true)
      const res = await apiFetch<any>("/pharmacy/requisicaomaterial/", {
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
          title="Nova requisição de materiais"
          subtitle="Informe o material e a quantidade para solicitar ao setor da farmácia."
          actions={
            <Link
              href="/pharmacy/material-requests"
              className="text-sm text-[var(--gray-700)] underline"
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
              <div className="md:col-span-6">
                <label className="block text-sm font-medium text-[var(--gray-700)]">
                  Setor solicitante
                </label>
                {requesterContext?.is_admin ? (
                  <select
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                    value={requesterSector}
                    onChange={(event) => setRequesterSector(event.target.value)}
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

              <div className="md:col-span-6">
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
          title="Produtos em estoque na farmácia"
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
              Nenhum produto com saldo em estoque.
            </div>
          )}
        </Card>

        <Card
          title="Itens"
          subtitle="Selecione o produto/lote e informe a quantidade desejada."
        >
          {loadingLots ? (
            <div className="text-sm text-[var(--gray-600)]">Carregando lotes disponíveis…</div>
          ) : lots.length ? (
            <div className="space-y-3">
              {items.map((it, idx) => {
                const lot = it.lotId ? lotById.get(it.lotId) : null
                const available = lot ? Number(lot.saldo || 0) : null
                return (
                  <div key={idx} className="grid gap-3 md:grid-cols-12">
                    <div className="md:col-span-8">
                      <label className="block text-sm font-medium text-[var(--gray-700)]">
                        Lote / Produto
                      </label>
                      <select
                        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                        value={it.lotId ?? ""}
                        onChange={(e) =>
                          updateItem(idx, { lotId: e.target.value ? Number(e.target.value) : null })
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
              Nenhum lote disponível para requisição no momento.
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  )
}
