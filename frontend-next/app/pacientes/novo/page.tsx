"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Entidade, PacienteCreateDTO } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import { getCountryOptions } from "@/lib/countries";
import { GROUPS } from "@/lib/rbac";

export default function NovoPacientePage () {
    useAuthGuard();
    const router = useRouter();

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
        endereco_rua: "",
        endereco_numero: "",
        endereco_bairro: "",
        endereco_cidade: "",
        endereco_provincia: "",
        endereco_codigo_postal: "",
        endereco_pais: "MZ",
        endereco_complemento: "",
        morada: "",
        empresa_origem: null,
    } );

    const countryOptions = useMemo( () => getCountryOptions( ["pt"] ), [] );

    const [empresas, setEmpresas] = useState<Entidade[]>( [] );
    const [loading, setLoading] = useState( false );
    const [error, setError] = useState<string | null>( null );

    useEffect( () => {
        async function carregarEmpresas () {
            try {
                const data: Entidade[] = await apiFetch( "/entidades/" );
                setEmpresas( data || [] );
            } catch {
                setEmpresas( [] );
            }
        }

        carregarEmpresas();
    }, [] );

    function handleChange (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        const { name, value } = e.target;
        setForm( ( prev ) => ( {
            ...prev,
            [name]: name === "empresa_origem" ? ( value ? Number( value ) : null ) : value,
        } ) );
    }

    async function handleSubmit ( e: React.FormEvent ) {
        e.preventDefault();

        if ( !form.nome.trim() ) {
            setError( "Nome é obrigatório" );
            return;
        }

        if (
            form.proveniencia === "Medicina Ocupacional" &&
            !form.empresa_origem
        ) {
            setError( "Selecione a empresa de origem para Medicina Ocupacional." );
            return;
        }

        setLoading( true );
        setError( null );

        try {
            await apiFetch( "/pacientes/", {
                method: "POST",
                body: JSON.stringify( form ),
            } );

            router.push( "/pacientes" );
        } catch ( err: any ) {
            setError( err.message || "Erro ao salvar paciente" );
        } finally {
            setLoading( false );
        }
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
                <h1 className="page-title">Novo Paciente</h1>

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
                    <option value="BI">Bilhete de Identidade</option>
                    <option value="PASS">Passaporte</option>
                    <option value="CC">Carta de Condução</option>
                    <option value="DIRE">DIRE</option>
                    <option value="NUIT">NUIT</option>
                    <option value="CE">Cartão de Eleitor</option>
                    <option value="CN">Certidão de Nascimento</option>
                    <option value="OUT">Outro</option>
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

                <select
                    name="empresa_origem"
                    value={form.empresa_origem ? String( form.empresa_origem ) : ""}
                    onChange={handleChange}
                >
                    <option value="">Empresa de origem (opcional)</option>
                    {empresas.map( ( e ) => (
                        <option key={e.id} value={e.id}>
                            {e.nome}
                        </option>
                    ) )}
                </select>

                <input
                    name="endereco_rua"
                    placeholder="Rua"
                    value={form.endereco_rua || ""}
                    onChange={handleChange}
                />

                <input
                    name="endereco_numero"
                    placeholder="Número"
                    value={form.endereco_numero || ""}
                    onChange={handleChange}
                />

                <input
                    name="endereco_bairro"
                    placeholder="Bairro"
                    value={form.endereco_bairro || ""}
                    onChange={handleChange}
                />

                <input
                    name="endereco_cidade"
                    placeholder="Cidade"
                    value={form.endereco_cidade || ""}
                    onChange={handleChange}
                />

                <input
                    name="endereco_provincia"
                    placeholder="Província"
                    value={form.endereco_provincia || ""}
                    onChange={handleChange}
                />

                <input
                    name="endereco_codigo_postal"
                    placeholder="Código postal"
                    value={form.endereco_codigo_postal || ""}
                    onChange={handleChange}
                />

                <select
                    name="endereco_pais"
                    value={form.endereco_pais || ""}
                    onChange={handleChange}
                >
                    <option value="">Selecione país</option>
                    {countryOptions.map( ( c ) => (
                        <option key={c.code} value={c.code}>
                            {c.label}
                        </option>
                    ) )}
                </select>

                <input
                    name="endereco_complemento"
                    placeholder="Complemento"
                    value={form.endereco_complemento || ""}
                    onChange={handleChange}
                />

                <input
                    name="morada"
                    placeholder="Morada (texto livre)"
                    value={form.morada}
                    onChange={handleChange}
                />

                <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? "Salvando..." : "Salvar Paciente"}
                </button>
                </form>
            </div>
        </AppLayout>
    );
}
