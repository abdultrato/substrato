import { useCallback, useEffect, useState } from "react"
import {
    listarResultados,
    atualizarResultado,
    validarResultado,
} from "@/lib/api/resultado"
import { ResultadoItem } from "@/lib/types/requisicao"

export function useResultados ( requisicaoId?: number ) {
    const [resultados, setResultados] = useState<ResultadoItem[]>( [] )
    const [loading, setLoading] = useState( true )
    const [error, setError] = useState<string | null>( null )

    const carregar = useCallback( async () => {
        try {
            setLoading( true )
            const data = await listarResultados(
                requisicaoId ? { requisicao: requisicaoId } : undefined
            )
            setResultados( data )
        } catch ( err: any ) {
            setError( err.message )
        } finally {
            setLoading( false )
        }
    }, [requisicaoId] )

    async function atualizar ( id: number, valor: string ) {
        const atualizado = await atualizarResultado( id, valor )
        setResultados( ( prev ) =>
            prev.map( ( r ) => ( r.id === id ? atualizado : r ) )
        )
    }

    async function validar ( id: number ) {
        await validarResultado( id )
        setResultados( ( prev ) =>
            prev.map( ( r ) =>
                r.id === id ? { ...r, validado: true } : r
            )
        )
    }

    useEffect( () => {
        carregar()
    }, [carregar] )

    return {
        resultados,
        loading,
        error,
        carregar,
        atualizar,
        validar,
    }
}
