"use client";

import { isNotFoundLikeError } from "@/lib/errors/api-error";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileText,
  HeartPulse,
  Layers,
  Microscope,
  PackageCheck,
  PackageSearch,
  Plus,
  Scissors,
  Settings,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, extractTotalCount } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS, userHasAnyGroup } from "@/lib/rbac";

const TODAY = new Date().toISOString().slice(0, 10);

function todayLabel() {
  return new Intl.DateTimeFormat("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

// ── unified module card ────────────────────────────────────────────────────
interface ModuleEntry {
  key: string;
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  bar: string; // left accent bar colour  e.g. "bg-red-500"
  iconBg: string; // icon chip bg+text       e.g. "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300"
  countKey?: string; // maps to counts state key
}

const MODULES: ModuleEntry[] = [
  {
    key: "requests",
    label: "Pedidos cirúrgicos",
    description:
      "Indicações cirúrgicas com diagnóstico, prioridade e especialidade.",
    href: "/surgery/requests",
    icon: ClipboardList,
    bar: "bg-red-500",
    iconBg: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300",
    countKey: "requests",
  },
  {
    key: "preop",
    label: "Avaliação pré-operatória",
    description:
      "Aptidão clínica e anestésica, ASA, exames obrigatórios e consentimento.",
    href: "/surgery/preoperative-assessments",
    icon: Stethoscope,
    bar: "bg-amber-500",
    iconBg:
      "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300",
    countKey: "preoperativeAssessments",
  },
  {
    key: "authorizations",
    label: "Autorizações cirúrgicas",
    description:
      "Orçamento, pagamento inicial, seguro, sala, equipa e consentimento.",
    href: "/surgery/authorizations",
    icon: ShieldCheck,
    bar: "bg-orange-500",
    iconBg:
      "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-300",
    countKey: "authorizations",
  },
  {
    key: "small-surgeries",
    label: "Pequenas cirurgias",
    description: "Listar, criar e gerir pequenas cirurgias.",
    href: "/surgery/small-surgeries",
    icon: Scissors,
    bar: "bg-blue-500",
    iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300",
    countKey: "smallSurgeries",
  },
  {
    key: "large-surgeries",
    label: "Grandes cirurgias",
    description: "Listar, criar e gerir grandes cirurgias.",
    href: "/surgery/large-surgeries",
    icon: Scissors,
    bar: "bg-violet-500",
    iconBg:
      "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300",
    countKey: "largeSurgeries",
  },
  {
    key: "surgeries",
    label: "Todas as cirurgias",
    description: "Vista consolidada com filtros por estado, tipo e data.",
    href: "/surgery/surgeries",
    icon: ClipboardList,
    bar: "bg-zinc-400",
    iconBg: "bg-zinc-50 text-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-300",
  },
  {
    key: "schedules",
    label: "Agenda cirúrgica",
    description: "Marcação por sala, prioridade, estado e horário previsto.",
    href: "/surgery/schedules",
    icon: CalendarDays,
    bar: "bg-cyan-500",
    iconBg: "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-300",
    countKey: "schedules",
  },
  {
    key: "operating-rooms",
    label: "Centro cirúrgico",
    description: "Salas, esterilização, disponibilidade e equipamentos.",
    href: "/surgery/operating-rooms",
    icon: Scissors,
    bar: "bg-emerald-500",
    iconBg:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300",
    countKey: "operatingRooms",
  },
  {
    key: "teams",
    label: "Equipa cirúrgica",
    description:
      "Cirurgião, anestesista, instrumentista, circulante e assistentes.",
    href: "/surgery/teams",
    icon: Users,
    bar: "bg-teal-500",
    iconBg: "bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-300",
  },
  {
    key: "surgical-procedures",
    label: "Procedimentos (catálogo)",
    description: "Gerir catálogo de procedimentos cirúrgicos.",
    href: "/surgery/surgical-procedures",
    icon: Settings,
    bar: "bg-slate-500",
    iconBg:
      "bg-slate-50 text-slate-600 dark:bg-slate-800/40 dark:text-slate-300",
    countKey: "procedures",
  },
  {
    key: "procedure-items",
    label: "Procedimentos realizados",
    description:
      "Procedimentos efetivos por cirurgia, lateralidade, ordem e cirurgião.",
    href: "/surgery/procedure-items",
    icon: ClipboardCheck,
    bar: "bg-sky-500",
    iconBg: "bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-300",
  },
  {
    key: "anesthesia",
    label: "Anestesia",
    description: "Tipo, ASA, fármacos, fluidos, via aérea e complicações.",
    href: "/surgery/anesthesia",
    icon: HeartPulse,
    bar: "bg-rose-500",
    iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300",
  },
  {
    key: "safety-checklists",
    label: "Checklist de segurança",
    description: "Sign-in, time-out, sign-out e confirmação de segurança.",
    href: "/surgery/safety-checklists",
    icon: ClipboardCheck,
    bar: "bg-green-500",
    iconBg:
      "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300",
  },
  {
    key: "materials",
    label: "Materiais",
    description: "Catálogo de materiais cirúrgicos, implantes e consumíveis.",
    href: "/surgery/materials",
    icon: PackageSearch,
    bar: "bg-yellow-500",
    iconBg:
      "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300",
  },
  {
    key: "consumptions",
    label: "Consumos",
    description: "Materiais e produtos consumidos por cirurgia.",
    href: "/surgery/consumptions",
    icon: PackageCheck,
    bar: "bg-lime-500",
    iconBg: "bg-lime-50 text-lime-600 dark:bg-lime-900/20 dark:text-lime-300",
  },
  {
    key: "billing",
    label: "Faturação cirúrgica",
    description:
      "Itens faturáveis por sala, equipa, procedimento, anestesia e consumos.",
    href: "/surgery/billing",
    icon: CreditCard,
    bar: "bg-teal-500",
    iconBg: "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300",
    countKey: "billingItems",
  },
  {
    key: "specimens",
    label: "Amostras cirúrgicas",
    description: "Amostras coletadas e ligação ao pedido de patologia.",
    href: "/surgery/specimens",
    icon: Microscope,
    bar: "bg-pink-500",
    iconBg: "bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-300",
    countKey: "specimens",
  },
  {
    key: "recovery",
    label: "Recuperação",
    description: "Sala de recuperação, dor, Aldrete, sinais vitais e alta.",
    href: "/surgery/recovery",
    icon: HeartPulse,
    bar: "bg-fuchsia-500",
    iconBg:
      "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-900/20 dark:text-fuchsia-300",
  },
  {
    key: "operative-reports",
    label: "Relatório operatório",
    description: "Achados, técnica, complicações e amostras para patologia.",
    href: "/surgery/operative-reports",
    icon: FileText,
    bar: "bg-purple-500",
    iconBg:
      "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300",
    countKey: "operativeReports",
  },
  {
    key: "documents",
    label: "Documentos cirúrgicos",
    description:
      "Consentimentos, orçamentos, autorizações, relatórios e anexos.",
    href: "/surgery/documents",
    icon: FileText,
    bar: "bg-stone-500",
    iconBg:
      "bg-stone-50 text-stone-600 dark:bg-stone-800/40 dark:text-stone-300",
  },
  {
    key: "audit-events",
    label: "Auditoria cirúrgica",
    description:
      "Rastreabilidade de estados, sala, equipa, materiais e faturação.",
    href: "/surgery/audit-events",
    icon: Activity,
    bar: "bg-neutral-500",
    iconBg:
      "bg-neutral-50 text-neutral-600 dark:bg-neutral-800/40 dark:text-neutral-300",
  },
];

type Counts = Record<string, number>;

function ModuleCard({
  mod,
  counts,
  loading,
}: {
  mod: ModuleEntry;
  counts: Counts;
  loading: boolean;
}) {
  const Icon = mod.icon;
  const hasCount = !!mod.countKey;
  const count = hasCount ? (counts[mod.countKey!] ?? 0) : null;

  return (
    <Link href={mod.href} className="group block">
      <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-white/30 bg-white/30 shadow-sm backdrop-blur-sm transition-all hover:border-white/50 hover:bg-white/45 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:bg-white/[0.07]">
        {/* coloured left bar */}
        <span
          className={`absolute left-0 top-0 h-full w-1 ${mod.bar} opacity-70 transition-opacity group-hover:opacity-100`}
        />

        <div className="flex flex-1 flex-col gap-2 px-3 py-2.5 pl-4">
          {/* top: icon + count */}
          <div className="flex items-start justify-between gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${mod.iconBg}`}
            >
              <Icon size={14} strokeWidth={2} />
            </span>
            {hasCount && (
              <span className="font-display text-xl font-bold tabular-nums leading-none text-foreground">
                {loading ? (
                  <span className="inline-block h-5 w-6 animate-pulse rounded bg-foreground/10" />
                ) : (
                  count
                )}
              </span>
            )}
          </div>

          {/* label + description */}
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold leading-snug text-foreground">
              {mod.label}
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
              {mod.description}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function SurgeryPage() {
  const { user } = useAuth();
  const canViewAdmin = userHasAnyGroup(user, [GROUPS.ADMIN]);
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [counts, setCounts] = useState<Counts>({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setErrorMessage(null);
        const [
          reqs,
          assessments,
          small,
          large,
          procs,
          agenda,
          rooms,
          auths,
          billing,
          samples,
          reports,
        ] = await Promise.all([
          apiFetch<any>("/surgery/pedido_cirurgico/", {
            clientCache: safeRefreshToken === 0,
          }),
          apiFetch<any>("/surgery/avaliacao_pre_operatoria/", {
            clientCache: safeRefreshToken === 0,
          }),
          apiFetch<any>("/surgery/small_surgery/", {
            clientCache: safeRefreshToken === 0,
          }),
          apiFetch<any>("/surgery/large_surgery/", {
            clientCache: safeRefreshToken === 0,
          }),
          apiFetch<any>("/surgery/surgical_procedure/", {
            clientCache: safeRefreshToken === 0,
          }),
          apiFetch<any>("/surgery/agenda_cirurgica/", {
            clientCache: safeRefreshToken === 0,
          }),
          apiFetch<any>("/surgery/centro_cirurgico/", {
            clientCache: safeRefreshToken === 0,
          }),
          apiFetch<any>("/surgery/autorizacoes/", {
            clientCache: safeRefreshToken === 0,
          }),
          apiFetch<any>("/surgery/faturacao/", {
            clientCache: safeRefreshToken === 0,
          }),
          apiFetch<any>("/surgery/amostras/", {
            clientCache: safeRefreshToken === 0,
          }),
          apiFetch<any>("/surgery/relatorio_operatorio/", {
            clientCache: safeRefreshToken === 0,
          }),
        ]);
        if (!mounted) return;
        setCounts({
          requests: extractTotalCount(reqs),
          preoperativeAssessments: extractTotalCount(assessments),
          smallSurgeries: extractTotalCount(small),
          largeSurgeries: extractTotalCount(large),
          procedures: extractTotalCount(procs),
          schedules: extractTotalCount(agenda),
          operatingRooms: extractTotalCount(rooms),
          authorizations: extractTotalCount(auths),
          billingItems: extractTotalCount(billing),
          specimens: extractTotalCount(samples),
          operativeReports: extractTotalCount(reports),
        });
      } catch (e: any) {
        if (!mounted) return;
        setErrorMessage(
          isNotFoundLikeError(e) ? null : e?.message || "Falha ao carregar.",
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

  return (
    <AppLayout
      requiredGroups={[
        GROUPS.ADMIN,
        GROUPS.RECEPCAO,
        GROUPS.MEDICINA,
        GROUPS.MEDICINA_OCUPACIONAL,
      ]}
    >
      <div className="space-y-3">
        {/* ── HERO HEADER ─────────────────────────────────────────── */}
        <header className="relative overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-br from-slate-50/80 via-white/60 to-slate-100/50 shadow-sm backdrop-blur-md dark:border-white/10 dark:from-slate-900/60 dark:via-slate-800/40 dark:to-slate-900/60">
          <span
            className="pointer-events-none absolute -right-6 -top-6 select-none text-[120px] leading-none opacity-[0.04] dark:opacity-[0.06]"
            aria-hidden
          >
            ✂
          </span>

          <div className="relative px-5 pt-4 pb-4">
            {/* breadcrumb */}
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Layers size={9} className="shrink-0" />
              <span>Módulos clínicos</span>
              <span>/</span>
              <span className="font-semibold text-foreground">Cirurgia</span>
            </div>

            {/* title row */}
            <div className="mt-1.5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/10 dark:bg-white/10">
                    <Scissors
                      size={18}
                      className="text-slate-700 dark:text-slate-200"
                      strokeWidth={1.8}
                    />
                  </span>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                    Cirurgia
                  </h1>
                </div>
                <p className="mt-1 max-w-xl text-[11px] text-muted-foreground">
                  Pedido → avaliação → autorização → agenda → sala → equipa →
                  checklist → anestesia → recuperação → relatório → faturação
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <CalendarDays size={12} className="shrink-0" />
                  <span className="capitalize">{todayLabel()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link
                    href="/surgery/schedules"
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-card/70 px-2.5 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <CalendarDays size={11} /> Agenda
                  </Link>
                  <Link
                    href={`/surgery/surgeries/?scheduled_date=${TODAY}`}
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-300 bg-white/70 px-2.5 text-[11px] text-slate-600 shadow-sm transition hover:bg-white/90 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
                  >
                    Hoje <ArrowRight size={11} />
                  </Link>
                  <Link
                    href="/surgery/large-surgeries/new"
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-slate-800 px-3 text-[11px] font-semibold text-white transition hover:bg-slate-700 dark:bg-white/15 dark:hover:bg-white/20"
                  >
                    <Plus size={11} /> Nova cirurgia
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </header>
        {/* ── /HERO HEADER ────────────────────────────────────────── */}

        {errorMessage && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            {errorMessage}
          </div>
        )}

        {/* ── UNIFIED MODULE GRID ──────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-2 xl:grid-cols-5">
          {MODULES.map((mod) => (
            <ModuleCard
              key={mod.key}
              mod={mod}
              counts={counts}
              loading={loading}
            />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
