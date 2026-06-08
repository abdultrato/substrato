"use client";

import Link from "next/link";
import {
  Award,
  CalendarCheck2,
  ClipboardCheck,
  FileWarning,
  GaugeCircle,
  GraduationCap,
  MessageSquare,
  ScrollText,
  ShieldAlert,
  Wrench,
  Users,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS } from "@/lib/rbac";
import LabNav from "@/components/clinical-laboratory/LabNav";

const ITEMS = [
  { href: "/clinical-laboratory/quality-management/documents", label: "Documentos & SOPs", desc: "Documentos controlados, procedimentos, políticas", icon: ScrollText },
  { href: "/clinical-laboratory/quality-management/nonconformities", label: "Não conformidades", desc: "Desvios, falhas e ocorrências", icon: FileWarning },
  { href: "/clinical-laboratory/quality-management/corrective-actions", label: "Ações corretivas/preventivas", desc: "CAPA: corretiva, preventiva, melhoria", icon: Wrench },
  { href: "/clinical-laboratory/quality-management/audits", label: "Auditorias internas", desc: "Planeamento e execução de auditorias", icon: ClipboardCheck },
  { href: "/clinical-laboratory/quality-management/findings", label: "Achados de auditoria", desc: "NC menores/maiores, observações", icon: ShieldAlert },
  { href: "/clinical-laboratory/quality-management/indicators", label: "Indicadores (KPI)", desc: "Metas e desempenho da qualidade", icon: GaugeCircle },
  { href: "/clinical-laboratory/quality-management/trainings", label: "Formações", desc: "Capacitação da equipa", icon: GraduationCap },
  { href: "/clinical-laboratory/quality-management/competencies", label: "Competências", desc: "Avaliação de competência técnica", icon: Award },
  { href: "/clinical-laboratory/quality-management/complaints", label: "Reclamações", desc: "Pacientes, médicos e sectores", icon: MessageSquare },
  { href: "/clinical-laboratory/quality-management/risks", label: "Riscos", desc: "Avaliação e mitigação de riscos", icon: ShieldAlert },
  { href: "/clinical-laboratory/quality-management/management-reviews", label: "Revisões pela gestão", desc: "Reuniões de revisão do SGQ", icon: Users },
];

export default function QualityManagementHubPage() {
  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <LabNav />
      <main className="p-6 max-w-6xl mx-auto">
      <header className="mb-8 flex items-start gap-3">
        <div className="rounded-xl bg-amber-50 p-3 text-amber-600"><CalendarCheck2 size={26} /></div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão da Qualidade</h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Sistema de gestão da qualidade do laboratório: documentos, não conformidades,
            CAPA, auditorias, indicadores, formação, competências, reclamações, riscos e
            revisões pela gestão.
          </p>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((item) => (
          <Link key={item.href} href={item.href}
            className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50/40">
            <span className="mt-0.5 text-amber-600"><item.icon size={20} /></span>
            <span>
              <span className="block text-sm font-medium text-slate-900 group-hover:text-amber-700">{item.label}</span>
              <span className="block text-xs text-slate-500">{item.desc}</span>
            </span>
          </Link>
        ))}
      </div>
      </main>
    </AppLayout>
  );
}
