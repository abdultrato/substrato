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
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

type PrescricaoItemRow = Record<string, any>

export default function ProntuarioPrescricoesPage() {
    const { user } = useAuth()
    const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])

    const [erro, setErro] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<PrescricaoItemRow[]>([])
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
                const { items, meta } = await apiFetchList<PrescricaoItemRow>("/medical-records/prescricaoitem/", {
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
                setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar itens de prescrição."))
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
                header: "Código",
                render: (r: PrescricaoItemRow) => (
                    <Link
                        href={`/resources/medical-records/prescricaoitem/${r.id}`}
                        className="font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--gray-300)]"
                    >
                        {r.id_custom || r.id || "-"}
                    </Link>
                ),
            },
            {
                header: "Cardex",
                render: (r: PrescricaoItemRow) => r.registro || "-",
            },
            {
                header: "Medicação",
                render: (r: PrescricaoItemRow) => r.medicacao_nome || r.medicacao || "-",
            },
            {
                header: "Dose",
                render: (r: PrescricaoItemRow) =>
                    r.dosagem_valor ? `${r.dosagem_valor}${r.dosagem_unidade || ""}` : "-",
            },
            {
                header: "Esquema",
                render: (r: PrescricaoItemRow) => {
                    const n = r.numero_doses ?? "-"
                    const i = r.intervalo_horas ? `a cada ${r.intervalo_horas}h` : "dose única"
                    return `${n} dose(s) · ${i}`
                },
            },
        ],
        []
    )

    return (
        <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]}>
            <div className="space-y-6">
                <PageHeader
                    title="Itens de prescrição"
                    subtitle="Prescrição estruturada vinculada ao Cardex."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href="/resources/medical-records/prescricaoitem/new"
                                className="inline-flex items-center rounded-xl bg-[var(--primary-600)] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)]"
                            >
                                Criar item de prescrição
                            </Link>
                            <Link
                                href="/resources/medical-records/prescricaoitem"
                                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
                            >
                                Gerenciamento
                            </Link>
                            <Link
                                href="/medical-records"
                                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
                            >
                                Voltar
                            </Link>
                            {podeVerAdmin ? (
                                <Link
                                    href="/admin/medical-records/prescriptionitem/"
                                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
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
                        <DataTable<PrescricaoItemRow>
                            columns={columns as any}
                            data={data}
                            emptyMessage="Nenhum item de prescrição encontrado."
                        />
                        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                    </>
                )}
            </div>
        </AppLayout>
    )
}



