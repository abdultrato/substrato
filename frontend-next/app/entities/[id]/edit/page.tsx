"use client";

import {useEffect, useState} from "react";
import {useParams, useRouter} from "next/navigation";
import {apiFetch} from "@/lib/api";
import {Entidade} from "@/lib/types";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import { FormField } from "@/components/form";
import { GROUPS } from "@/lib/rbac";

export default function EditarEntidadePage() {
    useAuthGuard(); // 🔐 proteção automática

    const {id} = useParams();
    const router = useRouter();

    const [form, setForm] = useState<any | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function carregar() {
            try {
                const data = await apiFetch(`/external_entities/empresa/${id}/`);
                setForm(data);
            } catch {
                alert("Erro ao carregar entidade");
            }
        }

        if (id) carregar();
    }, [id]);

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) {
        const {name} = e.target;
        const isCheckbox = (e.target as HTMLInputElement).type === "checkbox";
        const nextValue = isCheckbox ? (e.target as HTMLInputElement).checked : e.target.value;

        setForm(prev =>
            prev
                ? {...prev, [name]: nextValue}
                : prev
        );
    }

    async function salvar(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        try {
            await apiFetch(`/external_entities/empresa/${id}/`, {
                method: "PUT",
                body: JSON.stringify(form),
            });

            router.push("/entities");
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    }

    if (!form) {
        return (
            <AppLayout
                requiredGroups={[
                    GROUPS.ADMIN,
                    GROUPS.RECEPCAO,
                    GROUPS.MEDICINA_OCUPACIONAL,
                ]}
            >
                <p>Carregando...</p>
            </AppLayout>
        )
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
                <h1 className="page-title">Editar Empresa</h1>

                <form onSubmit={salvar} className="space-y-6">
                    <fieldset className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                        <legend className="px-2 text-sm font-semibold text-foreground">Dados da empresa</legend>
                        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <FormField id="nome" label="Nome" required>
                                <input
                                    id="nome"
                                    name="nome"
                                    value={form.nome}
                                    onChange={handleChange}
                                    placeholder="Ex.: Clínica Substrato"
                                    required
                                />
                            </FormField>

                            <FormField id="endereco_sede" label="Local / Sede" hint="Opcional.">
                                <input
                                    id="endereco_sede"
                                    name="endereco_sede"
                                    value={(form as any).endereco_sede || ""}
                                    onChange={handleChange}
                                    placeholder="Ex.: Maputo, Baixa"
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
                                    value={(form as any).contactos || ""}
                                    onChange={handleChange}
                                    placeholder="Ex.: Recursos Humanos / Financeiro"
                                />
                            </FormField>

                            <FormField id="telefone1" label="Telefone" hint="Opcional.">
                                <input
                                    id="telefone1"
                                    name="telefone1"
                                    value={(form as any).telefone1 || ""}
                                    onChange={handleChange}
                                    placeholder="Ex.: +258 21 123 456"
                                />
                            </FormField>

                            <FormField id="telefone2" label="Telefone (alternativo)" hint="Opcional.">
                                <input
                                    id="telefone2"
                                    name="telefone2"
                                    value={(form as any).telefone2 || ""}
                                    onChange={handleChange}
                                    placeholder="Ex.: +258 84 123 4567"
                                />
                            </FormField>

                            <FormField id="email" label="E-mail" hint="Opcional.">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={(form as any).email || ""}
                                    onChange={handleChange}
                                    placeholder="Ex.: contacto@empresa.com"
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
                                    value={(form as any).nuit || ""}
                                    onChange={handleChange}
                                    placeholder="Ex.: 123456789"
                                />
                            </FormField>

                            <FormField id="nib" label="NIB / Conta bancária" hint="Opcional.">
                                <input
                                    id="nib"
                                    name="nib"
                                    value={(form as any).nib || ""}
                                    onChange={handleChange}
                                    placeholder="Ex.: 0001.0000.0000.0000.0"
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
                                    value={(form as any).observacoes || ""}
                                    onChange={handleChange}
                                    placeholder="Escreva observações relevantes..."
                                    rows={3}
                                />
                            </FormField>

                            <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                                <input
                                    type="checkbox"
                                    name="ativo"
                                    checked={!!(form as any).ativo}
                                    onChange={handleChange}
                                />
                                Ativo
                            </label>
                        </div>
                    </fieldset>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <button className={`btn-primary ${saving ? "btn-loading" : ""}`} disabled={saving}>
                            {saving ? "Salvando..." : "Salvar"}
                        </button>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => router.push( "/entities" )}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
