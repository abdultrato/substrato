"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { Paciente, Exame, ExameMedico } from "@/lib/types";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS, userHasAnyGroup } from "@/lib/rbac";
import useDebounce from "@/hooks/useDebounce";

export default function NovaRequisicaoPage () {
    useAuthGuard();
    const router = useRouter();
    const { user } = useAuth();

    const [pacientes, setPacientes] = useState<Paciente[]>( [] );

    const [paciente, setPaciente] = useState( "" );
    const [tipo, setTipo] = useState<"LAB" | "MED">( "LAB" );
    const [selecionados, setSelecionados] = useState<Array<Exame | ExameMedico>>( [] );

    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 250);
    const [resultados, setResultados] = useState<Array<Exame | ExameMedico>>([]);
    const [buscando, setBuscando] = useState(false);
    const [erroBusca, setErroBusca] = useState<string | null>(null);

    const [erro, setErro] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);

    useEffect( () => {
        carregarPacientes();
    }, [] );

    useEffect(() => {
        // ao trocar de setor, limpa seleção e resultados
        setSelecionados([]);
        setResultados([]);
        setQuery("");
    }, [tipo]);

    async function carregarPacientes () {
        setPacientes( await apiFetch( "/pacientes/" ) );
    }

    const selecionadosIds = useMemo(() => new Set(selecionados.map((x) => x.id)), [selecionados]);

    useEffect(() => {
        let mounted = true;
        async function buscar() {
            const q = (debouncedQuery || "").trim();
            if (!q) {
                setResultados([]);
                setErroBusca(null);
                return;
            }
            try {
                setBuscando(true);
                setErroBusca(null);
                const endpointBase = tipo === "MED" ? "/exames-medicos/" : "/exames/";
                const res = await apiFetch<any>(`${endpointBase}?search=${encodeURIComponent(q)}`);
                const items = res && res.results ? res.results : res;
                const list = Array.isArray(items) ? items : [];
                if (!mounted) return;
                // Remove os já selecionados e limita para não poluir a UI.
                setResultados(list.filter((x) => x && !selecionadosIds.has(x.id)).slice(0, 12));
            } catch (e: any) {
                if (!mounted) return;
                setErroBusca(e?.message || "Falha ao buscar exames.");
            } finally {
                if (mounted) setBuscando(false);
            }
        }
        buscar();
        return () => {
            mounted = false;
        };
    }, [debouncedQuery, tipo, selecionadosIds]);

    function adicionarExame ( ex: Exame | ExameMedico ) {
        setSelecionados((prev) => (prev.some((p) => p.id === ex.id) ? prev : [...prev, ex]));
        setResultados((prev) => prev.filter((p) => p.id !== ex.id));
    }

    function removerExame ( id: number ) {
        setSelecionados((prev) => prev.filter((p) => p.id !== id));
    }

    async function salvar ( e: any ) {
        e.preventDefault();
        setErro(null);
        if ( salvando ) return;
        if ( !paciente ) {
            setErro( "Selecione um paciente." );
            return;
        }
        if ( selecionados.length === 0 ) {
            setErro( "Adicione pelo menos um exame." );
            return;
        }

        try {
            setSalvando(true);
            const payload: any = {
                paciente: Number( paciente ),
                tipo,
            };

            const ids = selecionados.map((x) => x.id);
            if ( tipo === "MED" ) payload.exames_medicos = ids;
            else payload.exames = ids;

            const nova = await apiFetch( "/requisicoes/", {
                method: "POST",
                body: JSON.stringify( payload ),
            } );

            router.push( `/requisicoes/${nova.id}` );
        } catch (err: any) {
            setErro(err?.message || "Falha ao criar requisição.");
        } finally {
            setSalvando(false);
        }
    }

    const podeCriarExameMedico = userHasAnyGroup(user, [
        GROUPS.ADMIN,
        GROUPS.RECEPCAO,
        GROUPS.MEDICINA,
        GROUPS.MEDICINA_OCUPACIONAL,
    ])

    return (
        <AppLayout
            requiredGroups={[
                GROUPS.ADMIN,
                GROUPS.RECEPCAO,
                GROUPS.MEDICINA,
                GROUPS.MEDICINA_OCUPACIONAL,
            ]}
        >
            <form onSubmit={salvar} className="page-box">
                <h1>Nova Requisição</h1>

                {erro ? (
                    <div
                        style={{
                            background: "rgba(211, 47, 47, 0.08)",
                            border: "1px solid rgba(211, 47, 47, 0.25)",
                            color: "#b91c1c",
                            padding: 10,
                            borderRadius: 8,
                            marginBottom: 12,
                            fontSize: 13,
                        }}
                    >
                        {erro}
                    </div>
                ) : null}

                <label>Paciente</label>
                <select value={paciente} onChange={e => setPaciente( e.target.value )} required>
                    <option value="">Selecione</option>
                    {pacientes.map( p => (
                        <option key={p.id} value={p.id}>
                            {p.nome}
                        </option>
                    ) )}
                </select>

                <label>Setor</label>
                <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as any)}
                >
                    <option value="LAB">Laboratório</option>
                    {podeCriarExameMedico ? (
                        <option value="MED">Exames médicos</option>
                    ) : null}
                </select>

                <h3>Exames (pesquisa)</h3>

                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={tipo === "MED" ? "Buscar exame médico..." : "Buscar exame laboratorial..."}
                    style={{ marginBottom: 8 }}
                />

                {erroBusca ? (
                    <div style={{ color: "#b45309", fontSize: 13, marginBottom: 8 }}>
                        {erroBusca}
                    </div>
                ) : null}

                {buscando ? (
                    <div style={{ fontSize: 13, color: "var(--gray-500)", marginBottom: 8 }}>
                        Buscando...
                    </div>
                ) : null}

                {resultados.length ? (
                    <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
                        {resultados.map((ex) => (
                            <div
                                key={ex.id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    border: "1px solid var(--gray-300)",
                                    borderRadius: 8,
                                    padding: "8px 10px",
                                    gap: 10,
                                }}
                            >
                                <div style={{ fontSize: 13 }}>
                                    <strong>{ex.nome}</strong>
                                    {ex.id_custom ? (
                                        <span style={{ marginLeft: 8, color: "var(--gray-500)" }}>
                                            {ex.id_custom}
                                        </span>
                                    ) : null}
                                </div>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => adicionarExame(ex)}
                                >
                                    Adicionar
                                </button>
                            </div>
                        ))}
                    </div>
                ) : null}

                <h3>Selecionados ({selecionados.length})</h3>

                {selecionados.length ? (
                    <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
                        {selecionados.map((ex) => (
                            <div
                                key={ex.id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    border: "1px solid var(--gray-300)",
                                    borderRadius: 8,
                                    padding: "8px 10px",
                                    gap: 10,
                                }}
                            >
                                <div style={{ fontSize: 13 }}>
                                    <strong>{ex.nome}</strong>
                                    {ex.id_custom ? (
                                        <span style={{ marginLeft: 8, color: "var(--gray-500)" }}>
                                            {ex.id_custom}
                                        </span>
                                    ) : null}
                                </div>
                                <button
                                    type="button"
                                    className="btn-danger"
                                    onClick={() => removerExame(ex.id)}
                                >
                                    Remover
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ fontSize: 13, color: "var(--gray-500)", marginBottom: 12 }}>
                        Sem exames.
                    </div>
                )}

                <button className="btn-primary" disabled={salvando}>
                    {salvando ? "Criando..." : "Criar Requisição"}
                </button>
            </form>
        </AppLayout>
    );
}
