"use client";

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { Paciente, Exame, ExameMedico, Requisicao } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS } from "@/lib/rbac";
import { routeParamToString } from "@/lib/routeParams";

function toArray<T>(raw: any): T[] {
    if (Array.isArray(raw)) return raw as T[];
    if (raw && typeof raw === "object" && Array.isArray((raw as any).results)) {
        return (raw as any).results as T[];
    }
    return [];
}

export default function EditarRequisicaoPage () {
    const params = useParams();
    const id = routeParamToString( (params as any)?.id );
    useAuthGuard();
    const router = useRouter();

    const [loading, setLoading] = useState( true );
    const [saving, setSaving] = useState( false );
    const [error, setError] = useState<string | null>( null );

    const [pacientes, setPacientes] = useState<Paciente[]>( [] );
    const [exames, setExames] = useState<Array<Exame | ExameMedico>>( [] );

    const [paciente, setPaciente] = useState( "" );
    const [tipo, setTipo] = useState<"LAB" | "MED">( "LAB" );
    const [selecionados, setSelecionados] = useState<number[]>( [] );

    const carregar = useCallback( async () => {
        try {
            setLoading( true );
            setError( null );
            const req = await apiFetch<Requisicao>( `/clinical/labrequest/${id}/` );
            const tipoReq = (req?.tipo as any) || "LAB";

            const [pacsRaw, exsRaw] = await Promise.all( [
                apiFetch( "/patients/" ),
                apiFetch( tipoReq === "MED" ? "/clinical/medicalexam/" : "/exams/" ),
            ] );

            setPacientes( toArray<Paciente>(pacsRaw) );
            setExames( toArray<Exame | ExameMedico>( exsRaw ) );

            setPaciente( req.paciente?.toString() || "" );
            setTipo( tipoReq );
            setSelecionados( tipoReq === "MED" ? (req.exames_medicos || []) : (req.exames || []) );
        } catch {
            setError( "Erro ao carregar dados" );
        } finally {
            setLoading( false );
        }
    }, [id] );

    useEffect( () => {
        carregar();
    }, [carregar] );

    function toggleExame ( id: number ) {
        setSelecionados( prev =>
            prev.includes( id )
                ? prev.filter( x => x !== id )
                : [...prev, id]
        );
    }

    async function salvar ( e: React.FormEvent ) {
        e.preventDefault();

        if ( !paciente ) {
            setError( "Selecione um paciente" );
            return;
        }

        if ( selecionados.length === 0 ) {
            setError( "Selecione pelo menos um exame" );
            return;
        }

        setSaving( true );
        setError( null );

        try {
            const payload: any = {}
            if ( tipo === "MED" ) payload.exames_medicos = selecionados
            else payload.exames = selecionados

            await apiFetch( `/clinical/labrequest/${id}/`, {
                method: "PATCH",
                body: JSON.stringify( payload ),
            } );

            router.push( `/requests/${id}` );
        } catch ( err: any ) {
            setError(isNotFoundLikeError(err) ? null : (err.message || "Erro ao salvar" ));
        } finally {
            setSaving( false );
        }
    }

    const requiredGroups = [
        GROUPS.ADMIN,
        GROUPS.RECEPCAO,
        GROUPS.MEDICINA,
        GROUPS.MEDICINA_OCUPACIONAL,
    ]

    if ( loading ) {
        return (
            <AppLayout requiredGroups={requiredGroups}>
                <p>Carregando...</p>
            </AppLayout>
        )
    }

    return (
        <AppLayout requiredGroups={requiredGroups}>
            <form onSubmit={salvar} className="page-box fade-in">
                <h1>Editar Requisição</h1>

                {error && (
                    <p style={{ color: "#d32f2f" }}>{error}</p>
                )}

                <label>Paciente</label>
                <select
                    value={paciente}
                    onChange={e => setPaciente( e.target.value )}
                    disabled
                >
                    <option value="">Selecione</option>
                    {pacientes.map( p => (
                        <option key={p.id} value={p.id}>
                            {p.nome}
                        </option>
                    ) )}
                </select>

                <label>Setor</label>
                <input value={tipo === "MED" ? "Exames médicos" : "Laboratório"} disabled />

                <h3>Exames</h3>

                <div style={{ display: "grid", gap: 6 }}>
                    {exames.map( e => (
                        <label key={e.id}>
                            <input
                                type="checkbox"
                                checked={selecionados.includes( e.id )}
                                onChange={() => toggleExame( e.id )}
                            />
                            {e.nome}
                        </label>
                    ) )}
                </div>

                <button
                    className={`btn-primary ${saving ? "btn-loading" : ""}`}
                    disabled={saving}
                >
                    {saving ? "Salvando..." : "Salvar alterações"}
                </button>
            </form>
        </AppLayout>
    );
}

