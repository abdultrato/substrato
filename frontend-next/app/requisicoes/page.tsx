"use client";

import { useEffect, useState } from "react";
import { apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { Requisicao } from "@/lib/types";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import Pagination from "@/components/ui/Pagination";
import { GROUPS } from "@/lib/rbac";

export default function RequisicoesPage () {
    useAuthGuard();

    const [requisicoes, setRequisicoes] = useState<Requisicao[]>( [] );
    const [tipo, setTipo] = useState<string>( "" );
    const [loading, setLoading] = useState( true );
    const [error, setError] = useState<string | null>( null );
    const [page, setPage] = useState( 1 );
    const [pageSize, setPageSize] = useState( 50 );
    const [totalItems, setTotalItems] = useState( 0 );
    const [totalPages, setTotalPages] = useState( 1 );

    async function carregar () {
        try {
            setLoading( true );
            setError( null );

            const url = tipo
                ? `/requisicoes/?tipo=${encodeURIComponent( tipo )}`
                : "/requisicoes/";

            const { items, meta } = await apiFetchList<Requisicao>( url, {
                page,
                pageSize,
            } );

            const total = meta.total ?? items.length;
            const computedTotalPages =
                meta.totalPages ??
                (total && pageSize ? Math.max( 1, Math.ceil( total / pageSize ) ) : 1);

            setRequisicoes( items );
            setTotalItems( total || 0 );
            setTotalPages( computedTotalPages );

            if ( page > computedTotalPages ) setPage( computedTotalPages );
        } catch ( err: any ) {
            setError( err?.message || "Erro ao carregar requisições" );
            setRequisicoes( [] );
        } finally {
            setLoading( false );
        }
    }

    useEffect( () => {
        carregar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tipo, page, pageSize] );

    return (
        <AppLayout
            requiredGroups={[
                GROUPS.ADMIN,
                GROUPS.RECEPCAO,
                GROUPS.MEDICINA,
                GROUPS.MEDICINA_OCUPACIONAL,
            ]}
        >
            <div className="page-box">
                <h1>Requisições</h1>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link href="/requisicoes/nova" className="btn-primary">
                        Nova requisição
                    </Link>
                    <Link href="/requisicoes/externa/nova" className="btn-secondary">
                        Nova requisição externa
                    </Link>
                </div>

                <div style={{ display: "flex", gap: 10, margin: "10px 0" }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span>Setor</span>
                        <select
                            value={tipo}
                            onChange={(e) => {
                                setPage( 1 );
                                setTipo( e.target.value );
                            }}
                        >
                            <option value="">Todos</option>
                            <option value="LAB">Laboratório</option>
                            <option value="MED">Exames médicos</option>
                        </select>
                    </label>

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
                </div>

                {error && <p style={{ color: "#d32f2f" }}>{error}</p>}

                {loading ? (
                    <p>Carregando...</p>
                ) : null}

                {/* LISTA */}
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Paciente</th>
                            <th>Setor</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requisicoes.map( r => (
                            <tr key={r.id}>
                                <td>
                                    <Link href={`/requisicoes/${r.id}`}>{r.id_custom}</Link>
                                </td>
                                <td>{r.paciente_nome || r.paciente || "-"}</td>
                                <td>{r.tipo === "MED" ? "Exames médicos" : "Laboratório"}</td>
                                <td>{r.estado}</td>
                            </tr>
                        ) )}
                    </tbody>
                </table>

                <div style={{ marginTop: 12, fontSize: 13, color: "#555" }}>
                    Total: {totalItems}
                </div>

                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
        </AppLayout>
    );
}
