"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  FilePlus2,
  FileText,
  Loader2,
  PenLine,
  Search,
  Stethoscope,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type ImagingReport = {
  id: number;
  custom_id?: string;
  study?: number | { id?: number };
  study_label?: string;
  patient_name?: string;
  radiologist?: number | { id?: number };
  radiologist_name?: string;
  status?: string;
  version_number?: number;
  reported_at?: string;
  signed_at?: string | null;
  template_used?: string;
  technique?: string;
  findings?: string;
  impression?: string;
  recommendations?: string;
  critical_result?: boolean;
  critical_notified_at?: string | null;
  created_at?: string;
};

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  PRELIMINARY: "Preliminar",
  FINAL: "Final",
  AMENDED: "Retificado",
  CANCELLED: "Cancelado",
};

const STATUS_STYLES: Record<string, { bar: string; badge: string }> = {
  DRAFT: {
    bar: "bg-slate-500",
    badge: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800/50 dark:bg-slate-950/30 dark:text-slate-300",
  },
  PRELIMINARY: {
    bar: "bg-amber-500",
    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
  },
  FINAL: {
    bar: "bg-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  AMENDED: {
    bar: "bg-violet-500",
    badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-300",
  },
  CANCELLED: {
    bar: "bg-rose-500",
    badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
  },
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function summarize(value?: string) {
  const text = String(value || "").trim();
  if (!text) return "Sem conclusão registada.";
  return text.length > 120 ? `${text.slice(0, 119)}…` : text;
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-[112px] flex-none rounded-md border border-border/60 bg-background/45 px-2 py-1">
      <div className="mb-0.5 flex items-center gap-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        <Icon size={11} />
        {label}
      </div>
      <div className="truncate whitespace-nowrap text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}

function ReportCard({ item }: { item: ImagingReport }) {
  const status = item.status || "DRAFT";
  const style = STATUS_STYLES[status] || STATUS_STYLES.DRAFT;
  const title = item.study_label || item.custom_id || `Laudo #${item.id}`;

  return (
    <Link
      href={`/radiology/reports/${item.id}`}
      className={`${GLASS} group relative block overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${style.bar}`} />
      <div className="space-y-2 px-3 py-2 pl-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rose-500/12 text-rose-600 dark:text-rose-300">
              <FileText size={17} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-300">
                {title}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {item.patient_name || "Paciente não informado"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
              {STATUS_LABELS[status] || status}
            </span>
            {item.critical_result ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                <AlertTriangle size={10} />
                Crítico
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1">
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Versão</p>
            <p className="truncate text-xs font-bold text-foreground">v{item.version_number || 1}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Assinatura</p>
            <p className="truncate text-xs font-bold text-foreground">{item.signed_at ? "Assinado" : "Pendente"}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-1.5 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Laudado</p>
            <p className="truncate text-xs font-bold text-foreground">{formatDate(item.reported_at)}</p>
          </div>
        </div>

        <div className="space-y-1 border-t border-border/50 pt-1.5 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Stethoscope size={11} className="shrink-0" />
            <span className="truncate">{item.radiologist_name || "Radiologista não atribuído"}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <PenLine size={11} className="mt-0.5 shrink-0" />
            <span className="line-clamp-2">{summarize(item.impression)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function RadiologyReportsListPage() {
  useAuthGuard();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<ImagingReport[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await apiFetchList<ImagingReport>("/radiology/report/", {
          page: 1,
          pageSize: 500,
          clientPaginate: true,
          clientCache: safeRefreshToken === 0,
        });
        if (!mounted) return;
        setReports(response.items || []);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Falha ao carregar os laudos radiológicos.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [safeRefreshToken]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reports.filter((item) => {
      if (status !== "ALL" && item.status !== status) return false;
      if (onlyCritical && !item.critical_result) return false;
      if (!term) return true;
      return [
        item.custom_id,
        item.study_label,
        item.patient_name,
        item.radiologist_name,
        item.template_used,
        item.impression,
        item.findings,
      ].some((value) => String(value || "").toLowerCase().includes(term));
    });
  }, [onlyCritical, reports, search, status]);

  const visible = filtered.slice(0, limit);

  const criticalCount = reports.filter((item) => item.critical_result).length;
  const pendingSignature = reports.filter((item) => !item.signed_at).length;
  const finalCount = reports.filter((item) => item.status === "FINAL" || item.status === "AMENDED").length;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RADIOLOGIA]}>
      <div className="w-full space-y-1.5 px-0.5">
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-rose-500" />
          <div className="space-y-1.5 px-2.5 py-1.5 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rose-500/12 text-rose-600 dark:text-rose-300">
                  <FileText size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">Laudos radiológicos</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {loading ? "A carregar..." : `${visible.length} de ${filtered.length} laudos`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Link href="/radiology" className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
                  <ArrowLeft size={13} />
                  Voltar
                </Link>
                <Link href="/radiology/reports/new" className="inline-flex h-7 items-center gap-1 rounded-md border border-rose-400/50 bg-rose-500/15 px-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-500/20 dark:text-rose-200">
                  <FilePlus2 size={13} />
                  Novo laudo
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 xl:flex-row xl:items-center">
              <div className="flex flex-1 flex-nowrap gap-1 overflow-x-auto">
                <MetricCard icon={FileText} label="Laudos" value={reports.length} />
                <MetricCard icon={PenLine} label="Finais" value={finalCount} />
                <MetricCard icon={CalendarClock} label="Por assinar" value={pendingSignature} />
                <MetricCard icon={AlertTriangle} label="Críticos" value={criticalCount} />
              </div>
              <div className="flex min-w-0 gap-1.5 overflow-x-auto xl:w-[620px]">
                <div className="relative min-w-[200px] flex-1">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Pesquisar..."
                    className="h-7 w-full rounded-md border border-border bg-background/70 pl-8 pr-8 text-xs text-foreground outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  />
                  {search ? (
                    <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Limpar pesquisa">
                      <X size={12} />
                    </button>
                  ) : null}
                </div>
                <label className="w-16 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={limit}
                    onChange={(event) => setLimit(Math.min(500, Math.max(1, Number(event.target.value || 1))))}
                    className="h-7 w-full rounded-md border border-border bg-background/70 px-2 text-center text-xs font-semibold text-foreground outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                    aria-label="Quantidade de laudos a exibir"
                  />
                </label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="h-7 max-w-32 rounded-md border border-border bg-background/70 px-2 text-xs font-semibold text-foreground outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  aria-label="Filtrar por estado do laudo"
                >
                  <option value="ALL">Todos os estados</option>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setOnlyCritical((previous) => !previous)}
                  aria-pressed={onlyCritical}
                  className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-xs font-semibold transition ${
                    onlyCritical
                      ? "border-red-400/60 bg-red-500/15 text-red-700 dark:text-red-300"
                      : "border-border bg-background/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <AlertTriangle size={12} />
                  Críticos
                </button>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className={`${GLASS} flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground`}>
            <Loader2 size={19} className="animate-spin" />
            A carregar laudos...
          </div>
        ) : visible.length === 0 ? (
          <section className={`${GLASS} flex min-h-36 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground`}>
            <FileText size={25} className="opacity-60" />
            <span>Nenhum laudo corresponde aos filtros.</span>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-4">
            {visible.map((item) => (
              <ReportCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
