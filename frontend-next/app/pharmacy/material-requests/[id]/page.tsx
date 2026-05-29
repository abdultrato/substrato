"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import Card from "@/components/ui/Card"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefresh, useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { isMaterialRequisitionPharmacyUser } from "@/lib/material-requisition-rbac"
import { GROUPS } from "@/lib/rbac"

type ReqItem = {
  id: number
  lot: number
  product_name?: string
  lot_number?: string
  lot_expiration_date?: string
  requested_quantity: number
  supplied_quantity: number
  available_quantity?: number
}

type Requisition = {
  id: number
  custom_id?: string
  created_at?: string
  status?: string
  sector?: string
  requested_by_department?: string
  created_by_name?: string
  hold_reason?: string | null
  items?: ReqItem[]
}

function formatDt(v?: string) {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleString()
}

function statusLabel(s?: string) {
  switch (s) {
    case "PEN":
      return "Pendente"
    case "PAR":
      return "Parcialmente aviada"
    case "FUL":
      return "Aviada"
    case "HLD":
      return "Arquivada (aguarda estoque)"
    default:
      return s || "—"
  }
}

function sectorLabel(s?: string) {
  switch (s) {
    case "LAB":
      return "Laboratório"
    case "ENF":
      return "Enfermagem"
    case "REC":
      return "Recepção"
    case "MED":
      return "Medicina"
    case "MOC":
      return "Medicina Ocupacional"
    case "OUT":
      return "Outros setores"
    default:
      return s || "—"
  }
}

