"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileEdit,
  FileText,
  HeartPulse,
  Loader2,
  Stethoscope,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { SubstratoTimeline } from "@/components/ui/SubstratoTimeline";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const REQUIRED_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.RECEPCAO,
  GROUPS.MEDICINA,
  GROUPS.CARDIOLOGIA,
];

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const STATUS_META: Record<string, { label: string; bar: string; chip: string; Icon: typeof FileText }> = {
  DRAFT: {
    label: "Rascunho",
    bar: "bg-slate-400",
    chip: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/50 dark:bg-slate-900/30 dark:text-slate-300",
    Icon: FileEdit,
  },
  PRELIMINARY: {
    label: "Preliminar",
    bar: "bg-amber-500",
    chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
    Icon: ClipboardList,
  },
  FINAL: {
    label: "Final",
    bar: "bg-emerald-500",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
  AMENDED: {
    label: "Retificado",
    bar: "bg-blue-500",
    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300",
    Icon: FileText,
  },
  CANCELLED: {
    label: "Cancelado",
    bar: "bg-rose-500",
    chip: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
    Icon: AlertTriangle,
  },
};

const MODALITY_LABELS: Record<string, string> = {
  ECG: "ECG",
  ECHOCARDIOGRAM: "Ecocardiograma",
  EXERCISE_TEST: "Teste ergométrico",
  HOLTER: "Holter",
  AMBULATORY_BP: "MAPA",
  OTHER: "Outra",
};

type CardiologyReport = {
  id: number;
  custom_id?: string;
  order?: number;
  order_label?: string;
  patient_name?: string;
  specialty?: string;
  modality?: string;
  specialist_name?: string;
  status?: string;
  version_number?: number;
  reported_at?: string | null;
  signed_at?: string | null;
  technique?: string;
  findings?: string;
  impression?: string;
  recommendations?: string;
  critical_result?: boolean;
  critical_notified_at?: string | null;
  notes?: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type InfoCardProps = {
  title: string;
  icon: typeof FileText;
  children: ReactNode;
  accent?: string;
  className?: string;
};

function fmtDatetime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function textValue(value?: string | null) {
  const clean = String(value || "").trim();
  return clean || "-";
}

function canEdit(report: CardiologyReport) {
  return ["DRAFT", "PRELIMINARY"].includes(report.status || "");
}

function HeaderMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded border border-border/60 border-l-2 border-l-rose-500 bg-rose-500/5 px-1.5 py-0.5">
      <div className="whitespace-nowrap text-[9px] font-medium leading-tight text-muted-foreground">{label}</div>
      <div className="break-words text-[11px] font-bold leading-tight text-foreground md:truncate">{value}</div>
    </div>
  );
}

