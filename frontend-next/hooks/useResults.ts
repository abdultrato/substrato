import { useCallback, useEffect, useState } from "react"
import {
    listResults,
    saveResult,
    validateResult,
} from "@/lib/api/result"
import { ResultItem } from "@/lib/types/request"

export function useResults ( requestId?: number ) {
    const [results, setResults] = useState<ResultItem[]>( [] )
    const [loading, setLoading] = useState( true )
    const [error, setError] = useState<string | null>( null )

    const loadResults = useCallback( async () => {
        try {
            setLoading( true )
            const data = await listResults(
                requestId ? { requisicao: requestId } : undefined
            )
            setResults( data )
        } catch ( err: any ) {
            setError( err.message )
        } finally {
            setLoading( false )
        }
    }, [requestId] )

    async function updateResult ( id: number, value: string ) {
        const updated = await saveResult( id, value )
        setResults( ( prev ) =>
            prev.map( ( result ) => ( result.id === id ? updated : result ) )
        )
    }

    async function validateResultById ( id: number ) {
        const updated = await validateResult( id )
        setResults( ( prev ) =>
            prev.map( ( result ) =>
                result.id === id ? updated : result
            )
        )
    }

    useEffect( () => {
        loadResults()
    }, [loadResults] )

    return {
        results,
        loading,
        error,
        loadResults,
        updateResult,
        validateResult: validateResultById,
    }
}
