"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { Paciente, Exame } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function EditarRequisicaoPage ( {
    params,
}: {
    params: { id: string };
} ) {
    useAuthGuard();
    const router = useRouter();

    const [loading, setLoading] = useState( true );
    const [saving, setSaving] = useState( false );
    const [error, setError] = useState<string | null>( null );

    const [pacientes, setPacientes] = useState<Paciente[]>( [] );
    const [exames, setExames] = useState<Exame[]>( [] );

    const [paciente, setPaciente] = useState( "" );
    const [observacoes, setObservacoes] = useState( "" );
    const [status, setStatus] = useState( "PEND" );
    const [selecionados, setSelecionados] = useState<number[]>( [] );

    useEffect( () => {
        carregar();
    }, [] );

    async function carregar () {
        try {
            const [req, pacs, exs] = await Promise.all( [
                apiFetch( `/requisicoes/${params.id}/` ),
                apiFetch( "/pacientes/" ),
                apiFetch( "/exames/" ),
            ] );

            setPacientes( pacs || [] );
            setExames( exs || [] );

            setPaciente( req.paciente?.toString() || "" );
            setObservacoes( req.observacoes || "" );
            setStatus( req.status || "PEND" );
            setSelecionados( req.exames || [] );
        } catch {
            setError( "Erro ao carregar dados" );
        } finally {
            setLoading( false );
        }
    }

    function toggleExame ( id: number ) {
        setSelecionados( prev =>
            prev.includes( id )
                ? prev.filter( x => x !== id )
                : [...prev, id]
        );
    }

    async function salvar ( e: React.FormEvent ) {
        e.preventDefault();

        if ( !paciente ) {
            setError( "Selecione um paciente" );
            return;
        }

        if ( selecionados.length === 0 ) {
            setError( "Selecione pelo menos um exame" );
            return;
        }

        setSaving( true );
        setError( null );

        try {
            await apiFetch( `/requisicoes/${params.id}/`, {
                method: "PATCH",
                body: JSON.stringify( {
                    paciente,
                    exames: selecionados,
                    observacoes,
                    status,
                } ),
            } );

            router.push( `/requisicoes/${params.id}` );
        } catch ( err: any ) {
            setError( err.message || "Erro ao salvar" );
        } finally {
            setSaving( false );
        }
    }

    if ( loading ) return <p>Carregando...</p>;

    return (
        <form onSubmit={salvar} className="page-box fade-in">
            <h1>Editar Requisição</h1>

            {error && (
                <p style={{ color: "#d32f2f" }}>{error}</p>
            )}

            <label>Paciente</label>
            <select
                value={paciente}
                onChange={e => setPaciente( e.target.value )}
            >
                <option value="">Selecione</option>
                {pacientes.map( p => (
                    <option key={p.id} value={p.id}>
                        {p.nome}
                    </option>
                ) )}
            </select>

            <label>Status</label>
            <select
                value={status}
                onChange={e => setStatus( e.target.value )}
            >
                <option value="PEND">Pendente</option>
                <option value="VAL">Validada</option>
            </select>

            <label>Observações</label>
            <textarea
                value={observacoes}
                onChange={e => setObservacoes( e.target.value )}
            />

            <h3>Exames</h3>

            <div style={{ display: "grid", gap: 6 }}>
                {exames.map( e => (
                    <label key={e.id}>
                        <input
                            type="checkbox"
                            checked={selecionados.includes( e.id )}
                            onChange={() => toggleExame( e.id )}
                        />
                        {e.nome}
                    </label>
                ) )}
            </div>

            <button
                className={`btn-primary ${saving ? "btn-loading" : ""}`}
                disabled={saving}
            >
                {saving ? "Salvando..." : "Salvar alterações"}
            </button>
        </form>
    );
}
