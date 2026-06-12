"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import Pagination from "@/components/ui/Pagination"
import { apiFetchList } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type LogRow = Record<string, any>

function fmtDateTime(value: any): string {
    if (!value) return "-"
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleString()
}

function truncate(value: any, max = 80): string {
    const v = String(value ?? "").trim()
    if (!v) return "-"
    if (v.length <= max) return v
    return `${v.slice(0, Math.max(0, max - 3))}...`
}

export default function NotificacoesLogsPage() {
    const [erro, setErro] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<LogRow[]>([])
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
                const { items, meta } = await apiFetchList<LogRow>("/notifications/logenvio/", {
                    page,
                    pageSize,
                    clientPaginate: true,
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
                setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar logs de envio."))
            } finally {
                if (mounted) setLoading(false)
            }
        }
        load()
        return () => {
            mounted = false
        }
    }, [page, pageSize])

    const columns = useMemo(
        () => [
            {
                header: "ID",
                render: (l: LogRow) => (
                    <Link
                        href={`/resources/notifications/logenvio/${l.id}`}
                        className="font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--gray-300)]"
                    >
                        {l.id || "-"}
                    </Link>
                ),
            },
            { header: "Notificação", render: (l: LogRow) => l.notificacao || "-" },
            { header: "Status", render: (l: LogRow) => l.status || "-" },
            { header: "Resposta", render: (l: LogRow) => truncate(l.resposta, 60) },
            { header: "Criado em", render: (l: LogRow) => fmtDateTime(l.criado_em) },
        ],
        []
    )

    return (
        <AppLayout requiredGroups={[GROUPS.ADMIN]}>
            <div className="space-y-6">
                <PageHeader
                    title="Logs de envio"
                    subtitle="Rastreabilidade dos envios (sucesso/erro/ignorado)."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href="/resources/notifications/logenvio"
                                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
                            >
                                Gerenciamento
                            </Link>
                            <Link
                                href="/notifications"
                                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
                            >
                                Voltar
                            </Link>
                            <Link
                                href="/admin/notifications/deliverylog/"
                                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
                            >
                                Admin
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
                        </select>
                    </label>
                </div>

                {loading ? (
                    <div className="text-sm text-gray-500">Carregando...</div>
                ) : (
                    <>
                        <DataTable<LogRow>
                            columns={columns as any}
                            data={data}
                            emptyMessage="Nenhum log encontrado."
                        />
                        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                    </>
                )}
            </div>
        </AppLayout>
    )
}



