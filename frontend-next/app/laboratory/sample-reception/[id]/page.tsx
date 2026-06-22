"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { apiFetch, apiFetchList } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"
import { GROUPS } from "@/lib/rbac"

type RejectionReason = { id: number; name: string; code: string }
type Item = Record<string, any>
type RequestRecord = Record<string, any>

function formatDateTime(value?: string): string {
  if (!value) return "-"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

export default function SampleReceptionDetailPage() {
  useAuthGuard()
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const [record, setRecord] = useState<RequestRecord | null>(null)
  const [reasons, setReasons] = useState<RejectionReason[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyItem, setBusyItem] = useState<number | null>(null)
  const [rejectingItem, setRejectingItem] = useState<number | null>(null)
  const [selectedReasons, setSelectedReasons] = useState<number[]>([])
  const [note, setNote] = useState("")

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<RequestRecord>(`/clinical/labrequest/${id}/`, { clientCache: false })
      setRecord(data)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar a requisição.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    apiFetchList<RejectionReason>("/clinical/sample_rejection_reason/", { page: 1, pageSize: 50 })
      .then(({ items }) => setReasons(items.filter((reason: any) => reason.active !== false)))
      .catch(() => setReasons([]))
  }, [])

  const labItems: Item[] = Array.isArray(record?.items)
    ? (record!.items as Item[]).filter((item) => item.exam)
    : []
  const allReceived = labItems.length > 0 && labItems.every((item) => item.sample_status === "recebida")

  async function receber(item: Item) {
    setBusyItem(item.id)
    setError(null)
    try {
      await apiFetch(`/clinical/labrequestitem/${item.id}/receber-amostra/`, { method: "POST" })
      await load()
    } catch (e: any) {
      setError(e?.message || "Falha ao marcar amostra como recebida.")
    } finally {
      setBusyItem(null)
    }
  }

  function abrirRejeicao(item: Item) {
    setRejectingItem(item.id)
    setSelectedReasons([])
    setNote("")
  }

  async function confirmarRejeicao(item: Item) {
    if (!selectedReasons.length) {
      setError("Selecione pelo menos um motivo de rejeição.")
      return
    }
    setBusyItem(item.id)
    setError(null)
    try {
      await apiFetch(`/clinical/labrequestitem/${item.id}/rejeitar-amostra/`, {
        method: "POST",
        body: JSON.stringify({ rejection_reasons: selectedReasons, note }),
      })
      setRejectingItem(null)
      await load()
    } catch (e: any) {
      setError(e?.message || "Falha ao rejeitar a amostra.")
    } finally {
      setBusyItem(null)
    }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <PageHeader
          title={record?.custom_id ? `Recepção de amostras · ${record.custom_id}` : "Recepção de amostras"}
          subtitle="Confira cada amostra recebida contra o exame solicitado."
          actions={
            <Link
              href="/laboratory/sample-reception"
              className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
            >
              Voltar
            </Link>
          }
        />

        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
        ) : null}

        {loading ? (
          <div className="text-sm text-[var(--gray-500)]">Carregando...</div>
        ) : record ? (
          <>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-[var(--gray-500)]">Paciente: </span>
                  <span className="font-medium text-[var(--text)]">{record.patient_name}</span>
                  {record.patient_age ? <span className="text-[var(--gray-500)]"> · {record.patient_age}</span> : null}
                </div>
                <div>
                  <span className="text-[var(--gray-500)]">Código do paciente: </span>
                  <span className="font-medium text-[var(--text)]">{record.patient_code}</span>
                </div>
                <div>
                  <span className="text-[var(--gray-500)]">Coleta: </span>
                  <span className="font-medium text-[var(--text)]">{formatDateTime(record.collected_at)}</span>
                </div>
                <div>
                  <span className="text-[var(--gray-500)]">Médico solicitante: </span>
                  <span className="font-medium text-[var(--text)]">{record.requesting_physician_name || "-"}</span>
                </div>
              </div>
            </div>

            {allReceived ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Todas as amostras conferidas — a requisição está disponível em{" "}
                <Link href="/laboratory/pedidos" className="font-semibold underline">
                  Pedidos
                </Link>
                .
              </div>
            ) : null}

            <div className="space-y-3">
              {labItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="font-semibold text-[var(--text)]">{item.exam_name}</div>
                      {(item.sample_options || []).map((sample: any) => (
                        <div key={`${item.id}-${sample.id}`} className="text-xs text-[var(--gray-600)]">
                          {sample.name} · {sample.bottle_type_display || sample.bottle_type}
                          {sample.minimum_volume_ml && Number(sample.minimum_volume_ml) > 0
                            ? ` · mínimo ${sample.minimum_volume_ml} ml`
                            : ""}
                        </div>
                      ))}
                      {item.sample_status === "rejeitada" ? (
                        <div className="text-xs font-medium text-rose-700">
                          Rejeitada: {(item.rejection_reason_names || []).join(", ")}
                          {item.rejection_note ? ` — ${item.rejection_note}` : ""}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                      {item.sample_status === "recebida" ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                          Amostra recebida
                        </span>
                      ) : item.sample_status === "rejeitada" ? (
                        <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
                          Aguardando nova coleta
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => receber(item)}
                            disabled={busyItem === item.id}
                            className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--primary-600)] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)] disabled:opacity-60"
                          >
                            Confirmar recepção no laboratório
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirRejeicao(item)}
                            disabled={busyItem === item.id}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                          >
                            Rejeitar amostra
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {rejectingItem === item.id ? (
                    <div className="mt-3 space-y-2 rounded-md border border-rose-200 bg-rose-50/50 p-3">
                      <div className="text-xs font-semibold text-rose-800">Motivos da rejeição</div>
                      <div className="grid gap-1 sm:grid-cols-2">
                        {reasons.map((reason) => (
                          <label key={reason.id} className="flex items-center gap-2 text-xs text-[var(--text)]">
                            <input
                              type="checkbox"
                              checked={selectedReasons.includes(reason.id)}
                              onChange={(e) =>
                                setSelectedReasons((prev) =>
                                  e.target.checked ? [...prev, reason.id] : prev.filter((x) => x !== reason.id)
                                )
                              }
                            />
                            {reason.name}
                          </label>
                        ))}
                      </div>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Observação (opcional)"
                        rows={2}
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-xs"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => confirmarRejeicao(item)}
                          disabled={busyItem === item.id}
                          className="inline-flex h-8 items-center rounded-md bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
                        >
                          Confirmar rejeição
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectingItem(null)}
                          className="inline-flex h-8 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Requisição não encontrada.
          </div>
        )}
      </div>
    </AppLayout>
  )
}
