"use client";

import { useEffect, useState } from "react";
import { Paciente, PacienteCreateDTO } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";

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
        tipo_documento: "Bilhete de Identidade",
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
            const data = await apiFetch( "/pacientes/" );
            setPacientes( data );
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
            tipo_documento: "Bilhete de Identidade",
            numero_id: "",
            contacto: "",
            email: "",
            proveniencia: "",
            morada: "",
        } );
        setEditingId( null );
    }

    async function salvarPaciente () {
        if ( !form.nome.trim() ) {
            setError( "Nome é obrigatório" );
            return;
        }

        try {
            setSaving( true );

            const url = editingId
                ? `/pacientes/${editingId}/`
                : "/pacientes/";

            const method = editingId ? "PUT" : "POST";

            await apiFetch( url, {
                method,
                body: JSON.stringify( form ),
            } );

            resetForm();
            carregarPacientes();
        } catch {
            setError( "Erro ao salvar paciente" );
        } finally {
            setSaving( false );
        }
    }

    async function apagarPaciente ( id: number ) {
        if ( !confirm( "Deseja remover este paciente?" ) ) return;

        await apiFetch( `/pacientes/${id}/`, { method: "DELETE" } );
        carregarPacientes();
    }

    function iniciarEdicao ( p: Paciente ) {
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

    if ( loading ) return <p>Carregando...</p>;

    return (
        <div className="page-box fade-in">
            <h1 className="page-title">Pacientes</h1>

            {error && <p style={{ color: "#d32f2f" }}>{error}</p>}

            {/* FORM */}
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
                                    <button
                                        onClick={() => iniciarEdicao( p )}
                                        className="btn-secondary"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => apagarPaciente( p.id )}
                                        className="btn-danger"
                                    >
                                        Apagar
                                    </button>
                                </td>
                            </tr>
                        ) )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
