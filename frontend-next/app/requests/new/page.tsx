"use client";
import { isNotFoundLikeError } from "@/lib/errors/api-error"

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { Patient, Exam, MedicalExam } from "@/lib/types";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS, userHasAnyGroup } from "@/lib/rbac";
import useDebounce from "@/hooks/useDebounce";

export default function NovaRequisicaoPage() {
    useAuthGuard();
    const router = useRouter();
    const { user } = useAuth();

    const [patients, setPatients] = useState<Patient[]>([]);

    const [patientId, setPatientId] = useState("");
    const [type, setType] = useState<"LAB" | "MED">("LAB");
    const [selectedExams, setSelectedExams] = useState<Array<Exam | MedicalExam>>([]);

    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 250);
    const [results, setResults] = useState<Array<Exam | MedicalExam>>([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const [erro, setErro] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        loadPatients();
    }, []);

    useEffect(() => {
        // ao trocar de setor, limpa seleção e resultados
        setSelectedExams([]);
        setResults([]);
        setQuery("");
    }, [type]);

    async function loadPatients() {
        const data = await apiFetch<any>("/clinical/patient/");
        const items = Array.isArray(data) ? data : data?.results || [];
        setPatients(items.map(normalizePatient));
    }

    const selectedExamIds = useMemo(() => new Set(selectedExams.map((x) => x.id)), [selectedExams]);

    useEffect(() => {
        let mounted = true;
        async function buscar() {
            const q = (debouncedQuery || "").trim();
            if (!q) {
                setResults([]);
                setSearchError(null);
                return;
            }
            try {
                setSearching(true);
                setSearchError(null);
                const endpointBase = "/clinical/exam/";
                const res = await apiFetch<any>(`${endpointBase}?search=${encodeURIComponent(q)}`);
                const items = res && res.results ? res.results : res;
                const list = Array.isArray(items) ? items : [];
                if (!mounted) return;
                // Remove os já selecionados e limita para não poluir a UI.
                setResults(list.map(normalizeExam).filter((x) => x && !selectedExamIds.has(x.id)).slice(0, 12));
            } catch (e: any) {
                if (!mounted) return;
                setSearchError(e?.message || "Falha ao buscar exames.");
            } finally {
                if (mounted) setSearching(false);
            }
        }
        buscar();
        return () => {
            mounted = false;
        };
    }, [debouncedQuery, type, selectedExamIds]);

    function addExam(exam: Exam | MedicalExam) {
        setSelectedExams((prev) => (prev.some((item) => item.id === exam.id) ? prev : [...prev, exam]));
        setResults((prev) => prev.filter((item) => item.id !== exam.id));
    }

    function removeExam(id: number) {
        setSelectedExams((prev) => prev.filter((item) => item.id !== id));
    }

    async function salvar(e: any) {
        e.preventDefault();
        setErro(null);
        if (salvando) return;
        if (!patientId) {
            setErro("Selecione um paciente.");
            return;
        }
        if (selectedExams.length === 0) {
            setErro("Adicione pelo menos um exame.");
            return;
        }

        try {
            setSalvando(true);
            const payload: any = {
                patient: Number(patientId),
                type,
            };

            const ids = selectedExams.map((x) => x.id);
            if (type === "MED") payload.medical_exams = ids;
            else payload.exames = ids;

            const nova = await apiFetch("/clinical/labrequest/", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            router.push(`/requests/${nova.id}`);
        } catch (err: any) {
            setErro(isNotFoundLikeError(err) ? null : (err?.message || "Falha ao criar requisição."));
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
                <select value={patientId} onChange={e => setPatientId(e.target.value)} required>
                    <option value="">Selecione</option>
                    {patients.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.name || p.nome}
                        </option>
                    ))}
                </select>

                <label>Setor</label>
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
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
                    placeholder={type === "MED" ? "Buscar exame médico..." : "Buscar exame laboratorial..."}
                    style={{ marginBottom: 8 }}
                />

                {searchError ? (
                    <div style={{ color: "#b45309", fontSize: 13, marginBottom: 8 }}>
                        {searchError}
                    </div>
                ) : null}

                {searching ? (
                    <div style={{ fontSize: 13, color: "var(--gray-500)", marginBottom: 8 }}>
                        Buscando...
                    </div>
                ) : null}

                {results.length ? (
                    <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
                        {results.map((ex) => (
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
                                    <strong>{ex.name || ex.nome}</strong>
                                    {ex.custom_id || ex.id_custom ? (
                                        <span style={{ marginLeft: 8, color: "var(--gray-500)" }}>
                                            {ex.custom_id || ex.id_custom}
                                        </span>
                                    ) : null}
                                </div>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => addExam(ex)}
                                >
                                    Adicionar
                                </button>
                            </div>
                        ))}
                    </div>
                ) : null}

                <h3>Selecionados ({selectedExams.length})</h3>

                {selectedExams.length ? (
                    <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
                        {selectedExams.map((ex) => (
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
                                    <strong>{ex.name || ex.nome}</strong>
                                    {ex.custom_id || ex.id_custom ? (
                                        <span style={{ marginLeft: 8, color: "var(--gray-500)" }}>
                                            {ex.custom_id || ex.id_custom}
                                        </span>
                                    ) : null}
                                </div>
                                <button
                                    type="button"
                                    className="btn-danger"
                                    onClick={() => removeExam(ex.id)}
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

function normalizePatient(raw: any): Patient {
    return {
        id: Number(raw?.id ?? 0),
        custom_id: raw?.custom_id ?? raw?.id_custom,
        name: raw?.name ?? raw?.nome ?? "",
        nome: raw?.nome,
    }
}

function normalizeExam(raw: any): Exam | MedicalExam {
    return {
        id: Number(raw?.id ?? 0),
        custom_id: raw?.custom_id ?? raw?.id_custom,
        name: raw?.name ?? raw?.nome ?? "",
        nome: raw?.nome,
    }
}


