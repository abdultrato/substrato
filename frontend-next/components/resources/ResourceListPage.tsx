"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { apiFetch } from "@/lib/api"

type Row = Record<string, any>

function pickLabel(row: Row): string {
  const candidates = [
    "nome",
    "descricao",
    "identificador",
    "dominio",
    "token",
    "numero",
    "referencia_externa",
    "estado",
    "status",
  ]
  for (const key of candidates) {
    const v = row?.[key]
    if (typeof v === "string" && v.trim()) return v
  }
  return ""
}

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

export default function ResourceListPage({
  title,
  endpoint,
  adminListHref,
}: {
  title: string
  endpoint: string
  adminListHref?: string
}) {
  const { loading } = useAuthGuard()
  const [data, setData] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoadingData(true)
        setError(null)
        const res = await apiFetch<any>(endpoint)
        const items = res && (res as any).results ? (res as any).results : res
        if (mounted) setData(Array.isArray(items) ? items : [])
      } catch (e: any) {
        if (mounted) setError(e?.message || "Falha ao carregar dados.")
      } finally {
        if (mounted) setLoadingData(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [endpoint])

  const columns = useMemo(
    () => [
      {
        header: "Código",
        render: (row: Row) => row.id_custom || row.id || "-",
      },
      {
        header: "Nome",
        render: (row: Row) => pickLabel(row) || "-",
      },
      {
        header: "Estado",
        render: (row: Row) =>
          row.estado || row.status || row.status_comercial || "-",
      },
      {
        header: "Criado em",
        render: (row: Row) => fmtDate(row.criado_em),
      },
    ],
    []
  )

  if (loading) return null

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title={title}
          subtitle={endpoint}
          actions={
            adminListHref ? (
              <Link
                href={adminListHref}
                className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Abrir no admin
              </Link>
            ) : null
          }
        />

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        )}

        {loadingData ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <DataTable<Row>
            columns={columns as any}
            data={data}
            emptyMessage="Nenhum registro encontrado."
          />
        )}
      </div>
    </AppLayout>
  )
}

