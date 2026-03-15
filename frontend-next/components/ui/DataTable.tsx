"use client"

import { ReactNode } from "react"

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
    if ( !data.length ) {
        return (
            <div className="text-center py-6 text-sm text-[var(--gray-500)]">
                {emptyMessage}
            </div>
        )
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
            <table className="min-w-full text-sm">
                <thead className="bg-[var(--gray-100)] text-[var(--gray-700)]">
                    <tr>
                        {columns.map( ( col, idx ) => (
                            <th
                                key={idx}
                                className="text-left font-medium px-2 py-1.5"
                            >
                                {col.header}
                            </th>
                        ) )}
                    </tr>
                </thead>

                <tbody className="divide-y">
                    {data.map( ( row, i ) => (
                        <tr key={i} className="hover:bg-[var(--gray-100)]">
                            {columns.map( ( col, idx ) => (
                                <td
                                    key={idx}
                                    className={`px-2 py-1.5 ${col.className ?? ""}`}
                                >
                                    {col.render
                                        ? col.render( row )
                                        : ( row[col.accessor as keyof T] as ReactNode )}
                                </td>
                            ) )}
                        </tr>
                    ) )}
                </tbody>
            </table>
        </div>
    )
}
