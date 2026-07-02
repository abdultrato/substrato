"use client";

import Link from "next/link";
import {
  Award,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
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

const ITEMS = [
  { href: "/clinical-laboratory/quality-management/documents",          label: "Documentos & SOPs",            desc: "Documentos controlados, procedimentos, políticas", icon: ScrollText,    color: "sky" },
  { href: "/clinical-laboratory/quality-management/nonconformities",    label: "Não conformidades",             desc: "Desvios, falhas e ocorrências",                    icon: FileWarning,   color: "rose" },
  { href: "/clinical-laboratory/quality-management/corrective-actions", label: "Ações corretivas/preventivas", desc: "CAPA: corretiva, preventiva, melhoria",             icon: Wrench,        color: "orange" },
  { href: "/clinical-laboratory/quality-management/audits",             label: "Auditorias internas",          desc: "Planeamento e execução de auditorias",             icon: ClipboardCheck, color: "violet" },
  { href: "/clinical-laboratory/quality-management/findings",           label: "Achados de auditoria",         desc: "NC menores/maiores, observações",                  icon: ShieldAlert,   color: "amber" },
  { href: "/clinical-laboratory/quality-management/indicators",         label: "Indicadores (KPI)",            desc: "Metas e desempenho da qualidade",                  icon: GaugeCircle,   color: "emerald" },
  { href: "/clinical-laboratory/quality-management/trainings",          label: "Formações",                    desc: "Capacitação da equipa",                            icon: GraduationCap, color: "indigo" },
  { href: "/clinical-laboratory/quality-management/competencies",       label: "Competências",                 desc: "Avaliação de competência técnica",                 icon: Award,         color: "teal" },
  { href: "/clinical-laboratory/quality-management/complaints",         label: "Reclamações",                  desc: "Pacientes, médicos e sectores",                    icon: MessageSquare, color: "pink" },
  { href: "/clinical-laboratory/quality-management/risks",              label: "Riscos",                       desc: "Avaliação e mitigação de riscos",                  icon: ShieldAlert,   color: "red" },
  { href: "/clinical-laboratory/quality-management/management-reviews", label: "Revisões pela gestão",         desc: "Reuniões de revisão do SGQ",                       icon: Users,         color: "slate" },
] as const;

const COLOR_MAP: Record<string, { icon: string; bar: string; hover: string; badge: string }> = {
  sky:     { icon: "text-sky-500",     bar: "bg-sky-400",     hover: "hover:border-sky-200/70 dark:hover:border-sky-700/40",     badge: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  rose:    { icon: "text-rose-500",    bar: "bg-rose-400",    hover: "hover:border-rose-200/70 dark:hover:border-rose-700/40",    badge: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
  orange:  { icon: "text-orange-500",  bar: "bg-orange-400",  hover: "hover:border-orange-200/70 dark:hover:border-orange-700/40",badge: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  violet:  { icon: "text-violet-500",  bar: "bg-violet-400",  hover: "hover:border-violet-200/70 dark:hover:border-violet-700/40",badge: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  amber:   { icon: "text-amber-500",   bar: "bg-amber-400",   hover: "hover:border-amber-200/70 dark:hover:border-amber-700/40", badge: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  emerald: { icon: "text-emerald-500", bar: "bg-emerald-400", hover: "hover:border-emerald-200/70 dark:hover:border-emerald-700/40", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  indigo:  { icon: "text-indigo-500",  bar: "bg-indigo-400",  hover: "hover:border-indigo-200/70 dark:hover:border-indigo-700/40",badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" },
  teal:    { icon: "text-teal-500",    bar: "bg-teal-400",    hover: "hover:border-teal-200/70 dark:hover:border-teal-700/40",   badge: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" },
  pink:    { icon: "text-pink-500",    bar: "bg-pink-400",    hover: "hover:border-pink-200/70 dark:hover:border-pink-700/40",   badge: "bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300" },
  red:     { icon: "text-red-500",     bar: "bg-red-400",     hover: "hover:border-red-200/70 dark:hover:border-red-700/40",     badge: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  slate:   { icon: "text-slate-500",   bar: "bg-slate-400",   hover: "hover:border-slate-200/70 dark:hover:border-slate-700/40", badge: "bg-slate-50 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300" },
};

export default function QualityManagementHubPage() {
  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="space-y-4">

        {/* Hero */}
        <section className="relative overflow-hidden rounded-xl border border-amber-200/50 bg-gradient-to-br from-amber-50/80 via-white/60 to-yellow-50/60 shadow-sm backdrop-blur-sm dark:border-amber-800/30 dark:from-amber-950/30 dark:via-slate-900/40 dark:to-yellow-950/20">
          <span className="absolute left-0 top-0 h-full w-1 bg-amber-400" />
          <div className="px-4 py-4 pl-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100/80 text-amber-600 backdrop-blur-sm dark:bg-amber-900/30 dark:text-amber-400">
                  <CalendarCheck2 size={18} />
                </div>
                <div>
                  <h1 className="font-display text-base font-bold text-foreground leading-tight">Gestão da Qualidade</h1>
                  <p className="text-[10px] text-[var(--gray-500)]">{ITEMS.length} módulos disponíveis</p>
                </div>
              </div>
              <Link href="/clinical-laboratory"
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/40 bg-white/30 px-2.5 text-[11px] text-[var(--gray-700)] backdrop-blur-sm transition hover:bg-white/50 dark:border-white/10 dark:text-[var(--gray-300)] dark:hover:bg-white/10">
                <ChevronLeft size={11} /> Voltar
              </Link>
            </div>
          </div>
        </section>

        {/* Grid */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item) => {
            const c = COLOR_MAP[item.color];
            return (
              <Link key={item.href} href={item.href}
                className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/50 bg-white/30 shadow-sm backdrop-blur-sm transition hover:bg-white/50 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] ${c.hover}`}>
                <span className={`absolute left-0 top-0 h-full w-1 ${c.bar}`} />
                <div className={`ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.badge}`}>
                  <item.icon size={16} />
                </div>
                <div className="min-w-0 flex-1 py-3 pr-3">
                  <p className="text-[12px] font-semibold text-foreground leading-snug">{item.label}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--gray-500)] truncate">{item.desc}</p>
                </div>
                <ChevronRight size={13} className="mr-3 shrink-0 text-[var(--gray-400)] opacity-0 transition group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>

      </div>
    </AppLayout>
  );
}
