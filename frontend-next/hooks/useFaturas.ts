import { useEffect, useState } from "react"
import {
    listarFaturas,
    obterFatura,
    emitirFatura,
    anularFatura,
    gerarPdfFatura,
} from "@/lib/api/fatura"
import { Fatura } from "@/lib/types/fatura"

export function useFaturas () {
    const [faturas, setFaturas] = useState<Fatura[]>( [] )
    const [loading, setLoading] = useState( true )
    const [error, setError] = useState<string | null>( null )

    async function carregar () {
        try {
            setLoading( true )
            const data = await listarFaturas()
            setFaturas( data )
        } catch ( err: any ) {
            setError( err.message )
        } finally {
            setLoading( false )
        }
    }

    async function emitir ( id: number ) {
        await emitirFatura( id )
        setFaturas( ( prev ) =>
            prev.map( ( f ) =>
                f.id === id ? { ...f, estado: "EMIT" } : f
            )
        )
    }

    async function anular ( id: number ) {
        await anularFatura( id )
        setFaturas( ( prev ) =>
            prev.map( ( f ) =>
                f.id === id ? { ...f, estado: "ANUL" } : f
            )
        )
    }

    async function baixarPdf ( id: number ) {
        const blob = await gerarPdfFatura( id )
        const url = window.URL.createObjectURL( blob )
        const a = document.createElement( "a" )
        a.href = url
        a.download = `fatura_${id}.pdf`
        a.click()
    }

    async function detalhe ( id: number ) {
        return await obterFatura( id )
    }

    useEffect( () => {
        carregar()
    }, [] )

    return {
        faturas,
        loading,
        error,
        carregar,
        emitir,
        anular,
        baixarPdf,
        detalhe,
    }
}
