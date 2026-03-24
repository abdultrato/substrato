import { useEffect, useState } from "react"
import {
    listarExames,
    criarExame,
    atualizarExame,
    deletarExame,
} from "@/lib/api/exame"
import { Exame } from "@/lib/types/exame"

export function useExames () {
    const [exames, setExames] = useState<Exame[]>( [] )
    const [loading, setLoading] = useState( true )
    const [error, setError] = useState<string | null>( null )

    async function carregar () {
        try {
            setLoading( true )
            const data = await listarExames()
            setExames( data )
        } catch ( err: any ) {
            setError( err.message )
        } finally {
            setLoading( false )
        }
    }

    async function adicionar ( payload: Partial<Exame> ) {
        const novo = await criarExame( payload )
        setExames( ( prev ) => [novo, ...prev] )
    }

    async function editar ( id: number, payload: Partial<Exame> ) {
        const atualizado = await atualizarExame( id, payload )
        setExames( ( prev ) =>
            prev.map( ( e ) => ( e.id === id ? atualizado : e ) )
        )
    }

    async function remover ( id: number ) {
        await deletarExame( id )
        setExames( ( prev ) => prev.filter( ( e ) => e.id !== id ) )
    }

    useEffect( () => {
        carregar()
    }, [] )

    return {
        exames,
        loading,
        error,
        carregar,
        adicionar,
        editar,
        remover,
    }
}
