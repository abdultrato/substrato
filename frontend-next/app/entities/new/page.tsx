"use client";

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { EntidadeCreateDTO } from "@/lib/types";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import { FormField } from "@/components/form";
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
            await apiFetch( "/entities/", {
                method: "POST",
                body: JSON.stringify( form ),
            } );

            router.push( "/entities" );
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

                <form onSubmit={salvar} className="space-y-6">
                    <fieldset className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                        <legend className="px-2 text-sm font-semibold text-foreground">Dados da empresa</legend>
                        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <FormField id="nome" label="Nome" required hint="Nome oficial ou comercial.">
                                <input
                                    id="nome"
                                    name="nome"
                                    placeholder="Ex.: Clínica Substrato"
                                    required
                                    value={form.nome}
                                    onChange={handleChange}
                                />
                            </FormField>

                            <FormField id="endereco_sede" label="Local / Sede" hint="Opcional.">
                                <input
                                    id="endereco_sede"
                                    name="endereco_sede"
                                    placeholder="Ex.: Maputo, Baixa"
                                    value={form.endereco_sede}
                                    onChange={handleChange}
                                />
                            </FormField>
                        </div>
                    </fieldset>

                    <fieldset className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                        <legend className="px-2 text-sm font-semibold text-foreground">Contactos</legend>
                        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <FormField id="contactos" label="Contactos (pessoa/departamento)" hint="Opcional.">
                                <input
                                    id="contactos"
                                    name="contactos"
                                    placeholder="Ex.: Recursos Humanos / Financeiro"
                                    value={form.contactos}
                                    onChange={handleChange}
                                />
                            </FormField>

                            <FormField id="telefone1" label="Telefone" hint="Opcional.">
                                <input
                                    id="telefone1"
                                    name="telefone1"
                                    placeholder="Ex.: +258 21 123 456"
                                    value={form.telefone1}
                                    onChange={handleChange}
                                />
                            </FormField>

                            <FormField id="telefone2" label="Telefone (alternativo)" hint="Opcional.">
                                <input
                                    id="telefone2"
                                    name="telefone2"
                                    placeholder="Ex.: +258 84 123 4567"
                                    value={form.telefone2}
                                    onChange={handleChange}
                                />
                            </FormField>

                            <FormField id="email" label="E-mail" hint="Opcional.">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="Ex.: contacto@empresa.com"
                                    value={form.email}
                                    onChange={handleChange}
                                />
                            </FormField>
                        </div>
                    </fieldset>

                    <fieldset className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                        <legend className="px-2 text-sm font-semibold text-foreground">Fiscal e bancário</legend>
                        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <FormField id="nuit" label="NUIT" hint="Opcional.">
                                <input
                                    id="nuit"
                                    name="nuit"
                                    placeholder="Ex.: 123456789"
                                    value={form.nuit}
                                    onChange={handleChange}
                                />
                            </FormField>

                            <FormField id="nib" label="NIB / Conta bancária" hint="Opcional.">
                                <input
                                    id="nib"
                                    name="nib"
                                    placeholder="Ex.: 0001.0000.0000.0000.0"
                                    value={form.nib || ""}
                                    onChange={handleChange}
                                />
                            </FormField>
                        </div>
                    </fieldset>

                    <fieldset className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                        <legend className="px-2 text-sm font-semibold text-foreground">Notas e estado</legend>
                        <div className="mt-2 grid grid-cols-1 gap-3">
                            <FormField id="observacoes" label="Observações" hint="Opcional.">
                                <textarea
                                    id="observacoes"
                                    name="observacoes"
                                    placeholder="Escreva observações relevantes..."
                                    value={form.observacoes || ""}
                                    onChange={handleChange}
                                    rows={3}
                                />
                            </FormField>

                            <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                                <input
                                    type="checkbox"
                                    name="ativo"
                                    checked={!!form.ativo}
                                    onChange={handleChange}
                                />
                                Ativo
                            </label>
                        </div>
                    </fieldset>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                            className={`btn-primary ${loading ? "btn-loading" : ""}`}
                            disabled={loading}
                        >
                            {loading ? "Salvando..." : "Salvar"}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

