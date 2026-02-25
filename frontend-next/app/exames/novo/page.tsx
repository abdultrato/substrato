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
        codigo: "",
        preco: 0,
        trl_horas: 24,
        metodo: "OUTRO",
        setor: "OUTRO",
    } );

    const [campos, setCampos] = useState( [
        { nome_campo: "", tipo: "NUM", unidade: "", valor_referencia: "", ordem: 1 },
    ] );

    function update ( field: string, value: any ) {
        setForm( prev => ( { ...prev, [field]: value } ) );
    }

    function updateCampo ( i: number, field: string, value: any ) {
        setCampos( prev => prev.map( ( c, idx ) => idx === i ? { ...c, [field]: value } : c ) );
    }

    function addCampo () {
        setCampos( prev => [...prev, { nome_campo: "", tipo: "NUM", unidade: "", valor_referencia: "", ordem: prev.length + 1 }] );
    }

    async function salvar ( e: any ) {
        e.preventDefault();

        await apiFetch( "/exames/", {
            method: "POST",
            body: JSON.stringify( { ...form, campos } ),
        } );

        router.push( "/exames" );
    }

    return (
        <form onSubmit={salvar} className="page-box">
            <h1>Novo Exame</h1>

            <input placeholder="Nome" onChange={e => update( "nome", e.target.value )} required />
            <input placeholder="Código" onChange={e => update( "codigo", e.target.value )} required />
            <input type="number" placeholder="Preço" onChange={e => update( "preco", e.target.value )} />

            <label>Método</label>
            <select onChange={e => update( "metodo", e.target.value )}>
                <option>Enzimático</option>
                <option>Imunológico</option>
                <option>ELISA</option>
                <option>PCR</option>
                <option>Outro</option>
            </select>

            <label>Setor</label>
            <select onChange={e => update( "setor", e.target.value )}>
                <option>Bioquímica</option>
                <option>Hematologia</option>
                <option>Microbiologia</option>
                <option>Imunologia</option>
                <option>Outro</option>
            </select>

            <h3>Campos</h3>

            {campos.map( ( c, i ) => (
                <div key={i}>
                    <input placeholder="Indicador" onChange={e => updateCampo( i, "nome_campo", e.target.value )} />
                    <select onChange={e => updateCampo( i, "tipo", e.target.value )}>
                        <option value="NUM">Numérico</option>
                        <option value="TXT">Texto</option>
                    </select>
                    <input placeholder="Unidade" onChange={e => updateCampo( i, "unidade", e.target.value )} />
                    <input placeholder="Referência" onChange={e => updateCampo( i, "valor_referencia", e.target.value )} />
                </div>
            ) )}

            <button type="button" onClick={addCampo}>+ Campo</button>
            <button className="btn-primary">Salvar</button>
        </form>
    );
}
