"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"

type PendingRequest = {
  id: number
  custom_id: string
  patient_name: string
  patient_age?: string
  created_at: string
  clinical_status?: string
}

function formatDateTime(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

export default function PendingRequestsPage() {
  useAuthGuard()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<PendingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await apiFetchList<PendingRequest>(
        "/clinical/labrequest/?status=pendente&validada=false",
        { page: 1, pageSize: 50, clientCache: false }
      )
      setRows(items)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar requisições pendentes.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, safeRefreshToken])

  async function validar(row: PendingRequest) {
    setBusyId(row.id)
    setError(null)
    setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequest/${row.id}/validar/`, { method: "POST" })
      setFeedback(`Requisição ${row.custom_id} validada — disponível para coleta na enfermagem.`)
      setRows((prev) => prev.filter((item) => item.id !== row.id))
    } catch (e: any) {
      setError(e?.message || "Falha ao validar a requisição.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <PageHeader
          title="Requisições pendentes"
          subtitle="Valide cada requisição para a enviar para coleta."
          actions={
            <Link
              href="/requests"
              className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition-all duration-150 hover:border-[var(--primary-300)] hover:bg-[var(--gray-100)] hover:text-[var(--text)]"
            >
              Todas as requisições
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
            Sem requisições pendentes de validação.
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
                  <div className="text-sm text-[var(--text)]">{row.patient_name}</div>
                  <div className="text-xs text-[var(--gray-500)]">Entrada: {formatDateTime(row.created_at)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => validar(row)}
                  disabled={busyId === row.id}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--primary-600)] px-4 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[var(--primary-700)] disabled:opacity-60"
                >
                  {busyId === row.id ? "Validando..." : "Validar requisição"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
