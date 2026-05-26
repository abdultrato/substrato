import { useEffect, useState } from "react"
import {
    downloadInvoicePdf,
    issueInvoice,
    listInvoices,
    retrieveInvoice,
    voidInvoice,
} from "@/lib/api/invoice"
import { Fatura } from "@/lib/types/invoice"

export function useInvoices () {
    const [invoices, setInvoices] = useState<Fatura[]>( [] )
    const [loading, setLoading] = useState( true )
    const [error, setError] = useState<string | null>( null )

    async function load () {
        try {
            setLoading( true )
            const data = await listInvoices()
            setInvoices( data )
        } catch ( err: any ) {
            setError( err.message )
        } finally {
            setLoading( false )
        }
    }

    async function issue ( id: number ) {
        await issueInvoice( id )
        setInvoices( ( prev ) =>
            prev.map( ( f ) =>
                f.id === id ? { ...f, estado: "EMIT" } : f
            )
        )
    }

    async function voidSelectedInvoice ( id: number ) {
        await voidInvoice( id )
        setInvoices( ( prev ) =>
            prev.map( ( f ) =>
                f.id === id ? { ...f, estado: "ANUL" } : f
            )
        )
    }

    async function downloadPdf ( id: number ) {
        const blob = await downloadInvoicePdf( id )
        const url = window.URL.createObjectURL( blob )
        const a = document.createElement( "a" )
        a.href = url
        a.download = `fatura_${id}.pdf`
        a.click()
    }

    async function retrieve ( id: number ) {
        return await retrieveInvoice( id )
    }

    useEffect( () => {
        load()
    }, [] )

    return {
        invoices,
        loading,
        error,
        load,
        issue,
        voidSelectedInvoice,
        downloadPdf,
        retrieve,
    }
}
