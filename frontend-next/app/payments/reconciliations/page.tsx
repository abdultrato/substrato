"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import Pagination from "@/components/ui/Pagination"
import { apiFetchList } from "@/lib/api"
import { confirmarReconciliacao } from "@/lib/api/payments"
import { GROUPS } from "@/lib/rbac"

type ReconcRow = Record<string, any>

function fmtDateTime(value: any): string {
    if (!value) return "-"
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleString()
}

export default function PagamentosReconciliacoesPage() {
    const [erro, setErro] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<ReconcRow[]>([])
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(50)
    const [totalItems, setTotalItems] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [acaoEmCurso, setAcaoEmCurso] = useState<string | null>(null)

    const carregar = useCallback(async () => {
        const { items, meta } = await apiFetchList<ReconcRow>("/payments/reconciliation/", {
            page,
            pageSize,
        })
        const total = meta.total ?? items.length
        const computedTotalPages =
            meta.totalPages ??
            (total && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1)
        setData(items)
        setTotalItems(total || 0)
        setTotalPages(computedTotalPages)
        if (page > computedTotalPages) setPage(computedTotalPages)
    }, [page, pageSize])

    useEffect(() => {
        let mounted = true
        async function load() {
            try {
                setLoading(true)
                setErro(null)
                await carregar()
            } catch (e: any) {
                if (!mounted) return
                setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar reconciliações."))
            } finally {
                if (mounted) setLoading(false)
            }
        }
        load()
        return () => {
            mounted = false
        }
    }, [carregar])

    const confirmar = useCallback(async (id: number) => {
        const key = `confirmar:${id}`
        try {
            setAcaoEmCurso(key)
            setErro(null)
            await confirmarReconciliacao(id)
            await carregar()
        } catch (e: any) {
            setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao confirmar reconciliação."))
        } finally {
            setAcaoEmCurso(null)
        }
    }, [carregar])

    const columns = useMemo(
        () => [
            {
                header: "ID",
                render: (r: ReconcRow) => (
                    <Link
                        href={`/resources/payments/reconciliation/${r.id}`}
                        className="font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--gray-300)]"
                    >
                        {r.id || "-"}
                    </Link>
                ),
            },
            { header: "Transação", render: (r: ReconcRow) => r.transacao || r.transaction || "-" },
            { header: "Confirmado", render: (r: ReconcRow) => ((r.confirmado ?? r.confirmed) ? "Sim" : "Não") },
            { header: "Confirmado em", render: (r: ReconcRow) => fmtDateTime(r.data_confirmacao || r.confirmation_date) },
            { header: "Criado em", render: (r: ReconcRow) => fmtDateTime(r.criado_em || r.created_at) },
            {
                header: "Ações",
                render: (r: ReconcRow) => {
                    const id = Number(r.id)
                    const confirmado = Boolean(r.confirmado ?? r.confirmed)
                    const key = `confirmar:${id}`
                    if (confirmado) {
                        return <span className="text-xs text-slate-500">Confirmado</span>
                    }
                    return (
                        <button
                            className="inline-flex items-center rounded-lg border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                            disabled={acaoEmCurso !== null}
                            onClick={() => confirmar(id)}
                        >
                            {acaoEmCurso === key ? "Confirmando..." : "Confirmar"}
                        </button>
                    )
                },
            },
        ],
        [acaoEmCurso, confirmar]
    )

    return (
        <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE]}>
            <div className="space-y-6">
                <PageHeader
                    title="Reconciliações"
                    subtitle="Estado de conciliação por transação."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href="/resources/payments/reconciliation/new"
                                className="inline-flex items-center rounded-xl bg-[var(--primary-600)] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)]"
                            >
                                Novo
                            </Link>
                            <Link
                                href="/resources/payments/reconciliacao"
                                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
                            >
                                Gerenciamento
                            </Link>
                            <Link
                                href="/payments"
                                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
                            >
                                Voltar
                            </Link>
                        </div>
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
                        <DataTable<ReconcRow>
                            columns={columns as any}
                            data={data}
                            emptyMessage="Nenhuma reconciliação encontrada."
                        />
                        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                    </>
                )}
            </div>
        </AppLayout>
    )
}



