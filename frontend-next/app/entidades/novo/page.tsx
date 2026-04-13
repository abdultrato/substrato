"use client";

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { EntidadeCreateDTO } from "@/lib/types";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS } from "@/lib/rbac";

export default function NovaEntidadePage () {
    useAuthGuard();
    const router = useRouter();

    const [loading, setLoading] = useState( false );
    const [error, setError] = useState<string | null>( null );

    const [form, setForm] = useState<EntidadeCreateDTO>( {
        nome: "",
        endereco_sede: "",
        contactos: "",
        telefone1: "",
        telefone2: "",
        email: "",
        nuit: "",
        nib: "",
        observacoes: "",
        ativo: true,
    } );

    function handleChange ( e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> ) {
        const { name } = e.target;
        const isCheckbox = ( e.target as HTMLInputElement ).type === "checkbox";
        const nextValue = isCheckbox
            ? ( e.target as HTMLInputElement ).checked
            : e.target.value.trimStart();

        setForm( prev => ( { ...prev, [name]: nextValue as any } ) );
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
            setError(isNotFoundLikeError(err) ? null : (err.message || "Erro ao salvar entidade" ));
        } finally {
            setLoading( false );
        }
    }

    return (
        <AppLayout
            requiredGroups={[
                GROUPS.ADMIN,
                GROUPS.RECEPCAO,
                GROUPS.MEDICINA_OCUPACIONAL,
            ]}
        >
            <div className="page-box fade-in">
                <h1 className="page-title">Nova Empresa</h1>

                {error && (
                    <p style={{ color: "#d32f2f", marginBottom: 10 }}>
                        {error}
                    </p>
                )}

                <form onSubmit={salvar} className="grid">
                    <input
                        name="nome"
                        placeholder="Nome"
                        required
                        value={form.nome}
                        onChange={handleChange}
                    />

                    <input
                        name="endereco_sede"
                        placeholder="Local / Sede"
                        value={form.endereco_sede}
                        onChange={handleChange}
                    />

                    <input
                        name="contactos"
                        placeholder="Contactos (pessoa/departamento)"
                        value={form.contactos}
                        onChange={handleChange}
                    />

                    <input
                        name="telefone1"
                        placeholder="Telefone"
                        value={form.telefone1}
                        onChange={handleChange}
                    />

                    <input
                        name="telefone2"
                        placeholder="Telefone (alternativo)"
                        value={form.telefone2}
                        onChange={handleChange}
                    />

                    <input
                        name="email"
                        type="email"
                        placeholder="E-mail"
                        value={form.email}
                        onChange={handleChange}
                    />

                    <input
                        name="nuit"
                        placeholder="NUIT"
                        value={form.nuit}
                        onChange={handleChange}
                    />

                    <input
                        name="nib"
                        placeholder="NIB / Conta bancária"
                        value={form.nib || ""}
                        onChange={handleChange}
                    />

                    <textarea
                        name="observacoes"
                        placeholder="Observações"
                        value={form.observacoes || ""}
                        onChange={handleChange}
                        rows={3}
                    />

                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                            type="checkbox"
                            name="ativo"
                            checked={!!form.ativo}
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
        </AppLayout>
    );
}

