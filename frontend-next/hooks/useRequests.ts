import { useEffect, useState } from "react"
import {
    cancelRequest,
    createRequest,
    listRequests,
    updateRequest,
    validateRequestResults,
} from "@/lib/api/request"
import {
    Request,
    RequestCreateDTO,
    RequestUpdateDTO,
} from "@/lib/types/request"

export function useRequests () {
    const [requests, setRequests] = useState<Request[]>( [] )
    const [loading, setLoading] = useState( true )
    const [error, setError] = useState<string | null>( null )

    async function loadRequests () {
        try {
            setLoading( true )
            const data = await listRequests()
            setRequests( data as unknown as Request[] )
        } catch ( err: any ) {
            setError( err.message )
        } finally {
            setLoading( false )
        }
    }

    async function addRequest ( payload: RequestCreateDTO ) {
        const created = await createRequest( payload )
        setRequests( ( prev ) => [created, ...prev] )
    }

    async function editRequest ( id: number, payload: RequestUpdateDTO ) {
        const updated = await updateRequest( id, payload )
        setRequests( ( prev ) =>
            prev.map( ( request ) => ( request.id === id ? updated : request ) )
        )
    }

    async function cancelRequestById ( id: number ) {
        await cancelRequest( id )
        setRequests( ( prev ) =>
            prev.map( ( request ) =>
                request.id === id ? { ...request, status: "CANC" } : request
            )
        )
    }

    async function validateResults ( id: number ) {
        await validateRequestResults( id )
        setRequests( ( prev ) =>
            prev.map( ( request ) =>
                request.id === id ? { ...request, status: "VAL" } : request
            )
        )
    }

    useEffect( () => {
        loadRequests()
    }, [] )

    return {
        requests,
        loading,
        error,
        loadRequests,
        addRequest,
        editRequest,
        cancelRequest: cancelRequestById,
        validateResults,
    }
}
