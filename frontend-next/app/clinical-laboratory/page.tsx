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
  Gauge,
  ListChecks,
  Microscope,
  PackageCheck,
  Pill,
  Syringe,
  TestTube,
  TestTubes,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { apiFetchList } from "@/lib/api";
import { isNotFoundLikeError } from "@/lib/errors/api-error";
import { GROUPS } from "@/lib/rbac";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";

type PhaseTone = {
  panel: string;
  accent: string;
  bar: string;
  dot: string;
  title: string;
  description: string;
};

type PhaseColor = "violet" | "sky" | "cyan" | "teal" | "emerald" | "amber" | "rose";

const PHASE_TONES: Record<PhaseColor, PhaseTone> = {
  violet: {
    panel:
      "border-violet-200/70 bg-gradient-to-br from-violet-50/80 via-card to-card hover:border-violet-300 dark:border-violet-900/40 dark:from-violet-950/20 dark:via-card dark:to-card",
    accent: "bg-violet-500/10 text-violet-700 ring-violet-500/15 dark:bg-violet-500/15 dark:text-violet-300",
    bar: "bg-violet-500",
    dot: "bg-violet-500",
    title: "text-violet-950 dark:text-violet-50",
    description: "text-violet-900/70 dark:text-violet-200/70",
  },
  sky: {
    panel:
      "border-sky-200/70 bg-gradient-to-br from-sky-50/80 via-card to-card hover:border-sky-300 dark:border-sky-900/40 dark:from-sky-950/20 dark:via-card dark:to-card",
    accent: "bg-sky-500/10 text-sky-700 ring-sky-500/15 dark:bg-sky-500/15 dark:text-sky-300",
    bar: "bg-sky-500",
    dot: "bg-sky-500",
    title: "text-sky-950 dark:text-sky-50",
    description: "text-sky-900/70 dark:text-sky-200/70",
  },
  cyan: {
    panel:
      "border-cyan-200/70 bg-gradient-to-br from-cyan-50/80 via-card to-card hover:border-cyan-300 dark:border-cyan-900/40 dark:from-cyan-950/20 dark:via-card dark:to-card",
    accent: "bg-cyan-500/10 text-cyan-700 ring-cyan-500/15 dark:bg-cyan-500/15 dark:text-cyan-300",
    bar: "bg-cyan-500",
    dot: "bg-cyan-500",
    title: "text-cyan-950 dark:text-cyan-50",
    description: "text-cyan-900/70 dark:text-cyan-200/70",
  },
  teal: {
    panel:
      "border-teal-200/70 bg-gradient-to-br from-teal-50/80 via-card to-card hover:border-teal-300 dark:border-teal-900/40 dark:from-teal-950/20 dark:via-card dark:to-card",
    accent: "bg-teal-500/10 text-teal-700 ring-teal-500/15 dark:bg-teal-500/15 dark:text-teal-300",
    bar: "bg-teal-500",
    dot: "bg-teal-500",
    title: "text-teal-950 dark:text-teal-50",
    description: "text-teal-900/70 dark:text-teal-200/70",
  },
  emerald: {
    panel:
      "border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 via-card to-card hover:border-emerald-300 dark:border-emerald-900/40 dark:from-emerald-950/20 dark:via-card dark:to-card",
    accent: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/15 dark:bg-emerald-500/15 dark:text-emerald-300",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
    title: "text-emerald-950 dark:text-emerald-50",
    description: "text-emerald-900/70 dark:text-emerald-200/70",
  },
  amber: {
    panel:
      "border-amber-200/70 bg-gradient-to-br from-amber-50/80 via-card to-card hover:border-amber-300 dark:border-amber-900/40 dark:from-amber-950/20 dark:via-card dark:to-card",
    accent: "bg-amber-500/10 text-amber-700 ring-amber-500/15 dark:bg-amber-500/15 dark:text-amber-300",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
    title: "text-amber-950 dark:text-amber-50",
    description: "text-amber-900/70 dark:text-amber-200/70",
  },
  rose: {
    panel:
      "border-rose-200/70 bg-gradient-to-br from-rose-50/80 via-card to-card hover:border-rose-300 dark:border-rose-900/40 dark:from-rose-950/20 dark:via-card dark:to-card",
    accent: "bg-rose-500/10 text-rose-700 ring-rose-500/15 dark:bg-rose-500/15 dark:text-rose-300",
    bar: "bg-rose-500",
    dot: "bg-rose-500",
    title: "text-rose-950 dark:text-rose-50",
    description: "text-rose-900/70 dark:text-rose-200/70",
  },
};

