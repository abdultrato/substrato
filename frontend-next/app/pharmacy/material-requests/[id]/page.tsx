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

function sourceLabel(row?: Requisition | null) {
  if (!row) return "—"
  if (row.source_label) return row.source_label
  if (row.source === "WHS") return "Armazém central"
  if (row.source === "PHA") return "Estoque da farmácia"
  return row.source || "Origem interna"
}

function MetaCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/45 px-2 py-1">
      <div className="mb-0.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        <Icon size={11} />
        {label}
      </div>
      <div className="truncate text-xs font-semibold text-foreground">{value || "—"}</div>
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
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
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
      setArchiveDialogOpen(false)
      router.push("/pharmacy/material-requests")
    } catch (e: any) {
      setError(e?.message || "Falha ao arquivar.")
    } finally {
      setArchiving(false)
    }
  }

  const st = STATUS[data?.status ?? ""] ?? STATUS.PEN
  const items = data?.items ?? []
  const totalRequested = items.reduce((total, item) => total + Number(item.requested_quantity || 0), 0)
  const totalSupplied = items.reduce((total, item) => total + Number(item.supplied_quantity || 0), 0)
  const requisitionActive = data && data.status !== "FUL" && data.status !== "HLD"

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="w-full space-y-1 px-0.5">

        {/* ── Cabeçalho ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className={`absolute inset-y-0 left-0 w-1 ${st.dot}`} />
          <div className="space-y-1 px-2.5 py-1 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/12 text-amber-600 dark:text-amber-300">
                  <PackageCheck size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">
                    {loading ? "Requisição..." : data?.custom_id || `REQ-MAT-${id}`}
                  </h1>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    {data?.status && (
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${st.badge}`}>
                        {st.label}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {items.length} itens · {totalSupplied}/{totalRequested} aviados
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Link href="/pharmacy/material-requests"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
                  <ArrowLeft size={13} /> Voltar
                </Link>
                {isPharmacy && requisitionActive && (
                  <button
                    type="button"
                    onClick={() => setArchiveDialogOpen(true)}
                    disabled={archiving || loading}
                    className="inline-flex h-7 items-center gap-1 rounded-md bg-rose-600 px-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                  >
                    <Archive size={13} />
                    Arquivar requisição
                  </button>
                )}
              </div>
            </div>

            {data && (
              <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
                <MetaCard icon={Calendar} label="Criada em" value={formatDt(data.created_at)} />
                <MetaCard icon={Building2} label="Sector" value={data.sector_label || materialRequisitionSectorLabel(data.sector)} />
                <MetaCard icon={Box} label="Fonte" value={sourceLabel(data)} />
                <MetaCard icon={User} label="Solicitante" value={data.created_by_name || data.requested_by_department} />
              </div>
            )}
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {archiveDialogOpen && isPharmacy && requisitionActive && (
          <section className={`relative ${GLASS}`}>
            <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-rose-500" />
            <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-1 pl-4">
              <input
                type="text"
                value={holdReason}
                onChange={e => setHoldReason(e.target.value)}
                placeholder="Motivo para arquivar requisição (opcional)…"
                className="min-w-[220px] flex-1 rounded-md border border-border bg-background/60 px-2.5 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                disabled={archiving}
                autoFocus
              />
              <button
                type="button"
                onClick={archiveRequisition}
                disabled={archiving || loading}
                className="inline-flex h-7 items-center gap-1.5 rounded-md bg-rose-600 px-2.5 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {archiving ? <Loader2 size={13} className="animate-spin" /> : <Archive size={13} />}
                Arquivar requisição
              </button>
              <button
                type="button"
                onClick={() => setArchiveDialogOpen(false)}
                disabled={archiving}
                className="inline-flex h-7 items-center rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </section>
        )}

        {loading ? (
          <div className="flex h-24 items-center justify-center text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : data ? (
          <>
            {/* ── Itens ── */}
            <section className={`relative ${GLASS}`}>
              <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-indigo-500" />
              <div className="px-2.5 py-1.5 pl-4">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-500">
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
                        <div key={it.id} className="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 dark:bg-white/[0.03] flex flex-col gap-1.5">
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
                            <div className="border-t border-white/10 pt-1.5 flex flex-wrap items-center gap-1.5">
                              <input
                                type="number" min={1} max={remaining}
                                className="w-20 rounded-md border border-border bg-background/60 px-2 py-0.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
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
                                className="inline-flex h-7 items-center gap-1 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 px-2.5 text-xs font-bold text-white shadow shadow-emerald-500/30 ring-1 ring-emerald-400/20 transition hover:from-emerald-400 hover:to-teal-500 hover:shadow-emerald-400/40 active:scale-95 disabled:opacity-50 disabled:shadow-none"
                              >
                                {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                Aviar
                              </button>

                              <button
                                type="button"
                                onClick={() => setSkipDialog({ itemId: it.id, itemName: it.product_name || it.warehouse_item_name || "—", reason: "" })}
                                disabled={busy}
                                className="inline-flex h-7 items-center gap-1 rounded-md bg-gradient-to-br from-amber-500 to-orange-500 px-2.5 text-xs font-bold text-white shadow shadow-amber-500/30 ring-1 ring-amber-400/20 transition hover:from-amber-400 hover:to-orange-400 hover:shadow-amber-400/40 active:scale-95 disabled:opacity-50 disabled:shadow-none"
                              >
                                <Archive size={12} /> Arquivar
                              </button>
                            </div>
                          )}

                          {/* Already fully supplied — no actions needed */}
                          {canAct && remaining <= 0 && it.supplied_quantity > 0 && (
                            <div className="border-t border-white/10 pt-1.5">
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">✓ Item completamente aviado</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

              </div>
            </section>
          </>
        ) : (
          <section className={`relative overflow-hidden ${GLASS}`}>
            <div className="flex flex-col items-center justify-center py-8 text-center">
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
