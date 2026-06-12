"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetchList } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import Pagination from "@/components/ui/Pagination"

type ExameMedicoRow = Record<string, any>

export default function ExamesMedicosPage() {
  const { user } = useAuth()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ExameMedicoRow[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)
        const { items, meta } = await apiFetchList<ExameMedicoRow>(
          "/clinical/medicalexam/",
          { page, pageSize, clientPaginate: true, clientCache: safeRefreshToken === 0 }
        )
        const total = meta.total ?? items.length
        const computedTotalPages =
          meta.totalPages ??
          (total && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1)
        if (!mounted) return
        setData(items)
        setTotalItems(total || 0)
        setTotalPages(computedTotalPages)
        if (page > computedTotalPages) setPage(computedTotalPages)
      } catch (e: any) {
        if (!mounted) return
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar exames médicos."))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [page, pageSize, safeRefreshToken])

  const columns = useMemo(
    () => [
      { header: "Código", render: (e: ExameMedicoRow) => e.id_custom || e.id || "-" },
      { header: "Nome", render: (e: ExameMedicoRow) => e.nome || "-" },
      { header: "Setor", render: (e: ExameMedicoRow) => e.setor || "-" },
      { header: "Método", render: (e: ExameMedicoRow) => e.metodo || "-" },
    ],
    []
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA]}>
      <div className="space-y-6">
        <PageHeader
          title="Exames médicos"
          subtitle="Catálogo de exames médicos (imagem/diagnóstico), conforme backend."
          actions={
            podeVerAdmin ? (
              <Link
                href="/admin/clinical/medicalexam/"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                Abrir na Administração
              </Link>
            ) : null
          }
        />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">Total: {totalItems}</div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <span>Por página</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPage(1)
                setPageSize(Number(e.target.value))
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
            >
              <option value={20}>20</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <>
            <DataTable<ExameMedicoRow>
              columns={columns as any}
              data={data}
              emptyMessage="Nenhum exame médico encontrado."
            />
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </AppLayout>
  )
}




