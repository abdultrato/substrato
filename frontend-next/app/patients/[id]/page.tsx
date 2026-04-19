"use client";

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Paciente } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS, userHasAnyGroup } from "@/lib/rbac";

function calcularIdade(dataNascimento?: string): string {
    if (!dataNascimento) return "—";

    const hoje = new Date();
    const nascimento = new Date(dataNascimento);

    const diffDias = Math.floor(
        (hoje.getTime() - nascimento.getTime()) / (1000 * 60 * 60 * 24)
    );

    const anos = Math.floor(diffDias / 365);
    if (anos >= 2) return `${anos} anos`;
    if (anos === 1) return `1 ano`;

    const meses = Math.floor(diffDias / 30);
    if (meses >= 2) return `${meses} meses`;
    if (meses === 1) return `1 mês`;

    return `${diffDias} dias`;
}

export default function PacienteDetalhePage() {
    useAuthGuard();
    const { user } = useAuth();

    const { id } = useParams() as { id?: string | string[] };
    const idStr = Array.isArray(id) ? id[0] : id;
    const router = useRouter();

    const podeEditar = userHasAnyGroup(user, [
        GROUPS.ADMIN,
        GROUPS.RECEPCAO,
        GROUPS.MEDICINA_OCUPACIONAL,
    ]);

    const podeVerHistoriaClinica = userHasAnyGroup(user, [
        GROUPS.ADMIN,
        GROUPS.MEDICINA,
        GROUPS.MEDICINA_OCUPACIONAL,
    ]);

    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const carregar = useCallback(async () => {
        if (!idStr) return
        try {
            setLoading(true);
            setError(null);
            setPaciente(null);
            const data = await apiFetch(`/pacientes/${idStr}/`);
            setPaciente(data);
        } catch (err: any) {
            setError(isNotFoundLikeError(err) ? null : (err.message || "Erro ao carregar paciente"));
        } finally {
            setLoading(false);
        }
    }, [idStr]);

    useEffect(() => {
        carregar();
    }, [carregar]);

    if (loading) {
        return (
            <AppLayout
                requiredGroups={[
                    GROUPS.ADMIN,
                    GROUPS.RECEPCAO,
                    GROUPS.ENFERMAGEM,
                    GROUPS.MEDICINA,
                    GROUPS.MEDICINA_OCUPACIONAL,
                ]}
            >
                <div className="page-box fade-in">
                    <div className="skeleton skeleton-row"></div>
                    <div className="skeleton skeleton-row"></div>
                    <div className="skeleton skeleton-row"></div>
                </div>
            </AppLayout>
        );
    }

    if (error || !paciente) {
        return (
            <AppLayout
                requiredGroups={[
                    GROUPS.ADMIN,
                    GROUPS.RECEPCAO,
                    GROUPS.ENFERMAGEM,
                    GROUPS.MEDICINA,
                    GROUPS.MEDICINA_OCUPACIONAL,
                ]}
            >
                <div className="page-box fade-in">
                    <p style={{ color: "#d32f2f" }}>
                        {error || "Paciente não encontrado"}
                    </p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout
            requiredGroups={[
                GROUPS.ADMIN,
                GROUPS.RECEPCAO,
                GROUPS.ENFERMAGEM,
                GROUPS.MEDICINA,
                GROUPS.MEDICINA_OCUPACIONAL,
            ]}
        >
            <div className="page-box fade-in">
                <h1 className="page-title">Detalhes do Paciente</h1>

                <div className="info-grid">
                    <div><strong>ID:</strong> {paciente.id_custom}</div>
                    <div><strong>Nome:</strong> {paciente.nome}</div>
                    <div><strong>Idade:</strong> {calcularIdade(paciente.data_nascimento)}</div>
                    <div><strong>Gênero:</strong> {paciente.genero || "-"}</div>
                    <div><strong>Telefone:</strong> {paciente.contacto || "-"}</div>
                    <div><strong>Email:</strong> {paciente.email || "-"}</div>
                    <div><strong>Documento:</strong> {paciente.tipo_documento || "-"}</div>
                    <div><strong>Nº Documento:</strong> {paciente.numero_id || "-"}</div>
                    <div><strong>Raça/Origem:</strong> {paciente.raca_origem || "-"}</div>
                    <div><strong>Proveniência:</strong> {paciente.proveniencia || "-"}</div>
                    <div><strong>Empresa:</strong> {paciente.empresa_origem_nome || "-"}</div>
                    <div><strong>Morada:</strong> {paciente.morada || "-"}</div>
                    <div>
                        <strong>Cadastro:</strong>{" "}
                        {paciente.criado_em
                            ? new Date(paciente.criado_em).toLocaleDateString()
                            : "-"}
                    </div>
                </div>

                <div style={{ marginTop: 25, display: "flex", gap: 10 }}>
                    <button
                        className="btn-secondary"
                        onClick={() => router.push("/patients")}
                    >
                        ← Voltar
                    </button>

                    {podeVerHistoriaClinica ? (
                        <button
                            className="btn-secondary"
                            onClick={() => router.push(`/patients/${idStr}/historia-clinica`)}
                        >
                            História clínica
                        </button>
                    ) : null}

                    {podeEditar ? (
                        <button
                            className="btn-primary"
                            onClick={() => router.push(`/patients/${idStr}/edit`)}
                        >
                            Editar
                        </button>
                    ) : (
                        <span style={{ color: "#666", alignSelf: "center", fontSize: 13 }}>
                            Somente leitura
                        </span>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

