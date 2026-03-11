"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { Requisicao, Paciente, Exame } from "@/lib/types";
import Link from "next/link";

export default function RequisicoesPage () {
    useAuthGuard();

    const [requisicoes, setRequisicoes] = useState<Requisicao[]>( [] );
    const [pacientes, setPacientes] = useState<Paciente[]>( [] );
    const [exames, setExames] = useState<Exame[]>( [] );

    const [paciente, setPaciente] = useState( "" );
    const [selecionados, setSelecionados] = useState<number[]>( [] );
    const [observacoes, setObservacoes] = useState( "" );

    async function carregar () {
        setRequisicoes( await apiFetch( "/requisicoes/" ) );
        setPacientes( await apiFetch( "/pacientes/" ) );
        setExames( await apiFetch( "/exames/" ) );
    }

    useEffect( () => {
        carregar();
    }, [] );

    async function criar () {
        const nova = await apiFetch<Requisicao>( "/requisicoes/", {
            method: "POST",
            body: JSON.stringify( {
                paciente,
                exames: selecionados,
                observacoes,
            } ),
        } );

        window.location.href = `/requisicoes/${nova.id}`;
    }

    return (
        <div className="page-box">
            <h1>Requisições</h1>
            <Link href="/requisicoes/nova" className="btn-primary">
                Nova requisição
            </Link>


            {/* CRIAR */}
            <div className="page-box">
                <h2>Nova requisição</h2>

                <select value={paciente} onChange={e => setPaciente( e.target.value )}>
                    <option value="">Paciente</option>
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
                            onChange={ev =>
                                ev.target.checked
                                    ? setSelecionados( [...selecionados, e.id] )
                                    : setSelecionados( selecionados.filter( x => x !== e.id ) )
                            }
                        />
                        {e.nome}
                    </label>
                ) )}

                <textarea
                    placeholder="Observações"
                    value={observacoes}
                    onChange={e => setObservacoes( e.target.value )}
                />

                <button onClick={criar}>Criar</button>
            </div>

            {/* LISTA */}
            <table>
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Paciente</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {requisicoes.map( r => (
                        <tr key={r.id}>
                            <td>
                                <Link href={`/requisicoes/${r.id}`}>{r.id_custom}</Link>
                            </td>
                            <td>{r.paciente_nome}</td>
                            <td>{r.status}</td>
                        </tr>
                    ) )}
                </tbody>
            </table>
        </div>
    );
}
