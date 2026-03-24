"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { Exame, ExameCampo } from "@/lib/types";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS } from "@/lib/rbac";
import { useParams } from "next/navigation";
import { routeParamToString } from "@/lib/routeParams";

export default function ExameDetailPage () {
    const params = useParams();
    const id = routeParamToString( (params as any)?.id );
    useAuthGuard();

    const [exame, setExame] = useState<Exame | null>( null );
    const [campos, setCampos] = useState<ExameCampo[]>( [] );

    const carregar = useCallback( async () => {
        const ex = await apiFetch<Exame>( `/exames/${id}/` );
        setExame( ex );

        const r = await apiFetch<any>( `/clinico/examecampo/?exame=${id}` );
        const data = r && (r as any).results ? (r as any).results : (r as any);
        setCampos( Array.isArray( data ) ? data : [] );
    }, [id] );

    useEffect( () => {
        carregar();
    }, [carregar] );

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
