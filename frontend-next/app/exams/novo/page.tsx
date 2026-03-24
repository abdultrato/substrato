"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS } from "@/lib/rbac";

export default function NovoExamePage () {
    useAuthGuard();
    const router = useRouter();

    const metodoOptions = [
        { value: "Enzimatico", label: "Enzimático" },
        { value: "Colorimetrico", label: "Colorimétrico" },
        { value: "Espectrofotometrico", label: "Espectrofotométrico" },
        { value: "Turbidimetrico", label: "Turbidimétrico" },
        { value: "Nefelometrico", label: "Nefelométrico" },
        { value: "Potenciometrico", label: "Potenciométrico" },
        { value: "Eletroquimico", label: "Eletroquímico" },
        { value: "ELISA", label: "ELISA" },
        { value: "Quimioluminescencia", label: "Quimioluminescência" },
        { value: "Eletroquimioluminescencia", label: "Eletroquimioluminescência" },
        { value: "Imunofluorescencia", label: "Imunofluorescência" },
        { value: "Imunoturbidimetria", label: "Imunoturbidimetria" },
        { value: "Aglutinacao", label: "Aglutinação" },
        { value: "Cultura", label: "Cultura" },
        { value: "Antibiograma", label: "Antibiograma" },
        { value: "Microscopico", label: "Microscópico" },
        { value: "ColoracaoGram", label: "Coloração de Gram" },
        { value: "ColoracaoZiehl", label: "Ziehl-Neelsen" },
        { value: "IsolamentoMicrobiano", label: "Isolamento Microbiano" },
        { value: "CitometriaFluxo", label: "Citometria de Fluxo" },
        { value: "HematologiaAutomatizada", label: "Hematologia Automatizada" },
        { value: "MicroscopiaOptica", label: "Microscopia Óptica" },
        { value: "PCR", label: "PCR" },
        { value: "RT_PCR", label: "RT-PCR" },
        { value: "PCRTempoReal", label: "PCR em Tempo Real" },
        { value: "Sequenciamento", label: "Sequenciamento Genético" },
        { value: "HibridizacaoMolecular", label: "Hibridização Molecular" },
        { value: "Genotipagem", label: "Genotipagem" },
        { value: "Cromatografia", label: "Cromatografia" },
        { value: "CromatografiaGasosa", label: "Cromatografia Gasosa" },
        { value: "CromatografiaLiquida", label: "Cromatografia Líquida" },
        { value: "HPLC", label: "Cromatografia Líquida de Alta Eficiência" },
        { value: "Eletroforese", label: "Eletroforese" },
        { value: "Isoeletrofoque", label: "Isoeletrofocalização" },
        { value: "Sedimentacao", label: "Sedimentação" },
        { value: "Flutuacao", label: "Flutuação" },
        { value: "KatoKatz", label: "Kato-Katz" },
        { value: "TiraReagente", label: "Tira Reagente" },
        { value: "AnaliseMicroscopica", label: "Análise Microscópica" },
        { value: "EspectrometriaMassa", label: "Espectrometria de Massa" },
        { value: "MALDI_TOF", label: "MALDI-TOF" },
        { value: "RessonanciaMagneticaNuclear", label: "Ressonância Magnética Nuclear" },
    ];

    const [form, setForm] = useState( {
        nome: "",
        preco: 0,
        trl_horas: 24,
        metodo: "Enzimatico",
        setor: "Bioquimica",
    } );

    function update ( field: string, value: any ) {
        setForm( prev => ( { ...prev, [field]: value } ) );
    }

    async function salvar ( e: any ) {
        e.preventDefault();

        await apiFetch( "/exames/", {
            method: "POST",
            body: JSON.stringify( form ),
        } );

        router.push( "/exames" );
    }

    return (
        <AppLayout requiredGroups={[GROUPS.ADMIN]}>
            <form onSubmit={salvar} className="page-box">
                <h1>Novo Exame</h1>

                <input placeholder="Nome" onChange={e => update( "nome", e.target.value )} required />
                <input type="number" step="0.01" placeholder="Preço" onChange={e => update( "preco", Number( e.target.value ) )} required />
                <input type="number" placeholder="TRL (horas)" onChange={e => update( "trl_horas", Number( e.target.value ) )} required />

                <label>Método</label>
                <select value={form.metodo} onChange={e => update( "metodo", e.target.value )}>
                    {metodoOptions.map( (m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                    ) )}
                </select>

                <label>Setor</label>
                <select value={form.setor} onChange={e => update( "setor", e.target.value )}>
                    <option value="Bioquimica">Bioquímica</option>
                    <option value="Hematologia">Hematologia</option>
                    <option value="Microbiologia">Microbiologia</option>
                    <option value="Imunologia">Imunologia</option>
                    <option value="Outro">Outro</option>
                </select>
                <button className="btn-primary">Salvar</button>
            </form>
        </AppLayout>
    );
}
