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
type Company = { id: number; name: string }

export default function LabOrdersPage() {
  useAuthGuard()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [rows, setRows] = useState<Row[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [transferId, setTransferId] = useState<number | null>(null)
  const [companyId, setCompanyId] = useState<string>("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await apiFetchList<Row>("/clinical/labrequest/?fase=pedidos&type=LAB", {
        page: 1,
        pageSize: 50,
        clientCache: false,
      })
      setRows(items)
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar pedidos.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, safeRefreshToken])

  useEffect(() => {
    apiFetchList<Company>("/external_entities/empresa/", { page: 1, pageSize: 100 })
      .then(({ items }) => setCompanies(items))
      .catch(() => setCompanies([]))
  }, [])

  async function iniciarProcessamento(row: Row) {
    setBusyId(row.id)
    setError(null)
    setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequest/${row.id}/iniciar-processamento/`, { method: "POST" })
      setFeedback(`Processamento de ${row.custom_id} iniciado — disponível nas Listas de trabalho.`)
      setRows((prev) => prev.filter((item) => item.id !== row.id))
    } catch (e: any) {
      setError(e?.message || "Falha ao iniciar processamento.")
    } finally {
      setBusyId(null)
    }
  }

  async function transferir(row: Row) {
    if (!companyId) {
      setError("Selecione a empresa/unidade de destino.")
      return
    }
    setBusyId(row.id)
    setError(null)
    setFeedback(null)
    try {
      await apiFetch(`/clinical/labrequest/${row.id}/transferir-analise/`, {
        method: "POST",
        body: JSON.stringify({ external_executing_company: Number(companyId) }),
      })
      setFeedback(`Requisição ${row.custom_id} transferida para execução externa.`)
      setTransferId(null)
      setCompanyId("")
      await load()
    } catch (e: any) {
      setError(e?.message || "Falha ao transferir a análise.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <PageHeader
          title="Pedidos"
          subtitle="Requisições com amostras conferidas, prontas para processamento ou transferência."
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
            Sem pedidos prontos para processamento.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link href={`/requests/${row.id}`} className="font-semibold text-[var(--primary-700)] hover:underline">
                      {row.custom_id}
                    </Link>
                    <div className="text-sm text-[var(--text)]">{row.patient_name}</div>
                    {row.external_executing_company_name ? (
                      <div className="text-xs text-sky-700">
                        Transferida para: {row.external_executing_company_name}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => iniciarProcessamento(row)}
                      disabled={busyId === row.id}
                      className="inline-flex h-9 items-center rounded-md bg-[var(--primary-600)] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)] disabled:opacity-60"
                    >
                      Iniciar processamento
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferId(transferId === row.id ? null : row.id)}
                      disabled={busyId === row.id}
                      className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:opacity-60"
                    >
                      Transferir análise
                    </button>
                  </div>
                </div>

                {transferId === row.id ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-sky-200 bg-sky-50/60 p-3">
                    <select
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      className="h-9 rounded-md border border-[var(--border)] bg-[var(--card)] px-2 text-xs"
                    >
                      <option value="">Empresa/unidade de destino...</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => transferir(row)}
                      disabled={busyId === row.id}
                      className="inline-flex h-9 items-center rounded-md bg-sky-600 px-3 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
                    >
                      Confirmar transferência
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
