"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FileText,
  FlaskConical,
  Loader2,
  Send,
  Stethoscope,
  User,
  Droplets,
  ShieldAlert,
  Clock,
} from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"

/* ── types ── */
type SampleOption = { name: string }
type RequestItem = {
  id: number
  custom_id?: string | null
  position?: number
  exam?: number | null
  exam_name?: string
  exam_custom_id?: string
  exam_method?: string
  medical_exam?: number | null
  medical_exam_name?: string
  sample_options?: SampleOption[]
  sample_status?: string
  sample_status_display?: string
  rejection_reason_names?: string[]
  rejection_note?: string
  sample_received_at?: string | null
}

type LabRequest = {
  id: number
  custom_id?: string
  type?: "LAB" | "MED" | string
  status?: string
  clinical_status?: string
  clinical_status_display?: string
  patient?: number
  patient_name?: string
  patient_code?: string
  patient_age?: string
  patient_gender?: string
  requesting_physician?: number | null
  requesting_physician_name?: string
  collected_at?: string | null
  validated_at?: string | null
  created_at?: string
  updated_at?: string
  has_critical_result?: boolean
  requires_fasting?: boolean
  fasting_hours?: number
  is_occupational?: boolean
  items?: RequestItem[]
  collection_guidance?: any[]
}

