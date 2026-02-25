"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useRouter } from "next/navigation";

export default function EditarExamePage ( { params }: any ) {
    useAuthGuard();
    const router = useRouter();

    const [form, setForm] = useState<any>( null );

    useEffect( () => {
        carregar();
    }, [] );

    async function carregar () {
        setForm( await apiFetch( `/exames/${params.id}/` ) );
    }

    async function salvar ( e: any ) {
        e.preventDefault();

        await apiFetch( `/exames/${params.id}/`, {
            method: "PUT",
            body: JSON.stringify( form ),
        } );

        router.push( "/exames" );
    }

    if ( !form ) return <p>Carregando...</p>;

    return (
        <form onSubmit={salvar} className="page-box">
            <h1>Editar Exame</h1>

            <input value={form.nome} onChange={e => setForm( { ...form, nome: e.target.value } )} />
            <input value={form.codigo} onChange={e => setForm( { ...form, codigo: e.target.value } )} />

            <button className="btn-primary">Salvar</button>
        </form>
    );
}
