"use client";

import { useEffect, useState } from "react";
import { ExamesService } from "@/lib/api-client/services/ExamesService";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import Link from "next/link";
import { ExameList } from "@/lib/types";

export default function ExamesPage () {
    useAuthGuard();

    const [exames, setExames] = useState<ExameList[]>( [] );

    useEffect( () => {
        carregar();
    }, [] );

    async function carregar () {
        const r = await ExamesService.clinicoExamesList();
        const data = r && (r as any).results ? (r as any).results : (r as any);
        setExames( data || [] );
    }

    async function remover ( id: number ) {
        if ( !confirm( "Remover exame?" ) ) return;
        await apiFetch( `/exames/${id}/`, { method: "DELETE" } );
        carregar();
    }

    return (
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
                        <th>Campos</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {exames.map( e => (
                        <tr key={e.id}>
                            <td>{e.nome}</td>
                            <td>{e.codigo}</td>
                            <td>{e.setor}</td>
                            <td>{e.metodo}</td>
                            <td>{e.total_campos}</td>
                            <td>
                                <Link href={`/exames/${e.id}`}>Ver</Link>{" "}
                                <Link href={`/exames/${e.id}/editar`}>Editar</Link>{" "}
                                <button onClick={() => remover( e.id )}>Apagar</button>
                            </td>
                        </tr>
                    ) )}
                </tbody>
            </table>
        </div>
    );
}
