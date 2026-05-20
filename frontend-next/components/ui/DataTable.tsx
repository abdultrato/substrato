"use client"

import { ReactNode, useMemo, useState } from "react"
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
}

export default function DataTable<T> ( {
    columns,
    data,
    emptyMessage = "Nenhum registro encontrado.",
    searchable = true,
    searchPlaceholder,
    searchKeys = [],
}: Props<T> ) {
    const { t, tr } = useLanguage()
    const [query, setQuery] = useState("")

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
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2">
                    <div className="relative min-w-[220px] flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={searchPlaceholder || t("Pesquisar na listagem...", "Search in listing...")}
                            className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm text-foreground shadow-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                            {t("Resultados:", "Results:")} {filteredData.length}/{data.length}
                        </span>
                        {query.trim() ? (
                            <button
                                type="button"
                                onClick={() => setQuery("")}
                                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-xs font-semibold text-foreground-2 transition hover:bg-muted"
                            >
                                <RotateCcw size={12} />
                                {t("Limpar", "Clear")}
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                <table className="min-w-full text-sm">
                    <thead className="bg-muted text-muted-foreground">
                        <tr>
                            {columns.map( ( col, idx ) => (
                                <th
                                    key={idx}
                                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                                >
                                    {tr(col.header)}
                                </th>
                            ) )}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-border">
                        {filteredData.length ? (
                            filteredData.map( ( row, i ) => (
                                <tr key={i} className="transition-colors hover:bg-muted/60">
                                    {columns.map( ( col, idx ) => (
                                        <td
                                            key={idx}
                                            className={`px-3 py-2 align-top ${col.className ?? ""}`}
                                        >
                                            {(() => {
                                                const value = col.render
                                                    ? col.render( row )
                                                    : ( row[col.accessor as keyof T] as ReactNode )
                                                return typeof value === "string" ? tr(value) : value
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
