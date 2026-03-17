"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Entidade, Paciente, PacienteCreateDTO } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import { getCountryOptions } from "@/lib/countries";
import { GROUPS } from "@/lib/rbac";

export default function EditarPacientePage () {
    useAuthGuard();

    const router = useRouter();
    const { id } = useParams() as { id?: string | string[] };
    const idStr = Array.isArray( id ) ? id[0] : id;
    const pacienteId = Number( idStr );

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
    const [loading, setLoading] = useState( true );
    const [saving, setSaving] = useState( false );
    const [error, setError] = useState<string | null>( null );

    const carregar = useCallback( async () => {
        try {
            setLoading( true );
            setError( null );
            if ( !Number.isFinite( pacienteId ) || !pacienteId ) {
                throw new Error( "ID de paciente inválido." )
            }
            const [data, emps] = await Promise.all( [
                apiFetch<Paciente>( `/pacientes/${pacienteId}/` ),
                apiFetch<Entidade[]>( "/entidades/" ),
            ] );

            setEmpresas( emps || [] );

            setForm( {
                nome: data.nome || "",
                data_nascimento: data.data_nascimento || "",
                genero: data.genero || "",
                raca_origem: data.raca_origem || "Negra",
                tipo_documento:
                    data.tipo_documento || "BI",
                numero_id: data.numero_id || "",
                contacto: data.contacto || "",
                email: data.email || "",
                proveniencia: data.proveniencia || "",
                endereco_rua: (data as any).endereco_rua || "",
                endereco_numero: (data as any).endereco_numero || "",
                endereco_bairro: (data as any).endereco_bairro || "",
                endereco_cidade: (data as any).endereco_cidade || "",
                endereco_provincia: (data as any).endereco_provincia || "",
                endereco_codigo_postal: (data as any).endereco_codigo_postal || "",
                endereco_pais: (data as any).endereco_pais || "MZ",
                endereco_complemento: (data as any).endereco_complemento || "",
                morada: data.morada || "",
                empresa_origem: (data as any).empresa_origem ?? null,
            } );
        } catch ( err: any ) {
            setError( err.message || "Erro ao carregar paciente" );
        } finally {
            setLoading( false );
        }
    }, [pacienteId] );

    useEffect( () => {
        carregar();
    }, [carregar] );

    function handleChange (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        const { name, value } = e.target;
        setForm( prev => ( {
            ...prev,
            [name]: name === "empresa_origem" ? ( value ? Number( value ) : null ) : value,
        } ) );
    }

    async function handleSubmit ( e: React.FormEvent ) {
        e.preventDefault();

        if (
            form.proveniencia === "Medicina Ocupacional" &&
            !form.empresa_origem
        ) {
            setError( "Selecione a empresa de origem para Medicina Ocupacional." );
            return;
        }
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
            <AppLayout
                requiredGroups={[
                    GROUPS.ADMIN,
                    GROUPS.RECEPCAO,
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

    return (
        <AppLayout
            requiredGroups={[
                GROUPS.ADMIN,
                GROUPS.RECEPCAO,
                GROUPS.MEDICINA_OCUPACIONAL,
            ]}
        >
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

                <button
                    type="submit"
                    className={`btn-primary ${saving ? "btn-loading" : ""}`}
                    disabled={saving}
                >
                    {saving ? "Salvando..." : "Salvar Alterações"}
                </button>

                </form>
            </div>
        </AppLayout>
    );
}
