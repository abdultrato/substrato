"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { Entidade, Paciente, Exame, ExameMedico } from "@/lib/types";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS, userHasAnyGroup } from "@/lib/rbac";

export default function NovaRequisicaoExternaPage() {
    useAuthGuard();
    const router = useRouter();
    const { user } = useAuth();

    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [empresas, setEmpresas] = useState<Entidade[]>([]);
    const [exames, setExames] = useState<Array<Exame | ExameMedico>>([]);

    const [paciente, setPaciente] = useState("");
    const [tipo, setTipo] = useState<"LAB" | "MED">("LAB");
    const [selecionados, setSelecionados] = useState<number[]>([]);

    const [empresaSolicitante, setEmpresaSolicitante] = useState("");
    const [empresaExecutora, setEmpresaExecutora] = useState("");

    useEffect(() => {
        carregarPacientes();
        carregarEmpresas();
    }, []);

    useEffect(() => {
        // ao trocar de setor, limpa seleção e carrega catálogo correto
        setSelecionados([]);
        carregarExames();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tipo]);

    async function carregarPacientes() {
        try {
            setPacientes(await apiFetch("/clinical/patient/"));
        } catch {
            setPacientes([]);
        }
    }

    async function carregarEmpresas() {
        try {
            setEmpresas(await apiFetch("/entities/company/"));
        } catch {
            setEmpresas([]);
        }
    }

    async function carregarExames() {
        try {
            setExames(await apiFetch("/clinical/exam/"));
        } catch {
            setExames([]);
        }
    }

    function toggleExame(id: number) {
        setSelecionados(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    }

    function onPacienteChange(value: string) {
        setPaciente(value);

        // Auto-preenche empresa solicitante com a empresa do paciente (se existir).
        if (!empresaSolicitante && value) {
            const pac = pacientes.find(p => p.id === Number(value));
            if (pac?.empresa_origem) setEmpresaSolicitante(String(pac.empresa_origem));
        }
    }

    async function salvar(e: any) {
        e.preventDefault();
        if (!paciente) {
            alert("Selecione um paciente.");
            return;
        }
        if (selecionados.length === 0) {
            alert("Selecione pelo menos um exame.");
            return;
        }

        const pac = pacientes.find(p => p.id === Number(paciente));
        const temEmpresa =
            !!empresaSolicitante ||
            !!empresaExecutora ||
            !!pac?.empresa_origem;

        if (!temEmpresa) {
            alert("Informe pelo menos a empresa solicitante ou a empresa executora externa (ou associe empresa no paciente).");
            return;
        }

        const payload: any = {
            paciente: Number(paciente),
            tipo,
            empresa_solicitante: empresaSolicitante ? Number(empresaSolicitante) : null,
            empresa_executora_externa: empresaExecutora ? Number(empresaExecutora) : null,
        };

        if (tipo === "MED") payload.exames_medicos = selecionados;
        else payload.exames = selecionados;

        const nova = await apiFetch("/clinical/labrequest/", {
            method: "POST",
            body: JSON.stringify(payload),
        });

        router.push(`/requests/${nova.id}`);
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
                <h1>Nova Requisição Externa</h1>

                <label>Paciente</label>
                <select value={paciente} onChange={e => onPacienteChange(e.target.value)} required>
                    <option value="">Selecione</option>
                    {pacientes.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.nome}
                            {p.empresa_origem_nome ? ` (${p.empresa_origem_nome})` : ""}
                        </option>
                    ))}
                </select>

                <label>Empresa solicitante (subcontratando)</label>
                <select value={empresaSolicitante} onChange={e => setEmpresaSolicitante(e.target.value)}>
                    <option value="">(Auto pelo paciente / Não informar)</option>
                    {empresas.map(e => (
                        <option key={e.id} value={e.id}>
                            {e.nome}
                        </option>
                    ))}
                </select>

                <label>Empresa executora externa (terceirizada)</label>
                <select value={empresaExecutora} onChange={e => setEmpresaExecutora(e.target.value)}>
                    <option value="">(Não terceirizar)</option>
                    {empresas.map(e => (
                        <option key={e.id} value={e.id}>
                            {e.nome}
                        </option>
                    ))}
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

                {exames.map(e => (
                    <label key={e.id}>
                        <input
                            type="checkbox"
                            checked={selecionados.includes(e.id)}
                            onChange={() => toggleExame(e.id)}
                        />
                        {e.nome}
                    </label>
                ))}

                <button className="btn-primary">Criar Requisição Externa</button>
            </form>
        </AppLayout>
    );
}

