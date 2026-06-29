"use client"

import { ReactNode, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, RotateCcw } from "lucide-react"
import { useLanguage } from "@/hooks/useLanguage"

interface Column<T> {
    header: string
    accessor?: keyof T
    render?: ( row: T ) => ReactNode
    className?: string
}

interface Props<T> {
    columns: Column<T>[]
    data: T[]
    emptyMessage?: string
    searchable?: boolean
    searchPlaceholder?: string
    searchKeys?: Array<keyof T | string>
    /** Remove a superfície opaca própria para a tabela fundir-se num cartão glass. */
    bare?: boolean
    rowHref?: (row: T) => string | undefined
    compact?: boolean
}

export default function DataTable<T> ( {
    columns,
    data,
    emptyMessage = "Nenhum registro encontrado.",
    searchable = true,
    searchPlaceholder,
    searchKeys = [],
    bare = false,
    rowHref,
    compact = false,
}: Props<T> ) {
    const { t, tr } = useLanguage()
    const router = useRouter()
    const [query, setQuery] = useState("")

    const searchWrapCls = bare
        ? "flex flex-col gap-2 rounded-lg border border-border/60 bg-white/30 px-3 py-2 backdrop-blur-sm dark:bg-white/5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
        : "flex flex-col gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
    const mobileCardCls = bare
        ? `rounded-lg border border-white/20 bg-white/30 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 ${compact ? "p-2.5" : "p-3"}`
        : `rounded-lg border border-border bg-card shadow-sm ${compact ? "p-2.5" : "p-3"}`
    const mobileEmptyCls = bare
        ? "rounded-lg border border-white/20 bg-white/30 p-4 text-sm text-muted-foreground backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
        : "rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground"
    const tableWrapCls = bare
        ? "hidden overflow-x-auto md:block"
        : "hidden overflow-x-auto rounded-lg border border-border bg-card shadow-sm md:block"
    const theadCls = bare
        ? "border-b border-border/60 text-muted-foreground"
        : "sticky top-0 z-10 bg-muted text-muted-foreground"
    const tbodyCls = bare ? "" : "divide-y divide-border"
    const rowCls = bare
        ? "border-b border-border/40 transition-colors hover:bg-white/40 dark:hover:bg-white/10"
        : "transition-colors hover:bg-muted/55"
    const isRowInteractive = typeof rowHref === "function"

    const normalizedQuery = normalizeText(query)
    const activeSearchKeys = searchKeys.map((k) => String(k))

    const filteredData = useMemo(() => {
        if (!searchable || !normalizedQuery) return data
        return data.filter((row) => {
            const haystack = activeSearchKeys.length
                ? buildRowTextWithKeys(row as Record<string, unknown>, activeSearchKeys)
                : buildRowText(row as unknown)
            return normalizeText(haystack).includes(normalizedQuery)
        })
    }, [activeSearchKeys, data, normalizedQuery, searchable])

    const showSearch = searchable && data.length > 0

    function renderCell(row: T, col: Column<T>): ReactNode {
        const value = col.render
            ? col.render(row)
            : (row[col.accessor as keyof T] as ReactNode)
        return typeof value === "string" ? tr(value) : value
    }

    if (!data.length) {
        return (
            <div className="py-6 text-center text-sm text-muted-foreground">
                {tr(emptyMessage)}
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {showSearch ? (
                <div className={searchWrapCls}>
                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={searchPlaceholder || t("Pesquisar na listagem...", "Search in listing...")}
                            className="h-9 w-full rounded-md border border-border bg-background py-2 pl-8 pr-3 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring"
                        />
                    </div>
                    <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end">
                        <span className="text-xs text-muted-foreground">
                            {t("Resultados:", "Results:")} {filteredData.length}/{data.length}
                        </span>
                        {query.trim() ? (
                            <button
                                type="button"
                                onClick={() => setQuery("")}
                                className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground-2 transition hover:bg-muted"
                            >
                                <RotateCcw size={12} />
                                {t("Limpar", "Clear")}
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <div className="space-y-2 md:hidden">
                {filteredData.length ? (
                    filteredData.map((row, i) => {
                        const href = rowHref?.(row)
                        return (
                        <article
                            key={i}
                            className={`${mobileCardCls} ${href ? "cursor-pointer transition hover:border-primary/40 hover:bg-white/40 dark:hover:bg-white/10" : ""}`}
                            onClick={href ? () => router.push(href) : undefined}
                        >
                            <div className="space-y-3">
                                {columns.map((col, idx) => (
                                    <div key={idx} className={idx === 0 ? "space-y-1" : "grid grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] gap-2"}>
                                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            {tr(col.header)}
                                        </div>
                                        <div className={`${idx === 0 ? "text-sm font-semibold text-foreground" : "min-w-0 text-sm text-foreground"} ${col.className ?? ""}`}>
                                            {renderCell(row, col)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </article>
                    )})
                ) : (
                    <div className={mobileEmptyCls}>
                        {query.trim()
                            ? t("Nenhum resultado para a pesquisa.", "No results for this search.")
                            : tr(emptyMessage)}
                    </div>
                )}
            </div>

            <div className={tableWrapCls}>
                <table className="min-w-full text-sm">
                    <thead className={theadCls}>
                        <tr>
                            {columns.map( ( col, idx ) => (
                                <th
                                    key={idx}
                                    className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide"
                                >
                                    {tr(col.header)}
                                </th>
                            ) )}
                        </tr>
                    </thead>

                    <tbody className={tbodyCls}>
                        {filteredData.length ? (
                            filteredData.map( ( row, i ) => (
                                <tr
                                    key={i}
                                    className={`${rowCls} ${isRowInteractive ? "cursor-pointer" : ""}`}
                                    onClick={isRowInteractive ? () => {
                                        const href = rowHref?.(row)
                                        if (href) router.push(href)
                                    } : undefined}
                                >
                                    {columns.map( ( col, idx ) => (
                                        <td
                                            key={idx}
                                            className={`px-3 py-2.5 align-top ${col.className ?? ""}`}
                                        >
                                            {(() => {
                                                return renderCell(row, col)
                                            })()}
                                        </td>
                                    ) )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td className="px-3 py-4 text-sm text-muted-foreground" colSpan={columns.length}>
                                    {query.trim()
                                        ? t("Nenhum resultado para a pesquisa.", "No results for this search.")
                                        : tr(emptyMessage)}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function normalizeText(value: string): string {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
}

function buildRowText(value: unknown): string {
    if (value === null || value === undefined) return ""
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return String(value)
    }
    if (Array.isArray(value)) return value.map((item) => buildRowText(item)).join(" ")
    if (typeof value === "object") {
        return Object.values(value as Record<string, unknown>)
            .map((item) => buildRowText(item))
            .join(" ")
    }
    return ""
}

function buildRowTextWithKeys(row: Record<string, unknown>, keys: string[]): string {
    return keys
        .map((key) => {
            const value = key.includes(".")
                ? key.split(".").reduce<unknown>((acc, part) => {
                    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[part]
                    return undefined
                }, row)
                : row[key]
            return buildRowText(value)
        })
        .join(" ")
}
