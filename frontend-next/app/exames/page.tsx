"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import Link from "next/link";
import { Exame } from "@/lib/types";
import AppLayout from "@/components/layout/AppLayout";
import Pagination from "@/components/ui/Pagination";
import { GROUPS } from "@/lib/rbac";

export default function ExamesPage () {
    useAuthGuard();

    const [exames, setExames] = useState<Exame[]>( [] );
    const [loading, setLoading] = useState( true );
    const [error, setError] = useState<string | null>( null );
    const [page, setPage] = useState( 1 );
    const [pageSize, setPageSize] = useState( 50 );
    const [totalItems, setTotalItems] = useState( 0 );
    const [totalPages, setTotalPages] = useState( 1 );

    useEffect( () => {
        carregar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize] );

    async function carregar () {
        try {
            setLoading( true );
            setError( null );

            const { items, meta } = await apiFetchList<Exame>( "/exames/", {
                page,
                pageSize,
            } );

            const total = meta.total ?? items.length;
            const computedTotalPages =
                meta.totalPages ??
                (total && pageSize ? Math.max( 1, Math.ceil( total / pageSize ) ) : 1);

            setExames( items );
            setTotalItems( total || 0 );
            setTotalPages( computedTotalPages );
            if ( page > computedTotalPages ) setPage( computedTotalPages );
        } catch ( err: any ) {
            setError( err?.message || "Erro ao carregar exames" );
            setExames( [] );
        } finally {
            setLoading( false );
        }
    }

    async function remover ( id: number ) {
        if ( !confirm( "Remover exame?" ) ) return;
        await apiFetch( `/exames/${id}/`, { method: "DELETE" } );
        carregar();
    }

    return (
        <AppLayout requiredGroups={[GROUPS.ADMIN]}>
            <div className="page-box">
                <h1>Exames</h1>

                <Link href="/exames/novo" className="btn-primary">
                    Novo exame
                </Link>

                {error && <p style={{ color: "#d32f2f" }}>{error}</p>}

                <div style={{ display: "flex", gap: 10, margin: "10px 0", flexWrap: "wrap" }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span>Por página</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPage( 1 );
                                setPageSize( Number( e.target.value ) );
                            }}
                        >
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </label>
                    <div style={{ fontSize: 13, color: "#555", display: "flex", alignItems: "center" }}>
                        Total: {totalItems}
                    </div>
                </div>

                {loading ? <p>Carregando...</p> : null}

                <table>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Código</th>
                            <th>Setor</th>
                            <th>Método</th>
                            <th>TRL (h)</th>
                            <th>Preço</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {exames.map( e => (
                            <tr key={e.id}>
                                <td>{e.nome}</td>
                                <td>{e.id_custom}</td>
                                <td>{e.setor}</td>
                                <td>{e.metodo}</td>
                                <td>{e.trl_horas}</td>
                                <td>{e.preco}</td>
                                <td>
                                    <Link href={`/exames/${e.id}`}>Ver</Link>{" "}
                                    <button onClick={() => remover( e.id )}>Apagar</button>
                                </td>
                            </tr>
                        ) )}
                    </tbody>
                </table>

                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
        </AppLayout>
    );
}
