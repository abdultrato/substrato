"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { apiFetch, apiFetchList } from "@/lib/api";
import { EntidadeList } from "@/lib/types";
import useAuthGuard from "@/hooks/useAuthGuard";
import useDebounce from "@/hooks/useDebounce";
import AppLayout from "@/components/layout/AppLayout";
import Pagination from "@/components/ui/Pagination";
import { GROUPS } from "@/lib/rbac";

export default function EntidadesPage () {
    useAuthGuard();

    const [entidades, setEntidades] = useState<EntidadeList[]>( [] );
    const [loading, setLoading] = useState( true );
    const [error, setError] = useState<string | null>( null );
    const [page, setPage] = useState( 1 );
    const [pageSize, setPageSize] = useState( 50 );
    const [totalItems, setTotalItems] = useState( 0 );
    const [totalPages, setTotalPages] = useState( 1 );
    const [search, setSearch] = useState( "" );
    const debouncedSearch = useDebounce( search, 300 );
    const mounted = useRef( true );

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, pageSize]);

    useEffect( () => {
        carregar();
        return () => {
            mounted.current = false;
        };
    }, [page, pageSize, debouncedSearch] );

    async function carregar () {
        try {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams();
            if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
            const url = `/entities/${params.toString() ? `?${params.toString()}` : ""}`;

            const { items, meta } = await apiFetchList<EntidadeList>( url, {
                page,
                pageSize,
            } );
            if (!mounted.current) return;

            const total = meta.total ?? items.length;
            const computedTotalPages =
                meta.totalPages ??
                (total && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1);

            setEntidades(items || []);
            setTotalItems(total || 0);
            setTotalPages(computedTotalPages);
            if (page > computedTotalPages) setPage(computedTotalPages);
        } catch ( err ) {
            if (mounted.current) {
                const message = (err as any)?.message || "Falha ao carregar empresas.";
                setError(message);
            }
        } finally {
            if ( mounted.current ) setLoading( false );
        }
    }

    async function apagar ( id: number ) {
        if ( !confirm( "Confirmar remoção da entidade?" ) ) return;

        try {
            await apiFetch( `/entities/${id}/`, { method: "DELETE" } );
            carregar();
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

                    <Link href="/entities/new" className="btn-primary">
                        Nova empresa
                    </Link>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span>Pesquisar</span>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Nome, NUIT, telefone, e-mail"
                        />
                    </label>

                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span>Por página</span>
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                        >
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </label>

                    <div style={{ fontSize: 13, color: "#555" }}>Total: {totalItems}</div>
                </div>

                {error ? <p style={{ color: "#d32f2f", marginTop: 8 }}>{error}</p> : null}

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
                                        <Link href={`/entities/${e.id}`} className="btn-secondary">
                                            Ver
                                        </Link>

                                        <Link href={`/entities/${e.id}/edit`} className="btn-secondary">
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

                <Pagination page={page} totalPages={totalPages} onChange={setPage} />

            </div>
        </AppLayout>
    );
}
