"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
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

  const pendingSampleSummary = useMemo(() => {
    const unique = new Map<number, SampleOption>()
    for (const item of labItems) {
      if (isCollectedProgress(normalizeStatus(item.sample_status))) continue
      for (const sample of item.sample_options || []) {
        if (!sample?.id || unique.has(sample.id)) continue
        unique.set(sample.id, sample)
      }
    }
    return Array.from(unique.values())
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

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-5xl space-y-2 text-[0.9em]">
        <PageHeader
          title={record?.custom_id ? `Requisição ${record.custom_id}` : "Requisição de enfermagem"}
          subtitle="Vista operacional da coleta por exame."
          actions={
            <div className="flex items-center gap-2">
              {record?.validated_at && anyPending ? (
                <button
                  type="button"
                  onClick={collectAll}
                  disabled={busyAll}
                  className="inline-flex h-8 items-center gap-1.5 rounded bg-primary px-3 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyAll ? "Registando..." : "Realizar todas as coletas"}
                </button>
              ) : null}
              {anyCollected ? (
                <button
                  type="button"
                  onClick={openEtiqueta}
                  className="inline-flex h-8 items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Imprimir etiqueta
                </button>
              ) : null}
              <Link
                href="/nursing/requests"
                className="inline-flex h-8 items-center rounded border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Voltar
              </Link>
            </div>
          }
        />

        {error ? (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="text-xs text-slate-500">Carregando...</div>
        ) : record ? (
          <>
            {/* Info do paciente */}
            <section className="rounded border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Paciente</div>
                  <div className="text-xs font-semibold text-slate-900">{record.patient_name || "-"}</div>
                  <div className="text-[10px] text-slate-500">
                    {record.patient_code || "Sem código"}
                    {record.patient_age ? ` · ${record.patient_age}` : ""}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Prioridade</div>
                  <div className="text-xs font-semibold text-slate-900">
                    {getClinicalStatusLabel(record.clinical_status, record.clinical_status_display) || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Validação recepção</div>
                  <div className="text-xs font-semibold text-slate-900">{formatDateTime(record.validated_at)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Médico solicitante</div>
                  <div className="text-xs font-semibold text-slate-900">{record.requesting_physician_name || "-"}</div>
                </div>
              </div>
            </section>

            {/* Resumo de amostras por coletar */}
            {pendingSampleSummary.length > 0 ? (
              <section className="rounded border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Amostras por coletar</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {pendingSampleSummary.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pendingSampleSummary.map((sample, idx) => (
                    <span
                      key={sample.id ?? idx}
                      className="inline-flex items-center rounded border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-slate-800"
                    >
                      {sample.container_name || sample.name || "Amostra"}
                      {sample.cap_color_display ? ` · ${sample.cap_color_display}` : (sample.bottle_type_display || sample.bottle_type ? ` · ${sample.bottle_type_display || sample.bottle_type}` : "")}
                      {sample.volume_ml && Number(sample.volume_ml) > 0 ? ` · ${sample.volume_ml} mL` : (sample.minimum_volume_ml && Number(sample.minimum_volume_ml) > 0 ? ` · ${sample.minimum_volume_ml} mL` : "")}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Lista de exames */}
            <section className="space-y-1.5">
              {labItems.map((item) => {
                const status = normalizeStatus(item.sample_status)
                const isReceived = status === "recebida"
                const isCollected = isCollectedProgress(status)
                const isRejected = status === "rejeitada"
                const title = item.exam_name || item.medical_exam_name || "Exame"

                return (
                  <article key={item.id} className="rounded border border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-900">{title}</span>
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
                        </div>

                        <div className="mt-1.5 space-y-1">
                          {(item.sample_options || []).map((sample, sIdx) => (
                            <div
                              key={`${item.id}-${sample.id ?? sIdx}`}
                              className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] text-slate-700"
                            >
                              <div className="flex flex-wrap items-center gap-1.5">
                                {/* Container / tube name */}
                                <span className="font-semibold text-slate-900">
                                  {sample.container_name || sample.name || "Amostra"}
                                </span>
                                {/* Cap color badge */}
                                {(sample.cap_color_display || sample.bottle_type_display || sample.bottle_type) && (
                                  <span className="rounded bg-slate-200 px-1.5 py-0.5 font-medium">
                                    {sample.cap_color_display || sample.bottle_type_display || sample.bottle_type}
                                  </span>
                                )}
                                {/* Volume */}
                                {(sample.volume_ml && Number(sample.volume_ml) > 0) ? (
                                  <span>{Number(sample.volume_ml)} mL</span>
                                ) : (sample.minimum_volume_ml && Number(sample.minimum_volume_ml) > 0) ? (
                                  <span>{sample.minimum_volume_ml} mL</span>
                                ) : null}
                                {/* Inversions */}
                                {sample.inversions ? <span>{sample.inversions}× inversões</span> : null}
                                {/* Conservation */}
                                {sample.conservation_temperature_display && (
                                  <span className="text-slate-500">{sample.conservation_temperature_display}</span>
                                )}
                                {/* Stability */}
                                {sample.conservation_max_hours ? (
                                  <span className="text-slate-500">estável {sample.conservation_max_hours}h</span>
                                ) : null}
                                {/* Fasting (legacy) */}
                                {sample.fasting_required ? (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
                                    jejum {sample.fasting_hours || 0}h
                                  </span>
                                ) : null}
                              </div>
                              {/* Additive / notes */}
                              {sample.additive && (
                                <p className="mt-0.5 text-slate-500">{sample.additive}</p>
                              )}
                              {sample.notes && (
                                <p className="mt-0.5 italic text-slate-400">{sample.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>

                        {isRejected && ((item.rejection_reason_names || []).length > 0 || item.rejection_note) ? (
                          <div className="mt-1.5 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] text-rose-800">
                            <span className="font-semibold">Recoleta: </span>
                            {(item.rejection_reason_names || []).join(", ")}
                            {item.rejection_note ? ` — ${item.rejection_note}` : ""}
                          </div>
                        ) : null}
                      </div>

                      <div className="lg:w-44">
                        {isCollected ? (
                          <div
                            className={`rounded px-2 py-1.5 text-[10px] font-medium ${
                              isReceived
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border border-teal-200 bg-teal-50 text-teal-800"
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
                            className="inline-flex h-8 w-full items-center justify-center rounded bg-primary px-3 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busyItem === item.id ? "Registando..." : isRejected ? "Registar recoleta" : "Realizar coleta"}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>
          </>
        ) : (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Requisição não encontrada.
          </div>
        )}
      </div>
    </AppLayout>
  )
}
