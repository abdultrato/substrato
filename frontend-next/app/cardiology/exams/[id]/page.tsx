"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileEdit,
  FileText,
  HeartPulse,
  Loader2,
  Play,
  Stethoscope,
  User,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const REQUIRED_GROUPS = [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.CARDIOLOGIA];

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const STATUS_META: Record<string, { label: string; bar: string; chip: string; Icon: typeof ClipboardList }> = {
  REQUESTED: {
    label: "Solicitado",
    bar: "bg-slate-400",
    chip: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/50 dark:bg-slate-900/30 dark:text-slate-300",
    Icon: ClipboardList,
  },
  SCHEDULED: {
    label: "Agendado",
    bar: "bg-blue-500",
    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300",
    Icon: CalendarClock,
  },
  IN_PROGRESS: {
    label: "Em execução",
    bar: "bg-amber-500",
    chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
    Icon: Play,
  },
  PERFORMED: {
    label: "Realizado",
    bar: "bg-emerald-500",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
  REPORTING: {
    label: "Em laudo",
    bar: "bg-violet-500",
    chip: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-300",
    Icon: FileEdit,
  },
  REPORTED: {
    label: "Laudado",
    bar: "bg-cyan-500",
    chip: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800/50 dark:bg-cyan-950/30 dark:text-cyan-300",
    Icon: FileText,
  },
  VALIDATED: {
    label: "Validado",
    bar: "bg-emerald-600",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
  DELIVERED: {
    label: "Entregue",
    bar: "bg-teal-500",
    chip: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800/50 dark:bg-teal-950/30 dark:text-teal-300",
    Icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Cancelado",
    bar: "bg-rose-500",
    chip: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
    Icon: AlertTriangle,
  },
};

const PRIORITY_LABELS: Record<string, string> = {
  ROUTINE: "Rotina",
  URGENT: "Urgente",
  STAT: "Emergência",
};

const MODALITY_LABELS: Record<string, string> = {
  ECG: "ECG",
  ECHOCARDIOGRAM: "Ecocardiograma",
  EXERCISE_TEST: "Teste ergométrico",
  HOLTER: "Holter",
  AMBULATORY_BP: "MAPA",
  OTHER: "Outra",
};

type CardiologyExam = {
  id: number;
  custom_id?: string;
  patient?: number;
  patient_name?: string;
  requesting_doctor?: number | null;
  specialist?: number | null;
  specialist_name?: string;
  consultation?: number | null;
  medical_record?: number | null;
  record_label?: string;
  prescription_item?: number | null;
  protocol?: number | null;
  protocol_name?: string;
  equipment?: number | null;
  equipment_name?: string;
  order_number?: string;
  external_order_id?: string;
  specialty?: string;
  modality?: string;
  status?: string;
  priority?: string;
  clinical_indication?: string;
  requested_at?: string | null;
  scheduled_at?: string | null;
  started_at?: string | null;
  performed_at?: string | null;
  completed_at?: string | null;
  preparation_notes?: string;
  acquisition_notes?: string;
  measurements_complete?: boolean;
  report_available?: boolean;
  measurement_count?: number;
  report_count?: number;
  notes?: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type Measurement = {
  id: number;
  custom_id?: string;
  code?: string;
  name?: string;
  value_type?: string;
  numeric_value?: string | number | null;
  text_value?: string;
  unit?: string;
  reference_range?: string;
  interpretation?: string;
  abnormal?: boolean;
  critical?: boolean;
  measured_at?: string | null;
};

type Report = {
  id: number;
  custom_id?: string;
  status?: string;
  specialist_name?: string;
  reported_at?: string | null;
  signed_at?: string | null;
  critical_result?: boolean;
};

type InfoCardProps = {
  title: string;
  icon: typeof ClipboardList;
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

function textValue(value?: string | number | null) {
  const clean = String(value ?? "").trim();
  return clean || "-";
}

function modalityLabel(value?: string) {
  return MODALITY_LABELS[value || ""] || value || "Cardiologia";
}

function priorityLabel(value?: string) {
  return PRIORITY_LABELS[value || ""] || value || "-";
}

function examLabel(exam: CardiologyExam) {
  return exam.order_number || exam.custom_id || `Exame #${exam.id}`;
}

function canEdit(exam: CardiologyExam) {
  return ["REQUESTED", "SCHEDULED", "IN_PROGRESS"].includes(exam.status || "");
}

function canSchedule(exam: CardiologyExam) {
  return ["REQUESTED", "SCHEDULED"].includes(exam.status || "");
}

function canStart(exam: CardiologyExam) {
  return ["REQUESTED", "SCHEDULED", "IN_PROGRESS"].includes(exam.status || "");
}

function canFinish(exam: CardiologyExam) {
  return ["SCHEDULED", "IN_PROGRESS"].includes(exam.status || "");
}

function canCancel(exam: CardiologyExam) {
  return !["DELIVERED", "CANCELLED"].includes(exam.status || "");
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

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 text-[10px] leading-tight min-[420px]:grid-cols-[7.5rem_1fr]">
      <span className="whitespace-nowrap text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words font-medium text-foreground">{value}</span>
    </div>
  );
}

function TimelineStep({
  label,
  value,
  active,
  isLast,
}: {
  label: string;
  value?: string | null;
  active?: boolean;
  isLast?: boolean;
}) {
  return (
    <div className="flex min-w-[8.5rem] flex-1 items-center gap-1">
      <div className="min-w-0 flex-1 rounded border border-border/60 bg-background/40 px-1.5 py-0.5">
        <div className="flex items-center justify-between gap-1">
          <span className="whitespace-nowrap text-[9px] font-semibold leading-tight text-foreground">{label}</span>
          <span
            className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
              active ? "bg-emerald-500 text-white" : "bg-rose-500/10 text-rose-600 dark:text-rose-300"
            }`}
            aria-label={active ? "Concluído" : "Pendente"}
          >
            {active ? <CheckCircle2 size={10} /> : <X size={9} />}
          </span>
        </div>
        <div className="break-words text-[9px] leading-tight text-muted-foreground">{fmtDatetime(value)}</div>
      </div>
      {!isLast ? <ArrowRight size={12} className="shrink-0 text-muted-foreground" /> : null}
    </div>
  );
}

function measurementValue(measurement: Measurement) {
  const numeric = textValue(measurement.numeric_value);
  const textual = textValue(measurement.text_value);
  const value = numeric !== "-" ? numeric : textual;
  return `${value}${measurement.unit ? ` ${measurement.unit}` : ""}`;
}

export default function CardiologyExamDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [exam, setExam] = useState<CardiologyExam | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [examData, measurementData, reportData] = await Promise.all([
        apiFetch<CardiologyExam>(`/specialty_diagnostics/order/${id}/`),
        apiFetchList<Measurement>("/specialty_diagnostics/measurement/", {
          page: 1,
          pageSize: 20,
          query: { order: id },
        }),
        apiFetchList<Report>("/specialty_diagnostics/report/", {
          page: 1,
          pageSize: 10,
          query: { order: id },
        }),
      ]);
      setExam(examData);
      setMeasurements(measurementData.items);
      setReports(reportData.items);
    } catch (err: any) {
      setExam(null);
      setMeasurements([]);
      setReports([]);
      setError(err?.message || "Não foi possível carregar o exame.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const statusMeta = useMemo(() => STATUS_META[exam?.status || ""] || STATUS_META.REQUESTED, [exam?.status]);
  const StatusIcon = statusMeta.Icon;

  async function runAction(action: string, label: string, body: Record<string, unknown> = {}) {
    if (!exam) return;
    setBusy(action);
    setError(null);
    try {
      const updated = await apiFetch<CardiologyExam>(`/specialty_diagnostics/order/${exam.id}/${action}/`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setExam(updated);
      await load();
    } catch (err: any) {
      setError(err?.message || `Não foi possível ${label}.`);
    } finally {
      setBusy(null);
    }
  }

  function cancelExam() {
    const reason = window.prompt("Motivo do cancelamento:");
    if (!reason?.trim()) return;
    runAction("cancelar", "cancelar o exame", { reason });
  }

  return (
    <AppLayout requiredGroups={REQUIRED_GROUPS}>
      <div className="mx-auto w-full max-w-[97vw] space-y-1 px-0.5">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : error && !exam ? (
          <section className={`relative overflow-hidden ${GLASS}`}>
            <span className="absolute inset-y-0 left-0 w-1 bg-rose-500" />
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 pl-4">
              <AlertTriangle size={18} className="text-rose-500" />
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-bold text-foreground">Exame não encontrado</h1>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
              <Link href="/cardiology/exams/" className="inline-flex h-7 items-center gap-1 rounded border border-border px-2 text-[11px]">
                <ArrowLeft size={12} /> Voltar
              </Link>
            </div>
          </section>
        ) : exam ? (
          <>
            <section className={`relative overflow-hidden ${GLASS}`}>
              <span className={`absolute inset-y-0 left-0 w-1 ${statusMeta.bar}`} />
              <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 pl-4 xl:flex-nowrap">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/20">
                  <StatusIcon size={14} />
                </span>
                <div className="min-w-[12rem] flex-1">
                  <h1 className="break-words text-sm font-bold leading-tight text-foreground xl:truncate">
                    {exam.patient_name || examLabel(exam)}
                  </h1>
                  <p className="break-all font-mono text-[10px] leading-tight text-muted-foreground md:truncate">
                    {examLabel(exam)} · {modalityLabel(exam.modality)}
                  </p>
                </div>
                <span className={`inline-flex h-7 shrink-0 items-center rounded border px-2 text-[11px] font-semibold ${statusMeta.chip}`}>
                  {statusMeta.label}
                </span>
                <Link
                  href="/cardiology/exams/"
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-white/20 bg-white/10 px-2 text-[11px] font-medium text-muted-foreground backdrop-blur-sm transition hover:bg-white/20 hover:text-foreground"
                >
                  <ArrowLeft size={12} /> Voltar
                </Link>
                {canEdit(exam) ? (
                  <Link
                    href={`/cardiology/exams/${exam.id}/edit/`}
                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-border/60 bg-background/50 px-2 text-[11px] font-semibold text-foreground transition hover:bg-muted"
                  >
                    <FileEdit size={12} /> Editar
                  </Link>
                ) : null}
                {canSchedule(exam) ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => runAction("agendar", "agendar o exame")}
                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300"
                  >
                    {busy === "agendar" ? <Loader2 size={12} className="animate-spin" /> : <CalendarClock size={12} />}
                    Agendar
                  </button>
                ) : null}
                {canStart(exam) ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => runAction("iniciar", "iniciar o exame")}
                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300"
                  >
                    {busy === "iniciar" ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                    Iniciar
                  </button>
                ) : null}
                {canFinish(exam) ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => runAction("finalizar-execucao", "finalizar o exame")}
                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                  >
                    {busy === "finalizar-execucao" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Finalizar
                  </button>
                ) : null}
                {canCancel(exam) ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={cancelExam}
                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300"
                  >
                    {busy === "cancelar" ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                    Cancelar
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-1 border-t border-white/20 px-2 py-1 pl-4 min-[520px]:grid-cols-3 md:grid-cols-6 dark:border-white/10">
                <HeaderMetric label="Prioridade" value={priorityLabel(exam.priority)} />
                <HeaderMetric label="Solicitado" value={fmtDatetime(exam.requested_at)} />
                <HeaderMetric label="Agendado" value={fmtDatetime(exam.scheduled_at)} />
                <HeaderMetric label="Realizado" value={fmtDatetime(exam.performed_at)} />
                <HeaderMetric label="Medições" value={exam.measurement_count ?? measurements.length} />
                <HeaderMetric label="Laudos" value={exam.report_count ?? reports.length} />
              </div>
            </section>

            {error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
              <InfoCard title="Exame e paciente" icon={User} accent="bg-rose-500">
                <div className="space-y-1">
                  <Row label="Paciente" value={textValue(exam.patient_name)} />
                  <Row label="Exame" value={examLabel(exam)} />
                  <Row label="Modalidade" value={modalityLabel(exam.modality)} />
                  <Row label="Especialidade" value="Cardiologia" />
                  <Row label="Prioridade" value={priorityLabel(exam.priority)} />
                </div>
              </InfoCard>

              <InfoCard title="Execução" icon={HeartPulse} accent="bg-blue-500">
                <div className="space-y-1">
                  <Row label="Protocolo" value={textValue(exam.protocol_name || exam.protocol)} />
                  <Row
                    label="Equipamento"
                    value={
                      exam.equipment ? (
                        <Link href={`/cardiology/equipment/${exam.equipment}/`} className="text-rose-600 hover:underline dark:text-rose-300">
                          {exam.equipment_name || `Equipamento #${exam.equipment}`}
                        </Link>
                      ) : (
                        textValue(exam.equipment_name)
                      )
                    }
                  />
                  <Row label="Especialista" value={textValue(exam.specialist_name || exam.specialist)} />
                  <Row label="Medições completas" value={exam.measurements_complete ? "Sim" : "Não"} />
                  <Row label="Laudo disponível" value={exam.report_available ? "Sim" : "Não"} />
                </div>
              </InfoCard>

              <InfoCard title="Indicação clínica" icon={Stethoscope} accent="bg-amber-500">
                <p className="whitespace-pre-wrap break-words text-[11px] leading-4 text-foreground">{textValue(exam.clinical_indication)}</p>
              </InfoCard>

              <InfoCard title="Vínculos operacionais" icon={ClipboardList} accent="bg-violet-500">
                <div className="space-y-1">
                  <Row label="Consulta" value={textValue(exam.consultation)} />
                  <Row label="Prontuário" value={textValue(exam.record_label || exam.medical_record)} />
                  <Row label="Prescrição" value={textValue(exam.prescription_item)} />
                  <Row label="ID externo" value={textValue(exam.external_order_id)} />
                </div>
              </InfoCard>

              <InfoCard title="Medições" icon={HeartPulse} accent="bg-emerald-500">
                {measurements.length === 0 ? (
                  <div className="rounded border border-dashed border-border px-2 py-2 text-[11px] text-muted-foreground">Sem medições registadas.</div>
                ) : (
                  <div className="space-y-1">
                    {measurements.slice(0, 6).map((measurement) => (
                      <div key={measurement.id} className="rounded border border-border/60 bg-background/40 px-2 py-1">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="break-words text-[11px] font-semibold text-foreground">{measurement.name || measurement.code || `Medição #${measurement.id}`}</span>
                          <span className={`rounded border px-1 text-[9px] ${measurement.critical ? "border-rose-300 text-rose-600" : measurement.abnormal ? "border-amber-300 text-amber-600" : "border-border text-muted-foreground"}`}>
                            {measurement.critical ? "Crítica" : measurement.abnormal ? "Alterada" : "Normal"}
                          </span>
                        </div>
                        <div className="text-[10px] font-medium text-foreground">{measurementValue(measurement)}</div>
                        <div className="text-[9px] text-muted-foreground">{textValue(measurement.interpretation || measurement.reference_range)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </InfoCard>

              <InfoCard title="Laudos" icon={FileText} accent="bg-sky-500">
                {reports.length === 0 ? (
                  <div className="rounded border border-dashed border-border px-2 py-2 text-[11px] text-muted-foreground">Ainda sem laudo ligado a este exame.</div>
                ) : (
                  <div className="space-y-1">
                    {reports.map((report) => (
                      <Link key={report.id} href={`/cardiology/reports/${report.id}/`} className="block rounded border border-border/60 bg-background/40 px-2 py-1 transition hover:bg-muted">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="break-all font-mono text-[11px] font-semibold text-foreground">{report.custom_id || `Laudo #${report.id}`}</span>
                          <span className="rounded border border-border px-1 text-[9px] text-muted-foreground">{report.status || "-"}</span>
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                          {textValue(report.specialist_name)} · {fmtDatetime(report.reported_at || report.signed_at)}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </InfoCard>

              {(String(exam.preparation_notes || "").trim() || String(exam.acquisition_notes || "").trim() || String(exam.notes || "").trim()) ? (
                <InfoCard title="Notas" icon={FileText} accent="bg-slate-500">
                  <div className="space-y-1">
                    <Row label="Preparação" value={textValue(exam.preparation_notes)} />
                    <Row label="Execução" value={textValue(exam.acquisition_notes)} />
                    <Row label="Observações" value={textValue(exam.notes)} />
                  </div>
                </InfoCard>
              ) : null}

              <InfoCard title="Cronologia" icon={CalendarClock} accent="bg-rose-500" className="md:col-span-2">
                <div className="flex flex-wrap items-stretch gap-1">
                  {[
                    { label: "Solicitado", value: exam.requested_at, active: Boolean(exam.requested_at) },
                    { label: "Agendado", value: exam.scheduled_at, active: Boolean(exam.scheduled_at) },
                    { label: "Iniciado", value: exam.started_at, active: Boolean(exam.started_at) },
                    { label: "Realizado", value: exam.performed_at, active: Boolean(exam.performed_at) },
                    { label: "Concluído", value: exam.completed_at, active: Boolean(exam.completed_at) },
                    { label: "Atualizado", value: exam.updated_at, active: Boolean(exam.updated_at) },
                  ].map((step, index, steps) => (
                    <TimelineStep key={step.label} label={step.label} value={step.value} active={step.active} isLast={index === steps.length - 1} />
                  ))}
                </div>
              </InfoCard>
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
