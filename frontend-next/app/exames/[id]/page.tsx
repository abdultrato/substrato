"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { Exame } from "@/lib/types";

export default function ExameDetailPage ( { params }: any ) {
    useAuthGuard();

    const [exame, setExame] = useState<Exame | null>( null );

    useEffect( () => {
        carregar();
    }, [] );

    async function carregar () {
        setExame( await apiFetch( `/exames/${params.id}/` ) );
    }

    if ( !exame ) return <p>Carregando...</p>;

    return (
        <div className="page-box">
            <h1>{exame.nome}</h1>
            <p>Código: {exame.codigo}</p>
            <p>Método: {exame.metodo}</p>
            <p>Setor: {exame.setor}</p>

            <h3>Campos</h3>
            {exame.campos.map( c => (
                <div key={c.id}>
                    {c.nome_campo} ({c.unidade}) → {c.valor_referencia}
                </div>
            ) )}
        </div>
    );
}
