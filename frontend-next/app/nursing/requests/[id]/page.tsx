"use client"

import Link from "next/link"
import { ArrowLeft, Droplets, FileText, Printer } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { getClinicalStatusLabel } from "@/lib/clinicalStatus"
import { routeParamToString } from "@/lib/routeParams"
import { GROUPS } from "@/lib/rbac"

type SampleOption = {
  id?: number
  custom_id?: string
  name?: string
  // Legacy (LabExam / Sample model)
  bottle_type?: string
  bottle_type_display?: string
  minimum_volume_ml?: string
  fasting_required?: boolean
  fasting_hours?: number
  // New (LabTest / LabContainerType model)
  container_type_id?: number
  container_code?: string
  container_name?: string
  cap_color?: string
  cap_color_display?: string
  additive?: string
  specimen_yields?: string
  volume_ml?: string | null
  inversions?: number
  conservation_temperature?: string
  conservation_temperature_display?: string
  conservation_max_hours?: number | null
  notes?: string
}

type RequestItem = {
  id: number
  exam_name?: string
  medical_exam_name?: string
  sample_status?: string
  sample_status_display?: string
  sample_options?: SampleOption[]
  rejection_reason_names?: string[]
  rejection_note?: string
  sample_received_at?: string
}

type RequestRecord = {
  id: number
  custom_id?: string
  patient_name?: string
  patient_code?: string
  patient_age?: string
  clinical_status?: string
  clinical_status_display?: string
  validated_at?: string
  requesting_physician_name?: string
  collected_at?: string
  items?: RequestItem[]
}

function formatDateTime(value?: string): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

function normalizeStatus(value?: string): string {
  return (value || "").trim().toLocaleLowerCase()
}

function isCollectedProgress(status: string): boolean {
  return status === "coletada" || status === "recebida"
}

function getNursingSampleStatusLabel(item: RequestItem, requestValidatedAt?: string): string {
  const status = normalizeStatus(item.sample_status)
  if (status === "recebida") return "Amostra recebida pelo laboratório"
  if (status === "coletada") return "Amostra coletada"
  if (status === "rejeitada") return item.sample_status_display || "Amostra rejeitada"
  if (requestValidatedAt) return "Aguardando coleta"
  return "Aguardando validação"
}

