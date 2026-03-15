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
        <div className="flex justify-center mt-3 gap-1">
            <button
                onClick={() => onChange( page - 1 )}
                disabled={page === 1}
                className="px-2.5 py-0.5 border rounded-lg disabled:opacity-40 hover:bg-[var(--gray-100)]"
            >
                ‹
            </button>

            {pages.map( ( p, idx ) =>
                p === "..." ? (
                    <span key={idx} className="px-1.5 py-0.5 text-gray-400">
                        ...
                    </span>
                ) : (
                    <button
                        key={idx}
                        onClick={() => onChange( Number( p ) )}
                        className={`px-2.5 py-0.5 border rounded-lg transition
              ${p === page
                                ? "bg-[var(--primary-600)] text-white border-[var(--primary-600)]"
                                : "hover:bg-[var(--gray-100)]"
                            }`}
                    >
                        {p}
                    </button>
                )
            )}

            <button
                onClick={() => onChange( page + 1 )}
                disabled={page === totalPages}
                className="px-2.5 py-0.5 border rounded-lg disabled:opacity-40 hover:bg-[var(--gray-100)]"
            >
                ›
            </button>
        </div>
    )
}
