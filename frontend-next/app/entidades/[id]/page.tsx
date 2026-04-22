"use client";

import {useEffect, useState} from "react";
import {useParams} from "next/navigation";
import Link from "next/link";
import {apiFetch} from "@/lib/api";
import {Entidade} from "@/lib/types";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS } from "@/lib/rbac";

export default function VerEntidadePage() {
    useAuthGuard(); // 🔐 proteção automática

    const {id} = useParams();
    const [entidade, setEntidade] = useState<Entidade | null>(null);

    useEffect(() => {
        async function carregar() {
            try {
                const data = await apiFetch(`/entidades/${id}/`);
                setEntidade(data);
            } catch {
                alert("Erro ao carregar entidade");
            }
        }

        if (id) carregar();
    }, [id]);

    if (!entidade) {
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
                <h1 className="page-title">{entidade.nome}</h1>

                <div className="info-grid">
                    <div><strong>Código:</strong> {entidade.id_custom || entidade.id}</div>
                    <div><strong>Local / Sede:</strong> {entidade.endereco_sede || "-"}</div>
                    <div><strong>Contactos:</strong> {entidade.contactos || "-"}</div>
                    <div><strong>Telefone:</strong> {entidade.telefone1 || "-"}</div>
                    <div><strong>Telefone (alternativo):</strong> {entidade.telefone2 || "-"}</div>
                    <div><strong>E-mail:</strong> {entidade.email || "-"}</div>
                    <div><strong>NUIT:</strong> {entidade.nuit || "-"}</div>
                    <div><strong>NIB:</strong> {entidade.nib || "-"}</div>
                    <div><strong>Observações:</strong> {entidade.observacoes || "-"}</div>
                    <div><strong>Status:</strong> {entidade.ativo ? "Ativo" : "Inativo"}</div>
                </div>

                <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                    <Link href="/entidades" className="btn-secondary">
                        ← Voltar
                    </Link>
                    <Link href={`/entidades/${entidade.id}/editar`} className="btn-primary">
                        Editar
                    </Link>
                </div>
            </div>
        </AppLayout>
    );
}
