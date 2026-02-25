"use client"

interface Props {
    page: number
    totalPages: number
    onChange: ( page: number ) => void
    siblings?: number
}

export default function Pagination ( {
    page,
    totalPages,
    onChange,
    siblings = 1,
}: Props ) {
    if ( totalPages <= 1 ) return null

    const createPages = () => {
        const pages: ( number | string )[] = []

        const start = Math.max( 1, page - siblings )
        const end = Math.min( totalPages, page + siblings )

        if ( start > 1 ) {
            pages.push( 1 )
            if ( start > 2 ) pages.push( "..." )
        }

        for ( let i = start; i <= end; i++ ) {
            pages.push( i )
        }

        if ( end < totalPages ) {
            if ( end < totalPages - 1 ) pages.push( "..." )
            pages.push( totalPages )
        }

        return pages
    }

    const pages = createPages()

    return (
        <div className="flex justify-center mt-6 gap-1">
            <button
                onClick={() => onChange( page - 1 )}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
            >
                ‹
            </button>

            {pages.map( ( p, idx ) =>
                p === "..." ? (
                    <span key={idx} className="px-2 py-1 text-gray-400">
                        ...
                    </span>
                ) : (
                    <button
                        key={idx}
                        onClick={() => onChange( Number( p ) )}
                        className={`px-3 py-1 border rounded transition
              ${p === page
                                ? "bg-gray-900 text-white border-gray-900"
                                : "hover:bg-gray-100"
                            }`}
                    >
                        {p}
                    </button>
                )
            )}

            <button
                onClick={() => onChange( page + 1 )}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
            >
                ›
            </button>
        </div>
    )
}
