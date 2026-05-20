"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ApiListMeta, apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import useDebounce from "@/hooks/useDebounce";
import { Requisicao } from "@/lib/types";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import Pagination from "@/components/ui/Pagination";
import { GROUPS } from "@/lib/rbac";

type RequisicaoListResponse = { items: Requisicao[]; meta: ApiListMeta; raw: any };

export default function RequisicoesPage() {
    useAuthGuard();

    const [tipo, setTipo] = useState<string>("");
    const [search, setSearch] = useState<string>("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const debouncedSearch = useDebounce(search, 300);

    useEffect(() => {
        setPage(1);
    }, [tipo, debouncedSearch, pageSize]);

    const { data, isFetching, isError, error } = useQuery<RequisicaoListResponse>({
        queryKey: ["requisicoes", { tipo, page, pageSize, debouncedSearch }],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (tipo) params.set("tipo", tipo);
            if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
            const url = `/clinical/labrequest/${params.toString() ? `?${params.toString()}` : ""}`;
            return apiFetchList<Requisicao>(url, { page, pageSize });
        },
        placeholderData: keepPreviousData,
        staleTime: 20_000,
    });

    const requisicoes = data?.items ?? [];
    const totalItems = data?.meta.total ?? requisicoes.length;
    const totalPages =
        data?.meta.totalPages ??
        (totalItems && pageSize ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1);

    useEffect(() => {
        if (totalPages > 0 && page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

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
                    <Link href="/requests/new" className="btn-primary">
                        Nova requisição
                    </Link>
                    <Link href="/requests/external/new" className="btn-secondary">
                        Nova requisição externa
                    </Link>
                </div>

                <div style={{ display: "flex", gap: 10, margin: "10px 0" }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span>Pesquisar</span>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Código, paciente, estado"
                        />
                    </label>

                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span>Setor</span>
                        <select
                            value={tipo}
                            onChange={(e) => {
                                setPage(1);
                                setTipo(e.target.value);
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
                                setPage(1);
                                setPageSize(Number(e.target.value));
                            }}
                        >
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </label>
                </div>

                {isError && <p style={{ color: "#d32f2f" }}>{(error as any)?.message || "Erro ao carregar requisições"}</p>}

                {isFetching ? (
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
                        {requisicoes.map(r => (
                            <tr key={r.id}>
                                <td>
                                    <Link href={`/requests/${r.id}`}>{r.id_custom}</Link>
                                </td>
                                <td>{r.paciente_nome || r.paciente || "-"}</td>
                                <td>{r.tipo === "MED" ? "Exames médicos" : "Laboratório"}</td>
                                <td>{r.estado}</td>
                            </tr>
                        ))}
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