export default function MaterialRequisitionDetailPage() {
  useAuthGuard()
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const { hasUnsavedInput } = useSafeDataRefresh()

  const requiredGroups = useMemo(
    () => [
      GROUPS.ADMIN,
      GROUPS.FARMACIA,
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
  const isPharmacy = isMaterialRequisitionPharmacyUser(user)

  const id = String((params as any)?.id || "")
  const [data, setData] = useState<Requisition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [holdReason, setHoldReason] = useState("")
  const [toSupply, setToSupply] = useState<Record<number, number>>({})

  async function reload() {
    setError(null)
    try {
      setLoading(true)
      const res = await apiFetch<Requisition>(`/pharmacy/material_requisition/${id}/`, {
        clientCache: safeRefreshToken === 0,
      })
      setData(res)
      const defaults: Record<number, number> = {}
      for (const it of res?.items || []) {
        const remaining = Math.max(0, Number(it.requested_quantity) - Number(it.supplied_quantity || 0))
        if (remaining > 0) defaults[it.id] = remaining
      }
      setToSupply(defaults)
    } catch (e: any) {
      setError(e?.message || "Falha ao carregar requisição.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (safeRefreshToken > 0 && hasUnsavedInput) return
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, safeRefreshToken, hasUnsavedInput])

  async function fulfill() {
    if (!data) return
    setError(null)
    const itemsPayload = (data.items || [])
      .map((it) => ({
        id: it.id,
        quantity: Number(toSupply[it.id] || 0),
      }))
      .filter((x) => x.quantity > 0)

    if (!itemsPayload.length) {
      setError("Informe pelo menos uma quantidade a aviar.")
      return
    }

    try {
      setSubmitting(true)
      await apiFetch(`/pharmacy/material_requisition/${id}/fulfill/`, {
        method: "POST",
        body: JSON.stringify({ items: itemsPayload }),
      })
      await reload()
    } catch (e: any) {
      setError(e?.message || "Falha ao aviar.")
    } finally {
      setSubmitting(false)
    }
  }

  async function archive() {
    setError(null)
    try {
      setSubmitting(true)
      await apiFetch(`/pharmacy/material_requisition/${id}/archive/`, {
        method: "POST",
        body: JSON.stringify({ reason: holdReason || null }),
      })
      router.push("/pharmacy/material-requests")
    } catch (e: any) {
      setError(e?.message || "Falha ao arquivar.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="space-y-6">
        <PageHeader
          title={`Requisição ${data?.custom_id || id}`}
          subtitle="Requisição interna de materiais à farmácia."
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

        <Card title="Resumo" subtitle="Data, solicitante e estado.">
          {loading ? (
            <div className="text-sm text-[var(--gray-600)]">Carregando…</div>
          ) : data ? (
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <div className="text-[var(--gray-500)]">Data/hora</div>
                <div className="font-semibold text-[var(--text)]">{formatDt(data.created_at)}</div>
              </div>
              <div>
                <div className="text-[var(--gray-500)]">Estado</div>
                <div className="font-semibold text-[var(--text)]">{statusLabel(data.status)}</div>
              </div>
              <div>
                <div className="text-[var(--gray-500)]">Setor solicitante</div>
                <div className="font-semibold text-[var(--text)]">{sectorLabel(data.sector)}</div>
              </div>
              <div>
                <div className="text-[var(--gray-500)]">Solicitante</div>
                <div className="font-semibold text-[var(--text)]">{data.created_by_name || "—"}</div>
              </div>
              <div>
                <div className="text-[var(--gray-500)]">Departamento</div>
                <div className="font-semibold text-[var(--text)]">{data.requested_by_department || "—"}</div>
              </div>
              {data.status === "HLD" ? (
                <div className="md:col-span-2">
                  <div className="text-[var(--gray-500)]">Motivo do arquivamento</div>
                  <div className="font-semibold text-[var(--text)]">{data.hold_reason || "—"}</div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-[var(--gray-600)]">Não encontrado.</div>
          )}
        </Card>

        <Card title="Itens" subtitle="Solicitado vs disponível (lote) vs aviado.">
          {!data?.items?.length ? (
            <div className="text-sm text-[var(--gray-600)]">Sem itens.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-[var(--gray-600)]">
                  <tr>
                    <th className="py-2 pr-3">Produto</th>
                    <th className="py-2 pr-3">Lote</th>
                    <th className="py-2 pr-3">Solicitado</th>
                    <th className="py-2 pr-3">Disponível</th>
                    <th className="py-2 pr-3">Aviado</th>
                    <th className="py-2 pr-3">Situação</th>
                    {isPharmacy ? <th className="py-2 pr-3">Aviar agora</th> : null}
                  </tr>
                </thead>
                <tbody className="text-[var(--text)]">
                  {data.items.map((it) => {
                    const available = typeof it.available_quantity === "number" ? it.available_quantity : null
                    const remaining = Math.max(0, Number(it.requested_quantity) - Number(it.supplied_quantity || 0))
                    return (
                      <tr key={it.id} className="border-t border-[var(--border)]">
                        <td className="py-2 pr-3">{it.product_name || "—"}</td>
                        <td className="py-2 pr-3">
                          {it.lot_number || it.lot}
                          {it.lot_expiration_date ? (
                            <div className="text-xs text-[var(--gray-500)]">Val: {String(it.lot_expiration_date)}</div>
                          ) : null}
                        </td>
                        <td className="py-2 pr-3">{it.requested_quantity}</td>
                        <td className="py-2 pr-3">{available !== null ? available : "—"}</td>
                        <td className="py-2 pr-3">{it.supplied_quantity || 0}</td>
                        <td className="py-2 pr-3">
                          {remaining <= 0 ? "Aviado" : it.supplied_quantity > 0 ? "Parcial" : "Pendente"}
                        </td>
                        {isPharmacy ? (
                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              min={0}
                              max={remaining}
                              className="w-28 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-sm"
                              value={toSupply[it.id] ?? 0}
                              onChange={(e) =>
                                setToSupply((prev) => ({
                                  ...prev,
                                  [it.id]: Math.max(0, Number(e.target.value || 0)),
                                }))
                              }
                              disabled={submitting || remaining <= 0}
                              title={remaining <= 0 ? "Item já atendido" : "Quantidade a aviar"}
                            />
                            <div className="mt-1 text-xs text-[var(--gray-500)]">Restante: {remaining}</div>
                          </td>
                        ) : null}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {isPharmacy && data?.status !== "FUL" ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={fulfill}
                disabled={submitting || loading}
                className="rounded-lg bg-[var(--primary-600)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-700)] disabled:opacity-60"
              >
                {submitting ? "Aviando…" : "Aviar"}
              </button>

              <div className="flex flex-1 flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder="Motivo (opcional) para arquivar…"
                  className="min-w-[260px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={archive}
                  disabled={submitting || loading}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60"
                >
                  Arquivar
                </button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </AppLayout>
  )
}
