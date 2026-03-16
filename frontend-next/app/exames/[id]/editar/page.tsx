"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS } from "@/lib/rbac";
import { routeParamToString } from "@/lib/routeParams";

export default function EditarExamePage () {
    const params = useParams();
    const id = routeParamToString( (params as any)?.id );
    useAuthGuard();
    const router = useRouter();

    const [form, setForm] = useState<any>( null );

    const carregar = useCallback( async () => {
        setForm( await apiFetch( `/exames/${id}/` ) );
    }, [id] );

    useEffect( () => {
        carregar();
    }, [carregar] );

    async function salvar ( e: any ) {
        e.preventDefault();

        await apiFetch( `/exames/${id}/`, {
            method: "PUT",
            body: JSON.stringify( form ),
        } );

        router.push( "/exames" );
    }

    if ( !form ) {
        return (
            <AppLayout requiredGroups={[GROUPS.ADMIN]}>
                <p>Carregando...</p>
            </AppLayout>
        );
    }

    return (
        <AppLayout requiredGroups={[GROUPS.ADMIN]}>
            <form onSubmit={salvar} className="page-box">
                <h1>Editar Exame</h1>

                <input
                    placeholder="Nome"
                    value={form.nome || ""}
                    onChange={e => setForm( { ...form, nome: e.target.value } )}
                />

                <input
                    type="number"
                    placeholder="Preço"
                    step="0.01"
                    value={form.preco ?? 0}
                    onChange={e => setForm( { ...form, preco: Number( e.target.value ) } )}
                />

                <input
                    type="number"
                    placeholder="TRL (horas)"
                    value={form.trl_horas ?? 24}
                    onChange={e => setForm( { ...form, trl_horas: Number( e.target.value ) } )}
                />

                <label>Método</label>
                <select
                    value={form.metodo || "Enzimatico"}
                    onChange={e => setForm( { ...form, metodo: e.target.value } )}
                >
                    <option value="Enzimatico">Enzimático</option>
                    <option value="Colorimetrico">Colorimétrico</option>
                    <option value="ELISA">ELISA</option>
                    <option value="PCR">PCR</option>
                    <option value="Outro">Outro</option>
                </select>

                <label>Setor</label>
                <select
                    value={form.setor || "Bioquimica"}
                    onChange={e => setForm( { ...form, setor: e.target.value } )}
                >
                    <option value="Bioquimica">Bioquímica</option>
                    <option value="Hematologia">Hematologia</option>
                    <option value="Microbiologia">Microbiologia</option>
                    <option value="Imunologia">Imunologia</option>
                    <option value="Outro">Outro</option>
                </select>

                <button className="btn-primary">Salvar</button>
            </form>
        </AppLayout>
    );
}
