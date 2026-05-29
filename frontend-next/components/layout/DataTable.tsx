"use client"

interface Column<T> {
    header: string
    accessor: keyof T | ( ( row: T ) => React.ReactNode )
    className?: string
}

interface Props<T> {
    data: T[]
    columns: Column<T>[]
    emptyMessage?: string
}

export default function DataTable<T> ( {
    data,
    columns,
    emptyMessage = "Nenhum registro encontrado",
}: Props<T> ) {
    function renderCell ( row: T, column: Column<T> ) {
        if ( typeof column.accessor === "function" ) {
            return column.accessor( row )
        }
        return String( row[column.accessor] ?? "" )
    }

    return (
        <div>
            <div className="space-y-2 md:hidden">
                {data.length === 0 ? (
                    <div className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
                        {emptyMessage}
                    </div>
                ) : (
                    data.map((row, i) => (
                        <article key={i} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                            <div className="space-y-3">
                                {columns.map((col, j) => (
                                    <div key={j} className={j === 0 ? "space-y-1" : "grid grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] gap-2"}>
                                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            {col.header}
                                        </div>
                                        <div className={`${j === 0 ? "text-sm font-semibold text-foreground" : "min-w-0 text-sm text-foreground"} ${col.className || ""}`}>
                                            {renderCell(row, col)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </article>
                    ))
                )}
            </div>

            <div className="hidden overflow-x-auto rounded-lg border border-border bg-card shadow-sm md:block">
                <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-muted text-left text-muted-foreground">
                            {columns.map( ( col, idx ) => (
                                <th
                                    key={idx}
                                    className={`whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide ${col.className || ""}`}
                                >
                                    {col.header}
                                </th>
                            ) )}
                        </tr>
                    </thead>

                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="py-6 text-center text-muted-foreground"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            data.map( ( row, i ) => (
                                <tr
                                    key={i}
                                    className="border-t border-border transition-colors hover:bg-muted/55"
                                >
                                    {columns.map( ( col, j ) => (
                                        <td key={j} className="px-3 py-2.5">
                                            {renderCell( row, col )}
                                        </td>
                                    ) )}
                                </tr>
                            ) )
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
