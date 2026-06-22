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
import { lucideToDataUrl } from "@/lib/icon-svg";

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
      // Itens do pedido são segunda camada: aparecem dentro do detalhe do pedido,
      // não como lista solta (ver FRONTEND_EXPOSURE_BACKLOG.md / readiness).
      { href: "/clinical-laboratory/orders", label: "Pedidos", desc: "Pedidos laboratoriais e respetivos exames", icon: ClipboardList },
    ],
  },
  {
    title: "Pré-analítico",
    hint: "Coleta, identificação, recepção e triagem.",
    items: [
      { href: "/clinical-laboratory/collections", label: "Coletas", desc: "Coleta da amostra do paciente", icon: Syringe },
      { href: "/clinical-laboratory/samples", label: "Amostras", desc: "Amostras rastreáveis (código de barras)", icon: TestTubes },
      { href: "/clinical-laboratory/reception", label: "Receção", desc: "Conferência e aceitação da amostra", icon: PackageCheck },
      { href: "/clinical-laboratory/rejections", label: "Rejeições", desc: "Amostras inadequadas / nova coleta", icon: XCircle },
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
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <main className="p-6 max-w-6xl mx-auto">
      <header className="mb-8 flex items-start gap-3">
        <div className="relative rounded-xl bg-indigo-50 p-3 w-[52px] h-[52px] shrink-0">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{
              background: "#4f46e5",
              opacity: 0.55,
              WebkitMaskImage: `url("${lucideToDataUrl(FlaskConical)}")`,
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskSize: "52%",
              WebkitMaskPosition: "center",
              maskImage: `url("${lucideToDataUrl(FlaskConical)}")`,
              maskRepeat: "no-repeat",
              maskSize: "52%",
              maskPosition: "center",
            }}
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laboratório Clínico</h1>
        </div>
      </header>

      <div className="space-y-5">
        {PHASES.map((phase) => (
          <section key={phase.title}>
            <div className="mb-2 flex items-baseline gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {phase.title}
              </h2>
              <span className="text-xs text-slate-400">{phase.hint}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {phase.items.map((item) => {
                const iconUrl = lucideToDataUrl(item.icon);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm transition-colors hover:border-indigo-300"
                  >
                    <span className="relative shrink-0 w-5 h-5 rounded bg-gray-100">
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 rounded"
                        style={{
                          background: "#4f46e5",
                          opacity: 0.7,
                          WebkitMaskImage: `url("${iconUrl}")`,
                          WebkitMaskRepeat: "no-repeat",
                          WebkitMaskSize: "65%",
                          WebkitMaskPosition: "center",
                          maskImage: `url("${iconUrl}")`,
                          maskRepeat: "no-repeat",
                          maskSize: "65%",
                          maskPosition: "center",
                        }}
                      />
                    </span>
                    <span className="text-sm font-medium text-slate-800 group-hover:text-indigo-700">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      </main>
    </AppLayout>
  );
}
