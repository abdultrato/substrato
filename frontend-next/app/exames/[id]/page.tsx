"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { Exame, ExameCampo } from "@/lib/types";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS } from "@/lib/rbac";

export default function ExameDetailPage ( { params }: any ) {
    useAuthGuard();

    const [exame, setExame] = useState<Exame | null>( null );
    const [campos, setCampos] = useState<ExameCampo[]>( [] );

    useEffect( () => {
        carregar();
    }, [] );

    async function carregar () {
        const ex = await apiFetch<Exame>( `/exames/${params.id}/` );
        setExame( ex );

        const r = await apiFetch<any>( `/clinico/examecampo/?exame=${params.id}` );
        const data = r && (r as any).results ? (r as any).results : (r as any);
        setCampos( Array.isArray( data ) ? data : [] );
    }

    if ( !exame ) {
        return (
            <AppLayout requiredGroups={[GROUPS.ADMIN]}>
                <p>Carregando...</p>
            </AppLayout>
        );
    }

    return (
        <AppLayout requiredGroups={[GROUPS.ADMIN]}>
            <div className="page-box">
                <h1>{exame.nome}</h1>
                <p>Código: {exame.id_custom}</p>
                <p>Método: {exame.metodo}</p>
                <p>Setor: {exame.setor}</p>

                <h3>Campos</h3>
                {campos.length === 0 ? (
                    <p>Sem campos cadastrados.</p>
                ) : campos.map( c => (
                    <div key={c.id}>
                        {c.nome || "-"} ({c.unidade || "-"})
                    </div>
                ) )}
            </div>
        </AppLayout>
    );
}
