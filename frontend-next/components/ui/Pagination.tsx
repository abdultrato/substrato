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
        <div className="mt-3 flex justify-center gap-1">
            <button
                onClick={() => onChange( page - 1 )}
                disabled={page === 1}
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-card px-2 text-sm font-semibold shadow-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
                ‹
            </button>

            {pages.map( ( p, idx ) =>
                p === "..." ? (
                    <span key={idx} className="px-1.5 py-1 text-muted-foreground">
                        ...
                    </span>
                ) : (
                    <button
                        key={idx}
                        onClick={() => onChange( Number( p ) )}
                        className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background
              ${p === page
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card hover:bg-muted"
                            }`}
                    >
                        {p}
                    </button>
                )
            )}

            <button
                onClick={() => onChange( page + 1 )}
                disabled={page === totalPages}
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-card px-2 text-sm font-semibold shadow-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
                ›
            </button>
        </div>
    )
}
