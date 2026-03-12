"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { Paciente, Exame } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function NovaRequisicaoPage () {
    useAuthGuard();
    const router = useRouter();

    const [pacientes, setPacientes] = useState<Paciente[]>( [] );
    const [exames, setExames] = useState<Exame[]>( [] );

    const [paciente, setPaciente] = useState( "" );
    const [selecionados, setSelecionados] = useState<number[]>( [] );

    useEffect( () => {
        carregar();
    }, [] );

    async function carregar () {
        setPacientes( await apiFetch( "/pacientes/" ) );
        setExames( await apiFetch( "/exames/" ) );
    }

    function toggleExame ( id: number ) {
        setSelecionados( prev =>
            prev.includes( id )
                ? prev.filter( x => x !== id )
                : [...prev, id]
        );
    }

    async function salvar ( e: any ) {
        e.preventDefault();
        if ( !paciente ) {
            alert( "Selecione um paciente." );
            return;
        }
        if ( selecionados.length === 0 ) {
            alert( "Selecione pelo menos um exame." );
            return;
        }

        const nova = await apiFetch( "/requisicoes/", {
            method: "POST",
            body: JSON.stringify( {
                paciente: Number( paciente ),
                exames: selecionados,
            } ),
        } );

        router.push( `/requisicoes/${nova.id}` );
    }

    return (
        <form onSubmit={salvar} className="page-box">
            <h1>Nova Requisição</h1>

            <label>Paciente</label>
            <select value={paciente} onChange={e => setPaciente( e.target.value )} required>
                <option value="">Selecione</option>
                {pacientes.map( p => (
                    <option key={p.id} value={p.id}>
                        {p.nome}
                    </option>
                ) )}
            </select>

            <h3>Exames</h3>

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

            <button className="btn-primary">Criar Requisição</button>
        </form>
    );
}
