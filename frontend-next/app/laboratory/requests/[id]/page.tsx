"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Ban, FlaskConical, Loader2 } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import Card from "@/components/ui/Card"
import { useSafeDataRefresh, useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type ResultStatus =
  | "pendente"
  | "em_analise"
  | "aguardando_validacao"
  | "validado"
  | "rejeitado"
  | "desconsiderado"
  | string

type LaboratoryResultItem = {
  id: number
  custom_id?: string | null
  status: ResultStatus
  result_value: string | number | null
  clinical_status?: string | null
  critical_alert?: boolean
  validation_date?: string | null
  disregard_reason?: string | null
  disregarded_at?: string | null
  disregard_validation_date?: string | null
  exam_name?: string | null
  exam_field_name?: string | null
  exam_field_unit?: string | null
  exam_field_reference?: string | null
}

type LaboratoryResultItemsResponse = {
  request: {
    id: number
    custom_id: string
    patient: number
    patient_name: string
    status: string
    clinical_status: string
    has_critical_result: boolean
  }
  summary: {
    total: number
    pending: number
    in_analysis: number
    awaiting_validation: number
    validated: number
    rejected: number
    disregarded?: number
    disregard_awaiting_validation?: number
  }
  items: LaboratoryResultItem[]
  workflow?: Record<string, number>
}

function toKey(value: unknown): string {
  return value == null ? "" : String(value)
}

export default function LaboratoryRequestResultsPage() {
  const router = useRouter()
  const params = useParams() as any
  const idRaw = params?.id
  const requestId = Number(Array.isArray(idRaw) ? idRaw[0] : idRaw)
  const safeRefreshToken = useSafeDataRefreshSignal()
  const { hasUnsavedInput } = useSafeDataRefresh()

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [requestRecord, setRequestRecord] = useState<LaboratoryResultItemsResponse["request"] | null>(null)
  const [items, setItems] = useState<LaboratoryResultItem[]>([])
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [busyAll, setBusyAll] = useState<null | "start" | "save" | "validate" | "disregard">(null)
  const [busyRow, setBusyRowState] = useState<Record<string, boolean>>({})
  const [showDisregardPanel, setShowDisregardPanel] = useState(false)
  const [disregardReason, setDisregardReason] = useState("")

  function applyResultItemsResponse(response: LaboratoryResultItemsResponse) {
    const resultItems = Array.isArray(response.items) ? response.items : []

    setRequestRecord(response.request)
    setItems(resultItems)

    const nextDraft: Record<string, string> = {}
    for (const item of resultItems) {
      nextDraft[toKey(item.id)] = item.result_value == null ? "" : String(item.result_value)
    }
    setDraft(nextDraft)
  }

  async function load() {
    if (!requestId || Number.isNaN(requestId)) return

    try {
      setLoading(true)
      setErrorMessage(null)

      const response = await apiFetch<LaboratoryResultItemsResponse>(`/requests/${requestId}/result-items/`, {
        clientCache: safeRefreshToken === 0,
      })
      applyResultItemsResponse(response)
    } catch (error: any) {
      setErrorMessage(isNotFoundLikeError(error) ? null : (error?.message || "Falha ao carregar resultados da requisição."))
    } finally {
      setLoading(false)
    }
  }

  async function refreshResultItems() {
    const response = await apiFetch<LaboratoryResultItemsResponse>(`/requests/${requestId}/result-items/`, {
      clientCache: false,
    })
    applyResultItemsResponse(response)
    return response
  }

  useEffect(() => {
    if (safeRefreshToken > 0 && hasUnsavedInput) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, safeRefreshToken, hasUnsavedInput])

  const summary = useMemo(() => {
    const counts = {
      pending: 0,
      inAnalysis: 0,
      awaitingValidation: 0,
      validated: 0,
      rejected: 0,
      disregarded: 0,
      disregardAwaitingValidation: 0,
      total: 0,
    }
    for (const item of items) {
      counts.total += 1
      if (item.status === "pendente") counts.pending += 1
      if (item.status === "em_analise") counts.inAnalysis += 1
      if (item.status === "aguardando_validacao") counts.awaitingValidation += 1
      if (item.status === "validado") counts.validated += 1
      if (item.status === "rejeitado") counts.rejected += 1
      if (item.status === "desconsiderado") {
        counts.disregarded += 1
        if (!item.disregard_validation_date) counts.disregardAwaitingValidation += 1
      }
    }
    return counts
  }, [items])

  const canSaveAll =
    !busyAll &&
    items.some((item) => ["pendente", "em_analise", "rejeitado"].includes(item.status) && !!(draft[toKey(item.id)] || "").trim())
  const readyForRequestValidation =
    summary.total > 0 && summary.pending === 0 && summary.inAnalysis === 0 && summary.rejected === 0
  const canValidateAll =
    !busyAll &&
    readyForRequestValidation &&
    items.some(
      (item) =>
        item.status === "aguardando_validacao" ||
        (item.status === "desconsiderado" && !item.disregard_validation_date)
    )
  const canDisregardEmpty =
    !busyAll &&
    items.some(
      (item) =>
        item.status !== "validado" &&
        item.status !== "desconsiderado" &&
        item.result_value == null &&
        !(draft[toKey(item.id)] || "").trim()
    )

  const groupedItems = useMemo(() => {
    const map = new Map<string, LaboratoryResultItem[]>()
    for (const item of items) {
      const examName = (item.exam_name || "Exame").toString()
      const rows = map.get(examName) || []
      rows.push(item)
      map.set(examName, rows)
    }
    return Array.from(map.entries())
  }, [items])

  function setRowBusy(id: number, value: boolean) {
    setBusyRowState((previous) => ({ ...previous, [toKey(id)]: value }))
  }

  function updateItem(next: LaboratoryResultItem) {
    setItems((previous) => previous.map((item) => (item.id === next.id ? next : item)))
    setDraft((previous) => ({
      ...previous,
      [toKey(next.id)]: next.result_value == null ? "" : String(next.result_value),
    }))
  }

  async function saveItem(id: number) {
    const value = (draft[toKey(id)] || "").trim()
    if (!value) throw new Error("Informe um valor antes de gravar.")

    setRowBusy(id, true)
    try {
      const updated = await apiFetch<LaboratoryResultItem>(`/clinical/resultitem/${id}/save-result/`, {
        method: "POST",
        body: JSON.stringify({ result_value: value }),
      })
      updateItem(updated)
    } finally {
      setRowBusy(id, false)
    }
  }

  async function validateItem(id: number) {
    setRowBusy(id, true)
    try {
      await apiFetch<LaboratoryResultItem>(`/clinical/resultitem/${id}/validate-result/`, {
        method: "POST",
      })
      const response = await refreshResultItems()
      if (response.request?.status === "validado") {
        router.push("/laboratory/requests/validated")
      }
    } finally {
      setRowBusy(id, false)
    }
  }

  async function saveAll() {
    try {
      setBusyAll("save")
      setErrorMessage(null)

      for (const item of items) {
        if (!["pendente", "em_analise", "rejeitado"].includes(item.status)) continue
        if (!(draft[toKey(item.id)] || "").trim()) continue
        await saveItem(item.id)
      }
    } catch (error: any) {
      setErrorMessage(isNotFoundLikeError(error) ? null : (error?.message || "Falha ao gravar resultados."))
    } finally {
      setBusyAll(null)
    }
  }

  async function validateAll() {
    try {
      setBusyAll("validate")
      setErrorMessage(null)

      const response = await apiFetch<LaboratoryResultItemsResponse>(`/requests/${requestId}/validate-results/`, {
        method: "POST",
      })
      applyResultItemsResponse(response)
      if (response.request?.status === "validado") {
        router.push("/laboratory/requests/validated")
      }
    } catch (error: any) {
      setErrorMessage(isNotFoundLikeError(error) ? null : (error?.message || "Falha ao validar resultados."))
    } finally {
      setBusyAll(null)
    }
  }

  async function disregardEmptyResults() {
    const reason = disregardReason.trim()
    if (reason.length < 5) {
      setErrorMessage("Explique o motivo da desconsideração com pelo menos 5 caracteres.")
      return
    }

    try {
      setBusyAll("disregard")
      setErrorMessage(null)

      const response = await apiFetch<LaboratoryResultItemsResponse>(
        `/requests/${requestId}/disregard-empty-results/`,
        {
          method: "POST",
          body: JSON.stringify({ reason }),
        }
      )
      applyResultItemsResponse(response)
      setShowDisregardPanel(false)
      setDisregardReason("")
    } catch (error: any) {
      setErrorMessage(isNotFoundLikeError(error) ? null : (error?.message || "Falha ao desconsiderar resultados vazios."))
    } finally {
      setBusyAll(null)
    }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="space-y-6">
        <PageHeader
          title="Lançar resultados"
          subtitle={requestRecord ? `${requestRecord.custom_id} · ${requestRecord.patient_name}` : "Carregando..."}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/laboratory/requests"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                <FlaskConical size={16} />
                Voltar
              </Link>

              <button
                type="button"
                onClick={saveAll}
                disabled={!canSaveAll}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                {busyAll === "save" ? <Loader2 className="animate-spin" size={16} /> : null}
                Gravar preenchidos
              </button>

              <button
                type="button"
                onClick={validateAll}
                disabled={!canValidateAll}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                {busyAll === "validate" ? <Loader2 className="animate-spin" size={16} /> : null}
                Validar requisição
              </button>

              <button
                type="button"
                onClick={() => setShowDisregardPanel(true)}
                disabled={!canDisregardEmpty}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 shadow-sm transition hover:bg-amber-100 disabled:opacity-50"
              >
                {busyAll === "disregard" ? <Loader2 className="animate-spin" size={16} /> : <Ban size={16} />}
                Desconsiderar vazios
              </button>

            </div>
          }
        />

        {errorMessage ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {errorMessage}
          </div>
        ) : null}

        {showDisregardPanel ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <label className="text-sm font-semibold text-amber-950" htmlFor="disregard-reason">
              Motivo da desconsideração dos campos vazios
            </label>
            <textarea
              id="disregard-reason"
              value={disregardReason}
              onChange={(event) => setDisregardReason(event.target.value)}
              className="mt-2 min-h-24 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-amber-400"
              placeholder="Ex.: Amostra insuficiente para estes parâmetros."
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={disregardEmptyResults}
                disabled={busyAll === "disregard"}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 disabled:opacity-50"
              >
                {busyAll === "disregard" ? <Loader2 className="animate-spin" size={16} /> : null}
                Confirmar desconsideração
              </button>
              <button
                type="button"
                onClick={() => setShowDisregardPanel(false)}
                disabled={busyAll === "disregard"}
                className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-amber-900 shadow-sm transition hover:bg-amber-100 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Pendentes</div>
              <div className="text-2xl font-semibold text-slate-900">{summary.pending}</div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Em análise</div>
              <div className="text-2xl font-semibold text-slate-900">{summary.inAnalysis}</div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Aguardando validação</div>
              <div className="text-2xl font-semibold text-slate-900">{summary.awaitingValidation}</div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Validados</div>
              <div className="text-2xl font-semibold text-slate-900">{summary.validated}</div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Desconsiderados</div>
              <div className="text-2xl font-semibold text-slate-900">{summary.disregarded}</div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Total</div>
              <div className="text-2xl font-semibold text-slate-900">{summary.total}</div>
            </div>
          </div>
        )}

        {!loading ? (
          <div className="space-y-4">
            {groupedItems.map(([examName, rows]) => (
              <Card key={examName} title={examName} subtitle={`${rows.length} parâmetros`}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                        <th className="py-2 pr-3">Parâmetro</th>
                        <th className="py-2 pr-3">Unidade</th>
                        <th className="py-2 pr-3">Referência</th>
                        <th className="py-2 pr-3">Resultado</th>
                        <th className="py-2 pr-3">Estado</th>
                        <th className="py-2 pr-0">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const id = toKey(row.id)
                        const isBusy = !!busyRow[id]
                        const isEditable = ["pendente", "em_analise", "rejeitado"].includes(row.status)
                        const draftValue = draft[id] ?? ""
                        const canSave = isEditable && !isBusy && !busyAll && !!draftValue.trim()
                        const canValidate = row.status === "aguardando_validacao" && !isBusy && !busyAll
                        const disregardLabel = row.disregard_validation_date
                          ? "Desconsideração validada"
                          : "Desconsideração a validar"

                        return (
                          <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                            <td className="py-2 pr-3">
                              <div className="font-medium text-slate-900">{row.exam_field_name || "-"}</div>
                              {row.critical_alert ? (
                                <div className="text-xs text-rose-600">Crítico</div>
                              ) : row.clinical_status ? (
                                <div className="text-xs text-slate-500">Status: {row.clinical_status}</div>
                              ) : null}
                            </td>
                            <td className="py-2 pr-3 text-slate-700">{row.exam_field_unit || "-"}</td>
                            <td className="py-2 pr-3 text-slate-700">{row.exam_field_reference || "-"}</td>
                            <td className="py-2 pr-3">
                              <input
                                value={draftValue}
                                onChange={(event) => setDraft((previous) => ({ ...previous, [id]: event.target.value }))}
                                disabled={!isEditable || !!busyAll}
                                inputMode="decimal"
                                className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm disabled:bg-slate-50 disabled:text-slate-500"
                                placeholder={isEditable ? "Digite..." : "-"}
                              />
                            </td>
                            <td className="py-2 pr-3 text-slate-700">
                              <div>{row.status || "-"}</div>
                              {row.status === "desconsiderado" ? (
                                <div className="mt-1 max-w-48 text-xs text-amber-700">
                                  {disregardLabel}
                                  {row.disregard_reason ? `: ${row.disregard_reason}` : ""}
                                </div>
                              ) : null}
                            </td>
                            <td className="py-2 pr-0">
                              <div className="flex items-center gap-2">
                                {isBusy ? (
                                  <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                                    <Loader2 className="animate-spin" size={14} />
                                    Processando
                                  </span>
                                ) : null}

                                {isEditable ? (
                                  <button
                                    type="button"
                                    disabled={!canSave}
                                    onClick={() => saveItem(row.id).catch((error: any) => setErrorMessage(isNotFoundLikeError(error) ? null : (error?.message || String(error))))}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                                  >
                                    Gravar
                                  </button>
                                ) : null}

                                {canValidate ? (
                                  <button
                                    type="button"
                                    onClick={() => validateItem(row.id).catch((error: any) => setErrorMessage(isNotFoundLikeError(error) ? null : (error?.message || String(error))))}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                                  >
                                    Validar
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </AppLayout>
  )
}
