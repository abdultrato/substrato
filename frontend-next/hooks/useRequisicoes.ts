import { useEffect, useState } from "react"
import {
    listarRequisicoes,
    criarRequisicao,
    atualizarRequisicao,
    cancelarRequisicao,
    validarResultados,
} from "@/lib/api/requisicao"
import {
    Requisicao,
    RequisicaoCreateDTO,
    RequisicaoUpdateDTO,
} from "@/lib/types/requisicao"

export function useRequisicoes () {
    const [requisicoes, setRequisicoes] = useState<Requisicao[]>( [] )
    const [loading, setLoading] = useState( true )
    const [error, setError] = useState<string | null>( null )

    async function carregar () {
        try {
            setLoading( true )
            const data = await listarRequisicoes()
            setRequisicoes( data as unknown as Requisicao[] )
        } catch ( err: any ) {
            setError( err.message )
        } finally {
            setLoading( false )
        }
    }

    async function adicionar ( payload: RequisicaoCreateDTO ) {
        const nova = await criarRequisicao( payload )
        setRequisicoes( ( prev ) => [nova, ...prev] )
    }

    async function editar ( id: number, payload: RequisicaoUpdateDTO ) {
        const atualizada = await atualizarRequisicao( id, payload )
        setRequisicoes( ( prev ) =>
            prev.map( ( r ) => ( r.id === id ? atualizada : r ) )
        )
    }

    async function cancelar ( id: number ) {
        await cancelarRequisicao( id )
        setRequisicoes( ( prev ) =>
            prev.map( ( r ) =>
                r.id === id ? { ...r, status: "CANC" } : r
            )
        )
    }

    async function validar ( id: number ) {
        await validarResultados( id )
        setRequisicoes( ( prev ) =>
            prev.map( ( r ) =>
                r.id === id ? { ...r, status: "VAL" } : r
            )
        )
    }

    useEffect( () => {
        carregar()
    }, [] )

    return {
        requisicoes,
        loading,
        error,
        carregar,
        adicionar,
        editar,
        cancelar,
        validar,
    }
}
