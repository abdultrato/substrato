import { useEffect, useState } from "react"
import {
    listarPacientes,
    criarPaciente,
    atualizarPaciente,
    deletarPaciente,
} from "@/lib/api/patient"
import { Paciente, PacienteCreateDTO, PacienteUpdateDTO } from "@/lib/types/patient"

export function usePacientes () {
    const [pacientes, setPacientes] = useState<Paciente[]>( [] )
    const [loading, setLoading] = useState( true )
    const [error, setError] = useState<string | null>( null )

    async function carregar () {
        try {
            setLoading( true )
            const data = await listarPacientes()
            setPacientes( data as unknown as Paciente[] )
        } catch ( err: any ) {
            setError( err.message )
        } finally {
            setLoading( false )
        }
    }

    async function adicionar ( payload: PacienteCreateDTO ) {
        const novo = await criarPaciente( payload )
        setPacientes( ( prev ) => [novo, ...prev] )
    }

    async function editar ( id: number, payload: PacienteUpdateDTO ) {
        const atualizado = await atualizarPaciente( id, payload )
        setPacientes( ( prev ) =>
            prev.map( ( p ) => ( p.id === id ? atualizado : p ) )
        )
    }

    async function remover ( id: number ) {
        await deletarPaciente( id )
        setPacientes( ( prev ) => prev.filter( ( p ) => p.id !== id ) )
    }

    useEffect( () => {
        carregar()
    }, [] )

    return {
        pacientes,
        loading,
        error,
        carregar,
        adicionar,
        editar,
        remover,
    }
}
