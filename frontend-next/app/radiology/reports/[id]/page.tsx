"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Edit3,
  FileCheck2,
  FileText,
  Loader2,
  Microscope,
  Stethoscope,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type Relation = number | { id?: number };

type ImagingReport = {
  id: number;
  custom_id?: string;
  study?: Relation;
  study_label?: string;
  patient_name?: string;
  radiologist?: Relation;
  radiologist_name?: string;
  status?: string;
  version_number?: number;
  reported_at?: string;
  signed_at?: string;
  template_used?: string;
  technique?: string;
  findings?: string;
  impression?: string;
  recommendations?: string;
  critical_result?: boolean;
  critical_notified_at?: string;
  report_file?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const STATUS_INFO: Record<string, { label: string; badge: string; bar: string }> = {
  DRAFT: {
    label: "Rascunho",
    badge: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800/50 dark:bg-slate-950/30 dark:text-slate-300",
    bar: "bg-slate-500",
  },
  PRELIMINARY: {
    label: "Preliminar",
    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
    bar: "bg-amber-500",
  },
  FINAL: {
    label: "Final",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
  AMENDED: {
    label: "Retificado",
    badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-300",
    bar: "bg-violet-500",
  },
  CANCELLED: {
    label: "Cancelado",
    badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
    bar: "bg-rose-500",
  },
};

function relationId(value?: Relation) {
  if (typeof value === "object" && value) return value.id ? String(value.id) : "";
  return value ? String(value) : "";
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
    <div className="min-w-0 rounded-md border border-border/60 bg-background/45 px-2 py-1">
      <div className="mb-0.5 flex items-center gap-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        <Icon size={11} />
        {label}
      </div>
      <div className="truncate whitespace-nowrap text-sm font-bold text-foreground">{value ?? "—"}</div>
    </div>
  );
}

function DetailCard({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon: React.ElementType;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${GLASS} relative overflow-hidden`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="space-y-2 px-3 py-2 pl-4">
        <div className="flex items-center gap-2 border-b border-border/50 pb-1.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground/10 text-foreground">
            <Icon size={14} />
          </span>
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function TextBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/45 px-2.5 py-2">
      <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">{value || "Não informado."}</p>
    </div>
  );
}

export default function RadiologyReportsDetailPage() {
  useAuthGuard();
  const params = useParams();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const id = String((params as { id?: string })?.id || "");
  const [report, setReport] = useState<ImagingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await apiFetch<ImagingReport>(`/radiology/report/${id}/`, {
          clientCache: safeRefreshToken === 0,
        });
        if (mounted) setReport(response);
      } catch (reason: any) {
        if (mounted) setError(reason?.message || "Falha ao carregar o laudo radiológico.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (id) load();
    return () => {
      mounted = false;
    };
  }, [id, safeRefreshToken]);

  const status = report?.status || "DRAFT";
  const statusInfo = STATUS_INFO[status] || STATUS_INFO.DRAFT;
  const title = report?.custom_id || report?.study_label || `Laudo #${id}`;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RADIOLOGIA]} fullWidth>
      <div className="w-auto space-y-1.5 px-0.5">
        <header className={`${GLASS} relative overflow-hidden`}>
          <span className={`absolute inset-y-0 left-0 w-1 ${statusInfo.bar}`} />
          <div className="space-y-1.5 px-2.5 py-1.5 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rose-500/12 text-rose-600 dark:text-rose-300">
                  <FileCheck2 size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">
                    {loading ? "Laudo radiológico..." : title}
                  </h1>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusInfo.badge}`}>
                      {statusInfo.label}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {report?.study_label || "Estudo não informado"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Link href="/radiology/reports" className="inline-flex h-7 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
                  <ArrowLeft size={13} />
                  Voltar
                </Link>
                <Link href={`/radiology/reports/${id}/edit`} className="inline-flex h-7 items-center gap-1 rounded-md border border-rose-400/50 bg-rose-500/15 px-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-500/20 dark:text-rose-200">
                  <Edit3 size={13} />
                  Editar
                </Link>
              </div>
            </div>

            {report ? (
              <div className="flex flex-nowrap gap-1 overflow-x-auto">
                <div className="min-w-[125px] flex-1"><MetricCard icon={ClipboardList} label="Estado" value={statusInfo.label} /></div>
                <div className="min-w-[125px] flex-1"><MetricCard icon={FileText} label="Versão" value={`v${report.version_number || 1}`} /></div>
                <div className="min-w-[145px] flex-1"><MetricCard icon={CalendarClock} label="Laudado em" value={formatDate(report.reported_at)} /></div>
                <div className="min-w-[145px] flex-1"><MetricCard icon={CheckCircle2} label="Assinado em" value={formatDate(report.signed_at)} /></div>
                <div className="min-w-[125px] flex-1"><MetricCard icon={AlertTriangle} label="Resultado crítico" value={report.critical_result ? "Sim" : "Não"} /></div>
              </div>
            ) : null}
          </div>
        </header>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className={`${GLASS} flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground`}>
            <Loader2 size={20} className="animate-spin" />
            A carregar laudo...
          </div>
        ) : report ? (
          <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">
            <DetailCard icon={User} title="Estudo e responsabilidade" accent="bg-sky-500">
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                <MetricCard icon={User} label="Paciente" value={report.patient_name || "Não informado"} />
                <MetricCard icon={Stethoscope} label="Radiologista" value={report.radiologist_name || "Não informado"} />
                <MetricCard
                  icon={Microscope}
                  label="Estudo"
                  value={
                    relationId(report.study) ? (
                      <Link href={`/radiology/studies/${relationId(report.study)}`} className="text-cyan-700 hover:underline dark:text-cyan-200">
                        {report.study_label || `#${relationId(report.study)}`}
                      </Link>
                    ) : "—"
                  }
                />
                <MetricCard icon={ClipboardList} label="Modelo" value={report.template_used || "Sem modelo"} />
              </div>
            </DetailCard>

            <DetailCard icon={CheckCircle2} title="Estado e assinatura" accent={statusInfo.bar}>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                <MetricCard icon={ClipboardList} label="Estado" value={statusInfo.label} />
                <MetricCard icon={FileText} label="Versão" value={`v${report.version_number || 1}`} />
                <MetricCard icon={CalendarClock} label="Laudado em" value={formatDate(report.reported_at)} />
                <MetricCard icon={CheckCircle2} label="Assinado em" value={formatDate(report.signed_at)} />
              </div>
            </DetailCard>

            <DetailCard icon={FileText} title="Conteúdo do laudo" accent="bg-rose-500">
              <div className="space-y-1">
                <TextBlock label="Técnica" value={report.technique} />
                <TextBlock label="Achados" value={report.findings} />
                <TextBlock label="Conclusão / impressão" value={report.impression} />
                <TextBlock label="Recomendações" value={report.recommendations} />
              </div>
            </DetailCard>

            <div className="space-y-1.5">
              <DetailCard icon={AlertTriangle} title="Resultado crítico" accent={report.critical_result ? "bg-red-500" : "bg-emerald-500"}>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  <MetricCard icon={AlertTriangle} label="Resultado crítico" value={report.critical_result ? "Sim" : "Não"} />
                  <MetricCard icon={CalendarClock} label="Notificado em" value={formatDate(report.critical_notified_at)} />
                </div>
              </DetailCard>

              <DetailCard icon={FileText} title="Ficheiro e observações" accent="bg-amber-500">
                <TextBlock label="Ficheiro do laudo" value={report.report_file || "Nenhum ficheiro anexado."} />
                <TextBlock label="Observações" value={report.notes} />
              </DetailCard>
            </div>
          </div>
        ) : (
          <section className={`${GLASS} flex h-40 items-center justify-center text-sm text-muted-foreground`}>
            Laudo não encontrado.
          </section>
        )}
      </div>
    </AppLayout>
  );
}