function InfoCard({ title, icon: Icon, children, accent = "bg-rose-500", className = "" }: InfoCardProps) {
  return (
    <section className={`relative overflow-hidden ${GLASS} ${className}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="space-y-1 px-2 py-1.5 pl-4">
        <div className="flex items-center gap-1 border-b border-border/40 pb-1">
          <Icon size={12} className="shrink-0 text-rose-500" />
          <h2 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 text-[10px] leading-tight min-[420px]:grid-cols-[7.25rem_1fr]">
      <span className="whitespace-nowrap text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function CardiologyReportDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [report, setReport] = useState<CardiologyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<CardiologyReport>(`/specialty_diagnostics/report/${id}/`);
      setReport(data);
    } catch (err: any) {
      setReport(null);
      setError(err?.message || "Não foi possível carregar o laudo.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const statusMeta = useMemo(() => STATUS_META[report?.status || ""] || STATUS_META.DRAFT, [report?.status]);
  const StatusIcon = statusMeta.Icon;
  const modality = MODALITY_LABELS[report?.modality || ""] || report?.modality || "Cardiologia";

  return (
    <AppLayout requiredGroups={REQUIRED_GROUPS}>
      <div className="mx-auto w-full max-w-[97vw] space-y-1 px-0.5">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : error || !report ? (
          <section className={`relative overflow-hidden ${GLASS}`}>
            <span className="absolute inset-y-0 left-0 w-1 bg-rose-500" />
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 pl-4">
              <AlertTriangle size={20} className="text-rose-500" />
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-bold text-foreground">Laudo não encontrado</h1>
                <p className="text-xs text-muted-foreground">{error || "O registo solicitado não existe ou não está disponível."}</p>
              </div>
              <Link href="/cardiology/reports/" className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-3 text-xs">
                <ArrowLeft size={13} /> Voltar
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className={`relative overflow-hidden ${GLASS}`}>
              <span className={`absolute inset-y-0 left-0 w-1 ${statusMeta.bar}`} />
              <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 pl-4 xl:flex-nowrap">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/20">
                  <StatusIcon size={14} />
                </span>
                <div className="min-w-[12rem] flex-1">
                  <h1 className="break-words text-sm font-bold leading-tight text-foreground xl:truncate">
                    {report.patient_name || report.order_label || report.custom_id || `Laudo #${report.id}`}
                  </h1>
                  <p className="break-all font-mono text-[10px] leading-tight text-muted-foreground md:truncate">
                    {report.custom_id || `SDR-${report.id}`} · {report.order_label || `Exame #${report.order || "-"}`}
                  </p>
                </div>

                <span className={`inline-flex h-7 shrink-0 items-center rounded border px-2 text-[11px] font-semibold ${statusMeta.chip}`}>
                  {statusMeta.label}
                </span>
                <Link
                  href="/cardiology/reports/"
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-white/20 bg-white/10 px-2 text-[11px] font-medium text-muted-foreground backdrop-blur-sm transition hover:bg-white/20 hover:text-foreground"
                >
                  <ArrowLeft size={12} /> Voltar
                </Link>
                {canEdit(report) ? (
                  <Link
                    href={`/cardiology/reports/${report.id}/edit/`}
                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded bg-gradient-to-br from-rose-500 to-red-600 px-2 text-[11px] font-semibold text-white shadow-sm shadow-rose-500/20 transition hover:opacity-90"
                  >
                    <FileEdit size={12} /> Editar
                  </Link>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-1 border-t border-white/20 px-2 py-1 pl-4 min-[520px]:grid-cols-3 md:grid-cols-6 dark:border-white/10">
                <HeaderMetric label="Modalidade" value={modality} />
                <HeaderMetric label="Versão" value={`v${report.version_number || 1}`} />
                <HeaderMetric label="Laudado em" value={fmtDatetime(report.reported_at)} />
                <HeaderMetric label="Assinado em" value={fmtDatetime(report.signed_at)} />
                <HeaderMetric label="Crítico" value={report.critical_result ? "Sim" : "Não"} />
                <HeaderMetric label="Notificação" value={fmtDatetime(report.critical_notified_at)} />
              </div>
            </section>

            {report.critical_result ? (
              <section className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-800 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-200">
                <div className="flex flex-wrap items-center gap-1.5">
                  <AlertTriangle size={13} className="shrink-0" />
                  <span className="font-semibold">Resultado crítico</span>
                  <span className="break-words">
                    {report.critical_notified_at
                      ? `Notificado em ${fmtDatetime(report.critical_notified_at)}.`
                      : "Ainda sem notificação registada."}
                  </span>
                </div>
              </section>
            ) : null}

            <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
              <InfoCard title="Exame e paciente" icon={User} accent="bg-rose-500">
                <div className="space-y-1">
                  <Row label="Paciente" value={textValue(report.patient_name)} />
                  <Row
                    label="Exame"
                    value={
                      report.order ? (
                        <Link href={`/cardiology/exams/${report.order}/`} className="text-rose-600 hover:underline dark:text-rose-300">
                          {report.order_label || `Exame #${report.order}`}
                        </Link>
                      ) : (
                        textValue(report.order_label)
                      )
                    }
                  />
                  <Row label="Modalidade" value={modality} />
                  <Row label="Especialidade" value="Cardiologia" />
                </div>
              </InfoCard>

              <InfoCard title="Responsabilidade técnica" icon={Stethoscope} accent="bg-blue-500">
                <div className="space-y-1">
                  <Row label="Especialista" value={textValue(report.specialist_name)} />
                  <Row label="Estado" value={statusMeta.label} />
                  <Row label="Versão" value={`v${report.version_number || 1}`} />
                </div>
              </InfoCard>

              <InfoCard title="Técnica" icon={HeartPulse} accent="bg-amber-500">
                <p className="whitespace-pre-wrap break-words text-[11px] leading-4 text-foreground">{textValue(report.technique)}</p>
              </InfoCard>

              <InfoCard title="Achados" icon={ClipboardList} accent="bg-violet-500">
                <p className="whitespace-pre-wrap break-words text-[11px] leading-4 text-foreground">{textValue(report.findings)}</p>
              </InfoCard>

              <InfoCard title="Conclusão" icon={CheckCircle2} accent="bg-emerald-500">
                <p className="whitespace-pre-wrap break-words text-[11px] leading-4 font-medium text-foreground">{textValue(report.impression)}</p>
              </InfoCard>

              <InfoCard title="Recomendações" icon={FileText} accent="bg-sky-500">
                <p className="whitespace-pre-wrap break-words text-[11px] leading-4 text-foreground">{textValue(report.recommendations)}</p>
              </InfoCard>

              {String(report.notes || "").trim() ? (
                <InfoCard title="Observações" icon={FileText} accent="bg-slate-500">
                  <p className="whitespace-pre-wrap break-words text-[11px] leading-4 text-foreground">{textValue(report.notes)}</p>
                </InfoCard>
              ) : null}

              <SubstratoTimeline className="md:col-span-2" accentClassName="bg-rose-500" steps={[
                { label: "Criado", date: report.created_at ? fmtDatetime(report.created_at) : undefined },
                { label: "Laudado", date: report.reported_at ? fmtDatetime(report.reported_at) : undefined },
                { label: "Assinado", date: report.signed_at ? fmtDatetime(report.signed_at) : undefined },
                { label: "Crítico notificado", date: report.critical_notified_at ? fmtDatetime(report.critical_notified_at) : undefined },
                { label: "Atualizado", date: report.updated_at ? fmtDatetime(report.updated_at) : undefined },
              ]} />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
