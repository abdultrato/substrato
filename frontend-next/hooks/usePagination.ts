import { useMemo, useState } from "react"

interface Options {
    initialPage?: number
    pageSize?: number
    totalItems?: number
}

export default function usePagination ( {
    initialPage = 1,
    pageSize = 20,
    totalItems = 0,
}: Options = {} ) {
    const [page, setPage] = useState( initialPage )

    const totalPages = useMemo( () => {
        return Math.max( 1, Math.ceil( totalItems / pageSize ) )
    }, [totalItems, pageSize] )

    function next () {
        setPage( ( p ) => Math.min( p + 1, totalPages ) )
    }

    function prev () {
        setPage( ( p ) => Math.max( p - 1, 1 ) )
    }

    function goTo ( p: number ) {
        const pageNum = Math.min( Math.max( p, 1 ), totalPages )
        setPage( pageNum )
    }

    function reset () {
        setPage( 1 )
    }

    return {
        page,
        pageSize,
        totalPages,
        setPage: goTo,
        next,
        prev,
        reset,
        offset: ( page - 1 ) * pageSize,
        limit: pageSize,
    }
}
