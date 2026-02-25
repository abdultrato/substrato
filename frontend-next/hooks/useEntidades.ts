import { useEffect, useState } from "react"
import {
    listarEntidades,
    criarEntidade,
    atualizarEntidade,
    deletarEntidade,
} from "@/lib/api/entidade"
import {
    Entidade,
    EntidadeCreateDTO,
    EntidadeUpdateDTO,
} from "@/lib/types/entidade"

export function useEntidades () {
    const [entidades, setEntidades] = useState<Entidade[]>( [] )
    const [loading, setLoading] = useState( true )
    const [error, setError] = useState<string | null>( null )

    async function carregar () {
        try {
            setLoading( true )
            const data = await listarEntidades()
            setEntidades( data as unknown as Entidade[] )
        } catch ( err: any ) {
            setError( err.message )
        } finally {
            setLoading( false )
        }
    }

    async function adicionar ( payload: EntidadeCreateDTO ) {
        const nova = await criarEntidade( payload )
        setEntidades( ( prev ) => [nova, ...prev] )
    }

    async function editar ( id: number, payload: EntidadeUpdateDTO ) {
        const atualizada = await atualizarEntidade( id, payload )
        setEntidades( ( prev ) =>
            prev.map( ( e ) => ( e.id === id ? atualizada : e ) )
        )
    }

    async function remover ( id: number ) {
        await deletarEntidade( id )
        setEntidades( ( prev ) => prev.filter( ( e ) => e.id !== id ) )
    }

    useEffect( () => {
        carregar()
    }, [] )

    return {
        entidades,
        loading,
        error,
        carregar,
        adicionar,
        editar,
        remover,
    }
}
