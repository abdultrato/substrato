"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { Paciente, Exame } from "@/types";
import { useRouter } from "next/navigation";

export default function NovaRequisicaoPage () {
    useAuthGuard();
    const router = useRouter();

    const [pacientes, setPacientes] = useState<Paciente[]>( [] );
    const [exames, setExames] = useState<Exame[]>( [] );

    const [paciente, setPaciente] = useState( "" );
    const [analista, setAnalista] = useState( "" );
    const [observacoes, setObservacoes] = useState( "" );
    const [selecionados, setSelecionados] = useState<number[]>( [] );
    const [status, setStatus] = useState( "PEND" );

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

        const nova = await apiFetch( "/requisicoes/", {
            method: "POST",
            body: JSON.stringify( {
                paciente,
                exames: selecionados,
                observacoes,
                status,
                analista: analista || null,
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

            <label>Status</label>
            <select value={status} onChange={e => setStatus( e.target.value )}>
                <option value="PEND">Pendente</option>
                <option value="VAL">Validada</option>
            </select>

            <textarea
                placeholder="Observações"
                value={observacoes}
                onChange={e => setObservacoes( e.target.value )}
            />

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
