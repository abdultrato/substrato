"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ChevronLeft, FileText, FlaskConical, Loader2, Microscope } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { getClinicalStatusLabel } from "@/lib/clinicalStatus"

type RequestInfo = {
  id: number
  custom_id?: string
  patient_name?: string
  patient_age?: string
  patient_gender?: string
  status?: string
  clinical_status?: string
  clinical_status_display?: string
  has_critical_result?: boolean
}

type Summary = {
  total: number
  pending: number
  in_analysis: number
  awaiting_validation: number
  validated: number
  rejected: number
  disregarded: number
}

type ResultItem = {
  id: number
  exam_id: number
  exam_name: string
  exam_field_name: string
  exam_field_position: number
  exam_field_unit?: string
  exam_field_reference?: string
  result_value?: string
  result_text?: string
  clinical_status?: string
  critical_alert?: boolean
  status?: string
}

type SpecializedItem = {
  exam_id: number
  exam_name: string
  method?: string
  sector?: string
  sector_label?: string
  href?: string
  status?: string
  record_id?: number
  result_text?: string
}

type Payload = {
  request: RequestInfo
  summary: Summary
  items: ResultItem[]
  specialized_items?: SpecializedItem[]
}

const STAT_PILL =
  "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border border-transparent px-2 text-[10px] font-semibold backdrop-blur-sm"

const STATUS_BADGE: Record<string, string> = {
  validado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  pendente: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  desconsiderado: "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300",
  rejeitado: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
}

function statusBadgeCls(status?: string): string {
  return STATUS_BADGE[(status || "").toLowerCase()] || "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"
}

function flagCls(flag?: string, critical?: boolean): string {
  if (critical) return "text-rose-600 dark:text-rose-400"
  if (flag && flag !== "N") return "text-amber-600 dark:text-amber-400"
  return "text-emerald-600 dark:text-emerald-400"
}

function formatValue(item: ResultItem): string {
  const v = (item.result_value || "").trim() || (item.result_text || "").trim()
  return v || "—"
}

