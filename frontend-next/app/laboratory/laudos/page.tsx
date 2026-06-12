"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type Row = Record<string, any>

function formatDateTime(value?: string): string {
  if (!value) return "-"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

async function descarregarLaudo(row: Row) {
  const blob = await apiFetch<Blob>(`/clinical/labrequest/${row.id}/results-pdf/`, { responseType: "blob" })
  const url = URL.createObjectURL(blob)
  const surname = String(row.patient_name || "").trim().split(/\s+/).pop() || "paciente"
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${row.custom_id || row.id}_${surname}.pdf`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.open(url, "_blank", "noopener")
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export default function LabReportsPage() {
  useAuthGuard()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await apiFetchList<Row>("/clinical/labrequest/?fase=laudos&type=LAB", {
        page: 1,
        pageSize: 50,
        clientCache: false,
      })
      setRows(items)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar laudos.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, safeRefreshToken])

  async function notificar(row: Row) {
    setBusyId(row.id)
    setError(null)
    setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequest/${row.id}/send-results-notification/`, {
        method: "POST",
        body: JSON.stringify({ channels: ["email", "whatsapp"] }),
      })
      setFeedback(`Notificação de resultados de ${row.custom_id} enviada.`)
    } catch (e: any) {
      setError(e?.message || "Falha ao enviar a notificação.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <PageHeader
          title="Laudos"
          subtitle="Requisições validadas: emissão do laudo em PDF e comunicação de resultados."
          actions={
            <Link
              href="/laboratory/worklist"
              className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
            >
              Listas de trabalho
            </Link>
          }
        />

        {feedback ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{feedback}</div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
        ) : null}

        {loading ? (
          <div className="text-sm text-[var(--gray-500)]">Carregando...</div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-6 text-center text-sm text-[var(--gray-500)]">
            Sem laudos validados.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <Link href={`/requests/${row.id}`} className="font-semibold text-[var(--primary-700)] hover:underline">
                    {row.custom_id}
                  </Link>
                  <div className="text-sm text-[var(--text)]">
                    {row.patient_name}
                    {row.patient_age ? <span className="text-[var(--gray-500)]"> · {row.patient_age}</span> : null}
                  </div>
                  <div className="text-xs text-[var(--gray-500)]">Atualizada: {formatDateTime(row.updated_at)}</div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => descarregarLaudo(row).catch(() => setError("Falha ao gerar o laudo PDF."))}
                    className="inline-flex h-9 items-center rounded-md bg-sky-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-500"
                  >
                    Laudo PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => notificar(row)}
                    disabled={busyId === row.id}
                    className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60"
                  >
                    {busyId === row.id ? "Enviando..." : "Enviar notificação"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
