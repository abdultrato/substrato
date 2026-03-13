"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type LancamentoRow = Record<string, any>

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

export default function ContabilidadeLancamentosPage() {
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<LancamentoRow[]>([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)
        const res = await apiFetch<any>("/contabilidade/lancamento/")
        const items = res && (res as any).results ? (res as any).results : res
        if (!mounted) return
        setData(Array.isArray(items) ? items : [])
      } catch (e: any) {
        if (!mounted) return
        setErro(e?.message || "Falha ao carregar lançamentos.")
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
      { header: "Código", render: (l: LancamentoRow) => l.id_custom || l.id || "-" },
      { header: "Conta", render: (l: LancamentoRow) => l.conta || "-" },
      { header: "Valor", render: (l: LancamentoRow) => l.valor ?? l.montante ?? "-" },
      { header: "Data", render: (l: LancamentoRow) => fmtDate(l.data || l.criado_em) },
      { header: "Descrição", render: (l: LancamentoRow) => l.descricao || l.observacao || "-" },
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
          title="Lançamentos"
          subtitle="Lançamentos contabilísticos e histórico."
          actions={
            <Link
              href="/admin/contabilidade/lancamento/"
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
          <DataTable<LancamentoRow>
            columns={columns as any}
            data={data}
            emptyMessage="Nenhum lançamento encontrado."
          />
        )}
      </div>
    </AppLayout>
  )
}
