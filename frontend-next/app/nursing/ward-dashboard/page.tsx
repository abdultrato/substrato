"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BedDouble,
  Clock,
  Loader2,
  Pill,
  Search,
  Users,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { useLanguage } from "@/hooks/useLanguage";
import { GROUPS } from "@/lib/rbac";

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

type DashboardSummary = {
  patients: number;
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
};

type DashboardBed = {
  admission_id: number;
  admission_code?: string;
  ward?: string;
  bed_id: number;
  bed_number?: string;
  patient_id: number;
  patient_name?: string;
  admission_date?: string | null;
  expected_discharge_date?: string | null;
  estimated_observation_hours?: number | null;
  next_medication_at?: string | null;
  next_medication_description?: string;
};

type DashboardResponse = {
  summary: DashboardSummary;
  beds: DashboardBed[];
};

function fmtDateTime(value?: string | null, isPt = true) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(isPt ? "pt-PT" : "en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function medicationUrgency(value?: string | null): "overdue" | "soon" | "later" | "none" {
  if (!value) return "none";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "none";
  const diffMs = date.getTime() - Date.now();
  if (diffMs < 0) return "overdue";
  if (diffMs <= 60 * 60 * 1000) return "soon";
  return "later";
}

function HeaderStat({
  label, value, icon: Icon, chipClass, href,
}: { label: string; value: React.ReactNode; icon: React.ElementType; chipClass: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex shrink-0 items-center gap-1 rounded-lg border border-white/30 bg-white/40 px-2 py-1 shadow-sm backdrop-blur-sm transition hover:border-emerald-400/60 hover:bg-white/60 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
    >
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${chipClass}`}>
        <Icon size={11} strokeWidth={2} />
      </span>
      <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="whitespace-nowrap text-sm font-bold leading-none text-foreground tabular-nums">{value}</span>
    </Link>
  );
}

function BedCard({ bed, isPt }: { bed: DashboardBed; isPt: boolean }) {
  const urgency = medicationUrgency(bed.next_medication_at);
  const urgencyStyle =
    urgency === "overdue"
      ? "border-red-300/60 bg-red-500/10"
      : urgency === "soon"
        ? "border-amber-300/60 bg-amber-500/10"
        : "border-white/20 bg-white/20 dark:border-white/10 dark:bg-white/[0.03]";

  return (
    <div className={`relative overflow-hidden rounded-lg border ${urgencyStyle} px-3 py-2.5 shadow-sm backdrop-blur-sm`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <BedDouble size={12} className="shrink-0 text-muted-foreground" />
            <span className="text-[11px] font-bold text-foreground">{bed.bed_number || `#${bed.bed_id}`}</span>
            {bed.admission_code ? (
              <span className="truncate text-[10px] text-muted-foreground">{bed.admission_code}</span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{bed.patient_name || `Paciente #${bed.patient_id}`}</p>
        </div>
        {urgency === "overdue" ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-red-300/50 bg-red-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-red-700 dark:text-red-400">
            <AlertTriangle size={10} /> {isPt ? "Atrasada" : "Overdue"}
          </span>
        ) : urgency === "soon" ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-amber-300/50 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400">
            <Clock size={10} /> {isPt ? "Em breve" : "Soon"}
          </span>
        ) : null}
      </div>

      <div className="mt-1.5 space-y-0.5 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock size={10} className="shrink-0" />
          <span>{isPt ? "Internado" : "Admitted"}: {fmtDateTime(bed.admission_date, isPt)}</span>
        </div>
        {bed.expected_discharge_date ? (
          <div className="flex items-center gap-1.5">
            <Activity size={10} className="shrink-0" />
            <span>{isPt ? "Alta prevista" : "Expected discharge"}: {fmtDateTime(bed.expected_discharge_date, isPt)}</span>
          </div>
        ) : null}
        {bed.next_medication_at ? (
          <div className="flex items-center gap-1.5">
            <Pill size={10} className="shrink-0" />
            <span className="truncate">
              {fmtDateTime(bed.next_medication_at, isPt)}
              {bed.next_medication_description ? ` · ${bed.next_medication_description}` : ""}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function NursingWardDashboardPage() {
  const { t, language } = useLanguage();
  const isPt = language !== "en";
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<DashboardResponse>("/nursing/ward_dashboard/", { clientCache: safeRefreshToken === 0 })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e: any) => { if (!cancelled) setError(e?.message || t("Falha ao carregar o painel.", "Failed to load the dashboard.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [safeRefreshToken, t]);

  const filteredBeds = useMemo(() => {
    const beds = data?.beds ?? [];
    const q = search.trim().toLowerCase();
    const list = q
      ? beds.filter((b) =>
          (b.patient_name || "").toLowerCase().includes(q) ||
          (b.ward || "").toLowerCase().includes(q) ||
          (b.bed_number || "").toLowerCase().includes(q) ||
          (b.admission_code || "").toLowerCase().includes(q)
        )
      : beds;
    return [...list].sort((a, b) => {
      const ua = medicationUrgency(a.next_medication_at);
      const ub = medicationUrgency(b.next_medication_at);
      const rank = { overdue: 0, soon: 1, later: 2, none: 3 } as const;
      if (rank[ua] !== rank[ub]) return rank[ua] - rank[ub];
      const ta = a.next_medication_at ? new Date(a.next_medication_at).getTime() : Infinity;
      const tb = b.next_medication_at ? new Date(b.next_medication_at).getTime() : Infinity;
      return ta - tb;
    });
  }, [data, search]);

  const wardGroups = useMemo(() => {
    const groups = new Map<string, DashboardBed[]>();
    for (const bed of filteredBeds) {
      const key = bed.ward || t("Sem enfermaria", "No ward");
      const list = groups.get(key) || [];
      list.push(bed);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredBeds, t]);

  const summary = data?.summary;
  const occupancyPct = summary && summary.total_beds > 0
    ? Math.round((summary.occupied_beds / summary.total_beds) * 100)
    : 0;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="w-full space-y-1.5 px-1">

        {/* Cabeçalho compacto: título + KPIs + pesquisa + ação */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-emerald-500" />
          <div className="flex flex-wrap items-center justify-between gap-1 px-3 py-2 pl-4">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/20">
                <BedDouble size={13} />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold leading-tight text-foreground">
                  {t("Painel da enfermaria", "Ward dashboard")}
                </h1>
                <p className="truncate text-[10px] text-muted-foreground">
                  {t("Ocupação de camas em tempo real.", "Live bed occupancy.")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <HeaderStat label={t("Internados", "Admitted")} value={summary?.patients ?? 0} icon={Users} chipClass="bg-violet-500/15 text-violet-600 dark:text-violet-400" href="/nursing/ward-admissions" />
              <HeaderStat label={t("Total", "Total")} value={summary?.total_beds ?? 0} icon={BedDouble} chipClass="bg-sky-500/15 text-sky-600 dark:text-sky-400" href="/nursing/ward-beds" />
              <HeaderStat label={t("Ocupadas", "Occupied")} value={`${summary?.occupied_beds ?? 0} (${occupancyPct}%)`} icon={Activity} chipClass="bg-amber-500/15 text-amber-600 dark:text-amber-400" href="/nursing/ward-admissions" />
              <HeaderStat label={t("Livres", "Free")} value={summary?.available_beds ?? 0} icon={BedDouble} chipClass="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" href="/nursing/ward-beds" />
            </div>

            <div className="flex items-center gap-1">
              <div className="relative">
                <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder={t("Pesquisar…", "Search…")}
                  className="w-36 rounded-lg border border-border bg-background/60 py-1.5 pl-6 pr-5 text-xs text-foreground placeholder:text-muted-foreground focus:w-52 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                  value={search} onChange={(e) => setSearch(e.target.value)} />
                {search && (
                  <button type="button" onClick={() => setSearch("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={10} />
                  </button>
                )}
              </div>
              <Link href="/nursing/ward-admissions/new"
                className="inline-flex h-8 items-center gap-1 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 px-2.5 text-xs font-semibold text-white shadow-sm shadow-emerald-500/20 transition hover:opacity-90">
                {t("Novo internamento", "New admission")}
              </Link>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <>
            {/* Grupos por enfermaria */}
            {wardGroups.length === 0 ? (
              <section className={`relative overflow-hidden ${GLASS}`}>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                    <BedDouble size={22} />
                  </span>
                  <p className="text-sm font-medium text-foreground">{t("Nenhum internamento ativo", "No active admissions")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {search ? t("Tente ajustar a pesquisa.", "Try adjusting your search.") : t("Todas as camas estão livres.", "All beds are free.")}
                  </p>
                </div>
              </section>
            ) : (
              <div className="space-y-1.5">
                {wardGroups.map(([wardName, beds]) => (
                  <section key={wardName} className={`relative overflow-hidden ${GLASS}`}>
                    <div className="flex items-center justify-between px-3 py-1.5 pl-4">
                      <h2 className="text-xs font-bold uppercase tracking-wide text-foreground">{wardName}</h2>
                      <span className="text-[10px] text-muted-foreground">
                        {beds.length} {t("cama(s) ocupada(s)", "occupied bed(s)")}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1 px-3 pb-2 sm:grid-cols-2 xl:grid-cols-3">
                      {beds.map((bed) => (
                        <BedCard key={bed.admission_id} bed={bed} isPt={isPt} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
