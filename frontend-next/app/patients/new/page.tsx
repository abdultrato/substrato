"use client";

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Entidade, PacienteCreateDTO } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import AppLayout from "@/components/layout/AppLayout";
import { Etapas, FormField } from "@/components/form";
import { getCountryOptions } from "@/lib/countries";
import { GROUPS } from "@/lib/rbac";

export default function NovoPacientePage () {
    useAuthGuard();
    const router = useRouter();
    const etapas = [
        { titulo: "Dados pessoais", descricao: "Identificação e dados básicos" },
        { titulo: "Documento e contacto", descricao: "Documento e contactos" },
        { titulo: "Endereço", descricao: "Morada e localização" },
        { titulo: "Origem", descricao: "Proveniência e empresa" },
    ];
    const [etapaAtual, setEtapaAtual] = useState( 0 );

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
                const data: Entidade[] = await apiFetch( "/entities/" );
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

    function validarEtapa ( etapa: number ): string | null {
        if ( etapa === 0 && !form.nome.trim() ) return "O nome completo é obrigatório.";

        if (
            etapa === 3 &&
            form.proveniencia === "Medicina Ocupacional" &&
            !form.empresa_origem
        ) {
            return "Selecione a empresa de origem para Medicina Ocupacional.";
        }

        return null;
    }

    function avancarEtapa () {
        const msg = validarEtapa( etapaAtual );
        if ( msg ) {
            setError( msg );
            return;
        }
        setError( null );
        setEtapaAtual( ( prev ) => Math.min( etapas.length - 1, prev + 1 ) );
    }

    function voltarEtapa () {
        setError( null );
        setEtapaAtual( ( prev ) => Math.max( 0, prev - 1 ) );
    }

    async function handleSubmit ( e: React.FormEvent ) {
        e.preventDefault();

        if ( etapaAtual < etapas.length - 1 ) {
            avancarEtapa();
            return;
        }

        const msg = validarEtapa( etapaAtual );
        if ( msg ) {
            setError( msg );
            return;
        }

        setLoading( true );
        setError( null );

        try {
            await apiFetch( "/patients/", {
                method: "POST",
                body: JSON.stringify( form ),
            } );

            router.push( "/patients" );
        } catch ( err: any ) {
            const validation = (err as any)?.validation
            if (validation && typeof validation === "object" && !Array.isArray(validation)) {
                const first = Object.entries(validation)[0]
                if (first) {
                    const [campo, msgs] = first
                    const msg =
                        Array.isArray(msgs) && msgs.length
                            ? msgs[0]
                            : typeof msgs === "string"
                                ? msgs
                                : JSON.stringify(msgs)
                    setError( `${campo}: ${msg}` )
                    return
                }
            }
            setError(isNotFoundLikeError(err) ? null : (err.message || "Erro ao salvar paciente" ));
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

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Etapas etapas={etapas} etapaAtual={etapaAtual} onChange={setEtapaAtual} />

                    {error && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                            {error}
                        </div>
                    )}

                    {etapaAtual === 0 && (
                        <fieldset className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                            <legend className="px-2 text-sm font-semibold text-foreground">Dados pessoais</legend>
                            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                                <FormField id="nome" label="Nome completo" required hint="Como aparece no documento.">
                                    <input
                                        id="nome"
                                        name="nome"
                                        placeholder="Ex.: João Manuel"
                                        value={form.nome}
                                        onChange={handleChange}
                                        required
                                    />
                                </FormField>

                                <FormField id="data_nascimento" label="Data de nascimento" hint="Opcional.">
                                    <input
                                        id="data_nascimento"
                                        type="date"
                                        name="data_nascimento"
                                        value={form.data_nascimento}
                                        onChange={handleChange}
                                    />
                                </FormField>

                                <FormField id="genero" label="Género" hint="Selecione se aplicável.">
                                    <select id="genero" name="genero" value={form.genero} onChange={handleChange}>
                                        <option value="">Selecione o género</option>
                                        <option value="Masculino">Masculino</option>
                                        <option value="Femenino">Feminino</option>
                                    </select>
                                </FormField>

                                <FormField id="raca_origem" label="Raça/origem" hint="Opcional.">
                                    <select
                                        id="raca_origem"
                                        name="raca_origem"
                                        value={form.raca_origem}
                                        onChange={handleChange}
                                    >
                                        <option value="Branca">Branca</option>
                                        <option value="Negra">Negra</option>
                                        <option value="Parda">Parda</option>
                                        <option value="Amarela">Amarela</option>
                                        <option value="Indígena">Indígena</option>
                                        <option value="Outro">Outro</option>
                                    </select>
                                </FormField>
                            </div>
                        </fieldset>
                    )}

                    {etapaAtual === 1 && (
                        <fieldset className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                            <legend className="px-2 text-sm font-semibold text-foreground">Documento e contacto</legend>
                            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                                <FormField id="tipo_documento" label="Tipo de documento" hint="Ex.: BI, Passaporte.">
                                    <select
                                        id="tipo_documento"
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
                                </FormField>

                                <FormField id="numero_id" label="Número do documento" hint="Opcional.">
                                    <input
                                        id="numero_id"
                                        name="numero_id"
                                        placeholder="Ex.: 1234567A"
                                        value={form.numero_id}
                                        onChange={handleChange}
                                    />
                                </FormField>

                                <FormField id="contacto" label="Telefone" hint="Inclua o indicativo, se aplicável.">
                                    <input
                                        id="contacto"
                                        name="contacto"
                                        placeholder="Ex.: +258 84 123 4567"
                                        value={form.contacto}
                                        onChange={handleChange}
                                    />
                                </FormField>

                                <FormField id="email" label="E-mail" hint="Opcional.">
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="Ex.: utilizador@empresa.com"
                                        value={form.email}
                                        onChange={handleChange}
                                    />
                                </FormField>
                            </div>
                        </fieldset>
                    )}

                    {etapaAtual === 2 && (
                        <fieldset className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                            <legend className="px-2 text-sm font-semibold text-foreground">Endereço</legend>
                            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                                <FormField id="endereco_rua" label="Rua" hint="Opcional.">
                                    <input
                                        id="endereco_rua"
                                        name="endereco_rua"
                                        placeholder="Ex.: Av. 25 de Setembro"
                                        value={form.endereco_rua || ""}
                                        onChange={handleChange}
                                    />
                                </FormField>

                                <FormField id="endereco_numero" label="Número" hint="Opcional.">
                                    <input
                                        id="endereco_numero"
                                        name="endereco_numero"
                                        placeholder="Ex.: 123"
                                        value={form.endereco_numero || ""}
                                        onChange={handleChange}
                                    />
                                </FormField>

                                <FormField id="endereco_bairro" label="Bairro" hint="Opcional.">
                                    <input
                                        id="endereco_bairro"
                                        name="endereco_bairro"
                                        placeholder="Ex.: Polana"
                                        value={form.endereco_bairro || ""}
                                        onChange={handleChange}
                                    />
                                </FormField>

                                <FormField id="endereco_cidade" label="Cidade" hint="Opcional.">
                                    <input
                                        id="endereco_cidade"
                                        name="endereco_cidade"
                                        placeholder="Ex.: Maputo"
                                        value={form.endereco_cidade || ""}
                                        onChange={handleChange}
                                    />
                                </FormField>

                                <FormField id="endereco_provincia" label="Província" hint="Opcional.">
                                    <input
                                        id="endereco_provincia"
                                        name="endereco_provincia"
                                        placeholder="Ex.: Maputo"
                                        value={form.endereco_provincia || ""}
                                        onChange={handleChange}
                                    />
                                </FormField>

                                <FormField id="endereco_codigo_postal" label="Código postal" hint="Opcional.">
                                    <input
                                        id="endereco_codigo_postal"
                                        name="endereco_codigo_postal"
                                        placeholder="Ex.: 1100"
                                        value={form.endereco_codigo_postal || ""}
                                        onChange={handleChange}
                                    />
                                </FormField>

                                <FormField id="endereco_pais" label="País" hint="Opcional.">
                                    <select
                                        id="endereco_pais"
                                        name="endereco_pais"
                                        value={form.endereco_pais || ""}
                                        onChange={handleChange}
                                    >
                                        <option value="">Selecione o país</option>
                                        {countryOptions.map( ( c ) => (
                                            <option key={c.code} value={c.code}>
                                                {c.label}
                                            </option>
                                        ) )}
                                    </select>
                                </FormField>

                                <FormField id="endereco_complemento" label="Complemento" hint="Opcional.">
                                    <input
                                        id="endereco_complemento"
                                        name="endereco_complemento"
                                        placeholder="Ex.: Apto 2, 3.º andar"
                                        value={form.endereco_complemento || ""}
                                        onChange={handleChange}
                                    />
                                </FormField>

                                <FormField id="morada" label="Morada (texto livre)" hint="Opcional.">
                                    <input
                                        id="morada"
                                        name="morada"
                                        placeholder="Ex.: Próximo ao Hospital Central"
                                        value={form.morada}
                                        onChange={handleChange}
                                    />
                                </FormField>
                            </div>
                        </fieldset>
                    )}

                    {etapaAtual === 3 && (
                        <fieldset className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                            <legend className="px-2 text-sm font-semibold text-foreground">Origem</legend>
                            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                                <FormField id="proveniencia" label="Proveniência" hint="De onde vem o paciente?">
                                    <select
                                        id="proveniencia"
                                        name="proveniencia"
                                        value={form.proveniencia}
                                        onChange={handleChange}
                                    >
                                        <option value="">Selecione a proveniência</option>
                                        <option value="Ambulatório">Ambulatório</option>
                                        <option value="Clínica Externa">Clínica Externa</option>
                                        <option value="Medicina Ocupacional">Medicina Ocupacional</option>
                                        <option value="Maternidade">Maternidade</option>
                                        <option value="Ginecologia">Ginecologia</option>
                                        <option value="Pediatria">Pediatria</option>
                                        <option value="Banco de Socorros">Banco de Socorros</option>
                                        <option value="Consulta Externa">Consulta Externa</option>
                                        <option value="Urologia">Urologia</option>
                                        <option value="Cirurgia">Cirurgia</option>
                                        <option value="Dentária">Dentária</option>
                                        <option value="Oftalmologia">Oftalmologia</option>
                                        <option value="Outro">Outro</option>
                                    </select>
                                </FormField>

                                <FormField
                                    id="empresa_origem"
                                    label="Empresa de origem"
                                    hint="Obrigatório apenas para Medicina Ocupacional."
                                >
                                    <select
                                        id="empresa_origem"
                                        name="empresa_origem"
                                        value={form.empresa_origem ? String( form.empresa_origem ) : ""}
                                        onChange={handleChange}
                                    >
                                        <option value="">Selecione uma empresa (opcional)</option>
                                        {empresas.map( ( e ) => (
                                            <option key={e.id} value={e.id}>
                                                {e.nome}
                                            </option>
                                        ) )}
                                    </select>
                                </FormField>
                            </div>
                        </fieldset>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={etapaAtual === 0 ? () => router.push( "/patients" ) : voltarEtapa}
                        >
                            {etapaAtual === 0 ? "Voltar" : "Anterior"}
                        </button>

                        {etapaAtual < etapas.length - 1 ? (
                            <button type="button" className="btn-primary" onClick={avancarEtapa}>
                                Seguinte
                            </button>
                        ) : (
                            <button type="submit" disabled={loading} className={`btn-primary ${loading ? "btn-loading" : ""}`}>
                                {loading ? "Salvando..." : "Salvar paciente"}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

