"use client";

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Paciente, PacienteCreateDTO } from "@/lib/types";
import { ApiListMeta, apiFetch, apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import useDebounce from "@/hooks/useDebounce";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import Pagination from "@/components/ui/Pagination";
import { getCountryOptions } from "@/lib/countries";
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

type PacienteList = { items: Paciente[]; meta: ApiListMeta; raw: any };

export default function PacientesPage () {
    useAuthGuard();
    const { user } = useAuth();

    const podeEditar = userHasAnyGroup( user, [
        GROUPS.ADMIN,
        GROUPS.RECEPCAO,
        GROUPS.MEDICINA_OCUPACIONAL,
    ] );
    const podeApagar = userHasAnyGroup( user, [GROUPS.ADMIN] );

    const [saving, setSaving] = useState( false );
    const [editingId, setEditingId] = useState<number | null>( null );
    const [page, setPage] = useState( 1 );
    const [pageSize, setPageSize] = useState( 50 );
    const [search, setSearch] = useState( "" );
    const [error, setError] = useState<string | null>( null );
    const debouncedSearch = useDebounce( search, 300 );

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, pageSize]);

    const { data, isFetching, isError, error: queryError, refetch } = useQuery<PacienteList>( {
        queryKey: ["pacientes", page, pageSize, debouncedSearch],
        queryFn: () => {
            const params = new URLSearchParams();
            if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
            const url = `/patients/${params.toString() ? `?${params.toString()}` : ""}`;
            return apiFetchList<Paciente>( url, { page, pageSize } );
        },
        placeholderData: keepPreviousData,
        staleTime: 20_000,
    } );

    const pacientes = data?.items ?? [];
    const totalItems = data?.meta.total ?? pacientes.length;
    const totalPages =
        data?.meta.totalPages ??
        (totalItems && pageSize ? Math.max( 1, Math.ceil( totalItems / pageSize ) ) : 1);

    useEffect( () => {
        if ( totalPages > 0 && page > totalPages ) setPage( totalPages );
    }, [page, totalPages] );

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
    } );

    const countryOptions = useMemo( () => getCountryOptions( ["pt"] ), [] );

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
            endereco_rua: "",
            endereco_numero: "",
            endereco_bairro: "",
            endereco_cidade: "",
            endereco_provincia: "",
            endereco_codigo_postal: "",
            endereco_pais: "MZ",
            endereco_complemento: "",
            morada: "",
        } );
        setEditingId( null );
    }

    async function salvarPaciente () {
        if ( !podeEditar ) {
            setError( "Sem permissão para criar/edit pacientes." );
            return;
        }
        if ( !form.nome.trim() ) {
            setError( "Nome é obrigatório" );
            return;
        }

        try {
            setSaving( true );

            if ( editingId ) {
                await apiFetch( `/patients/${editingId}/`, { method: "PUT", body: JSON.stringify( form ) } );
            } else {
                await apiFetch( "/patients/", { method: "POST", body: JSON.stringify( form ) } );
            }

            resetForm();
            refetch();
        } catch (err: any) {
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
            setError(isNotFoundLikeError(err) ? null : (err?.message || "Erro ao salvar paciente" ));
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

        await apiFetch( `/patients/${id}/`, { method: "DELETE" } );
        refetch();
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
            tipo_documento: p.tipo_documento || "BI",
            numero_id: p.numero_id || "",
            contacto: p.contacto || "",
            email: p.email || "",
            proveniencia: p.proveniencia || "",
            endereco_rua: p.endereco_rua || "",
            endereco_numero: p.endereco_numero || "",
            endereco_bairro: p.endereco_bairro || "",
            endereco_cidade: p.endereco_cidade || "",
            endereco_provincia: p.endereco_provincia || "",
            endereco_codigo_postal: p.endereco_codigo_postal || "",
            endereco_pais: p.endereco_pais || "MZ",
            endereco_complemento: p.endereco_complemento || "",
            morada: p.morada || "",
        } );

        setEditingId( p.id );
        window.scrollTo( { top: 0, behavior: "smooth" } );
    }

    if ( isFetching ) {
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

                {(error || (isError && queryError)) && (
                    <p style={{ color: "#d32f2f" }}>{error || (queryError as any)?.message}</p>
                )}

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
                                <option value="">Género</option>
                                <option value="Masculino">Masculino</option>
                                <option value="Femenino">Feminino</option>
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
                                <option value="">Tipo de documento</option>
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
                                placeholder="E-mail"
                                value={form.email}
                                onChange={handleChange}
                            />

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
                            O seu perfil pode consultar pacientes, mas não pode criar/edit.
                        </p>
                    </div>
                )}

                {/* TABELA */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                    <label style={{ fontSize: 13, color: "#555" }}>Pesquisar</label>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Entrada, nome, contacto, documento"
                    />
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Entrada</th>
                                <th>Nome</th>
                                <th>Idade</th>
                                <th>Género</th>
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
                                        <Link href={`/patients/${p.id}`} className="btn-secondary">
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

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 13, color: "#555" }}>
                        Total: {totalItems}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <label style={{ fontSize: 13, color: "#555" }}>Por página</label>
                        <select
                            value={pageSize}
                            onChange={( e ) => {
                                setPage( 1 );
                                setPageSize( Number( e.target.value ) );
                            }}
                        >
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>

                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
        </AppLayout>
    );
}