export default function NursingRequestDetailPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const [record, setRecord] = useState<RequestRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyItem, setBusyItem] = useState<number | null>(null)
  const [busyAll, setBusyAll] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<RequestRecord>(`/clinical/labrequest/${id}/`, { clientCache: false })
      setRecord(data)
    } catch (requestError: any) {
      setError(requestError?.message || "Erro ao carregar a requisição.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const labItems = useMemo(() => {
    const items = Array.isArray(record?.items) ? record.items : []
    return items.filter((item) => item.exam_name || item.medical_exam_name)
  }, [record])

  // Agrega as amostras pendentes: exames que partilham a mesma amostra somam o volume mínimo.
  const pendingSampleSummary = useMemo(() => {
    const grouped = new Map<string, { sample: SampleOption; examCount: number; totalVolumeMl: number }>()
    for (const item of labItems) {
      if (isCollectedProgress(normalizeStatus(item.sample_status))) continue
      for (const sample of item.sample_options || []) {
        if (!sample) continue
        const key = String(sample.id ?? `${sample.name || ""}|${sample.container_name || sample.bottle_type || ""}`)
        const perExamVolume =
          Number(sample.volume_ml && Number(sample.volume_ml) > 0 ? sample.volume_ml : sample.minimum_volume_ml || 0) || 0
        const current = grouped.get(key)
        if (current) {
          current.examCount += 1
          current.totalVolumeMl += perExamVolume
        } else {
          grouped.set(key, { sample, examCount: 1, totalVolumeMl: perExamVolume })
        }
      }
    }
    return Array.from(grouped.values()).sort((a, b) => b.examCount - a.examCount)
  }, [labItems])

  const anyCollected = useMemo(
    () => labItems.some((item) => isCollectedProgress(normalizeStatus(item.sample_status))),
    [labItems]
  )

  const anyPending = useMemo(
    () => labItems.some((item) => !isCollectedProgress(normalizeStatus(item.sample_status))),
    [labItems]
  )

  async function collectItem(item: RequestItem) {
    setBusyItem(item.id)
    setError(null)
    try {
      await apiFetch(`/clinical/labrequestitem/${item.id}/colher-amostra/`, { method: "POST" })
      await load()
    } catch (requestError: any) {
      setError(requestError?.message || "Falha ao registar a coleta.")
    } finally {
      setBusyItem(null)
    }
  }

  async function collectAll() {
    if (!record?.id) return
    setBusyAll(true)
    setError(null)
    try {
      await apiFetch(`/clinical/labrequest/${record.id}/colher-todas-amostras/`, { method: "POST" })
      await load()
    } catch (requestError: any) {
      setError(requestError?.message || "Falha ao registar as coletas.")
    } finally {
      setBusyAll(false)
    }
  }

  function openEtiqueta() {
    if (!record?.id) return
    window.open(`/api/v1/clinical/labrequest/${record.id}/etiqueta/`, "_blank")
  }

  function openRequestPdf() {
    if (!record?.id) return
    window.open(`/api/v1/clinical/labrequest/${record.id}/request-pdf/`, "_blank")
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="w-full space-y-2 text-[0.9em]">
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-r from-blue-500/15 via-white/30 to-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:from-blue-500/10 dark:via-white/5 dark:to-white/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <Droplets size={22} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-bold text-foreground">
                {record?.custom_id ? `Requisição ${record.custom_id}` : "Requisição de enfermagem"}
              </h1>
              <p className="text-[11px] text-muted-foreground">Vista operacional da coleta por exame.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {record?.validated_at && anyPending ? (
              <button
                type="button"
                onClick={collectAll}
                disabled={busyAll}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 px-3.5 text-xs font-semibold text-white shadow-md shadow-blue-500/30 transition hover:from-blue-700 hover:to-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Droplets size={13} />
                {busyAll ? "Registando..." : "Realizar todas as coletas"}
              </button>
            ) : null}
            {record ? (
              <button
                type="button"
                onClick={openRequestPdf}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/30 bg-white/40 px-3 text-xs font-medium text-foreground-2 shadow-sm backdrop-blur-sm transition hover:bg-white/60 hover:text-foreground dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
              >
                <FileText size={13} />
                Imprimir requisição
              </button>
            ) : null}
            {anyCollected ? (
              <button
                type="button"
                onClick={openEtiqueta}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/30 bg-white/40 px-3 text-xs font-medium text-foreground-2 shadow-sm backdrop-blur-sm transition hover:bg-white/60 hover:text-foreground dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
              >
                <Printer size={13} />
                Imprimir etiqueta
              </button>
            ) : null}
            <Link
              href="/nursing/requests"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/30 bg-white/40 px-3 text-xs font-medium text-foreground-2 shadow-sm backdrop-blur-sm transition hover:bg-white/60 hover:text-foreground dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              <ArrowLeft size={13} />
              Voltar
            </Link>
          </div>
          </div>

          {record ? (
            <div className="mt-2.5 grid gap-x-4 gap-y-2 border-t border-white/30 pt-2.5 dark:border-white/10 md:grid-cols-2 xl:grid-cols-4">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Paciente</div>
                <div className="truncate text-xs font-semibold text-foreground">{record.patient_name || "-"}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {record.patient_code || "Sem código"}
                  {record.patient_age ? ` · ${record.patient_age}` : ""}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Prioridade</div>
                <div className="text-xs font-semibold text-foreground">
                  {getClinicalStatusLabel(record.clinical_status, record.clinical_status_display) || "-"}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Validação recepção</div>
                <div className="text-xs font-semibold text-foreground">{formatDateTime(record.validated_at)}</div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Médico solicitante</div>
                <div className="truncate text-xs font-semibold text-foreground">{record.requesting_physician_name || "-"}</div>
              </div>
            </div>
          ) : null}

          {record && pendingSampleSummary.length > 0 ? (
            <div className="mt-2.5 border-t border-white/30 pt-2.5 dark:border-white/10">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Amostras necessárias
                </span>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                  {pendingSampleSummary.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pendingSampleSummary.map(({ sample, examCount, totalVolumeMl }, idx) => {
                  const container = [
                    sample.container_name,
                    sample.cap_color_display || sample.bottle_type_display || sample.bottle_type,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                  return (
                    <span
                      key={sample.id ?? idx}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/40 px-2 py-1 text-[10px] font-medium text-foreground shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/10"
                    >
                      <span className="font-semibold">
                        {(sample.name || sample.container_name || "Amostra").replace(/_/g, " ")}
                      </span>
                      {container ? <span className="text-muted-foreground">{container}</span> : null}
                      <span className="rounded bg-sky-100 px-1.5 py-0.5 font-semibold text-sky-800">
                        {examCount} {examCount === 1 ? "exame" : "exames"}
                      </span>
                      {totalVolumeMl > 0 ? (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 font-semibold text-blue-800">
                          ≥ {Number(totalVolumeMl.toFixed(1))} mL
                        </span>
                      ) : null}
                      {sample.fasting_required ? (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">
                          jejum {sample.fasting_hours || 0}h
                        </span>
                      ) : null}
                    </span>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="text-xs text-muted-foreground">Carregando...</div>
        ) : record ? (
          <>
            {/* Lista de exames */}
            <section className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {labItems.map((item) => {
                const status = normalizeStatus(item.sample_status)
                const isReceived = status === "recebida"
                const isCollected = isCollectedProgress(status)
                const isRejected = status === "rejeitada"
                const title = item.exam_name || item.medical_exam_name || "Exame"

                return (
                  <article
                    key={item.id}
                    className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-white/25 bg-white/35 px-2.5 py-2 shadow-sm backdrop-blur-sm transition hover:bg-white/45 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/[0.08]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-foreground" title={title}>
                        {title}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            isReceived
                              ? "bg-emerald-100 text-emerald-800"
                              : status === "coletada"
                                ? "bg-teal-100 text-teal-800"
                              : isRejected
                                ? "bg-rose-100 text-rose-800"
                                : "bg-sky-100 text-sky-800"
                          }`}
                        >
                          {getNursingSampleStatusLabel(item, record.validated_at)}
                        </span>
                        {(item.sample_options || []).map((sample, sIdx) => {
                          const details = [
                            sample.cap_color_display || sample.bottle_type_display || sample.bottle_type,
                            sample.volume_ml && Number(sample.volume_ml) > 0
                              ? `${Number(sample.volume_ml)} mL`
                              : sample.minimum_volume_ml && Number(sample.minimum_volume_ml) > 0
                                ? `${sample.minimum_volume_ml} mL`
                                : null,
                            sample.inversions ? `${sample.inversions}× inversões` : null,
                            sample.conservation_temperature_display,
                            sample.conservation_max_hours ? `estável ${sample.conservation_max_hours}h` : null,
                            sample.fasting_required ? `jejum ${sample.fasting_hours || 0}h` : null,
                            sample.additive,
                            sample.notes,
                          ]
                            .filter(Boolean)
                            .join(" · ")
                          return (
                            <span
                              key={`${item.id}-${sample.id ?? sIdx}`}
                              title={details}
                              className="inline-flex max-w-full items-center gap-1 truncate rounded border border-white/30 bg-white/40 px-1.5 py-0.5 text-[10px] font-medium text-foreground-2 dark:border-white/10 dark:bg-white/5"
                            >
                              {sample.container_name || sample.name || "Amostra"}
                              {sample.fasting_required ? (
                                <span className="rounded bg-amber-100 px-1 font-semibold text-amber-800">
                                  jejum {sample.fasting_hours || 0}h
                                </span>
                              ) : null}
                            </span>
                          )
                        })}
                      </div>

                      {isRejected && ((item.rejection_reason_names || []).length > 0 || item.rejection_note) ? (
                        <div className="mt-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] text-rose-800 dark:border-rose-800/40 dark:bg-rose-900/20 dark:text-rose-300">
                          <span className="font-semibold">Recoleta: </span>
                          {(item.rejection_reason_names || []).join(", ")}
                          {item.rejection_note ? ` — ${item.rejection_note}` : ""}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-auto">
                      {isCollected ? (
                        <div
                          className={`rounded-lg px-2 py-1 text-[10px] font-medium ${
                            isReceived
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                              : "border border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800/40 dark:bg-teal-900/20 dark:text-teal-300"
                          }`}
                        >
                          {isReceived
                            ? `Recebida pelo lab em ${formatDateTime(item.sample_received_at)}`
                            : `Coletada em ${formatDateTime(record.collected_at)}`}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => collectItem(item)}
                          disabled={busyItem === item.id || !record.validated_at}
                          className="inline-flex h-7 w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 px-2.5 text-[11px] font-semibold text-white shadow-sm shadow-blue-500/30 transition hover:from-blue-700 hover:to-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busyItem === item.id ? "Registando..." : isRejected ? "Registar recoleta" : "Realizar coleta"}
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </section>
          </>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            Requisição não encontrada.
          </div>
        )}
      </div>
    </AppLayout>
  )
}
