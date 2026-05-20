"use client"

import { ReactNode } from "react"
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
}

export default function DataTable<T> ( {
    columns,
    data,
    emptyMessage = "Nenhum registro encontrado.",
}: Props<T> ) {
    const { tr } = useLanguage()

    if ( !data.length ) {
        return (
            <div className="py-6 text-center text-sm text-muted-foreground">
                {tr(emptyMessage)}
            </div>
        )
    }

    return (
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
                    {data.map( ( row, i ) => (
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
                    ) )}
                </tbody>
            </table>
        </div>
    )
}
