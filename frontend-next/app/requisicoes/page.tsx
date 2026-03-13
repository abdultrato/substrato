"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { Requisicao } from "@/lib/types";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS } from "@/lib/rbac";

export default function RequisicoesPage () {
    useAuthGuard();

    const [requisicoes, setRequisicoes] = useState<Requisicao[]>( [] );
    const [tipo, setTipo] = useState<string>( "" );

    async function carregar () {
        const url = tipo ? `/requisicoes/?tipo=${encodeURIComponent( tipo )}` : "/requisicoes/";
        const reqs = await apiFetch<any>( url );
        const reqData = reqs && (reqs as any).results ? (reqs as any).results : (reqs as any);
        setRequisicoes( Array.isArray( reqData ) ? reqData : [] );
    }

    useEffect( () => {
        carregar();
    }, [tipo] );

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
                <Link href="/requisicoes/nova" className="btn-primary">
                    Nova requisição
                </Link>

                <div style={{ display: "flex", gap: 10, margin: "10px 0" }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span>Setor</span>
                        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                            <option value="">Todos</option>
                            <option value="LAB">Laboratório</option>
                            <option value="MED">Exames médicos</option>
                        </select>
                    </label>
                </div>

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
            </div>
        </AppLayout>
    );
}
