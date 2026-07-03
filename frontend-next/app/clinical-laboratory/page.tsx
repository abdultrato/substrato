"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Beaker,
  Bug,
  ClipboardList,
  Dna,
  FileCheck2,
  FileText,
  FlaskConical,
  ListChecks,
  Microscope,
  PackageCheck,
  Pill,
  ShieldCheck,
  Syringe,
  TestTube,
  TestTubes,
  XCircle,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import ActionTile from "@/components/ui/ActionTile";
import MetricCard from "@/components/ui/MetricCard";
import { apiFetchList } from "@/lib/api";
import { isNotFoundLikeError } from "@/lib/errors/api-error";
import { GROUPS, userHasAnyGroup } from "@/lib/rbac";
import { useAuth } from "@/hooks/useAuth";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";

type PhaseConfig = {
  title: string;
  hint: string;
  accentClass: string;
  iconClass: string;
  items: { href: string; label: string; desc: string; icon: any }[];
};

const PHASES: PhaseConfig[] = [
  {
    title: "Catálogo",
    hint: "Configuração técnica e financeira",
    accentClass: "border-l-violet-500",
    iconClass: "bg-violet-500/15 text-violet-600",
    items: [
      { href: "/clinical-laboratory/sectors",  label: "Sectores",  desc: "Hematologia, Bioquímica, Microbiologia…", icon: Microscope },
      { href: "/clinical-laboratory/tests",    label: "Exames",    desc: "Catálogo de exames (método, unidade, preço)", icon: TestTube },
      { href: "/clinical-laboratory/panels",   label: "Painéis",   desc: "Hemograma, perfil lipídico, pré-operatório…", icon: ListChecks },
    ],
  },
  {
    title: "Pedido",
    hint: "Solicitação e autorização",
    accentClass: "border-l-sky-500",
    iconClass: "bg-sky-500/15 text-sky-600",
    items: [
      { href: "/clinical-laboratory/orders", label: "Pedidos", desc: "Pedidos laboratoriais e respetivos exames", icon: ClipboardList },
    ],
  },
  {
    title: "Pré-analítico",
    hint: "Coleta, identificação, recepção e triagem",
    accentClass: "border-l-cyan-500",
    iconClass: "bg-cyan-500/15 text-cyan-600",
    items: [
      { href: "/clinical-laboratory/collections", label: "Coletas",   desc: "Coleta da amostra do paciente", icon: Syringe },
      { href: "/clinical-laboratory/samples",     label: "Amostras",  desc: "Amostras rastreáveis (código de barras)", icon: TestTubes },
      { href: "/clinical-laboratory/reception",   label: "Recepção",  desc: "Conferência e aceitação da amostra", icon: PackageCheck },
      { href: "/clinical-laboratory/rejections",  label: "Rejeições", desc: "Amostras inadequadas / nova coleta", icon: XCircle },
    ],
  },
  {
    title: "Analítico",
    hint: "Processamento, resultado e validação",
    accentClass: "border-l-teal-500",
    iconClass: "bg-teal-500/15 text-teal-600",
    items: [
      { href: "/clinical-laboratory/worklists",   label: "Listas de trabalho", desc: "Trabalho por sector e equipamento", icon: Beaker },
      { href: "/clinical-laboratory/validations", label: "Validações",          desc: "Validação técnica e clínica", icon: FileCheck2 },
    ],
  },
  {
    title: "Pós-analítico",
    hint: "Laudo e comunicação de resultados críticos",
    accentClass: "border-l-emerald-500",
    iconClass: "bg-emerald-500/15 text-emerald-600",
    items: [
      { href: "/clinical-laboratory/reports",         label: "Laudos",             desc: "Emissão, assinatura e entrega do laudo", icon: FileText },
      { href: "/clinical-laboratory/critical-results", label: "Resultados críticos", desc: "Comunicação com readback", icon: AlertTriangle },
    ],
  },
  {
    title: "Sectores especializados",
    hint: "Microbiologia, biologia molecular e baciloscopia (TB)",
    accentClass: "border-l-amber-500",
    iconClass: "bg-amber-500/15 text-amber-600",
    items: [
      { href: "/clinical-laboratory/cultures",     label: "Culturas",                   desc: "Microbiologia: hemocultura, urocultura, TB…", icon: Microscope },
      { href: "/clinical-laboratory/isolates",     label: "Isolados",                   desc: "Microrganismos identificados", icon: Bug },
      { href: "/clinical-laboratory/antibiograms", label: "Antibiogramas",              desc: "Sensibilidade S/I/R", icon: Pill },
      { href: "/clinical-laboratory/molecular",    label: "Biologia Molecular / GeneXpert", desc: "PCR, carga viral, MTB/RIF", icon: Dna },
      { href: "/clinical-laboratory/afb-smears",  label: "Baciloscopia (BAAR)",        desc: "Microscopia para TB (ZN/Auramina)", icon: TestTubes },
    ],
  },
  {
    title: "Gestão & Segurança",
    hint: "Sistema de qualidade (SGQ) e biossegurança",
    accentClass: "border-l-rose-500",
    iconClass: "bg-rose-500/15 text-rose-600",
    items: [
      { href: "/clinical-laboratory/quality-management", label: "Gestão da Qualidade", desc: "Documentos, NC, CAPA, auditorias, indicadores…", icon: FileCheck2 },
      { href: "/clinical-laboratory/biosafety",          label: "Biossegurança",        desc: "Exposições, EPIs, resíduos, descontaminação…", icon: AlertTriangle },
    ],
  },
];