/* ── helpers ── */
function fmt(v?: string | null) {
  if (!v) return null
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

const STATUS_META: Record<string, { label: string; cls: string; accent: string }> = {
  pendente:       { label: "Pendente",       cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",   accent: "bg-amber-400" },
  em_analise:     { label: "Em análise",     cls: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200",           accent: "bg-sky-400" },
  concluido:      { label: "Concluído",      cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200", accent: "bg-emerald-400" },
  cancelado:      { label: "Cancelado",      cls: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200",       accent: "bg-rose-400" },
  validado:       { label: "Validado",       cls: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200", accent: "bg-violet-400" },
  transferido:    { label: "Transferido",    cls: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200", accent: "bg-indigo-400" },
}

const SAMPLE_STATUS_META: Record<string, { dot: string; cls: string }> = {
  aguardando:     { dot: "bg-amber-400",   cls: "text-amber-700 dark:text-amber-300" },
  recebida:       { dot: "bg-emerald-500", cls: "text-emerald-700 dark:text-emerald-300" },
  rejeitada:      { dot: "bg-rose-500",    cls: "text-rose-700 dark:text-rose-300" },
  coletada:       { dot: "bg-sky-400",     cls: "text-sky-700 dark:text-sky-300" },
}

const GLASS = "rounded-xl border border-[var(--border)] bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

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

export default function LabRequestDetailPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const [record, setRecord] = useState<LabRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true); setError(null)
    try {
      const data = await apiFetch<LabRequest>(`/clinical/labrequest/${id}/`, { clientCache: false })
      setRecord(data)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar o pedido.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleTransferir() {
    if (!record?.id) return
    setBusy(true); setError(null); setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequest/${record.id}/transferir-analise/`, { method: "POST", body: JSON.stringify({}) })
      setFeedback("Pedido transferido para análise externa.")
      await load()
    } catch (e: any) { setError(e?.message || "Falha ao transferir.") }
    finally { setBusy(false) }
  }

  async function handleValidar() {
    if (!record?.id) return
    setBusy(true); setError(null); setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequest/${record.id}/validar/`, { method: "POST", body: JSON.stringify({}) })
      setFeedback("Resultados validados com sucesso.")
      await load()
    } catch (e: any) { setError(e?.message || "Falha ao validar.") }
    finally { setBusy(false) }
  }

  const statusKey = (record?.status || "").toLowerCase()
  const statusMeta = STATUS_META[statusKey] ?? { label: record?.status || "—", cls: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300", accent: "bg-slate-400" }
  const items = record?.items ?? []
  const isPending = statusKey === "pendente"
  const isValidatable = ["em_analise", "concluido"].includes(statusKey)
  const hasValidated = statusKey === "validado"

  const samples = Array.from(new Set(
    items.flatMap(i => (i.sample_options ?? []).map(s => s.name)).filter(Boolean)
  ))

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-3 px-1 py-1">

        {/* ── hero ── */}
        <section className="relative overflow-hidden rounded-xl border border-sky-200/50 bg-gradient-to-br from-sky-50/80 via-white/60 to-cyan-50/60 shadow-sm backdrop-blur-sm dark:border-sky-800/30 dark:from-sky-950/30 dark:via-slate-900/40 dark:to-cyan-950/20">
          <span className={`absolute left-0 top-0 h-full w-1 ${statusMeta.accent}`} />
          <div className="px-4 py-4 pl-5">

            <nav className="mb-2 flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
              <Link href="/clinical" className="hover:text-foreground">Clínico</Link>
              <ChevronRight size={10} />
              <Link href="/clinical/lab-requests" className="hover:text-foreground">Pedidos lab.</Link>
              <ChevronRight size={10} />
              <span className="font-semibold text-foreground">{record?.custom_id ?? id}</span>
            </nav>

            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <FlaskConical size={15} className="text-sky-500" />
                  <h1 className="font-display text-base font-bold text-foreground">
                    {record?.custom_id ?? `Pedido #${id}`}
                  </h1>
                  {loading && <Loader2 size={12} className="animate-spin text-[var(--gray-400)]" />}
                </div>
                {record?.patient_name && (
                  <p className="mt-0.5 text-[12px] text-[var(--gray-600)] dark:text-[var(--gray-400)]">
                    <User size={10} className="mr-1 inline" />
                    {record.patient_name}
                    {(record.patient_age || record.patient_gender) && (
                      <span className="ml-1 opacity-70">
                        · {[record.patient_age, record.patient_gender].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Pill label={statusMeta.label} cls={statusMeta.cls} />
                {record?.type === "LAB" && (
                  <Pill label="Laboratorial" cls="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200" />
                )}
                {record?.type === "MED" && (
                  <Pill label="Médico" cls="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200" />
                )}
                {record?.has_critical_result && (
                  <Pill label="Resultado crítico" cls="bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200" />
                )}
                {record?.clinical_status_display && (
                  <Pill label={record.clinical_status_display} cls="bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300" />
                )}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-[var(--gray-500)]">
              {record?.created_at && (
                <span className="flex items-center gap-1">
                  <CalendarDays size={10} /> Criado {fmt(record.created_at)}
                </span>
              )}
              {record?.collected_at && (
                <span className="flex items-center gap-1">
                  <Droplets size={10} /> Colhido {fmt(record.collected_at)}
                </span>
              )}
              {record?.validated_at && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={10} /> Validado {fmt(record.validated_at)}
                </span>
              )}
              {record?.requires_fasting && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Clock size={10} /> Jejum {record.fasting_hours ? `${record.fasting_hours}h` : "necessário"}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* feedback / error */}
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

        {loading && !record ? (
          <div className={`${GLASS} flex items-center gap-2 px-4 py-6 text-[12px] text-[var(--gray-400)]`}>
            <Loader2 size={14} className="animate-spin" /> A carregar pedido...
          </div>
        ) : !record ? (
          <div className={`${GLASS} px-4 py-6 text-center text-[12px] text-[var(--gray-400)]`}>
            Pedido não encontrado.
          </div>
        ) : (
          <>
            {/* ── info grid ── */}
            <div className="grid gap-3 sm:grid-cols-2">
              <section className={`${GLASS} space-y-3 px-4 py-3`}>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                  <User size={11} /> Paciente e médico
                </div>
                <InfoRow icon={<User size={11} />} label="Paciente" value={record.patient_name} />
                <InfoRow icon={<FileText size={11} />} label="Código do paciente" value={record.patient_code} />
                <InfoRow icon={<Stethoscope size={11} />} label="Médico solicitante" value={record.requesting_physician_name} />
              </section>

              <section className={`${GLASS} space-y-3 px-4 py-3`}>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                  <ClipboardList size={11} /> Amostras e colheita
                </div>
                {samples.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {samples.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50/70 px-2.5 py-1 text-[10px] font-medium text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-200">
                        <Droplets size={9} /> {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--gray-400)]">Sem amostras registadas.</p>
                )}
                {record.requires_fasting && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/60 px-2.5 py-1.5 text-[11px] text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
                    <Clock size={11} />
                    Requer jejum{record.fasting_hours ? ` de ${record.fasting_hours}h` : ""}
                  </div>
                )}
                {record.has_critical_result && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/60 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
                    <ShieldAlert size={11} /> Resultado crítico presente
                  </div>
                )}
              </section>
            </div>

            {/* ── exams table ── */}
            {items.length > 0 ? (
              <section className={`${GLASS} px-4 py-3`}>
                <div className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                  <FlaskConical size={11} /> Análises solicitadas
                  <span className="ml-auto rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                    {items.length}
                  </span>
                </div>
                <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                  <table className="w-full table-fixed text-[11px]">
                    <colgroup>
                      <col className="w-[20%]" />
                      <col className="w-[35%]" />
                      <col className="w-[22%]" />
                      <col className="w-[23%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--gray-50)]/60 dark:bg-white/[0.03]">
                        <th className="px-3 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Código</th>
                        <th className="px-3 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Análise</th>
                        <th className="px-3 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Método</th>
                        <th className="px-3 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Amostra / Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {items.map((item) => {
                        const sampleKey = (item.sample_status || "").toLowerCase()
                        const sampleMeta = SAMPLE_STATUS_META[sampleKey] ?? { dot: "bg-slate-300", cls: "text-[var(--gray-500)]" }
                        const sampleNames = (item.sample_options ?? []).map(s => s.name).filter(Boolean).join(", ")
                        const name = item.exam_name || item.medical_exam_name || "—"
                        return (
                          <tr key={item.id} className="transition hover:bg-sky-50/30 dark:hover:bg-sky-900/10">
                            <td className="truncate px-3 py-2 font-mono text-[10px] text-[var(--gray-500)]">
                              {item.exam_custom_id ?? "—"}
                            </td>
                            <td className="px-3 py-2 font-medium text-[var(--text)]">{name}</td>
                            <td className="truncate px-3 py-2 text-[var(--gray-500)]">{item.exam_method ?? "—"}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${sampleMeta.dot}`} />
                                <span className={`truncate text-[10px] ${sampleMeta.cls}`}>
                                  {item.sample_status_display || item.sample_status || sampleNames || "—"}
                                </span>
                              </div>
                              {item.rejection_reason_names && item.rejection_reason_names.length > 0 && (
                                <p className="mt-0.5 text-[10px] text-rose-600 dark:text-rose-400">
                                  {item.rejection_reason_names.join(", ")}
                                </p>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : (
              <section className={`${GLASS} px-4 py-4 text-center text-[11px] text-[var(--gray-400)]`}>
                Nenhuma análise registada neste pedido.
              </section>
            )}

            {/* ── worklist link if validated ── */}
            {hasValidated && (
              <section className={`${GLASS} flex items-center gap-3 px-4 py-3`}>
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="flex-1 text-[12px] text-[var(--gray-600)] dark:text-[var(--gray-400)]">
                  Resultados validados. Disponíveis na lista de trabalho.
                </span>
                <Link href="/clinical-laboratory/worklists"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[11px] font-semibold text-white transition hover:bg-emerald-700">
                  Ver resultados <ArrowRight size={11} />
                </Link>
              </section>
            )}

            {/* ── footer actions ── */}
            <section className={`${GLASS} flex items-center justify-between gap-2 px-4 py-3`}>
              <Link href="/clinical/lab-requests"
                className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--border)] bg-card px-2.5 text-[11px] text-muted-foreground transition hover:bg-muted">
                <ArrowLeft size={11} /> Voltar
              </Link>

              <div className="flex items-center gap-2">
                {isPending && (
                  <button type="button" onClick={handleTransferir} disabled={busy}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50/70 px-3 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300">
                    {busy ? <Loader2 size={11} className="animate-spin" /> : <ExternalLink size={11} />}
                    Transferir análise
                  </button>
                )}
                {isValidatable && (
                  <button type="button" onClick={handleValidar} disabled={busy}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md bg-sky-600 px-3 text-[11px] font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60">
                    {busy ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                    {busy ? "A processar..." : "Validar resultados"}
                  </button>
                )}
                {!isPending && !isValidatable && !hasValidated && (
                  <Link href="/clinical-laboratory/worklists"
                    className="inline-flex h-7 items-center gap-1.5 rounded-md bg-sky-600 px-3 text-[11px] font-semibold text-white transition hover:bg-sky-700">
                    Lista de trabalho <ArrowRight size={11} />
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
