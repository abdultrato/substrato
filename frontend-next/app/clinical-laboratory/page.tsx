"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Beaker,
  ClipboardList,
  FileCheck2,
  FileText,
  FlaskConical,
  ListChecks,
  Microscope,
  PackageCheck,
  Syringe,
  TestTube,
  TestTubes,
  XCircle,
  Bug,
  Dna,
  Pill,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS } from "@/lib/rbac";
import LabNav from "@/components/clinical-laboratory/LabNav";

type Section = {
  href: string;
  label: string;
  desc: string;
  icon: any;
};

type Phase = {
  title: string;
  hint: string;
  items: Section[];
};

const PHASES: Phase[] = [
  {
    title: "Catálogo",
    hint: "Configuração técnica e financeira do laboratório.",
    items: [
      { href: "/clinical-laboratory/sectors", label: "Sectores", desc: "Hematologia, Bioquímica, Microbiologia…", icon: Microscope },
      { href: "/clinical-laboratory/tests", label: "Exames", desc: "Catálogo de exames (método, unidade, preço)", icon: TestTube },
      { href: "/clinical-laboratory/panels", label: "Painéis", desc: "Hemograma, perfil lipídico, pré-operatório…", icon: ListChecks },
    ],
  },
  {
    title: "Pedido",
    hint: "Solicitação e autorização dos exames.",
    items: [
      { href: "/clinical-laboratory/orders", label: "Pedidos", desc: "Pedidos laboratoriais por paciente", icon: ClipboardList },
      { href: "/clinical-laboratory/order-items", label: "Itens do pedido", desc: "Exames individuais de cada pedido", icon: FileText },
    ],
  },
  {
    title: "Pré-analítico",
    hint: "Colheita, identificação, recepção e triagem.",
    items: [
      { href: "/clinical-laboratory/collections", label: "Colheitas", desc: "Colheita da amostra do paciente", icon: Syringe },
      { href: "/clinical-laboratory/samples", label: "Amostras", desc: "Amostras rastreáveis (código de barras)", icon: TestTubes },
      { href: "/clinical-laboratory/reception", label: "Recepção", desc: "Conferência e aceitação da amostra", icon: PackageCheck },
      { href: "/clinical-laboratory/rejections", label: "Rejeições", desc: "Amostras inadequadas / nova colheita", icon: XCircle },
    ],
  },
  {
    title: "Analítico",
    hint: "Processamento, resultado e validação.",
    items: [
      { href: "/clinical-laboratory/worklists", label: "Listas de trabalho", desc: "Trabalho por sector e equipamento", icon: Beaker },
      { href: "/clinical-laboratory/results", label: "Resultados", desc: "Resultados técnicos e flags", icon: FlaskConical },
      { href: "/clinical-laboratory/validations", label: "Validações", desc: "Validação técnica e clínica", icon: FileCheck2 },
    ],
  },
  {
    title: "Pós-analítico",
    hint: "Laudo e comunicação de resultados críticos.",
    items: [
      { href: "/clinical-laboratory/reports", label: "Laudos", desc: "Emissão, assinatura e entrega do laudo", icon: FileText },
      { href: "/clinical-laboratory/critical-results", label: "Resultados críticos", desc: "Comunicação com readback", icon: AlertTriangle },
    ],
  },
  {
    title: "Sectores especializados",
    hint: "Microbiologia, biologia molecular e baciloscopia (TB).",
    items: [
      { href: "/clinical-laboratory/cultures", label: "Culturas", desc: "Microbiologia: hemocultura, urocultura, TB…", icon: Microscope },
      { href: "/clinical-laboratory/isolates", label: "Isolados", desc: "Microrganismos identificados", icon: Bug },
      { href: "/clinical-laboratory/antibiograms", label: "Antibiogramas", desc: "Sensibilidade S/I/R", icon: Pill },
      { href: "/clinical-laboratory/molecular", label: "Biologia Molecular / GeneXpert", desc: "PCR, carga viral, MTB/RIF", icon: Dna },
      { href: "/clinical-laboratory/afb-smears", label: "Baciloscopia (BAAR)", desc: "Microscopia para TB (ZN/Auramina)", icon: TestTubes },
    ],
  },
  {
    title: "Gestão & Segurança",
    hint: "Sistema de qualidade (SGQ) e biossegurança do laboratório.",
    items: [
      { href: "/clinical-laboratory/quality-management", label: "Gestão da Qualidade", desc: "Documentos, NC, CAPA, auditorias, indicadores…", icon: FileCheck2 },
      { href: "/clinical-laboratory/biosafety", label: "Biossegurança", desc: "Exposições, EPIs, resíduos, descontaminação…", icon: AlertTriangle },
    ],
  },
];

export default function ClinicalLaboratoryHubPage() {
  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]} subNav={<LabNav />}>
      <main className="p-6 max-w-6xl mx-auto">
      <header className="mb-8 flex items-start gap-3">
        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
          <FlaskConical size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laboratório Clínico (LIS)</h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Sector completo: do pedido e colheita (pré-analítico), passando pelo
            processamento e validação (analítico), até ao laudo e comunicação de
            resultados críticos (pós-analítico). Rastreável, faturável e auditável.
          </p>
        </div>
      </header>

      <div className="space-y-8">
        {PHASES.map((phase) => (
          <section key={phase.title}>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                {phase.title}
              </h2>
              <span className="text-xs text-slate-400">{phase.hint}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {phase.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
                >
                  <span className="mt-0.5 text-indigo-600">
                    <item.icon size={20} />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-slate-900 group-hover:text-indigo-700">
                      {item.label}
                    </span>
                    <span className="block text-xs text-slate-500">{item.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      </main>
    </AppLayout>
  );
}
