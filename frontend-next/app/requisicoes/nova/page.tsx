"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { Paciente, Exame, ExameMedico } from "@/lib/types";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS, userHasAnyGroup } from "@/lib/rbac";

export default function NovaRequisicaoPage () {
    useAuthGuard();
    const router = useRouter();
    const { user } = useAuth();

    const [pacientes, setPacientes] = useState<Paciente[]>( [] );
    const [exames, setExames] = useState<Array<Exame | ExameMedico>>( [] );

    const [paciente, setPaciente] = useState( "" );
    const [tipo, setTipo] = useState<"LAB" | "MED">( "LAB" );
    const [selecionados, setSelecionados] = useState<number[]>( [] );

    useEffect( () => {
        carregarPacientes();
    }, [] );

    useEffect(() => {
        // ao trocar de setor, limpa seleção e carrega catálogo correto
        setSelecionados([]);
        carregarExames();
    }, [tipo]);

    async function carregarPacientes () {
        setPacientes( await apiFetch( "/pacientes/" ) );
    }

    async function carregarExames () {
        if ( tipo === "MED" ) {
            setExames( await apiFetch( "/exames-medicos/" ) );
        } else {
            setExames( await apiFetch( "/exames/" ) );
        }
    }

    function toggleExame ( id: number ) {
        setSelecionados( prev =>
            prev.includes( id )
                ? prev.filter( x => x !== id )
                : [...prev, id]
        );
    }

    async function salvar ( e: any ) {
        e.preventDefault();
        if ( !paciente ) {
            alert( "Selecione um paciente." );
            return;
        }
        if ( selecionados.length === 0 ) {
            alert( "Selecione pelo menos um exame." );
            return;
        }

        const payload: any = {
            paciente: Number( paciente ),
            tipo,
        };

        if ( tipo === "MED" ) payload.exames_medicos = selecionados;
        else payload.exames = selecionados;

        const nova = await apiFetch( "/requisicoes/", {
            method: "POST",
            body: JSON.stringify( payload ),
        } );

        router.push( `/requisicoes/${nova.id}` );
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

                <h3>Exames</h3>

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

                <button className="btn-primary">Criar Requisição</button>
            </form>
        </AppLayout>
    );
}
