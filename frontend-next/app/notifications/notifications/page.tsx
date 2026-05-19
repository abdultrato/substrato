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

type NotifRow = Record<string, any>

function fmtDateTime(value: any): string {
    if (!value) return "-"
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleString()
}

function truncate(value: any, max = 70): string {
    const v = String(value ?? "").trim()
    if (!v) return "-"
    if (v.length <= max) return v
    return `${v.slice(0, Math.max(0, max - 3))}...`
}

export default function NotificacoesListaPage() {
    const [erro, setErro] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<NotifRow[]>([])
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(50)
    const [totalItems, setTotalItems] = useState(0)
    const [totalPages, setTotalPages] = useState(1)

    useEffect(() => {
        let mounted = true
        async function load() {
            try {
                setLoading(true)
                setErro(null)
                const { items, meta } = await apiFetchList<NotifRow>("/notifications/notificacao/", {
                    page,
                    pageSize,
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
                setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar notificações."))
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
                render: (n: NotifRow) => (
                    <Link
                        href={`/resources/notifications/notificacao/${n.id}`}
                        className="font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--gray-300)]"
                    >
                        {n.id || "-"}
                    </Link>
                ),
            },
            { header: "Canal", render: (n: NotifRow) => n.canal || "-" },
            { header: "Evento", render: (n: NotifRow) => n.tipo_evento || "-" },
            { header: "Destinatário", render: (n: NotifRow) => truncate(n.destinatario, 35) },
            { header: "Enviada", render: (n: NotifRow) => (n.enviada ? "Sim" : "Não") },
            { header: "Enviado em", render: (n: NotifRow) => fmtDateTime(n.enviado_em) },
            { header: "Criado em", render: (n: NotifRow) => fmtDateTime(n.criado_em) },
        ],
        []
    )

    return (
        <AppLayout requiredGroups={[GROUPS.ADMIN]}>
            <div className="space-y-6">
                <PageHeader
                    title="Notificações"
                    subtitle="Mensagens registradas no sistema."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href="/resources/notifications/notificacao/new"
                                className="inline-flex items-center rounded-xl bg-[var(--primary-600)] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)]"
                            >
                                Novo
                            </Link>
                            <Link
                                href="/resources/notifications/notificacao"
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
                                href="/admin/notifications/notification/"
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
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </label>
                </div>

                {loading ? (
                    <div className="text-sm text-gray-500">Carregando...</div>
                ) : (
                    <>
                        <DataTable<NotifRow>
                            columns={columns as any}
                            data={data}
                            emptyMessage="Nenhuma notificação encontrada."
                        />
                        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                    </>
                )}
            </div>
        </AppLayout>
    )
}



