"use client";

import {useEffect, useState} from "react";
import {useParams, useRouter} from "next/navigation";
import {apiFetch} from "@/lib/api";
import {Entidade} from "@/lib/types";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
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
                const data = await apiFetch(`/entidades/${id}/`);
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
            await apiFetch(`/entidades/${id}/`, {
                method: "PUT",
                body: JSON.stringify(form),
            });

            router.push("/entidades");
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

                <form onSubmit={salvar} className="grid">
                    <input
                        name="nome"
                        value={form.nome}
                        onChange={handleChange}
                        placeholder="Nome"
                        required
                    />

                    <input
                        name="endereco_sede"
                        value={(form as any).endereco_sede || ""}
                        onChange={handleChange}
                        placeholder="Local / Sede"
                    />

                    <input
                        name="contactos"
                        value={(form as any).contactos || ""}
                        onChange={handleChange}
                        placeholder="Contactos (pessoa/departamento)"
                    />

                    <input
                        name="telefone1"
                        value={(form as any).telefone1 || ""}
                        onChange={handleChange}
                        placeholder="Telefone"
                    />

                    <input
                        name="telefone2"
                        value={(form as any).telefone2 || ""}
                        onChange={handleChange}
                        placeholder="Telefone (alternativo)"
                    />

                    <input
                        name="email"
                        value={(form as any).email || ""}
                        onChange={handleChange}
                        placeholder="E-mail"
                    />

                    <input
                        name="nuit"
                        value={(form as any).nuit || ""}
                        onChange={handleChange}
                        placeholder="NUIT"
                    />

                    <input
                        name="nib"
                        value={(form as any).nib || ""}
                        onChange={handleChange}
                        placeholder="NIB / Conta bancária"
                    />

                    <textarea
                        name="observacoes"
                        value={(form as any).observacoes || ""}
                        onChange={handleChange}
                        placeholder="Observações"
                        rows={3}
                    />

                    <label style={{display: "flex", alignItems: "center", gap: "8px"}}>
                        <input
                            type="checkbox"
                            name="ativo"
                            checked={!!(form as any).ativo}
                            onChange={handleChange}
                        />
                        Ativo
                    </label>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button className="btn-primary" disabled={saving}>
                            {saving ? "Salvando..." : "Salvar"}
                        </button>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => router.push( "/entidades" )}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
