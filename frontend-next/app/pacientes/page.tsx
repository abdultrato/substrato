"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Paciente, PacienteCreateDTO } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS, userHasAnyGroup } from "@/lib/rbac";

function calcularIdade ( dataNascimento?: string ): string {
    if ( !dataNascimento ) return "—";

    const hoje = new Date();
    const nascimento = new Date( dataNascimento );

    const diffDias = Math.floor(
        ( hoje.getTime() - nascimento.getTime() ) / ( 1000 * 60 * 60 * 24 )
    );

    const anos = Math.floor( diffDias / 365 );
    if ( anos >= 2 ) return `${anos} anos`;
    if ( anos === 1 ) return `1 ano`;

    const meses = Math.floor( diffDias / 30 );
    if ( meses >= 2 ) return `${meses} meses`;
    if ( meses === 1 ) return `1 mês`;

    return `${diffDias} dias`;
}

export default function PacientesPage () {
    useAuthGuard();
    const { user } = useAuth();

    const podeEditar = userHasAnyGroup( user, [
        GROUPS.ADMIN,
        GROUPS.RECEPCAO,
        GROUPS.MEDICINA_OCUPACIONAL,
    ] );
    const podeApagar = userHasAnyGroup( user, [GROUPS.ADMIN] );

    const [pacientes, setPacientes] = useState<Paciente[]>( [] );
    const [loading, setLoading] = useState( true );
    const [saving, setSaving] = useState( false );
    const [error, setError] = useState<string | null>( null );
    const [editingId, setEditingId] = useState<number | null>( null );

    const [form, setForm] = useState<PacienteCreateDTO>( {
        nome: "",
        data_nascimento: "",
        genero: "",
        raca_origem: "Negra",
        tipo_documento: "BI",
        numero_id: "",
        contacto: "",
        email: "",
        proveniencia: "",
        morada: "",
    } );

    useEffect( () => {
        carregarPacientes();
    }, [] );

    async function carregarPacientes () {
        try {
            const r = await apiFetch<any>( "/pacientes/" );
            const data = r && (r as any).results ? (r as any).results : (r as any);
            setPacientes( data || [] );
        } catch {
            setError( "Erro ao carregar pacientes" );
        } finally {
            setLoading( false );
        }
    }

    function handleChange (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        const { name, value } = e.target;
        setForm( ( prev ) => ( { ...prev, [name]: value } ) );
    }

    function resetForm () {
        setForm( {
            nome: "",
            data_nascimento: "",
            genero: "",
            raca_origem: "Negra",
            tipo_documento: "BI",
            numero_id: "",
            contacto: "",
            email: "",
            proveniencia: "",
            morada: "",
        } );
        setEditingId( null );
    }

    async function salvarPaciente () {
        if ( !podeEditar ) {
            setError( "Sem permissão para criar/editar pacientes." );
            return;
        }
        if ( !form.nome.trim() ) {
            setError( "Nome é obrigatório" );
            return;
        }

        try {
            setSaving( true );

            if ( editingId ) {
                await apiFetch( `/pacientes/${editingId}/`, { method: "PUT", body: JSON.stringify( form ) } );
            } else {
                await apiFetch( "/pacientes/", { method: "POST", body: JSON.stringify( form ) } );
            }

            resetForm();
            carregarPacientes();
        } catch {
            setError( "Erro ao salvar paciente" );
        } finally {
            setSaving( false );
        }
    }

    async function apagarPaciente ( id: number ) {
        if ( !podeApagar ) {
            setError( "Sem permissão para apagar pacientes." );
            return;
        }
        if ( !confirm( "Deseja remover este paciente?" ) ) return;

        await apiFetch( `/pacientes/${id}/`, { method: "DELETE" } );
        carregarPacientes();
    }

    function iniciarEdicao ( p: Paciente ) {
        if ( !podeEditar ) {
            setError( "Sem permissão para editar pacientes." );
            return;
        }
        setForm( {
            nome: p.nome || "",
            data_nascimento: p.data_nascimento || "",
            genero: p.genero || "",
            raca_origem: p.raca_origem || "Negra",
            tipo_documento: p.tipo_documento || "Bilhete de Identidade",
            numero_id: p.numero_id || "",
            contacto: p.contacto || "",
            email: p.email || "",
            proveniencia: p.proveniencia || "",
            morada: p.morada || "",
        } );

        setEditingId( p.id );
        window.scrollTo( { top: 0, behavior: "smooth" } );
    }

    if ( loading ) {
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
                <p>Carregando...</p>
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
                <h1 className="page-title">Pacientes</h1>

                {error && <p style={{ color: "#d32f2f" }}>{error}</p>}

                {/* FORM */}
                {podeEditar ? (
                    <div className="page-box" style={{ marginBottom: 20 }}>
                        <h2>{editingId ? "Editar paciente" : "Novo paciente"}</h2>

                        <form className="grid">
                            <input
                                name="nome"
                                placeholder="Nome completo"
                                value={form.nome}
                                onChange={handleChange}
                            />

                            <input
                                type="date"
                                name="data_nascimento"
                                value={form.data_nascimento}
                                onChange={handleChange}
                            />

                            <select name="genero" value={form.genero} onChange={handleChange}>
                                <option value="">Gênero</option>
                                <option>Masculino</option>
                                <option>Femenino</option>
                            </select>

                            <select
                                name="raca_origem"
                                value={form.raca_origem}
                                onChange={handleChange}
                            >
                                <option>Branca</option>
                                <option>Negra</option>
                                <option>Parda</option>
                                <option>Amarela</option>
                                <option>Indígena</option>
                                <option>Outro</option>
                            </select>

                            <input
                                name="numero_id"
                                placeholder="Documento"
                                value={form.numero_id}
                                onChange={handleChange}
                            />

                            <input
                                name="contacto"
                                placeholder="Telefone"
                                value={form.contacto}
                                onChange={handleChange}
                            />

                            <input
                                name="email"
                                placeholder="Email"
                                value={form.email}
                                onChange={handleChange}
                            />

                            <input
                                name="morada"
                                placeholder="Morada"
                                value={form.morada}
                                onChange={handleChange}
                            />
                        </form>

                        <div style={{ marginTop: 15, display: "flex", gap: 10 }}>
                            <button
                                onClick={salvarPaciente}
                                className={`btn-primary ${saving ? "btn-loading" : ""}`}
                            >
                                {editingId ? "Atualizar" : "Criar"}
                            </button>

                            {editingId && (
                                <button onClick={resetForm} className="btn-secondary">
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="page-box" style={{ marginBottom: 20 }}>
                        <h2>Somente leitura</h2>
                        <p style={{ color: "#555", marginTop: 6 }}>
                            O seu perfil pode consultar pacientes, mas não pode criar/editar.
                        </p>
                    </div>
                )}

                {/* TABELA */}
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Entrada</th>
                                <th>Nome</th>
                                <th>Idade</th>
                                <th>Gênero</th>
                                <th>Contacto</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pacientes.map( ( p ) => (
                                <tr key={p.id}>
                                    <td>{p.id_custom}</td>
                                    <td>{p.nome}</td>
                                    <td>{calcularIdade( p.data_nascimento )}</td>
                                    <td>{p.genero || "-"}</td>
                                    <td>{p.contacto || "-"}</td>
                                    <td style={{ display: "flex", gap: 6 }}>
                                        <Link href={`/pacientes/${p.id}`} className="btn-secondary">
                                            Ver
                                        </Link>
                                        {podeEditar && (
                                            <button
                                                onClick={() => iniciarEdicao( p )}
                                                className="btn-secondary"
                                            >
                                                Editar
                                            </button>
                                        )}
                                        {podeApagar && (
                                            <button
                                                onClick={() => apagarPaciente( p.id )}
                                                className="btn-danger"
                                            >
                                                Apagar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
