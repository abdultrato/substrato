"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Beaker,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  ExternalLink,
  FileText,
  FlaskConical,
  Loader2,
  Send,
  Stethoscope,
  User,
  PlayCircle,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"

/* ── types ── */
type OrderItem = {
  id: number
  custom_id?: string
  code?: string
  test_id?: number
  exam?: number
  test_name?: string
  exam_name?: string
  test_code?: string
  exam_custom_id?: string
  exam_method?: string
  sector?: number
  sector_name?: string
  sector_code?: string
  price?: string
  status?: string
  sample_status?: string
  sample_status_display?: string
}

type Sector = { id: number; name: string; code: string }

type LabOrder = {
  id: number
  custom_id?: string
  patient?: number
  patient_name?: string
  requesting_physician?: number
  requesting_physician_name?: string
  requesting_company?: number
  requesting_company_name?: string
  origin?: string
  priority?: string
  clinical_indication?: string
  diagnosis?: string
  status?: string
  payment_status?: string
  type?: string
  validated_at?: string | null
  collected_at?: string | null
  requested_at?: string
  created_at?: string
  updated_at?: string
  sectors?: Sector[]
  requested_tests?: OrderItem[]
  items?: OrderItem[]
}

/* ── helpers ── */
function fmt(v?: string | null) {
  if (!v) return null
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  SOLICITADO:    { label: "Solicitado",    cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200" },
  EM_ANALISE:    { label: "Em análise",    cls: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200" },
  CONCLUIDO:     { label: "Concluído",     cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200" },
  CANCELADO:     { label: "Cancelado",     cls: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200" },
  AGUARDANDO:    { label: "Aguardando",    cls: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200" },
}

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  URGENTE: { label: "Urgente", cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
  ROTINA:  { label: "Rotina",  cls: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300" },
  NORMAL:  { label: "Normal",  cls: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300" },
}

const PAYMENT_META: Record<string, { label: string; cls: string }> = {
  PENDENTE: { label: "Pagamento pendente", cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/40" },
  PAGO:     { label: "Pago",               cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/40" },
  ISENTO:   { label: "Isento",             cls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-700/40" },
}

const ITEM_STATUS_META: Record<string, { dot: string }> = {
  SOLICITADO:  { dot: "bg-amber-400" },
  EM_ANALISE:  { dot: "bg-sky-400" },
  CONCLUIDO:   { dot: "bg-emerald-500" },
  CANCELADO:   { dot: "bg-rose-400" },
  recebida:    { dot: "bg-emerald-500" },
  coletada:    { dot: "bg-sky-400" },
  aguardando:  { dot: "bg-amber-400" },
  rejeitada:   { dot: "bg-rose-400" },
}

function Pill({ label, cls }: { label: string; cls: string }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-[var(--gray-400)]">{icon}</span>
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-400)]">{label}</div>
        <div className="text-[12px] text-[var(--text)]">{value}</div>
      </div>
    </div>
  )
}

const GLASS = "rounded-xl border border-[var(--border)] bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

export default function LabOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = routeParamToString((params as any)?.id)
  const [record, setRecord] = useState<LabOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [processingItemId, setProcessingItemId] = useState<number | "all" | null>(null)
  const [redirectingLegacy, setRedirectingLegacy] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    setRedirectingLegacy(false)
    try {
      const data = await apiFetch<LabOrder>(`/clinical/labrequest/${id}/`, { clientCache: false })
      setRecord(data)
    } catch (e: any) {
      try {
        const data = await apiFetch<LabOrder>(`/clinical_laboratory/order/${id}/`, { clientCache: false })
        setRecord(data)
        return
      } catch {
        setError(e?.message || "Erro ao carregar a ordem.")
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleAutorizar() {
    if (!record?.id) return
    setBusy(true); setError(null); setFeedback(null)
    try {
      await apiFetch(`/clinical_laboratory/order/${record.id}/autorizar/`, { method: "POST" })
      setFeedback("Ordem autorizada e enviada para processamento.")
      await load()
    } catch (e: any) { setError(e?.message || "Falha ao autorizar.") }
    finally { setBusy(false) }
  }

  async function handleCancelar() {
    if (!record?.id) return
    if (!confirm("Confirma o cancelamento desta ordem?")) return
    setBusy(true); setError(null); setFeedback(null)
    try {
      await apiFetch(`/clinical_laboratory/order/${record.id}/cancelar/`, { method: "POST" })
      setFeedback("Ordem cancelada.")
      await load()
    } catch (e: any) { setError(e?.message || "Falha ao cancelar.") }
    finally { setBusy(false) }
  }

  function isCultureItem(item: OrderItem) {
    return String(item.exam_method || "").toLowerCase().includes("cultura");
  }

  async function handleIniciarProcessamento(item?: OrderItem) {
    if (!record?.id) return
    setProcessingItemId(item?.id ?? "all")
    setBusy(true); setError(null); setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequest/${record.id}/iniciar-processamento/`, { method: "POST" })
      setFeedback(item ? `Processamento iniciado para ${item.exam_name || item.test_name || "o item"}.` : "Processamento iniciado para todos os itens.")
      if (item && isCultureItem(item)) {
        router.push("/clinical-laboratory/cultures")
        return
      }
      if (!item && (record.items || []).some(isCultureItem)) {
        router.push("/clinical-laboratory/cultures")
        return
      }
      router.push(`/clinical-laboratory/worklists/${record.id}`)
    } catch (e: any) {
      setError(e?.message || "Falha ao iniciar processamento.")
    } finally {
      setBusy(false)
      setProcessingItemId(null)
    }
  }

  const statusKey = String(record?.status || "").toUpperCase()
  const statusMeta = STATUS_META[statusKey] ?? { label: record?.status || "—", cls: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300" }
  const priorityMeta = PRIORITY_META[record?.priority || ""] ?? null
  const paymentMeta = PAYMENT_META[record?.payment_status || ""] ?? null
  const tests = record?.requested_tests?.length ? record.requested_tests : (record?.items ?? [])
  const sectors = record?.sectors ?? []
  const canAutorizar = ["SOLICITADO", "AGUARDANDO"].includes(record?.status || "")
  const canCancelar = !["CANCELADO", "CONCLUIDO", "cancelado"].includes(record?.status || "")
  const canStartProcessing = !!record && String(record.status || "").toLowerCase() === "pendente" && !!record.collected_at

  /* group tests by sector */
  const bySector = tests.reduce<Record<string, OrderItem[]>>((acc, t) => {
    const key = t.sector_name || "Sem sector"
    ;(acc[key] ??= []).push(t)
    return acc
  }, {})

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-3 px-1 py-1">

        {/* ── hero header ── */}
        <section className="relative overflow-hidden rounded-xl border border-sky-200/50 bg-gradient-to-br from-sky-50/80 via-white/60 to-cyan-50/60 shadow-sm backdrop-blur-sm dark:border-sky-800/30 dark:from-sky-950/30 dark:via-slate-900/40 dark:to-cyan-950/20">
          <span className="absolute left-0 top-0 h-full w-1 bg-sky-400" />
          <div className="px-4 py-4 pl-5">

            {/* breadcrumb */}
            <nav className="mb-2 flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
              <Link href="/clinical-laboratory" className="hover:text-foreground">Laboratório</Link>
              <ChevronRight size={10} />
              <Link href="/clinical-laboratory/orders" className="hover:text-foreground">Ordens</Link>
              <ChevronRight size={10} />
              <span className="font-semibold text-foreground">{record?.custom_id ?? id}</span>
            </nav>

            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <FlaskConical size={15} className="text-sky-500" />
                  <h1 className="font-display text-base font-bold text-foreground">
                    {record?.custom_id ?? `Ordem #${id}`}
                  </h1>
                  {loading && <Loader2 size={12} className="animate-spin text-[var(--gray-400)]" />}
                </div>
                {record?.patient_name && (
                  <p className="mt-0.5 text-[12px] text-[var(--gray-600)] dark:text-[var(--gray-400)]">
                    <User size={10} className="mr-1 inline" />{record.patient_name}
                  </p>
                )}
              </div>

              {/* pills */}
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {canStartProcessing && (
                  <button
                    type="button"
                    onClick={() => handleIniciarProcessamento()}
                    disabled={busy}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {processingItemId === "all" ? <Loader2 size={12} className="animate-spin" /> : <PlayCircle size={12} />}
                    Iniciar processamento
                  </button>
                )}
                <Pill label={statusMeta.label} cls={statusMeta.cls} />
                {priorityMeta && <Pill label={priorityMeta.label} cls={priorityMeta.cls} />}
                {record?.origin && <Pill label={record.origin} cls="bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300" />}
              </div>
            </div>

            {/* requested_at */}
            {record?.requested_at && (
              <p className="mt-2 flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
                <CalendarDays size={10} />
                Solicitada em {fmt(record.requested_at)}
                {record.updated_at && record.updated_at !== record.created_at && (
                  <> · actualizada {fmt(record.updated_at)}</>
                )}
              </p>
            )}
          </div>
        </section>

        {/* ── feedback / error ── */}
        {feedback && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-[12px] text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/15 dark:text-emerald-300">
            <CheckCircle2 size={13} /> {feedback}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-2.5 text-[12px] text-rose-800 dark:border-rose-800/40 dark:bg-rose-900/15 dark:text-rose-300">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        {redirectingLegacy ? (
          <div className={`${GLASS} flex items-center gap-2 px-4 py-6 text-[12px] text-[var(--gray-400)]`}>
            <Loader2 size={14} className="animate-spin" /> A redirecionar para a requisição clínica...
          </div>
        ) : loading && !record ? (
          <div className={`${GLASS} flex items-center gap-2 px-4 py-6 text-[12px] text-[var(--gray-400)]`}>
            <Loader2 size={14} className="animate-spin" /> A carregar ordem...
          </div>
        ) : !record ? (
          <div className={`${GLASS} px-4 py-6 text-center text-[12px] text-[var(--gray-400)]`}>
            Ordem não encontrada.
          </div>
        ) : (
          <>
            {/* ── two-col info grid ── */}
            <div className="grid gap-3 sm:grid-cols-2">

              {/* patient + requester card */}
              <section className={`${GLASS} space-y-3 px-4 py-3`}>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                  <User size={11} /> Paciente e solicitante
                </div>
                <InfoRow icon={<User size={11} />} label="Paciente" value={record.patient_name} />
                <InfoRow icon={<Stethoscope size={11} />} label="Médico solicitante" value={record.requesting_physician_name} />
                <InfoRow icon={<Building2 size={11} />} label="Entidade" value={record.requesting_company_name} />
              </section>

              {/* clinical info card */}
              <section className={`${GLASS} space-y-3 px-4 py-3`}>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                  <ClipboardList size={11} /> Informação clínica
                </div>
                <InfoRow icon={<FileText size={11} />} label="Indicação clínica" value={record.clinical_indication || null} />
                <InfoRow icon={<FileText size={11} />} label="Diagnóstico" value={record.diagnosis || null} />
                {!record.clinical_indication && !record.diagnosis && (
                  <p className="text-[11px] text-[var(--gray-400)]">Sem indicação clínica registada.</p>
                )}
                {/* payment status */}
                {paymentMeta && (
                  <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-semibold ${paymentMeta.cls}`}>
                    {paymentMeta.label}
                  </span>
                )}
              </section>
            </div>

            {/* ── sectors strip ── */}
            {sectors.length > 0 && (
              <section className={`${GLASS} px-4 py-3`}>
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                  <Beaker size={11} /> Sectores envolvidos
                </div>
                <div className="flex flex-wrap gap-2">
                  {sectors.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50/70 px-2.5 py-1 text-[11px] font-medium text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-200">
                      <span className="font-mono text-[10px] opacity-70">{s.code}</span> {s.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* ── tests by sector ── */}
            {tests.length > 0 ? (
              <section className={`${GLASS} px-4 py-3`}>
                <div className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                  <FlaskConical size={11} /> Análises solicitadas
                  <span className="ml-auto rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                    {tests.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {Object.entries(bySector).map(([sector, items]) => (
                    <div key={sector}>
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <span className="h-px flex-1 bg-[var(--border)]" />
                        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-400)]">{sector}</span>
                        <span className="h-px flex-1 bg-[var(--border)]" />
                      </div>
                      <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                        <table className="w-full table-fixed text-[11px]">
                          <colgroup>
                            <col className="w-[18%]" />
                            <col className="w-[34%]" />
                            <col className="w-[20%]" />
                            <col className="w-[14%]" />
                            <col className="w-[32%]" />
                          </colgroup>
                          <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--gray-50)]/60 dark:bg-white/[0.03]">
                              <th className="px-3 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Código</th>
                              <th className="px-3 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Análise</th>
                              <th className="px-3 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Estado</th>
                              <th className="px-3 py-1.5 text-right text-[9px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Preço</th>
                              <th className="px-3 py-1.5 text-right text-[9px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {items.map((item) => {
                              const itemStatus = item.status || item.sample_status || ""
                              const dot = ITEM_STATUS_META[itemStatus]?.dot ?? "bg-slate-300"
                              const itemName = item.test_name || item.exam_name || "—"
                              const itemCode = item.test_code || item.exam_custom_id || item.code || item.custom_id
                              return (
                                <tr key={item.id} className="hover:bg-sky-50/30 dark:hover:bg-sky-900/10 transition">
                                  <td className="truncate px-3 py-2 font-mono text-[10px] text-[var(--gray-500)]">
                                    {itemCode ?? "—"}
                                  </td>
                                  <td className="truncate px-3 py-2 font-medium text-[var(--text)]">{itemName}</td>
                                  <td className="px-3 py-2">
                                    <span className="flex items-center gap-1">
                                      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                                      <span className="truncate text-[var(--gray-500)]">{item.sample_status_display || item.status || item.sample_status || "—"}</span>
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right text-[var(--gray-500)]">
                                    {item.price ? `${Number(item.price).toFixed(2)} MT` : "—"}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleIniciarProcessamento(item)}
                                      disabled={!canStartProcessing || busy}
                                      className="inline-flex h-7 items-center gap-1 rounded-md border border-sky-200 bg-sky-50/80 px-2.5 text-[10px] font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300"
                                    >
                                      {processingItemId === item.id ? <Loader2 size={10} className="animate-spin" /> : isCultureItem(item) ? <FlaskConical size={10} /> : <PlayCircle size={10} />}
                                      Iniciar processamento
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          {/* total */}
                          {items.some(i => i.price) && (
                            <tfoot>
                              <tr className="border-t border-[var(--border)] bg-[var(--gray-50)]/60 dark:bg-white/[0.03]">
                                <td colSpan={4} className="px-3 py-1.5 text-right text-[9px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Subtotal</td>
                                <td className="px-3 py-1.5 text-right text-[11px] font-bold text-foreground">
                                  {items.reduce((sum, i) => sum + Number(i.price || 0), 0).toFixed(2)} MT
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <section className={`${GLASS} px-4 py-4 text-center text-[11px] text-[var(--gray-400)]`}>
                Nenhuma análise registada nesta ordem.
              </section>
            )}

            {/* ── actions footer ── */}
            <section className={`${GLASS} flex items-center justify-between gap-2 px-4 py-3`}>
              <Link href="/clinical-laboratory/orders"
                className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--border)] bg-card px-2.5 text-[11px] text-muted-foreground transition hover:bg-muted">
                <ArrowLeft size={11} /> Voltar
              </Link>

              <div className="flex items-center gap-2">
                {canStartProcessing && (
                  <button type="button" onClick={() => handleIniciarProcessamento()} disabled={busy}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                    {processingItemId === "all" ? <Loader2 size={11} className="animate-spin" /> : <PlayCircle size={11} />}
                    Iniciar todos
                  </button>
                )}
                {canCancelar && (
                  <button type="button" onClick={handleCancelar} disabled={busy}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50/70 px-3 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
                    Cancelar ordem
                  </button>
                )}
                {canAutorizar ? (
                  <button type="button" onClick={handleAutorizar} disabled={busy}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md bg-sky-600 px-3 text-[11px] font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60">
                    {busy ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                    {busy ? "A processar..." : "Autorizar ordem"}
                  </button>
                ) : record?.status === "CONCLUIDO" ? (
                  <Link href="/clinical-laboratory/worklists"
                    className="inline-flex h-7 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[11px] font-semibold text-white transition hover:bg-emerald-700">
                    Ver resultados <ArrowRight size={11} />
                  </Link>
                ) : (
                  <Link href="/clinical-laboratory/worklists"
                    className="inline-flex h-7 items-center gap-1.5 rounded-md bg-sky-600 px-3 text-[11px] font-semibold text-white transition hover:bg-sky-700">
                    Ver lista de trabalho <ArrowRight size={11} />
                  </Link>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  )
}
