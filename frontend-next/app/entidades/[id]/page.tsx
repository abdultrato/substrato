"use client";

import {useEffect, useState} from "react";
import {useParams} from "next/navigation";
import Link from "next/link";
import {apiFetch} from "@/lib/api";
import {Entidade} from "@/lib/types";
import useAuthGuard from "@/hooks/useAuthGuard";
import {logout} from "@/lib/auth";

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

    if (!entidade) return <p>Carregando...</p>;

    return (
        <div className="container fade-in">

            {/* topo */}
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                <h1>{entidade.nome}</h1>
                <button className="btn-secondary" onClick={logout}>
                    Terminar sessão
                </button>
            </div>

            <div className="page-box">

                <p><strong>Slogan:</strong> {entidade.slogan || "-"}</p>
                <p><strong>Endereço:</strong> {entidade.endereco_sede || "-"}</p>
                <p><strong>Telefone:</strong> {entidade.telefone1 || "-"}</p>
                <p><strong>Email:</strong> {entidade.email || "-"}</p>
                <p><strong>NUIT:</strong> {entidade.nuit || "-"}</p>
                <p>
                    <strong>Status:</strong>{" "}
                    {entidade.ativo ? "Ativo" : "Inativo"}
                </p>

                <div style={{marginTop: "20px"}}>
                    <Link
                        href={`/entidades/${entidade.id}/editar`}
                        className="btn-primary"
                    >
                        Editar
                    </Link>
                </div>

            </div>
        </div>
    );
}