export default function ClinicalLaboratoryHubPage() {
  const { user } = useAuth();
  const podeAdmin = userHasAnyGroup(user, [GROUPS.ADMIN]);
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ exames: 0, pedidos: 0, amostras: 0 });

  useEffect(() => {
    let mounted = true;
    async function load() {
      const safe = async (ep: string) => {
        try {
          const { meta } = await apiFetchList(ep, { page: 1, pageSize: 1, clientCache: false, timeoutMs: 4000, retryOnTimeout: 0 });
          return meta.total ?? 0;
        } catch (e) {
          return isNotFoundLikeError(e) ? 0 : 0;
        }
      };
      const [exames, pedidos, amostras] = await Promise.all([
        safe("/clinical_laboratory/labtest/"),
        safe("/clinical_laboratory/labrequest/"),
        safe("/clinical_laboratory/labsample/"),
      ]);
      if (!mounted) return;
      setCounts({ exames, pedidos, amostras });
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [safeRefreshToken]);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="space-y-4">

        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-cyan-600 to-sky-700 px-6 py-6 shadow-lg">
          {/* decorative circles */}
          <span className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/5" />
          <span className="pointer-events-none absolute -bottom-8 right-24 h-36 w-36 rounded-full bg-white/5" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-inner backdrop-blur-sm">
                <FlaskConical size={28} className="text-white" strokeWidth={1.8} />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-white leading-tight">
                  Laboratório Clínico
                </h1>
                <p className="mt-0.5 text-sm text-teal-100/80">
                  LIS · {PHASES.reduce((n, p) => n + p.items.length, 0)} funcionalidades
                </p>
              </div>
            </div>

            {podeAdmin ? (
              <Link
                href="/admin/clinical_laboratory/"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                <ShieldCheck size={13} />
                Admin
              </Link>
            ) : null}
          </div>

          {/* metric strip */}
          <div className="relative mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: "Exames no catálogo", value: loading ? "…" : counts.exames },
              { label: "Pedidos",             value: loading ? "…" : counts.pedidos },
              { label: "Amostras",            value: loading ? "…" : counts.amostras },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-teal-100/70">{label}</div>
                <div className="font-display text-xl font-bold text-white tabular-nums">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Phases ── */}
        <div className="space-y-4">
          {PHASES.map((phase) => (
            <section key={phase.title}>
              {/* section label */}
              <div className="mb-2 flex items-center gap-2">
                <span className={`h-2.5 w-1 rounded-full ${phase.accentClass.replace("border-l-", "bg-")}`} />
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-foreground/70">
                  {phase.title}
                </h2>
                <span className="text-[10px] text-muted-foreground">{phase.hint}</span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {phase.items.map((item) => (
                  <ActionTile
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    description={item.desc}
                    icon={item.icon}
                    accentClass={phase.accentClass}
                    iconClass={phase.iconClass}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

      </div>
    </AppLayout>
  );
}
