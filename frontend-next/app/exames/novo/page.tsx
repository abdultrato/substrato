"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useRouter } from "next/navigation";

export default function NovoExamePage () {
    useAuthGuard();
    const router = useRouter();

    const [form, setForm] = useState( {
        nome: "",
        preco: 0,
        trl_horas: 24,
        metodo: "Enzimatico",
        setor: "Bioquimica",
    } );

    function update ( field: string, value: any ) {
        setForm( prev => ( { ...prev, [field]: value } ) );
    }

    async function salvar ( e: any ) {
        e.preventDefault();

        await apiFetch( "/exames/", {
            method: "POST",
            body: JSON.stringify( form ),
        } );

        router.push( "/exames" );
    }

    return (
        <form onSubmit={salvar} className="page-box">
            <h1>Novo Exame</h1>

            <input placeholder="Nome" onChange={e => update( "nome", e.target.value )} required />
            <input type="number" step="0.01" placeholder="Preço" onChange={e => update( "preco", Number( e.target.value ) )} required />
            <input type="number" placeholder="TRL (horas)" onChange={e => update( "trl_horas", Number( e.target.value ) )} required />

            <label>Método</label>
            <select value={form.metodo} onChange={e => update( "metodo", e.target.value )}>
                <option value="Enzimatico">Enzimático</option>
                <option value="Colorimetrico">Colorimétrico</option>
                <option value="ELISA">ELISA</option>
                <option value="PCR">PCR</option>
                <option value="Outro">Outro</option>
            </select>

            <label>Setor</label>
            <select value={form.setor} onChange={e => update( "setor", e.target.value )}>
                <option value="Bioquimica">Bioquímica</option>
                <option value="Hematologia">Hematologia</option>
                <option value="Microbiologia">Microbiologia</option>
                <option value="Imunologia">Imunologia</option>
                <option value="Outro">Outro</option>
            </select>
            <button className="btn-primary">Salvar</button>
        </form>
    );
}
