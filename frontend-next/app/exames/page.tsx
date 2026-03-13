"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import Link from "next/link";
import { Exame } from "@/lib/types";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS } from "@/lib/rbac";

export default function ExamesPage () {
    useAuthGuard();

    const [exames, setExames] = useState<Exame[]>( [] );

    useEffect( () => {
        carregar();
    }, [] );

    async function carregar () {
        const r = await apiFetch<any>( "/exames/" );
        const data = r && (r as any).results ? (r as any).results : (r as any);
        setExames( data || [] );
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
            </div>
        </AppLayout>
    );
}
