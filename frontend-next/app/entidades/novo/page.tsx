"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { EntidadeCreateDTO } from "@/lib/types";
import useAuthGuard from "@/hooks/useAuthGuard";
import { logout } from "@/lib/auth";

export default function NovaEntidadePage () {
    useAuthGuard();
    const router = useRouter();

    const [loading, setLoading] = useState( false );
    const [error, setError] = useState<string | null>( null );

    const [form, setForm] = useState<EntidadeCreateDTO>( {
        nome: "",
        slogan: "",
        endereco_sede: "",
        telefone1: "",
        telefone2: "",
        email: "",
        nuit: "",
        ativo: true,
    } );

    function handleChange ( e: React.ChangeEvent<HTMLInputElement> ) {
        const { name, value, type, checked } = e.target;

        setForm( prev => ( {
            ...prev,
            [name]: type === "checkbox" ? checked : value.trimStart(),
        } ) );
    }

    async function salvar ( e: React.FormEvent ) {
        e.preventDefault();
        if ( !form.nome.trim() ) {
            setError( "Nome é obrigatório" );
            return;
        }

        setLoading( true );
        setError( null );

        try {
            await apiFetch( "/entidades/", {
                method: "POST",
                body: JSON.stringify( form ),
            } );

            router.push( "/entidades" );
        } catch ( err: any ) {
            setError( err.message || "Erro ao salvar entidade" );
        } finally {
            setLoading( false );
        }
    }

    return (
        <div className="container fade-in">

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1 className="page-title">Nova Entidade</h1>

                <button className="btn-secondary" onClick={logout}>
                    Terminar sessão
                </button>
            </div>

            {error && (
                <p style={{ color: "#d32f2f", marginBottom: 10 }}>
                    {error}
                </p>
            )}

            <form onSubmit={salvar} className="grid page-box">

                <input
                    name="nome"
                    placeholder="Nome"
                    required
                    value={form.nome}
                    onChange={handleChange}
                />

                <input
                    name="slogan"
                    placeholder="Slogan"
                    value={form.slogan}
                    onChange={handleChange}
                />

                <input
                    name="endereco_sede"
                    placeholder="Endereço"
                    value={form.endereco_sede}
                    onChange={handleChange}
                />

                <input
                    name="telefone1"
                    placeholder="Telefone 1"
                    value={form.telefone1}
                    onChange={handleChange}
                />

                <input
                    name="telefone2"
                    placeholder="Telefone 2"
                    value={form.telefone2}
                    onChange={handleChange}
                />

                <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={handleChange}
                />

                <input
                    name="nuit"
                    placeholder="NUIT"
                    value={form.nuit}
                    onChange={handleChange}
                />

                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                        type="checkbox"
                        name="ativo"
                        checked={form.ativo}
                        onChange={handleChange}
                    />
                    Ativo
                </label>

                <button
                    className={`btn-primary ${loading ? "btn-loading" : ""}`}
                    disabled={loading}
                >
                    {loading ? "Salvando..." : "Salvar"}
                </button>

            </form>
        </div>
    );
}
