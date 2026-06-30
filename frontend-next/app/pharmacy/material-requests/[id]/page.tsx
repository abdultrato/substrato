"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Archive, Box, Building2, Calendar, CheckCircle2, ClipboardList, Loader2, PackageCheck, User, X } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefresh, useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import {
  MATERIAL_REQUISITION_PAGE_GROUPS,
  isMaterialRequisitionPharmacyUser,
  materialRequisitionSectorLabel,
} from "@/lib/material-requisition-rbac"

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

type ReqItem = {
  id: number
  lot: number | null
  warehouse_item?: number | null
  warehouse_item_sku?: string | null
  warehouse_item_name?: string | null
  product_name?: string
  lot_number?: string | null
  lot_expiration_date?: string | null
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
  sector_label?: string
  source?: string
  source_label?: string
  requested_by_department?: string
  created_by_name?: string
  hold_reason?: string | null
  items?: ReqItem[]
}

function formatDt(v?: string) {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleString("pt-PT")
}

const STATUS: Record<string, { label: string; badge: string; dot: string }> = {
  PEN: { label: "Pendente", badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300", dot: "bg-amber-400" },
  PAR: { label: "Parcialmente aviada", badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300", dot: "bg-blue-400" },
  FUL: { label: "Aviada", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300", dot: "bg-emerald-400" },
  HLD: { label: "Arquivada", badge: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/50 dark:bg-slate-900/30 dark:text-slate-400", dot: "bg-slate-400" },
}

const ITEM_STATUS: Record<string, { label: string; cls: string }> = {
  done: { label: "Aviado", cls: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300" },
  partial: { label: "Parcial", cls: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300" },
  pending: { label: "Pendente", cls: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300" },
}

function MetaRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={12} className="mt-0.5 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value || "—"}</p>
      </div>
    </div>
  )
}

export default function MaterialRequisitionDetailPage() {
  useAuthGuard()
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const { hasUnsavedInput } = useSafeDataRefresh()

  const requiredGroups = useMemo(() => [...MATERIAL_REQUISITION_PAGE_GROUPS], [])
  const isPharmacy = isMaterialRequisitionPharmacyUser(user)

  const id = String((params as any)?.id || "")
  const [data, setData] = useState<Requisition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // item-level: quantity to supply per item id
  const [toSupply, setToSupply] = useState<Record<number, number>>({})
  // item-level: which item is currently being actioned
  const [itemBusy, setItemBusy] = useState<Record<number, boolean>>({})
  // per-item skip dialog: item id → reason string (null = not open)
  const [skipDialog, setSkipDialog] = useState<{ itemId: number; itemName: string; reason: string } | null>(null)
  // requisition-level archive
  const [holdReason, setHoldReason] = useState("")
  const [archiving, setArchiving] = useState(false)

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

  async function fulfillItem(itemId: number) {
    const qty = toSupply[itemId] ?? 0
    if (qty <= 0) { setError("Informe uma quantidade maior que zero."); return }
    setError(null)
    setItemBusy(prev => ({ ...prev, [itemId]: true }))
    try {
      const res = await apiFetch<Requisition>(`/pharmacy/material_requisition/${id}/fulfill/`, {
        method: "POST",
        body: JSON.stringify({ items: [{ id: itemId, quantity: qty }] }),
      })
      // Update local state directly from response so we don't need a full reload
      setData(res)
      const defaults: Record<number, number> = {}
      for (const it of res?.items || []) {
        const remaining = Math.max(0, Number(it.requested_quantity) - Number(it.supplied_quantity || 0))
        if (remaining > 0) defaults[it.id] = remaining
      }
      setToSupply(defaults)
      if (res.status === "FUL") router.push("/pharmacy/material-requests")
    } catch (e: any) {
      setError(e?.message || "Falha ao aviar item.")
    } finally {
      setItemBusy(prev => ({ ...prev, [itemId]: false }))
    }
  }

  async function skipItem(itemId: number, reason: string) {
    setError(null)
    setItemBusy(prev => ({ ...prev, [itemId]: true }))
    setSkipDialog(null)
    try {
      const res = await apiFetch<Requisition>(`/pharmacy/material_requisition/${id}/skip-item/`, {
        method: "POST",
        body: JSON.stringify({ item_id: itemId, reason: reason || null }),
      })
      setData(res)
      // If all items removed → redirect (status becomes HLD)
      if (res.status === "HLD") router.push("/pharmacy/material-requests")
    } catch (e: any) {
      setError(e?.message || "Falha ao arquivar item.")
    } finally {
      setItemBusy(prev => ({ ...prev, [itemId]: false }))
    }
  }

  async function archiveRequisition() {
    setError(null)
    setArchiving(true)
    try {
      await apiFetch(`/pharmacy/material_requisition/${id}/archive/`, {
        method: "POST",
        body: JSON.stringify({ reason: holdReason || null }),
      })
      router.push("/pharmacy/material-requests")
    } catch (e: any) {
      setError(e?.message || "Falha ao arquivar.")
    } finally {
      setArchiving(false)
    }
  }

  const st = STATUS[data?.status ?? ""] ?? STATUS.PEN
  const requisitionActive = data && data.status !== "FUL" && data.status !== "HLD"

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="w-full space-y-3 px-1">

        {/* ── Cabeçalho ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className={`absolute left-0 top-0 h-full w-1 ${st.dot}`} />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20">
                <PackageCheck size={17} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">
                  {loading ? "Requisição…" : (data?.custom_id || `REQ-${id}`)}
                </h1>
                {data?.status && (
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold ${st.badge}`}>
                    {st.label}
                  </span>
                )}
              </div>
            </div>
            <Link href="/pharmacy/material-requests"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-4 text-sm font-medium text-foreground backdrop-blur-sm transition hover:bg-white/20">
              <ArrowLeft size={14} /> Voltar
            </Link>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : data ? (
          <>
            {/* ── Resumo ── */}
            <section className={`relative ${GLASS}`}>
              <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-violet-500" />
              <div className="px-4 py-3 pl-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/10 text-violet-500">
                    <ClipboardList size={12} />
                  </span>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Resumo</p>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  <MetaRow icon={Calendar} label="Data / hora" value={formatDt(data.created_at)} />
                  <MetaRow icon={Building2} label="Setor solicitante" value={data.sector_label || materialRequisitionSectorLabel(data.sector)} />
                  <MetaRow icon={Box} label="Fonte" value={data.source_label || (data.source === "WHS" ? "Armazém central" : "Estoque da farmácia")} />
                  <MetaRow icon={User} label="Solicitante" value={data.created_by_name} />
                  <MetaRow icon={Building2} label="Departamento / paciente" value={data.requested_by_department} />
                  {data.status === "HLD" && (
                    <MetaRow icon={Archive} label="Motivo arquivamento" value={data.hold_reason} />
                  )}
                </div>
              </div>
            </section>

            {/* ── Itens ── */}
            <section className={`relative ${GLASS}`}>
              <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-indigo-500" />
              <div className="px-4 py-3 pl-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-500">
                    <Box size={12} />
                  </span>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Itens — {data.items?.length ?? 0}
                  </p>
                </div>

                {!data.items?.length ? (
                  <p className="text-sm text-muted-foreground">Sem itens.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {data.items.map((it) => {
                      const available = typeof it.available_quantity === "number" ? it.available_quantity : null
                      const remaining = Math.max(0, Number(it.requested_quantity) - Number(it.supplied_quantity || 0))
                      const itemSt = remaining <= 0 ? ITEM_STATUS.done : it.supplied_quantity > 0 ? ITEM_STATUS.partial : ITEM_STATUS.pending
                      const busy = itemBusy[it.id] ?? false
                      const canAct = isPharmacy && !!requisitionActive

                      return (
                        <div key={it.id} className="rounded-lg border border-white/10 bg-white/10 px-3 py-3 dark:bg-white/[0.03] flex flex-col gap-2">
                          {/* ── Nome + badge ── */}
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {it.product_name || it.warehouse_item_name || "—"}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {it.lot ? (it.lot_number || `Lote #${it.lot}`) : (it.warehouse_item_sku || "Sem lote")}
                                {it.lot_expiration_date ? ` · Val: ${it.lot_expiration_date}` : ""}
                              </p>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${itemSt.cls}`}>
                              {itemSt.label}
                            </span>
                          </div>

                          {/* ── Quantidades ── */}
                          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                            <span>Solicitado: <strong className="text-foreground">{it.requested_quantity}</strong></span>
                            <span>Disponível: <strong className="text-foreground">{available !== null ? available : "—"}</strong></span>
                            <span>Aviado: <strong className="text-foreground">{it.supplied_quantity || 0}</strong></span>
                          </div>

                          {/* ── Ações por item (só farmácia + requisição activa) ── */}
                          {canAct && remaining > 0 && (
                            <div className="border-t border-white/10 pt-2 flex flex-wrap items-center gap-2">
                              <input
                                type="number" min={1} max={remaining}
                                className="w-20 rounded-md border border-border bg-background/60 px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                value={toSupply[it.id] ?? remaining}
                                onChange={e => setToSupply(prev => ({
                                  ...prev,
                                  [it.id]: Math.max(1, Math.min(remaining, Number(e.target.value || 1))),
                                }))}
                                disabled={busy}
                              />
                              <span className="text-[10px] text-muted-foreground">/ {remaining}</span>

                              <button
                                type="button"
                                onClick={() => fulfillItem(it.id)}
                                disabled={busy}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 px-3 text-xs font-bold text-white shadow shadow-emerald-500/30 ring-1 ring-emerald-400/20 transition hover:from-emerald-400 hover:to-teal-500 hover:shadow-emerald-400/40 active:scale-95 disabled:opacity-50 disabled:shadow-none"
                              >
                                {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                Aviar
                              </button>

                              <button
                                type="button"
                                onClick={() => setSkipDialog({ itemId: it.id, itemName: it.product_name || it.warehouse_item_name || "—", reason: "" })}
                                disabled={busy}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 px-3 text-xs font-bold text-white shadow shadow-amber-500/30 ring-1 ring-amber-400/20 transition hover:from-amber-400 hover:to-orange-400 hover:shadow-amber-400/40 active:scale-95 disabled:opacity-50 disabled:shadow-none"
                              >
                                <Archive size={12} /> Arquivar
                              </button>
                            </div>
                          )}

                          {/* Already fully supplied — no actions needed */}
                          {canAct && remaining <= 0 && it.supplied_quantity > 0 && (
                            <div className="border-t border-white/10 pt-2">
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">✓ Item completamente aviado</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ── Arquivar REQUISIÇÃO inteira (só se activa) ── */}
                {isPharmacy && requisitionActive && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
                    <input type="text" value={holdReason} onChange={e => setHoldReason(e.target.value)}
                      placeholder="Motivo para arquivar requisição (opcional)…"
                      className="min-w-[220px] flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                      disabled={archiving} />
                    <button type="button" onClick={archiveRequisition} disabled={archiving || loading}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-br from-rose-500 to-red-600 px-4 text-sm font-bold text-white shadow shadow-rose-500/30 ring-1 ring-rose-400/20 transition hover:from-rose-400 hover:to-red-500 hover:shadow-rose-400/40 active:scale-95 disabled:opacity-50 disabled:shadow-none">
                      {archiving ? <Loader2 size={13} className="animate-spin" /> : <Archive size={14} />}
                      Arquivar requisição
                    </button>
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <section className={`relative overflow-hidden ${GLASS}`}>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-foreground">Requisição não encontrada.</p>
            </div>
          </section>
        )}

      </div>

      {/* ── Skip item dialog ── */}
      {skipDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm ${GLASS} p-5 space-y-4`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Arquivar item</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[260px]">{skipDialog.itemName}</p>
              </div>
              <button onClick={() => setSkipDialog(null)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              O item será removido desta requisição. Se todos os itens forem removidos, a requisição será arquivada automaticamente.
            </p>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Motivo (opcional)
              </label>
              <input
                type="text"
                autoFocus
                value={skipDialog.reason}
                onChange={e => setSkipDialog(prev => prev ? { ...prev, reason: e.target.value } : null)}
                placeholder="Ex: sem stock, substituído…"
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                onKeyDown={e => { if (e.key === "Enter") skipItem(skipDialog.itemId, skipDialog.reason) }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSkipDialog(null)}
                className="inline-flex h-9 items-center rounded-md border border-white/20 bg-white/10 px-4 text-sm font-medium text-foreground backdrop-blur-sm transition hover:bg-white/20"
              >
                Cancelar
              </button>
              <button
                onClick={() => skipItem(skipDialog.itemId, skipDialog.reason)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 px-4 text-sm font-bold text-white shadow shadow-amber-500/30 ring-1 ring-amber-400/20 transition hover:from-amber-400 hover:to-orange-400 active:scale-95"
              >
                <Archive size={14} /> Confirmar arquivo
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
