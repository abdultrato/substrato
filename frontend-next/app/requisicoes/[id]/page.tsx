"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Requisicao } from "@/lib/types";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";

export default function RequisicaoDetail ( {
    params,
}: {
    params: { id: string };
} ) {
    useAuthGuard();

    const [req, setReq] = useState<Requisicao | null>( null );
    const [loading, setLoading] = useState( true );
    const [error, setError] = useState<string | null>( null );

    useEffect( () => {
        carregar();
    }, [] );

    async function carregar () {
        try {
            const data = await apiFetch( `/requisicoes/${params.id}/` );
            setReq( data );
        } catch {
            setError( "Erro ao carregar requisição" );
        } finally {
            setLoading( false );
        }
    }

    function statusColor ( status: string ) {
        switch ( status ) {
            case "VAL":
                return "green";
            case "PEND":
                return "orange";
            default:
                return "gray";
        }
    }

    if ( loading ) return <p>Carregando...</p>;
    if ( error ) return <p style={{ color: "red" }}>{error}</p>;
    if ( !req ) return null;

    return (
        <div className="page-box fade-in">
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <Link href={`/requisicoes/${req.id}/editar`} className="btn-secondary">
                    Editar
                </Link>

                <Link
                    href={`/requisicoes/${req.id}/resultados`}
                    className="btn-primary"
                >
                    Resultados
                </Link>
            </div>

            <h1>Requisição {req.id_custom}</h1>

            <p>
                <b>Paciente:</b> {req.paciente_nome}
            </p>

            <p>
                <b>Status:</b>{" "}
                <span
                    style={{
                        color: statusColor( req.status ),
                        fontWeight: "bold",
                    }}
                >
                    {req.status}
                </span>
            </p>

            <p>
                <b>Observações:</b> {req.observacoes || "—"}
            </p>

            <hr />

            <h3>Exames</h3>

            {req.exames && req.exames.length > 0 ? (
                <ul>
                    {req.exames.map( ( id: number ) => (
                        <li key={id}>Exame #{id}</li>
                    ) )}
                </ul>
            ) : (
                <p>Nenhum exame associado</p>
            )}

            <hr />

            <div style={{ marginTop: 10 }}>
                <Link href="/requisicoes" className="btn-secondary">
                    ← Voltar
                </Link>
            </div>
        </div>
    );
}
