"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import Card from "@/components/ui/Card"
import useAuthGuard from "@/hooks/useAuthGuard"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type LotDisponivel = {
  id: number
  product_name?: string
  lot_number?: string
  expiration_date?: string
  saldo?: number
}

type DraftItem = {
  lotId: number | null
  requestedQuantity: number
}

function formatLotLabel(l: LotDisponivel) {
  const saldo = typeof l.saldo === "number" ? l.saldo : Number(l.saldo || 0)
  return `${l.product_name || "Produto"} — Lote ${l.lot_number || l.id} (disp.: ${saldo})`
}

export default function NovaRequisicaoMateriaisPage() {
  useAuthGuard()
  const router = useRouter()

  const requiredGroups = useMemo(
    () => [GROUPS.ADMIN, GROUPS.LABORATORIO, GROUPS.ENFERMAGEM, GROUPS.RECEPCAO],
    []
  )

  const [lots, setLots] = useState<LotDisponivel[]>([])
  const [loadingLots, setLoadingLots] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [items, setItems] = useState<DraftItem[]>([{ lotId: null, requestedQuantity: 1 }])

  useEffect(() => {
    let mounted = true
    async function loadLots() {
      try {
        setLoadingLots(true)
        setError(null)
        const res = await apiFetch<LotDisponivel[]>("/pharmacy/lot/disponiveis/")
        if (!mounted) return
        setLots(Array.isArray(res) ? res : [])
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
        body: JSON.stringify({ items_input: payloadItems }),
      })
      const id = res?.id ?? null
      if (id) {
        router.push(`/farmacia/requisicoes-materiais/${id}`)
      } else {
        router.push("/farmacia/requisicoes-materiais")
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
          subtitle="Solicite um material ao setor da farmácia."
          actions={
            <Link
              href="/farmacia/requisicoes-materiais"
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
          title="Itens"
          subtitle="Selecione um lote com estoque disponível e a quantidade desejada."
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
              Nenhum lote com estoque disponível.
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  )
}

