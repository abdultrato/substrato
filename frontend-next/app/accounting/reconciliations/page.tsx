"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

type ConciliacaoRow = Record<string, any>

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

export default function ContabilidadeConciliacoesPage() {
  const { user } = useAuth()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ConciliacaoRow[]>([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)
        const res = await apiFetch<any>("/accounting/financialreconciliation/", {
          clientCache: safeRefreshToken === 0,
        })
        const items = res && (res as any).results ? (res as any).results : res
        if (!mounted) return
        setData(Array.isArray(items) ? items : [])
      } catch (e: any) {
        if (!mounted) return
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar conciliações."))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [safeRefreshToken])

  const columns = useMemo(
    () => [
      {
        header: "Código",
        render: (c: ConciliacaoRow) => (
          <Link
            href={`/accounting/reconciliations/${c.id}`}
            className="font-medium text-[var(--text)] no-underline decoration-[var(--border)] underline-offset-2 hover:underline hover:decoration-[var(--gray-300)]"
          >
            {c.id_custom || c.id || "-"}
          </Link>
        ),
      },
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
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/accounting/reconciliations/new"
                className="inline-flex items-center rounded-xl bg-[var(--primary-600)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)]"
              >
                Criar conciliação
              </Link>
              <Link
                href="/accounting/reconciliations"
                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
              >
                CRUD
              </Link>
              {podeVerAdmin ? (
                <Link
                  href="/admin/accounting/financialreconciliation/"
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
                >
                  Admin
                </Link>
              ) : null}
            </div>
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




