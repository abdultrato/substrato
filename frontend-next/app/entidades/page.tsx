"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { EntidadeList } from "@/lib/types";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS } from "@/lib/rbac";

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
            <AppLayout
                requiredGroups={[
                    GROUPS.ADMIN,
                    GROUPS.RECEPCAO,
                    GROUPS.MEDICINA_OCUPACIONAL,
                ]}
            >
                <div className="page-box fade-in">
                    <div className="skeleton skeleton-row"></div>
                    <div className="skeleton skeleton-row"></div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout
            requiredGroups={[
                GROUPS.ADMIN,
                GROUPS.RECEPCAO,
                GROUPS.MEDICINA_OCUPACIONAL,
            ]}
        >
            <div className="page-box fade-in">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <h1 className="page-title">Empresas</h1>

                    <Link href="/entidades/novo" className="btn-primary">
                        Nova empresa
                    </Link>
                </div>

                <div className="table-container" style={{ marginTop: 12 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>NUIT</th>
                                <th>Telefone</th>
                                <th>E-mail</th>
                                <th>NIB</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>

                        <tbody>
                            {entidades.map( e => (
                                <tr key={e.id}>
                                    <td>{e.nome}</td>
                                    <td>{e.nuit || "-"}</td>
                                    <td>{e.telefone1 || "-"}</td>
                                    <td>{e.email || "-"}</td>
                                    <td>{e.nib || "-"}</td>
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
                                    <td colSpan={7}>Nenhuma empresa registada</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </AppLayout>
    );
}
