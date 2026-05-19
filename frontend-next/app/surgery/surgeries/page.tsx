"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useMemo, useState, useCallback } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import Pagination from "@/components/ui/Pagination"
import { apiFetchList } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { apiFetch } from "@/lib/api"

type CirurgiaRow = Record<string, any>
type SurgeryScope = "small" | "large" | "all"

const SCOPE_CONFIG: Record<
    SurgeryScope,
    { label: string; endpoint: string; resourceKey: string; adminHref: string; subtitle: string }
> = {
    small: {
        label: "Pequenas",
        endpoint: "/surgery/pequenacirurgia/",
        resourceKey: "pequenacirurgia",
        adminHref: "/admin/surgery/smallsurgery/",
        subtitle: "Agendadas e realizadas (pequenas).",
    },
    large: {
        label: "Grandes",
        endpoint: "/surgery/grandecirurgia/",
        resourceKey: "grandecirurgia",
        adminHref: "/admin/surgery/largesurgery/",
        subtitle: "Agendadas e realizadas (grandes).",
    },
    all: {
        label: "Todas",
        endpoint: "/surgery/surgery/",
        resourceKey: "cirurgia",
        adminHref: "/admin/surgery/surgery/",
        subtitle: "Agendadas e realizadas (visão consolidada).",
    },
}

function fmtDateTime(value: any): string {
    if (!value) return "-"
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleString()
}

function resolveResourceKey(row: CirurgiaRow): string {
    const size = String(row.porte_cirurgia || row.surgery_size || "").toUpperCase()
    if (size === "GRANDE") return "grandecirurgia"
    if (size === "PEQUENA") return "pequenacirurgia"
    return "cirurgia"
}

function fmtSurgerySize(row: CirurgiaRow): string {
    const size = String(row.porte_cirurgia || row.surgery_size || "").toUpperCase()
    if (size === "PEQUENA") return "Pequena"
    if (size === "GRANDE") return "Grande"
    return "-"
}

export default function CirurgiaCirurgiasPage() {
    const { user } = useAuth()
    const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])

    const [erro, setErro] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<CirurgiaRow[]>([])
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(50)
    const [totalItems, setTotalItems] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [acaoId, setAcaoId] = useState<number | null>(null)
    const [scope, setScope] = useState<SurgeryScope>("small")

    const scopeConfig = SCOPE_CONFIG[scope]
    const defaultResourceKey = scopeConfig.resourceKey

    useEffect(() => {
        let mounted = true
        async function load() {
            try {
                setLoading(true)
                setErro(null)
                const { items, meta } = await apiFetchList<CirurgiaRow>(scopeConfig.endpoint, {
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
                setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar cirurgias."))
            } finally {
                if (mounted) setLoading(false)
            }
        }
        load()
        return () => {
            mounted = false
        }
    }, [page, pageSize, scopeConfig.endpoint])

    const abrirPdf = useCallback(async (faturaId: number) => {
        try {
            setAcaoId(faturaId)
            const blob = await apiFetch<Blob>(`/invoices/${faturaId}/pdf/`, { responseType: "blob" })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `fatura_${faturaId}.pdf`
            a.click()
            window.URL.revokeObjectURL(url)
        } catch (e: any) {
            setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao gerar PDF."))
        } finally {
            setAcaoId(null)
        }
    }, [])

    const columns = useMemo(
        () => [
            {
                header: "Código",
                render: (c: CirurgiaRow) => (
                    <Link
                        href={`/resources/surgery/${resolveResourceKey(c)}/${c.id}`}
                        className="font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--gray-300)]"
                    >
                        {c.id_custom || c.id || "-"}
                    </Link>
                ),
            },
            { header: "Paciente", render: (c: CirurgiaRow) => c.paciente_nome || "-" },
            { header: "Cirurgião", render: (c: CirurgiaRow) => c.cirurgiao_nome || "-" },
            { header: "Porte", render: (c: CirurgiaRow) => fmtSurgerySize(c) },
            { header: "Estado", render: (c: CirurgiaRow) => c.estado || "-" },
            { header: "Agendada", render: (c: CirurgiaRow) => fmtDateTime(c.agendada_para) },
            {
                header: "Fatura",
                render: (c: CirurgiaRow) => c.fatura_codigo || "—",
            },
            {
                header: "Ações",
                render: (c: CirurgiaRow) => (
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href={`/resources/surgery/${resolveResourceKey(c)}/${c.id}`}
                            className="inline-flex items-center rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-50)]"
                        >
                            Abrir
                        </Link>
                        {c.fatura_id ? (
                            <button
                                type="button"
                                onClick={() => abrirPdf(c.fatura_id)}
                                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-50)]"
                            >
                                PDF
                            </button>
                        ) : (
                            <span className="text-xs text-gray-500">—</span>
                        )}
                    </div>
                ),
            },
        ],
        [abrirPdf]
    )

    return (
        <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]}>
            <div className="space-y-6">
                <PageHeader
                    title={`Cirurgias (${scopeConfig.label})`}
                    subtitle={scopeConfig.subtitle}
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] p-1">
                                {(Object.keys(SCOPE_CONFIG) as SurgeryScope[]).map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => {
                                            setScope(option)
                                            setPage(1)
                                        }}
                                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                                            scope === option
                                                ? "bg-[var(--primary-600)] text-white"
                                                : "text-[var(--gray-700)] hover:bg-[var(--gray-100)]"
                                        }`}
                                    >
                                        {SCOPE_CONFIG[option].label}
                                    </button>
                                ))}
                            </div>
                            <Link
                                href="/resources/surgery/pequenacirurgia/new"
                                className="inline-flex items-center rounded-xl bg-[var(--primary-600)] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)]"
                            >
                                Nova pequena
                            </Link>
                            <Link
                                href="/resources/surgery/grandecirurgia/new"
                                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-100)]"
                            >
                                Nova grande
                            </Link>
                            <Link
                                href={`/resources/surgery/${defaultResourceKey}`}
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
                            {podeVerAdmin ? (
                                <Link
                                    href={scopeConfig.adminHref}
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
                        <DataTable<CirurgiaRow>
                            columns={columns as any}
                            data={data}
                            emptyMessage="Nenhuma cirurgia encontrada."
                        />
                        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                    </>
                )}
            </div>
        </AppLayout>
    )
}



