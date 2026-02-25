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
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="bg-gray-50 text-left">
                        {columns.map( ( col, idx ) => (
                            <th
                                key={idx}
                                className={`px-3 py-2 font-medium text-gray-600 ${col.className || ""}`}
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
                                className="text-center py-6 text-gray-400"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map( ( row, i ) => (
                            <tr
                                key={i}
                                className="border-t hover:bg-gray-50 transition"
                            >
                                {columns.map( ( col, j ) => (
                                    <td key={j} className="px-3 py-2">
                                        {renderCell( row, col )}
                                    </td>
                                ) )}
                            </tr>
                        ) )
                    )}
                </tbody>
            </table>
        </div>
    )
}
