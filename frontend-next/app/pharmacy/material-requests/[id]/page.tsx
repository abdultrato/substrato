"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Archive, Box, Building2, Calendar, CheckCircle2, ClipboardList, Loader2, PackageCheck, User } from "lucide-react"

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
      .map((it) => ({ id: it.id, quantity: Number(toSupply[it.id] || 0) }))
      .filter((x) => x.quantity > 0)
    if (!itemsPayload.length) { setError("Informe pelo menos uma quantidade a aviar."); return }
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

  const st = STATUS[data?.status ?? ""] ?? STATUS.PEN

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
                  <MetaRow icon={Building2} label="Departamento" value={data.requested_by_department} />
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
                  <div className="space-y-2">
                    {data.items.map((it) => {
                      const available = typeof it.available_quantity === "number" ? it.available_quantity : null
                      const remaining = Math.max(0, Number(it.requested_quantity) - Number(it.supplied_quantity || 0))
                      const itemSt = remaining <= 0 ? ITEM_STATUS.done : it.supplied_quantity > 0 ? ITEM_STATUS.partial : ITEM_STATUS.pending
                      return (
                        <div key={it.id} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2.5 dark:bg-white/[0.03]">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {it.product_name || it.warehouse_item_name || "—"}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {it.lot ? (it.lot_number || `Lote #${it.lot}`) : (it.warehouse_item_sku || "Sem lote")}
                                {it.lot_expiration_date ? ` · Val: ${it.lot_expiration_date}` : ""}
                              </p>
                            </div>
                            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${itemSt.cls}`}>
                              {itemSt.label}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                            <span>Solicitado: <strong className="text-foreground">{it.requested_quantity}</strong></span>
                            <span>Disponível: <strong className="text-foreground">{available !== null ? available : "—"}</strong></span>
                            <span>Aviado: <strong className="text-foreground">{it.supplied_quantity || 0}</strong></span>
                            {isPharmacy && remaining > 0 && (
                              <div className="flex items-center gap-1.5 ml-auto">
                                <label className="text-[10px] uppercase tracking-wide">Aviar agora:</label>
                                <input type="number" min={0} max={remaining}
                                  className="w-20 rounded-md border border-border bg-background/60 px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                  value={toSupply[it.id] ?? 0}
                                  onChange={e => setToSupply(prev => ({ ...prev, [it.id]: Math.max(0, Number(e.target.value || 0)) }))}
                                  disabled={submitting}
                                />
                                <span className="text-[10px]">/ {remaining}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ── Ações farmácia ── */}
                {isPharmacy && data.status !== "FUL" && (
                  <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-white/10 pt-4">
                    <button type="button" onClick={fulfill} disabled={submitting || loading}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-gradient-to-br from-emerald-600 to-teal-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50">
                      {submitting ? <><Loader2 size={13} className="animate-spin" /> A aviar…</> : <><CheckCircle2 size={14} /> Aviar</>}
                    </button>
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <input type="text" value={holdReason} onChange={e => setHoldReason(e.target.value)}
                        placeholder="Motivo para arquivar (opcional)…"
                        className="min-w-[220px] flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                        disabled={submitting} />
                      <button type="button" onClick={archive} disabled={submitting || loading}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-4 text-sm font-medium text-foreground backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50">
                        <Archive size={14} /> Arquivar
                      </button>
                    </div>
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
    </AppLayout>
  )
}