export default function LabReportDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notifying, setNotifying] = useState(false)
  const [notified, setNotified] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const payload = await apiFetch<Payload>(`/clinical/labrequest/${id}/result-items/`)
      setData(payload)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar resultados.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  // Agrupa itens por exame, preservando a ordem do exame e dos campos.
  const exams = useMemo(() => {
    const byExam = new Map<number, { name: string; items: ResultItem[] }>()
    for (const item of data?.items ?? []) {
      if (!byExam.has(item.exam_id)) byExam.set(item.exam_id, { name: item.exam_name, items: [] })
      byExam.get(item.exam_id)!.items.push(item)
    }
    for (const group of byExam.values()) {
      group.items.sort((a, b) => a.exam_field_position - b.exam_field_position)
    }
    return [...byExam.values()]
  }, [data])

  const req = data?.request
  const summary = data?.summary
  const specialized = data?.specialized_items ?? []
  const priority = getClinicalStatusLabel(req?.clinical_status, req?.clinical_status_display)

  function openPdf() {
    window.open(`/api/v1/clinical/labrequest/${id}/results-pdf/`, "_blank")
  }

  async function handleNotify() {
    setNotifying(true)
    setError(null)
    try {
      await apiFetch(`/clinical/labrequest/${id}/send-results-notification/`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      setNotified(true)
    } catch (e: any) {
      setError(e?.message || "Falha ao enviar notificação.")
    } finally {
      setNotifying(false)
    }
  }

  return (
    <AppLayout fullWidth>
      <div className="w-full min-w-0 max-w-none space-y-2 px-1 py-1">

        {/* ── Cabeçalho fundido ── */}
        <section className="relative overflow-hidden rounded-xl border border-sky-200/50 bg-gradient-to-br from-sky-50/80 via-white/60 to-cyan-50/60 shadow-sm backdrop-blur-sm dark:border-sky-800/30 dark:from-sky-950/30 dark:via-slate-900/40 dark:to-cyan-950/20">
          <span className="absolute left-0 top-0 h-full w-1 bg-sky-400" />

          <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 pl-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-md shadow-sky-500/25">
                <FileText size={15} />
              </span>
              <div className="min-w-0">
                <h1 className="font-display text-sm font-bold leading-tight text-foreground">
                  Laudo <span className="font-mono text-sky-700 dark:text-sky-300">{req?.custom_id ?? `#${id}`}</span>
                </h1>
                <p className="truncate text-[10px] text-muted-foreground">
                  {req
                    ? [req.patient_name, req.patient_age, req.patient_gender].filter(Boolean).join(" · ")
                    : "A carregar…"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {priority && (
                <span className={`${STAT_PILL} bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200`}>
                  {priority}
                </span>
              )}
              {summary && (
                <>
                  <span className={`${STAT_PILL} bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200`}>
                    Validados <strong className="text-[11px]">{summary.validated}</strong>
                  </span>
                  {summary.pending > 0 && (
                    <span className={`${STAT_PILL} bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200`}>
                      Pendentes <strong className="text-[11px]">{summary.pending}</strong>
                    </span>
                  )}
                  {summary.disregarded > 0 && (
                    <span className={`${STAT_PILL} bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300`}>
                      Desconsiderados <strong className="text-[11px]">{summary.disregarded}</strong>
                    </span>
                  )}
                </>
              )}
              {req?.has_critical_result && (
                <span className={`${STAT_PILL} bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200`}>
                  Resultado crítico
                </span>
              )}
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <button type="button" onClick={openPdf}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-sky-600 px-2.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-sky-700">
                Imprimir PDF
              </button>
              <button type="button" onClick={handleNotify} disabled={notifying}
                className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-medium shadow-sm transition disabled:opacity-60 ${
                  notified
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                    : "border-white/40 bg-white/30 text-[var(--gray-700)] hover:bg-white/50 dark:border-white/10 dark:bg-white/[0.06] dark:text-[#ffffff]"
                }`}>
                {notifying ? <><Loader2 size={10} className="animate-spin" /> A notificar…</> : notified ? "✓ Notificado" : "Notificar"}
              </button>
              <Link href="/clinical-laboratory/reports"
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/40 bg-white/30 px-2.5 text-[11px] text-[var(--gray-700)] backdrop-blur-sm transition hover:bg-white/50 dark:border-white/10 dark:text-[#ffffff] dark:hover:bg-white/10">
                <ChevronLeft size={11} /> Voltar
              </Link>
            </div>
          </div>
        </section>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-2.5 text-[12px] text-rose-800 dark:border-rose-800/40 dark:bg-rose-900/15 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* ── Resultados por exame ── */}
        {loading && !data ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[12px] text-[var(--gray-400)]">
            <Loader2 size={16} className="animate-spin" /> A carregar resultados...
          </div>
        ) : exams.length === 0 && specialized.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/60 px-3 py-10 text-center text-[11px] text-[var(--gray-400)] dark:border-white/10">
            Sem resultados para esta requisição.
          </div>
        ) : (
          <div className="grid w-full min-w-0 items-start gap-1.5 md:grid-cols-2 xl:grid-cols-3">
            {exams.map((exam) => (
              <section key={exam.name}
                className="relative overflow-hidden rounded-xl border border-white/50 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
                <span className="absolute left-0 top-0 h-full w-1 bg-sky-400" />

                <div className="flex items-center gap-1.5 px-2 py-1.5 pl-3">
                  <FlaskConical size={11} className="shrink-0 text-sky-600 dark:text-sky-400" />
                  <h2 className="truncate text-[11px] font-bold text-foreground">{exam.name}</h2>
                  <span className="ml-auto shrink-0 text-[9px] text-[var(--gray-500)]">
                    {exam.items.length} {exam.items.length === 1 ? "parâmetro" : "parâmetros"}
                  </span>
                </div>

                <table className="w-full border-t border-white/40 text-[10px] dark:border-white/10">
                  <thead>
                    <tr className="text-left text-[8px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                      <th className="px-2 py-1 pl-3">Parâmetro</th>
                      <th className="px-1.5 py-1 text-right">Resultado</th>
                      <th className="px-1.5 py-1">Referência</th>
                      <th className="px-2 py-1 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exam.items.map((item) => (
                      <tr key={item.id}
                        className={`border-t border-white/30 dark:border-white/5 ${item.critical_alert ? "bg-rose-50/50 dark:bg-rose-900/10" : ""}`}>
                        <td className="px-2 py-1 pl-3 font-medium text-foreground">{item.exam_field_name}</td>
                        <td className="whitespace-nowrap px-1.5 py-1 text-right">
                          <span className={`font-semibold ${flagCls(item.clinical_status, item.critical_alert)}`}>
                            {formatValue(item)}
                          </span>
                          {item.exam_field_unit && (
                            <span className="ml-1 text-[8px] text-[var(--gray-500)]">{item.exam_field_unit}</span>
                          )}
                          {item.clinical_status && item.clinical_status !== "N" && (
                            <span className={`ml-1 font-bold ${flagCls(item.clinical_status, item.critical_alert)}`}>
                              {item.clinical_status}
                            </span>
                          )}
                        </td>
                        <td className="px-1.5 py-1 text-[9px] text-[var(--gray-500)]">{item.exam_field_reference || "—"}</td>
                        <td className="px-2 py-1 text-right">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${statusBadgeCls(item.status)}`}>
                            {item.status || "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}

            {specialized.map((item) => (
              <section key={`sp-${item.exam_id}-${item.record_id}`}
                className="relative overflow-hidden rounded-xl border border-white/50 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
                <span className="absolute left-0 top-0 h-full w-1 bg-violet-400" />

                <div className="flex items-center gap-1.5 px-2 py-1.5 pl-3">
                  <Microscope size={11} className="shrink-0 text-violet-600 dark:text-violet-400" />
                  <h2 className="truncate text-[11px] font-bold text-foreground">{item.exam_name}</h2>
                  {item.method && (
                    <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[8px] font-semibold text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
                      {item.method}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-start gap-2 border-t border-white/40 px-2 py-1.5 pl-3 dark:border-white/10">
                  <div className="min-w-0 flex-1">
                    {item.sector_label && (
                      <p className="text-[9px] text-[var(--gray-500)]">{item.sector_label}</p>
                    )}
                    <p className="text-[11px] font-semibold text-foreground">{item.status || "—"}</p>
                    {item.result_text && (
                      <ul className="mt-1 space-y-0.5">
                        {item.result_text.split(";").map((line, i) => {
                          const t = line.trim()
                          if (!t) return null
                          const isTsa = t.startsWith("TSA:")
                          const isIsolate = t.startsWith("Isolado:")
                          return (
                            <li key={i} className={`text-[10px] ${isIsolate ? "font-semibold italic text-foreground" : isTsa ? "text-fuchsia-700 dark:text-fuchsia-300" : "text-[var(--gray-600)] dark:text-[var(--gray-400)]"}`}>
                              {t}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                  {item.href && (
                    <Link href={item.href}
                      className="shrink-0 inline-flex h-6 items-center rounded-lg border border-white/40 bg-white/30 px-2 text-[9px] font-medium text-[var(--gray-700)] transition hover:bg-white/50 dark:border-white/10 dark:bg-white/[0.06] dark:text-[#ffffff]">
                      Ver detalhe
                    </Link>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
