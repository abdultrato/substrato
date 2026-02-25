"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Paciente, PacienteCreateDTO } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";

export default function EditarPacientePage () {
    useAuthGuard();

    const router = useRouter();
    const { id } = useParams();
    const pacienteId = Number( id );

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

    const [loading, setLoading] = useState( true );
    const [saving, setSaving] = useState( false );
    const [error, setError] = useState<string | null>( null );

    useEffect( () => {
        carregar();
    }, [pacienteId] );

    async function carregar () {
        try {
            const data: Paciente = await apiFetch( `/pacientes/${pacienteId}/` );

            setForm( {
                nome: data.nome || "",
                data_nascimento: data.data_nascimento || "",
                genero: data.genero || "",
                raca_origem: data.raca_origem || "Negra",
                tipo_documento:
                    data.tipo_documento || "Bilhete de Identidade",
                numero_id: data.numero_id || "",
                contacto: data.contacto || "",
                email: data.email || "",
                proveniencia: data.proveniencia || "",
                morada: data.morada || "",
            } );
        } catch ( err: any ) {
            setError( err.message || "Erro ao carregar paciente" );
        } finally {
            setLoading( false );
        }
    }

    function handleChange (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        const { name, value } = e.target;
        setForm( prev => ( { ...prev, [name]: value } ) );
    }

    async function handleSubmit ( e: React.FormEvent ) {
        e.preventDefault();
        setSaving( true );
        setError( null );

        try {
            await apiFetch( `/pacientes/${pacienteId}/`, {
                method: "PUT",
                body: JSON.stringify( form ),
            } );

            router.push( "/pacientes" );
        } catch ( err: any ) {
            setError( err.message || "Erro ao atualizar paciente" );
        } finally {
            setSaving( false );
        }
    }

    if ( loading ) {
        return (
            <div className="page-box fade-in">
                <div className="skeleton skeleton-row"></div>
                <div className="skeleton skeleton-row"></div>
                <div className="skeleton skeleton-row"></div>
            </div>
        );
    }

    return (
        <div className="page-box fade-in">
            <h1 className="page-title">Editar Paciente</h1>

            {error && (
                <p style={{ color: "#d32f2f", marginBottom: 10 }}>
                    {error}
                </p>
            )}

            <form onSubmit={handleSubmit} className="grid">

                <input
                    name="nome"
                    placeholder="Nome completo"
                    value={form.nome}
                    onChange={handleChange}
                    required
                />

                <input
                    type="date"
                    name="data_nascimento"
                    value={form.data_nascimento}
                    onChange={handleChange}
                />

                <select name="genero" value={form.genero} onChange={handleChange}>
                    <option value="">Selecione gênero</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                </select>

                <select name="raca_origem" value={form.raca_origem} onChange={handleChange}>
                    <option value="Branca">Branca</option>
                    <option value="Negra">Negra</option>
                    <option value="Parda">Parda</option>
                    <option value="Amarela">Amarela</option>
                    <option value="Indígena">Indígena</option>
                    <option value="Outro">Outro</option>
                </select>

                <select
                    name="tipo_documento"
                    value={form.tipo_documento}
                    onChange={handleChange}
                >
                    <option>Bilhete de Identidade</option>
                    <option>Passaporte</option>
                    <option>Carta de condução</option>
                    <option>Cartão de Recenseamento</option>
                    <option>DIRE</option>
                    <option>Cartão de Saúde</option>
                    <option>Outro</option>
                </select>

                <input
                    name="numero_id"
                    placeholder="Número do documento"
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

                <select
                    name="proveniencia"
                    value={form.proveniencia}
                    onChange={handleChange}
                >
                    <option value="">Selecione proveniência</option>
                    <option>Ambulatório</option>
                    <option>Clínica Externa</option>
                    <option>Medicina Ocupacional</option>
                    <option>Maternidade</option>
                    <option>Ginecologia</option>
                    <option>Pediatria</option>
                    <option>Banco de Socorros</option>
                    <option>Consulta Externa</option>
                    <option>Urologia</option>
                    <option>Cirurgia</option>
                    <option>Dentária</option>
                    <option>Oftalmologia</option>
                    <option>Outro</option>
                </select>

                <input
                    name="morada"
                    placeholder="Morada"
                    value={form.morada}
                    onChange={handleChange}
                />

                <button
                    type="submit"
                    className={`btn-primary ${saving ? "btn-loading" : ""}`}
                    disabled={saving}
                >
                    {saving ? "Salvando..." : "Salvar Alterações"}
                </button>

            </form>
        </div>
    );
}
