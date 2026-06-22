"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetchList } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type Row = Record<string, any>

function formatDateTime(value?: string): string {
  if (!value) return "-"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

export default function SampleReceptionListPage() {
  useAuthGuard()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await apiFetchList<Row>("/clinical/labrequest/?fase=rececao_amostras&type=LAB", {
        page: 1,
        pageSize: 50,
        clientCache: false,
      })
      setRows(items)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar a recepção de amostras.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, safeRefreshToken])

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <PageHeader
          title="Recepção de amostras"
          subtitle="Confira as amostras recebidas contra os exames solicitados."
        />

        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
        ) : null}

        {loading ? (
          <div className="text-sm text-[var(--gray-500)]">Carregando...</div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-6 text-center text-sm text-[var(--gray-500)]">
            Sem requisições a aguardar recepção de amostras.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const items = Array.isArray(row.items) ? row.items : []
              const pendentes = items.filter((item: any) => item.exam && item.sample_status === "coletada").length
              return (
                <Link
                  key={row.id}
                  href={`/laboratory/sample-reception/${row.id}`}
                  className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm transition hover:border-[var(--primary-300)] hover:bg-[var(--gray-50)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-semibold text-[var(--primary-700)]">{row.custom_id}</div>
                    <div className="text-sm text-[var(--text)]">
                      {row.patient_name}
                      {row.patient_age ? <span className="text-[var(--gray-500)]"> · {row.patient_age}</span> : null}
                    </div>
                    <div className="text-xs text-[var(--gray-500)]">Coleta: {formatDateTime(row.collected_at)}</div>
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    {pendentes} {pendentes === 1 ? "amostra" : "amostras"} por conferir
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