type PhaseConfig = {
  title: string;
  hint: string;
  color: PhaseColor;
  items: { href: string; label: string; desc: string; icon: LucideIcon }[];
};

/** Tile compacto no modelo do workspace: barra lateral colorida + ícone em anel + painel tonal. */
function CompactLabTile({
  href,
  title,
  description,
  icon: Icon,
  tone,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: PhaseTone;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex min-w-0 items-center gap-1 rounded-md border px-2 py-1 text-left shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:gap-1.5 sm:px-2.5 ${tone.panel}`}
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${tone.bar}`} />
      <span
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1 sm:h-6 sm:w-6 ${tone.accent}`}
      >
        <Icon size={12} strokeWidth={2.1} />
      </span>
      <span className="min-w-0">
        <span className={`block break-words text-[11px] font-semibold leading-tight sm:text-[12px] ${tone.title}`}>
          {title}
        </span>
        <span className={`mt-0.5 block break-words text-[10px] leading-tight ${tone.description}`}>
          {description}
        </span>
      </span>
    </Link>
  );
}

const PHASES: PhaseConfig[] = [
  {
    title: "Catálogo",
    hint: "Configuração técnica e financeira",
    color: "violet",
    items: [
      {
        href: "/clinical-laboratory/sectors",
        label: "Sectores",
        desc: "Hematologia, Bioquímica, Microbiologia…",
        icon: Microscope,
      },
      {
        href: "/clinical-laboratory/tests",
        label: "Exames",
        desc: "Catálogo de exames (método, unidade, preço)",
        icon: TestTube,
      },
      {
        href: "/clinical-laboratory/panels",
        label: "Painéis",
        desc: "Hemograma, perfil lipídico, pré-operatório…",
        icon: ListChecks,
      },
    ],
  },
  {
    title: "Pedido",
    hint: "Solicitação e autorização",
    color: "sky",
    items: [
      {
        href: "/clinical-laboratory/orders",
        label: "Pedidos",
        desc: "Pedidos laboratoriais e respetivos exames",
        icon: ClipboardList,
      },
    ],
  },
  {
    title: "Pré-analítico",
    hint: "Coleta, identificação, recepção e triagem",
    color: "cyan",
    items: [
      {
        href: "/clinical-laboratory/collections",
        label: "Coletas",
        desc: "Coleta da amostra do paciente",
        icon: Syringe,
      },
      {
        href: "/clinical-laboratory/samples",
        label: "Amostras",
        desc: "Amostras rastreáveis (código de barras)",
        icon: TestTubes,
      },
      {
        href: "/clinical-laboratory/reception",
        label: "Recepção",
        desc: "Conferência e aceitação da amostra",
        icon: PackageCheck,
      },
      {
        href: "/clinical-laboratory/rejections",
        label: "Rejeições",
        desc: "Amostras inadequadas / nova coleta",
        icon: XCircle,
      },
    ],
  },
  {
    title: "Analítico",
    hint: "Processamento, resultado e validação",
    color: "teal",
    items: [
      {
        href: "/clinical-laboratory/worklists",
        label: "Listas de trabalho",
        desc: "Trabalho por sector e equipamento",
        icon: Beaker,
      },
      {
        href: "/clinical-laboratory/quality-control",
        label: "Controlo de qualidade",
        desc: "Resultado esperado vs obtido e validade do exame",
        icon: Gauge,
      },
      {
        href: "/clinical-laboratory/validations",
        label: "Validações",
        desc: "Validação técnica e clínica",
        icon: FileCheck2,
      },
    ],
  },
  {
    title: "Pós-analítico",
    hint: "Laudo e comunicação de resultados críticos",
    color: "emerald",
    items: [
      {
        href: "/clinical-laboratory/reports",
        label: "Laudos",
        desc: "Emissão, assinatura e entrega do laudo",
        icon: FileText,
      },
      {
        href: "/clinical-laboratory/critical-results",
        label: "Resultados críticos",
        desc: "Comunicação com readback",
        icon: AlertTriangle,
      },
    ],
  },
  {
    title: "Sectores especializados",
    hint: "Microbiologia, biologia molecular e baciloscopia (TB)",
    color: "amber",
    items: [
      {
        href: "/clinical-laboratory/cultures",
        label: "Culturas",
        desc: "Microbiologia: hemocultura, urocultura, TB…",
        icon: Microscope,
      },
      {
        href: "/clinical-laboratory/isolates",
        label: "Isolados",
        desc: "Microrganismos identificados",
        icon: Bug,
      },
      {
        href: "/clinical-laboratory/antibiograms",
        label: "Antibiogramas",
        desc: "Sensibilidade S/I/R",
        icon: Pill,
      },
      {
        href: "/clinical-laboratory/molecular/genexpert",
        label: "GeneXpert MTB/RIF",
        desc: "Deteção MTB e resistência à rifampicina",
        icon: Dna,
      },
      {
        href: "/clinical-laboratory/molecular/hiv-viral-load",
        label: "Biologia Molecular: Carga Viral de HIV",
        desc: "Quantificação molecular da carga viral HIV",
        icon: Dna,
      },
      {
        href: "/clinical-laboratory/afb-smears",
        label: "Baciloscopia (BAAR)",
        desc: "Microscopia para TB (ZN/Auramina)",
        icon: TestTubes,
      },
    ],
  },
  {
    title: "Gestão & Segurança",
    hint: "Sistema de qualidade (SGQ) e biossegurança",
    color: "rose",
    items: [
      {
        href: "/clinical-laboratory/quality-management",
        label: "Gestão da Qualidade",
        desc: "Documentos, NC, CAPA, auditorias, indicadores…",
        icon: FileCheck2,
      },
      {
        href: "/clinical-laboratory/biosafety",
        label: "Biossegurança",
        desc: "Exposições, EPIs, resíduos, descontaminação…",
        icon: AlertTriangle,
      },
    ],
  },
];

export default function ClinicalLaboratoryHubPage() {
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    setores: 0,
    exames: 0,
    pedidos: 0,
    coletas: 0,
    amostras: 0,
    recepcoes: 0,
    laudos: 0,
    criticos: 0,
    culturas: 0,
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      const safe = async (ep: string) => {
        try {
          const { items, meta } = await apiFetchList(ep, {
            page: 1,
            pageSize: 1,
            clientCache: false,
            timeoutMs: 4000,
            retryOnTimeout: 0,
          });
          return meta.total ?? items.length ?? 0;
        } catch (e) {
          return isNotFoundLikeError(e) ? 0 : 0;
        }
      };
      const [
        setores,
        exames,
        pedidos,
        coletas,
        amostras,
        recepcoes,
        laudos,
        criticos,
        culturas,
      ] = await Promise.all([
        safe("/clinical_laboratory/sector/"),
        safe("/clinical_laboratory/test/"),
        safe("/clinical/labrequest/?fase=pedidos"),
        safe("/clinical_laboratory/collection/"),
        safe("/clinical_laboratory/sample/"),
        safe("/clinical/labrequest/?type=LAB&fase=rececao_amostras"),
        safe("/clinical/labrequest/?fase=laudos&ordering=-updated_at"),
        safe("/clinical_laboratory/critical_notification/"),
        safe("/clinical_laboratory/culture/"),
      ]);
      if (!mounted) return;
      setCounts({ setores, exames, pedidos, coletas, amostras, recepcoes, laudos, criticos, culturas });
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [safeRefreshToken]);

  const metrics = [
    { label: "Sectores", value: loading ? "…" : counts.setores, href: "/clinical-laboratory/sectors" },
    { label: "Exames", value: loading ? "…" : counts.exames, href: "/clinical-laboratory/tests" },
    { label: "Pedidos", value: loading ? "…" : counts.pedidos, href: "/clinical-laboratory/orders" },
    { label: "Coletas", value: loading ? "…" : counts.coletas, href: "/clinical-laboratory/collections" },
    { label: "Amostras", value: loading ? "…" : counts.amostras, href: "/clinical-laboratory/samples" },
    { label: "Recepções", value: loading ? "…" : counts.recepcoes, href: "/clinical-laboratory/reception" },
    { label: "Laudos", value: loading ? "…" : counts.laudos, href: "/clinical-laboratory/reports" },
    { label: "Críticos", value: loading ? "…" : counts.criticos, href: "/clinical-laboratory/critical-results" },
    { label: "Culturas", value: loading ? "…" : counts.culturas, href: "/clinical-laboratory/cultures" },
  ];

  return (
    <AppLayout
      fullWidth
      accessRestrictionMode="page"
      requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}
    >
      <div className="mx-auto box-border w-full max-w-full space-y-1 px-1">
        <div className="relative overflow-hidden rounded-xl border border-teal-200/80 bg-gradient-to-br from-teal-50/90 via-card to-card dark:border-teal-900/40 dark:from-teal-950/25 dark:via-card dark:to-card">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-teal-500/12 via-teal-500/0 to-transparent"
          />

          {/* Cabeçalho */}
          <div className="relative flex flex-col gap-1 p-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1.5">
              <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 ring-1 ring-teal-500/15 dark:bg-teal-500/15 dark:text-teal-300 sm:h-8 sm:w-8">
                <FlaskConical size={16} strokeWidth={2.1} />
              </div>
              <div className="min-w-0">
                <h1 className="break-words font-display text-base font-semibold leading-tight text-teal-950 dark:text-teal-50 sm:text-lg">
                  Laboratório Clínico
                </h1>
                <p className="mt-0.5 text-[11px] leading-snug text-teal-900/70 dark:text-teal-200/70 sm:text-xs">
                  Fluxo pré-analítico, analítico e pós-analítico (LIS).
                </p>
              </div>
            </div>
          </div>

          {/* Métricas — pílulas clicáveis para a respetiva lista */}
          <div className="relative flex flex-wrap gap-0.5 border-t border-border/60 bg-card/40 px-1 py-0.5">
            {metrics.map(({ label, value, href }) => (
              <Link
                key={label}
                href={href}
                className="group inline-flex items-center gap-1 rounded border border-teal-200/45 bg-white/35 px-1 py-px shadow-sm backdrop-blur-sm transition-colors hover:border-teal-300 hover:bg-white/60 dark:border-teal-700/25 dark:bg-teal-900/15 dark:hover:bg-teal-900/30"
              >
                <span className="text-[8px] font-semibold uppercase tracking-tight text-teal-700/80 dark:text-teal-300/70">
                  {label}
                </span>
                <span className="font-display text-[10px] font-bold leading-none tabular-nums text-teal-950 dark:text-teal-50">
                  {value}
                </span>
              </Link>
            ))}
          </div>

          {/* Fases */}
          <div className="relative space-y-1 border-t border-border/60 bg-card/40 px-2 py-1.5">
            {PHASES.map((phase) => {
              const tone = PHASE_TONES[phase.color];
              return (
                <div key={phase.title} className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className={`h-2 w-1 rounded-full ${tone.dot}`} />
                    <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/70">
                      {phase.title}
                    </h2>
                    <span className="text-[9px] text-muted-foreground">{phase.hint}</span>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-1">
                    {phase.items.map((item) => (
                      <CompactLabTile
                        key={`${item.href}:${item.label}`}
                        href={item.href}
                        title={item.label}
                        description={item.desc}
                        icon={item.icon}
                        tone={tone}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
