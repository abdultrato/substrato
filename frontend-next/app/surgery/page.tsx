"use client";

import { isNotFoundLikeError } from "@/lib/errors/api-error";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileText,
  HeartPulse,
  Microscope,
  PackageCheck,
  PackageSearch,
  Plus,
  Scissors,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, extractTotalCount } from "@/lib/api";
import useDebounce from "@/hooks/useDebounce";
import { useAuth } from "@/hooks/useAuth";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { formatCount } from "@/lib/i18n/plural";
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
    key: "add-surgery",
    label: "Adicionar cirurgia",
    description:
      "Criar uma cirurgia com paciente, equipa, sala, procedimentos, data e faturação.",
    href: "/surgery/surgeries/new",
    icon: Plus,
    bar: "bg-rose-500",
    iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300",
  },
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
      <div
        className="relative flex h-full flex-col gap-1.5 overflow-hidden rounded-xl border border-white/20 bg-white/25 p-2 pl-2.5 shadow-sm backdrop-blur-sm transition hover:border-[var(--primary-300)] hover:bg-white/40 dark:border-white/10 dark:bg-white/5 dark:hover:border-[var(--primary-600)] dark:hover:bg-white/[0.08]"
      >
        <span className={`absolute inset-y-0 left-0 w-1 ${mod.bar}`} />
        {/* top: icon + count */}
        <div className="flex items-start justify-between gap-2">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${mod.iconBg}`}
          >
            <Icon size={12} strokeWidth={2} />
          </span>
          {hasCount && (
            <span className="font-display text-lg font-bold tabular-nums leading-none text-foreground">
              {loading ? (
                <span className="inline-block h-4 w-5 animate-pulse rounded bg-foreground/10" />
              ) : (
                count
              )}
            </span>
          )}
        </div>

        {/* label + description */}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold leading-snug text-foreground">
            {mod.label}
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
            {mod.description}
          </p>
        </div>
      </div>
    </Link>
  );
}

function StatPill({
  label,
  value,
  loading,
  icon: Icon,
  cls,
  href,
}: {
  label: string;
  value: number;
  loading: boolean;
  icon: React.ElementType;
  cls: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <span
        className={`inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[10px] font-semibold backdrop-blur-xl transition hover:brightness-110 md:h-5 md:px-1.5 lg:h-6 lg:px-2 ${cls}`}
      >
        <Icon size={11} />
        {label}
        <strong className="text-[11px] tabular-nums">
          {loading ? "…" : value}
        </strong>
      </span>
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
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim().toLowerCase(), 200);

  const visibleModules = useMemo(() => {
    if (!debouncedSearch) return MODULES;
    return MODULES.filter((mod) =>
      `${mod.label} ${mod.description}`.toLowerCase().includes(debouncedSearch),
    );
  }, [debouncedSearch]);

  const totalSurgeries =
    (counts.smallSurgeries ?? 0) + (counts.largeSurgeries ?? 0);

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
      requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}
    >
      <div className="space-y-1.5">
        {/* Cabeçalho fundido: banner + pílulas + pesquisa + acções num só bloco translúcido */}
        <section className="relative overflow-hidden rounded-2xl border border-rose-200/25 bg-gradient-to-br from-rose-100/[0.05] via-white/[0.015] to-red-100/[0.03] shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-rose-800/20 dark:from-rose-950/[0.05] dark:via-white/[0.01] dark:to-red-950/[0.03]">
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-rose-400/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-2.5 px-3 py-2 md:flex-nowrap md:gap-1.5 md:px-2 md:py-1 lg:gap-2.5 lg:px-3 lg:py-2">
            <div className="flex min-w-0 items-center gap-3 md:shrink-0 md:gap-1.5 lg:gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/25 md:h-7 md:w-7 lg:h-8 lg:w-8">
                <Scissors size={15} />
              </span>
              <div className="min-w-0">
                <h1 className="text-base font-bold leading-tight text-foreground">
                  Cirurgia
                </h1>
                <p className="text-[10px] text-muted-foreground md:hidden lg:block">
                  {loading
                    ? "A carregar…"
                    : formatCount(totalSurgeries, {
                        one: "cirurgia registada",
                        other: "cirurgias registadas",
                      })}
                  <span className="capitalize"> · {todayLabel()}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 md:min-w-0 md:flex-1 md:flex-nowrap md:gap-1 lg:gap-1.5">
              <StatPill
                label="Pedidos"
                value={counts.requests ?? 0}
                loading={loading}
                icon={ClipboardList}
                cls="border-red-200/50 bg-red-100/30 text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300"
                href="/surgery/requests"
              />
              <StatPill
                label="Pré-op"
                value={counts.preoperativeAssessments ?? 0}
                loading={loading}
                icon={Stethoscope}
                cls="border-amber-200/50 bg-amber-100/30 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300"
                href="/surgery/preoperative-assessments"
              />
              <StatPill
                label="Pequenas"
                value={counts.smallSurgeries ?? 0}
                loading={loading}
                icon={Scissors}
                cls="border-blue-200/50 bg-blue-100/30 text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300"
                href="/surgery/small-surgeries"
              />
              <StatPill
                label="Grandes"
                value={counts.largeSurgeries ?? 0}
                loading={loading}
                icon={Scissors}
                cls="border-violet-200/50 bg-violet-100/30 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300"
                href="/surgery/large-surgeries"
              />
              <StatPill
                label="Agenda"
                value={counts.schedules ?? 0}
                loading={loading}
                icon={CalendarDays}
                cls="border-cyan-200/50 bg-cyan-100/30 text-cyan-700 dark:border-cyan-700/30 dark:bg-cyan-900/20 dark:text-cyan-300"
                href="/surgery/schedules"
              />
              <StatPill
                label="Salas"
                value={counts.operatingRooms ?? 0}
                loading={loading}
                icon={Settings}
                cls="border-emerald-200/50 bg-emerald-100/30 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
                href="/surgery/operating-rooms"
              />
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-1.5 md:shrink-0 md:flex-nowrap md:gap-1 lg:gap-1.5">
              <Link
                href={`/surgery/surgeries/?scheduled_date=${TODAY}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/25 bg-white/[0.05] px-2.5 text-xs font-medium text-foreground backdrop-blur-xl transition hover:bg-white/20 md:h-7 md:px-2 lg:h-8 lg:px-2.5 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.08]"
              >
                Hoje <ArrowRight size={12} />
              </Link>
              <Link
                href="/surgery/surgeries/new"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 px-2.5 text-xs font-semibold text-white shadow-sm transition hover:from-rose-700 hover:to-red-700 md:h-7 md:px-2 lg:h-8 lg:px-2.5"
              >
                <Plus size={12} /> Nova cirurgia
              </Link>
            </div>
          </div>

          <div className="relative flex flex-wrap items-center gap-1.5 border-t border-white/15 px-3 py-1.5 dark:border-white/[0.06]">
            <div className="relative w-full sm:w-64">
              <Search
                size={12}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filtrar módulos cirúrgicos…"
                className="w-full rounded-lg border border-white/25 bg-white/[0.05] py-1.5 pl-7 pr-3 text-xs text-foreground placeholder:text-muted-foreground backdrop-blur-xl transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/40 sm:focus:w-80 dark:border-white/10 dark:bg-white/[0.03]"
              />
            </div>
            {debouncedSearch ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground-2">
                {visibleModules.length}/{MODULES.length}
              </span>
            ) : null}
          </div>
        </section>

        {errorMessage && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            {errorMessage}
          </div>
        )}

        {visibleModules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
            Nenhum módulo corresponde à pesquisa.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visibleModules.map((mod) => (
              <ModuleCard
                key={mod.key}
                mod={mod}
                counts={counts}
                loading={loading}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
