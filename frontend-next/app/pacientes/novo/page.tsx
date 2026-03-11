"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PacienteCreateDTO } from "@/lib/types";
import { PacientesService } from "@/lib/api-client/services/PacientesService";

export default function NovoPacientePage () {
    const router = useRouter();

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

    const [loading, setLoading] = useState( false );
    const [error, setError] = useState<string | null>( null );

    function handleChange (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        const { name, value } = e.target;
        setForm( ( prev ) => ( { ...prev, [name]: value } ) );
    }

    async function handleSubmit ( e: React.FormEvent ) {
        e.preventDefault();

        if ( !form.nome.trim() ) {
            setError( "Nome é obrigatório" );
            return;
        }

        setLoading( true );
        setError( null );

        try {
            await PacientesService.clinicoPacientesCreate( form as any );

            router.push( "/pacientes" );
        } catch ( err: any ) {
            setError( err.message || "Erro ao salvar paciente" );
        } finally {
            setLoading( false );
        }
    }

    return (
        <div className="page-box fade-in">
            <h1 className="page-title">Novo Paciência</h1>

            {error && <p style={{ color: "#d32f2f" }}>{error}</p>}

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
                    <option value="">Proveniência</option>
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

                <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? "Salvando..." : "Salvar Paciente"}
                </button>
            </form>
        </div>
    );
}
