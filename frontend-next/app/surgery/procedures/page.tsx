"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import Pagination from "@/components/ui/Pagination"
import { apiFetchList } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

type ProcedureRow = Record<string, any>

export default function SurgicalProceduresPage() {
    const { user } = useAuth()
    const canViewAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])

    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<ProcedureRow[]>([])
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(50)
    const [totalItems, setTotalItems] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const safeRefreshToken = useSafeDataRefreshSignal()

    useEffect(() => {
        let mounted = true
        async function load() {
            try {
                setLoading(true)
                setErrorMessage(null)
                const { items, meta } = await apiFetchList<ProcedureRow>("/surgery/surgical_procedure/", {
                    page,
                    pageSize,
                    clientCache: safeRefreshToken === 0,
                })
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
                setErrorMessage(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar procedimentos."))
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
            {
                header: "Código",
                render: (p: ProcedureRow) => (
                    <Link
                        href={`/surgery/surgical-procedures/${p.id}`}
                        className="font-medium text-[var(--text)] no-underline decoration-[var(--border)] underline-offset-2 hover:underline hover:decoration-[var(--gray-300)]"
                    >
                        {p.id_custom || p.id || "-"}
                    </Link>
                ),
            },
            { header: "Nome", render: (p: ProcedureRow) => p.nome || p.descricao || "-" },
            { header: "Ativo", render: (p: ProcedureRow) => (p.ativo === false ? "Não" : "Sim") },
        ],
        []
    )

    return (
        <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]}>
            <div className="space-y-6">
                <PageHeader
                    title="Procedimentos cirúrgicos"
                    subtitle="Catálogo (para múltiplos procedimentos por cirurgia)."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href="/surgery/surgical-procedures/new"
                                className="inline-flex items-center rounded-xl bg-[var(--primary-600)] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)]"
                            >
                                Criar procedimento cirúrgico
                            </Link>
                            <Link
                                href="/surgery/surgical-procedures"
                                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
                            >
                                Gerenciamento
                            </Link>
                            <Link
                                href="/surgery"
                                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
                            >
                                Voltar
                            </Link>
                            {canViewAdmin ? (
                                <Link
                                    href="/admin/surgery/surgicalprocedure/"
                                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
                                >
                                    Admin
                                </Link>
                            ) : null}
                        </div>
                    }
                />

                {errorMessage ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {errorMessage}
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
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm"
                        >
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </label>
                </div>

                {loading ? (
                    <div className="text-sm text-gray-500">Carregando...</div>
                ) : (
                    <>
                        <DataTable<ProcedureRow>
                            columns={columns as any}
                            data={data}
                            emptyMessage="Nenhum procedimento encontrado."
                        />
                        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                    </>
                )}
            </div>
        </AppLayout>
    )
}



