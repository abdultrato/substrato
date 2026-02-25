"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { EntidadeList } from "@/lib/types";
import useAuthGuard from "@/hooks/useAuthGuard";
import { logout } from "@/lib/auth";

export default function EntidadesPage () {
    useAuthGuard();

    const [entidades, setEntidades] = useState<EntidadeList[]>( [] );
    const [loading, setLoading] = useState( true );
    const mounted = useRef( true );

    useEffect( () => {
        carregar();
        return () => {
            mounted.current = false;
        };
    }, [] );

    async function carregar () {
        try {
            const data: EntidadeList[] = await apiFetch( "/entidades/" );
            if ( mounted.current ) setEntidades( data || [] );
        } catch ( err ) {
            console.error( err );
        } finally {
            if ( mounted.current ) setLoading( false );
        }
    }

    async function apagar ( id: number ) {
        if ( !confirm( "Confirmar remoção da entidade?" ) ) return;

        try {
            await apiFetch( `/entidades/${id}/`, { method: "DELETE" } );
            setEntidades( prev => prev.filter( e => e.id !== id ) );
        } catch {
            alert( "Falha ao remover entidade." );
        }
    }

    if ( loading ) {
        return (
            <div className="page-box fade-in">
                <div className="skeleton skeleton-row"></div>
                <div className="skeleton skeleton-row"></div>
            </div>
        );
    }

    return (
        <div className="container fade-in">

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1 className="page-title">Entidades</h1>

                <button className="btn-secondary" onClick={logout}>
                    Terminar sessão
                </button>
            </div>

            <div style={{ marginBottom: 16 }}>
                <Link href="/entidades/novo" className="btn-primary">
                    Nova Entidade
                </Link>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Telefone</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>

                    <tbody>
                        {entidades.map( e => (
                            <tr key={e.id}>
                                <td>{e.nome}</td>
                                <td>{e.telefone1 || "-"}</td>
                                <td>{e.email || "-"}</td>
                                <td>
                                    <span className={e.ativo ? "status-ativo" : "status-inativo"}>
                                        {e.ativo ? "Ativo" : "Inativo"}
                                    </span>
                                </td>
                                <td style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                    <Link href={`/entidades/${e.id}`} className="btn-secondary">
                                        Ver
                                    </Link>

                                    <Link href={`/entidades/${e.id}/editar`} className="btn-secondary">
                                        Editar
                                    </Link>

                                    <button
                                        onClick={() => apagar( e.id )}
                                        className="btn-danger"
                                    >
                                        Apagar
                                    </button>
                                </td>
                            </tr>
                        ) )}

                        {entidades.length === 0 && (
                            <tr>
                                <td colSpan={5}>Nenhuma entidade cadastrada</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
