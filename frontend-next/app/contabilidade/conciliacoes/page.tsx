"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type ConciliacaoRow = Record<string, any>

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

export default function ContabilidadeConciliacoesPage() {
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ConciliacaoRow[]>([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)
        const res = await apiFetch<any>("/contabilidade/conciliacaofinanceira/")
        const items = res && (res as any).results ? (res as any).results : res
        if (!mounted) return
        setData(Array.isArray(items) ? items : [])
      } catch (e: any) {
        if (!mounted) return
        setErro(e?.message || "Falha ao carregar conciliações.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const columns = useMemo(
    () => [
      { header: "Código", render: (c: ConciliacaoRow) => c.id_custom || c.id || "-" },
      { header: "Estado", render: (c: ConciliacaoRow) => c.estado || c.status || "-" },
      { header: "Data", render: (c: ConciliacaoRow) => fmtDate(c.criado_em || c.data) },
      { header: "Descrição", render: (c: ConciliacaoRow) => c.descricao || c.observacao || "-" },
    ],
    []
  )

  return (
    <AppLayout
      requiredGroups={[
        GROUPS.ADMIN,
        GROUPS.CONTABILIDADE,
      ]}
    >
      <div className="space-y-6">
        <PageHeader
          title="Conciliações"
          subtitle="Conciliação financeira e auditoria."
          actions={
            <Link
              href="/admin/contabilidade/conciliacaofinanceira/"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Abrir no admin
            </Link>
          }
        />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <DataTable<ConciliacaoRow>
            columns={columns as any}
            data={data}
            emptyMessage="Nenhuma conciliação encontrada."
          />
        )}
      </div>
    </AppLayout>
  )
}
