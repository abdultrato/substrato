"use client";

import {useEffect, useState} from "react";
import {useParams, useRouter} from "next/navigation";
import {apiFetch} from "@/lib/api";
import {Entidade} from "@/lib/types";
import useAuthGuard from "@/hooks/useAuthGuard";
import {logout} from "@/lib/auth";

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
        e: React.ChangeEvent<HTMLInputElement>
    ) {
        const {name, value, type, checked} = e.target;

        setForm(prev =>
            prev
                ? {...prev, [name]: type === "checkbox" ? checked : value}
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

    if (!form) return <p>Carregando...</p>;

    return (
        <div className="container fade-in">

            {/* Header actions */}
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                <h1>Editar Entidade</h1>
                <button className="btn-secondary" onClick={logout}>
                    Terminar sessão
                </button>
            </div>

            <form onSubmit={salvar} className="grid">

                <input
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    placeholder="Nome"
                    required
                />

                <input
                    name="slogan"
                    value={(form as any).slogan || ""}
                    onChange={handleChange}
                    placeholder="Slogan"
                />

                <input
                    name="endereco_sede"
                    value={(form as any).endereco_sede || ""}
                    onChange={handleChange}
                    placeholder="Endereço"
                />

                <input
                    name="telefone1"
                    value={(form as any).telefone1 || ""}
                    onChange={handleChange}
                    placeholder="Telefone"
                />

                <input
                    name="telefone2"
                    value={form.telefone2 || ""}
                    onChange={handleChange}
                    placeholder="Telefone 2"
                />

                <input
                    name="email"
                    value={form.email || ""}
                    onChange={handleChange}
                    placeholder="Email"
                />

                <input
                    name="nuit"
                    value={form.nuit || ""}
                    onChange={handleChange}
                    placeholder="NUIT"
                />

                <label style={{display: "flex", alignItems: "center", gap: "8px"}}>
                    <input
                        type="checkbox"
                        name="ativo"
                        checked={!!form.ativo}
                        onChange={handleChange}
                    />
                    Ativo
                </label>

                <button className="btn-primary" disabled={saving}>
                    {saving ? "Salvando..." : "Salvar"}
                </button>
            </form>
        </div>
    );
}
