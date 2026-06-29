"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, LayoutList, Search, Settings2 } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import Pagination from "@/components/ui/Pagination"
import { apiFetchList } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

type RegistroRow = Record<string, any>

function fmtDateTime(value: any): string {
    if (!value) return "-"
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleString()
}

export default function ProntuarioCardexPage() {
    const { user } = useAuth()
    const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])

    const [erro, setErro] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<RegistroRow[]>([])
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [query, setQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [totalItems, setTotalItems] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const safeRefreshToken = useSafeDataRefreshSignal()

    useEffect(() => {
        let mounted = true
        async function load() {
            try {
                setLoading(true)
                setErro(null)
                const { items, meta } = await apiFetchList<RegistroRow>("/medical-records/registro/", {
                    page,
                    pageSize,
                    clientPaginate: true,
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
                setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar Cardex."))
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
                render: (r: RegistroRow) => (
                    <Link
                        href={`/medical-records/records/${r.id}`}
                        className="font-medium text-[var(--text)] no-underline decoration-[var(--border)] underline-offset-2 hover:underline hover:decoration-[var(--gray-300)]"
                    >
                        {r.id_custom || r.id || "-"}
                    </Link>
                ),
            },
            { header: "Paciente", render: (r: RegistroRow) => r.paciente_nome || "-" },
            { header: "Médico", render: (r: RegistroRow) => r.medico_nome || "-" },
            { header: "Estado", render: (r: RegistroRow) => r.estado || "-" },
            { header: "Início", render: (r: RegistroRow) => fmtDateTime(r.inicio_atendimento) },
        ],
        []
    )

    const filteredData = useMemo(() => {
        const normalized = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
        return data.filter((row) => {
            const matchesStatus = statusFilter === "all" || String(row.estado || "").trim() === statusFilter
            if (!matchesStatus) return false
            if (!normalized) return true
            return [
                row.id_custom,
                row.id,
                row.paciente_nome,
                row.medico_nome,
                row.estado,
                row.inicio_atendimento,
            ]
                .filter(Boolean)
                .some((value) =>
                    String(value)
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .toLowerCase()
                        .includes(normalized),
                )
        })
    }, [data, query, statusFilter])

    const availableStatuses = useMemo(
        () =>
            Array.from(
                new Set(
                    data
                        .map((row) => String(row.estado || "").trim())
                        .filter(Boolean),
                ),
            ).sort((a, b) => a.localeCompare(b, "pt")),
        [data],
    )

    return (
        <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]}>
            <div className="space-y-6">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/75 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/45">
                    <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-sky-500 via-cyan-500 to-teal-400" />
                    <div className="flex flex-wrap items-start justify-between gap-3 pl-2">
                        <div className="min-w-0 space-y-1">
                            <h1 className="text-lg font-bold text-foreground">Cardex</h1>
                            <p className="text-sm text-muted-foreground">Registros do prontuário (Cardex).</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href="/medical-records/records/new"
                                className="inline-flex items-center rounded-xl bg-[var(--primary-600)] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)]"
                            >
                                Criar Cardex
                            </Link>
                            <Link
                                href="/medical-records/records"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-card/60 px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-muted/55"
                            >
                                <Settings2 size={15} />
                                Gerenciamento
                            </Link>
                            <Link
                                href="/medical-records"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-card/60 px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-muted/55"
                            >
                                <ArrowLeft size={15} />
                                Voltar
                            </Link>
                            {podeVerAdmin ? (
                                <Link
                                    href="/admin/medical-records/medicalrecordentry/"
                                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-900"
                                >
                                    Admin
                                </Link>
                            ) : null}
                        </div>
                    </div>
                </div>

                {erro ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {erro}
                    </div>
                ) : null}

                <div className="flex flex-wrap gap-4">
                    <div className="group relative min-w-[220px] flex-1 basis-[220px] overflow-hidden rounded-xl border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/45">
                        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-sky-500 via-cyan-500 to-teal-400" />
                        <div className="flex items-center justify-between gap-3 p-4 pl-6">
                            <div>
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total</div>
                                <div className="mt-0.5 font-display text-xl font-bold text-foreground tabular-nums">{totalItems}</div>
                            </div>
                            <LayoutList className="text-sky-600 dark:text-sky-400" size={18} />
                        </div>
                    </div>

                    <div className="group relative min-w-[280px] flex-1 basis-[320px] overflow-hidden rounded-xl border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/45">
                        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-violet-500 via-fuchsia-500 to-pink-400" />
                        <div className="space-y-3 p-4 pl-6">
                            <div className="flex items-center justify-between gap-3">
                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                                    <span>Por página</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={999}
                                        value={pageSize}
                                        onChange={(e) => {
                                            const next = Number(e.target.value)
                                            if (!Number.isFinite(next)) return
                                            setPage(1)
                                            setPageSize(Math.max(1, Math.min(999, next)))
                                        }}
                                        className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                                    />
                                </label>
                                <Settings2 className="text-violet-600 dark:text-violet-400" size={18} />
                            </div>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground" size={15} />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Pesquisar registros..."
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-700 dark:text-slate-200">Estado</span>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setPage(1)
                                        setStatusFilter(e.target.value)
                                    }}
                                    className="min-w-[180px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                                >
                                    <option value="all">Todos</option>
                                    {availableStatuses.map((status) => (
                                        <option key={status} value={status}>
                                            {status}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Resultados: {filteredData.length}/{data.length}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative basis-full overflow-hidden rounded-xl border border-slate-200/70 bg-white/60 shadow-sm backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/40">
                    <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-indigo-500 via-blue-500 to-cyan-400" />
                    <div className="space-y-3 p-3 pl-5">
                        {loading ? (
                            <div className="text-sm text-gray-500">Carregando...</div>
                        ) : (
                            <>
                        <DataTable<RegistroRow>
                            columns={columns as any}
                            data={filteredData}
                            emptyMessage="Nenhum registro encontrado."
                            searchable={false}
                            bare
                            compact
                            rowHref={(row) => `/medical-records/records/${row.id}`}
                        />
                        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}
