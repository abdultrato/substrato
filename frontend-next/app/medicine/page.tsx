"use client";

import { isNotFoundLikeError } from "@/lib/errors/api-error";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  FilePlus2,
  Stethoscope,
  Users,
  HeartPulse,
  ScrollText,
  Baby,
  Scissors,
  ImagePlus,
  Pill,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import WorkspaceHub from "@/components/workspace/WorkspaceHub";
import { apiFetch, extractTotalCount } from "@/lib/api";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS } from "@/lib/rbac";

type MedicineActionTile = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accentClass: string;
  fullWidth?: boolean;
};

const medicineActionTiles: MedicineActionTile[] = [
  {
    title: "Pacientes",
    description: "Ver e registar pacientes vindos da recepção.",
    href: "/patients",
    icon: Users,
    accentClass: "from-sky-500 via-cyan-500 to-teal-400",
  },
  {
    title: "Criar requisição laboratorial",
    description: "Solicitar exames laboratoriais para um paciente.",
    href: "/requests/new",
    icon: FilePlus2,
    accentClass: "from-emerald-500 via-lime-500 to-amber-400",
  },
  {
    title: "Prontuário (Cardex)",
    description: "Registos clínicos e prescrição estruturada.",
    href: "/medical-records",
    icon: ScrollText,
    accentClass: "from-violet-500 via-fuchsia-500 to-pink-400",
  },
  {
    title: "Maternidade",
    description: "Gestação, berçário, camas e partos.",
    href: "/maternity",
    icon: Baby,
    accentClass: "from-rose-400 via-pink-400 to-orange-300",
  },
  {
    title: "Cirurgia",
    description: "Agendamento e procedimentos cirúrgicos.",
    href: "/surgery",
    icon: Scissors,
    accentClass: "from-red-500 via-orange-500 to-amber-400",
  },
  {
    title: "Exames médicos (catálogo)",
    description: "Consultar cadastros de exames médicos (se aplicável).",
    href: "/medicine/medical-exams",
    icon: Stethoscope,
    accentClass: "from-cyan-500 via-sky-500 to-indigo-400",
  },
  {
    title: "Procedimentos",
    description: "Acompanhar procedimentos executados na enfermagem.",
    href: "/nursing/procedures",
    icon: HeartPulse,
    accentClass: "from-emerald-500 via-teal-500 to-cyan-400",
  },
  {
    title: "Resultados médicos",
    description: "Anexar laudos e imagens por exame médico.",
    href: "/medicine/medical-results",
    icon: ImagePlus,
    accentClass: "from-indigo-500 via-blue-500 to-cyan-400",
  },
  {
    title: "Criar requisição de materiais",
    description:
      "Abrir o formulário para solicitar insumos médico-cirúrgicos à farmácia.",
    href: "/pharmacy/material-requests/new",
    icon: Pill,
    accentClass: "from-amber-500 via-orange-500 to-rose-400",
    fullWidth: true,
  },
];

export default function MedicinaPage() {
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pacientes, setPacientes] = useState<number>(0);
  const [requisicoes, setRequisicoes] = useState<number>(0);
  const [consultas, setConsultas] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setErro(null);

        const [pacs, reqs, cons] = await Promise.all([
          apiFetch<any>("/clinical/patient/", {
            clientCache: safeRefreshToken === 0,
          }),
          apiFetch<any>("/clinical/labrequest/", {
            clientCache: safeRefreshToken === 0,
          }),
          apiFetch<any>("/consultations/consultation/?sector=GENERAL_MEDICINE", {
            clientCache: safeRefreshToken === 0,
          }),
        ]);

        if (!mounted) return;
        setPacientes(extractTotalCount(pacs));
        setRequisicoes(extractTotalCount(reqs));
        setConsultas(extractTotalCount(cons));
      } catch (e: any) {
        if (!mounted) return;
        setErro(
          isNotFoundLikeError(e)
            ? null
            : e?.message || "Falha ao carregar o workspace de medicina.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [safeRefreshToken]);

  const metricValue = useMemo(() => (loading ? "..." : null), [loading]);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA]}>
      <div className="space-y-2">
        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        <WorkspaceHub
          title="Medicina"
          dense
          backHref="/healthcare"
          icon={Stethoscope}
          iconClass="bg-sky-500/15 text-sky-600 dark:text-sky-300"
          barClass="bg-sky-500"
          metrics={[
            { label: "Consultas", value: metricValue || consultas, href: "/consultations?sector=GENERAL_MEDICINE", icon: CalendarClock, accentClass: "border-l-cyan-500", iconClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300" },
            { label: "Pacientes", value: metricValue || pacientes, href: "/patients", icon: Users, accentClass: "border-l-sky-500", iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
            { label: "Requisições", value: metricValue || requisicoes, href: "/requests", icon: FilePlus2, accentClass: "border-l-emerald-500", iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
            { label: "Anamnese", value: "—", href: "/medical-records", icon: ScrollText, accentClass: "border-l-violet-500", iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
            { label: "Diagnósticos", value: "—", href: "/medical-records", icon: HeartPulse, accentClass: "border-l-rose-500", iconClass: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
          ]}
          actions={[
            {
              title: "Consultas",
              description: "Consultas de Clínica Geral marcadas para Medicina.",
              href: "/consultations?sector=GENERAL_MEDICINE",
              icon: CalendarClock,
            },
            ...medicineActionTiles.map((tile) => ({
              title: tile.title,
              description: tile.description,
              href: tile.href,
              icon: tile.icon,
            })),
          ]}
        />
      </div>
    </AppLayout>
  );
}
