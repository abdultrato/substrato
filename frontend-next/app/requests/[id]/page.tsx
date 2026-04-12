"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Requisicao } from "@/lib/types";
import Link from "next/link";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS } from "@/lib/rbac";
import { useParams } from "next/navigation";
import { routeParamToString } from "@/lib/routeParams";

export default function RequisicaoDetail() {
    const params = useParams();
    const id = routeParamToString((params as any)?.id);
    useAuthGuard();

    const [req, setReq] = useState<Requisicao | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const carregar = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await apiFetch(`/clinical/labrequest/${id}/`);
            setReq(data);
        } catch {
            setError("Erro ao carregar requisição");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        carregar();
    }, [carregar]);

    const requiredGroups = [
        GROUPS.ADMIN,
        GROUPS.RECEPCAO,
        GROUPS.MEDICINA,
        GROUPS.MEDICINA_OCUPACIONAL,
    ]

    if (loading) {
        return (
            <AppLayout requiredGroups={requiredGroups}>
                <p>Carregando...</p>
            </AppLayout>
        )
    }
    if (error) {
        return (
            <AppLayout requiredGroups={requiredGroups}>
                <p style={{ color: "red" }}>{error}</p>
            </AppLayout>
        )
    }
    if (!req) return null;

    return (
        <AppLayout requiredGroups={requiredGroups}>
            <div className="page-box fade-in">
                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    <Link href={`/requisicoes/${req.id}/editar`} className="btn-secondary">
                        Editar
                    </Link>
                </div>

                <h1>Requisição {req.id_custom}</h1>

                <p>
                    <b>Paciente:</b> {req.paciente_nome || req.paciente || "—"}
                </p>

                <p>
                    <b>Empresa solicitante:</b> {req.empresa_solicitante_nome || "—"}
                </p>

                <p>
                    <b>Executora externa:</b> {req.empresa_executora_externa_nome || "—"}
                </p>

                <p>
                    <b>Estado:</b> {req.estado || "—"}
                </p>

                <p>
                    <b>Setor:</b> {req.tipo === "MED" ? "Exames médicos" : "Laboratório"}
                </p>

                <hr />

                <h3>Exames</h3>

                {req.itens && req.itens.length > 0 ? (
                    <ul>
                        {req.itens.map((it: any) => (
                            <li key={it.id}>
                                {it.exame_nome || it.exame_medico_nome || `Item #${it.id}`}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>Nenhum exame associado</p>
                )}

                <hr />

                <div style={{ marginTop: 10 }}>
                    <Link href="/requisicoes" className="btn-secondary">
                        ← Voltar
                    </Link>
                </div>
            </div>
        </AppLayout>
    );
}
