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
  FileEdit,
  HeartPulse,
  Loader2,
  Ruler,
  Stethoscope,
  User,
  Waves,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const REQUIRED_GROUPS = [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.CARDIOLOGIA];

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const VALUE_TYPE_LABELS: Record<string, string> = {
  NUMERIC: "Numérico",
  TEXT: "Texto",
  BOOLEAN: "Booleano",
  WAVEFORM: "Traçado",
  IMAGE: "Imagem",
};

const MODALITY_LABELS: Record<string, string> = {
  ECG: "ECG",
  ECHOCARDIOGRAM: "Ecocardiograma",
  EXERCISE_TEST: "Teste ergométrico",
  HOLTER: "Holter",
  AMBULATORY_BP: "MAPA",
  OTHER: "Outra",
};

type Measurement = {
  id: number;
  custom_id?: string;
  order?: number;
  order_label?: string;
  patient_name?: string;
  specialty?: string;
  modality?: string;
  position?: number;
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
  notes?: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type CardProps = {
  title: string;
  icon: typeof Waves;
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

function valueTypeLabel(value?: string) {
  return VALUE_TYPE_LABELS[value || ""] || value || "-";
}

function measurementTitle(item: Measurement) {
  return item.name || item.code || item.custom_id || `Medição #${item.id}`;
}

function measurementValue(item: Measurement) {
  const numeric = textValue(item.numeric_value);
  const textual = textValue(item.text_value);
  const value = numeric !== "-" ? numeric : textual;
  return `${value}${item.unit ? ` ${item.unit}` : ""}`;
}

function stateMeta(item?: Measurement | null) {
  if (item?.critical) {
    return {
      label: "Crítica",
      bar: "bg-rose-500",
      chip: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
      Icon: AlertTriangle,
    };
  }
  if (item?.abnormal) {
    return {
      label: "Alterada",
      bar: "bg-amber-500",
      chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
      Icon: AlertTriangle,
    };
  }
  return {
    label: "Normal",
    bar: "bg-emerald-500",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    Icon: CheckCircle2,
  };
}

function HeaderMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded border border-border/60 border-l-2 border-l-rose-500 bg-rose-500/5 px-1.5 py-0.5">
      <div className="whitespace-nowrap text-[9px] font-medium leading-tight text-muted-foreground">{label}</div>
      <div className="break-words text-[11px] font-bold leading-tight text-foreground md:truncate">{value}</div>
    </div>
  );
}

function Card({ title, icon: Icon, children, accent = "bg-rose-500", className = "" }: CardProps) {
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

export default function CardiologyMeasurementDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Measurement>(`/specialty_diagnostics/measurement/${id}/`);
      setMeasurement(data);
    } catch (err: any) {
      setMeasurement(null);
      setError(err?.message || "Não foi possível carregar a medição.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const meta = useMemo(() => stateMeta(measurement), [measurement]);
  const StatusIcon = meta.Icon;

  return (
    <AppLayout requiredGroups={REQUIRED_GROUPS}>
      <div className="mx-auto w-full max-w-[97vw] space-y-1 px-0.5">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : error && !measurement ? (
          <section className={`relative overflow-hidden ${GLASS}`}>
            <span className="absolute inset-y-0 left-0 w-1 bg-rose-500" />
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 pl-4">
              <AlertTriangle size={18} className="text-rose-500" />
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-bold text-foreground">Medição não encontrada</h1>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
              <Link href="/cardiology/measurements/" className="inline-flex h-7 items-center gap-1 rounded border border-border px-2 text-[11px]">
                <ArrowLeft size={12} /> Voltar
              </Link>
            </div>
          </section>
        ) : measurement ? (
          <>
            <section className={`relative overflow-hidden ${GLASS}`}>
              <span className={`absolute inset-y-0 left-0 w-1 ${meta.bar}`} />
              <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 pl-4 xl:flex-nowrap">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/20">
                  <StatusIcon size={14} />
                </span>
                <div className="min-w-[12rem] flex-1">
                  <h1 className="break-words text-sm font-bold leading-tight text-foreground xl:truncate">
                    {measurementTitle(measurement)}
                  </h1>
                  <p className="break-all font-mono text-[10px] leading-tight text-muted-foreground md:truncate">
                    {measurement.custom_id || `SDM-${measurement.id}`} · {measurement.order_label || `Exame #${measurement.order || "-"}`}
                  </p>
                </div>
                <span className={`inline-flex h-7 shrink-0 items-center rounded border px-2 text-[11px] font-semibold ${meta.chip}`}>
                  {meta.label}
                </span>
                <Link
                  href="/cardiology/measurements/"
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-white/20 bg-white/10 px-2 text-[11px] font-medium text-muted-foreground backdrop-blur-sm transition hover:bg-white/20 hover:text-foreground"
                >
                  <ArrowLeft size={12} /> Voltar
                </Link>
                <Link
                  href={`/cardiology/measurements/${measurement.id}/edit/`}
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded bg-gradient-to-br from-rose-500 to-red-600 px-2 text-[11px] font-semibold text-white shadow-sm shadow-rose-500/20 transition hover:opacity-90"
                >
                  <FileEdit size={12} /> Editar
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-1 border-t border-white/20 px-2 py-1 pl-4 min-[520px]:grid-cols-3 md:grid-cols-6 dark:border-white/10">
                <HeaderMetric label="Paciente" value={textValue(measurement.patient_name)} />
                <HeaderMetric label="Modalidade" value={modalityLabel(measurement.modality)} />
                <HeaderMetric label="Valor" value={measurementValue(measurement)} />
                <HeaderMetric label="Tipo" value={valueTypeLabel(measurement.value_type)} />
                <HeaderMetric label="Medido em" value={fmtDatetime(measurement.measured_at)} />
                <HeaderMetric label="Estado" value={meta.label} />
              </div>
            </section>

            <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
              <Card title="Valor e referência" icon={Ruler} accent={measurement.critical ? "bg-rose-500" : measurement.abnormal ? "bg-amber-500" : "bg-emerald-500"}>
                <div className="rounded border border-border/60 bg-background/40 px-2 py-2">
                  <div className="text-[10px] text-muted-foreground">Valor medido</div>
                  <div className="break-words text-xl font-bold leading-tight text-foreground">{measurementValue(measurement)}</div>
                  <div className="break-words text-[10px] text-muted-foreground">{textValue(measurement.reference_range)}</div>
                </div>
                <div className="mt-1 space-y-1">
                  <Row label="Tipo de valor" value={valueTypeLabel(measurement.value_type)} />
                  <Row label="Código" value={textValue(measurement.code)} />
                  <Row label="Posição" value={textValue(measurement.position)} />
                </div>
              </Card>

              <Card title="Exame e paciente" icon={User} accent="bg-blue-500">
                <div className="space-y-1">
                  <Row label="Paciente" value={textValue(measurement.patient_name)} />
                  <Row
                    label="Exame"
                    value={
                      measurement.order ? (
                        <Link href={`/cardiology/exams/${measurement.order}/`} className="text-rose-600 hover:underline dark:text-rose-300">
                          {measurement.order_label || `Exame #${measurement.order}`}
                        </Link>
                      ) : (
                        textValue(measurement.order_label)
                      )
                    }
                  />
                  <Row label="Modalidade" value={modalityLabel(measurement.modality)} />
                  <Row label="Especialidade" value="Cardiologia" />
                </div>
              </Card>

              <Card title="Interpretação" icon={Stethoscope} accent="bg-violet-500">
                <p className="whitespace-pre-wrap break-words text-[11px] leading-4 text-foreground">{textValue(measurement.interpretation)}</p>
              </Card>

              <Card title="Estado clínico" icon={HeartPulse} accent={measurement.critical ? "bg-rose-500" : measurement.abnormal ? "bg-amber-500" : "bg-emerald-500"}>
                <div className="space-y-1">
                  <Row label="Normalidade" value={meta.label} />
                  <Row label="Alterada" value={measurement.abnormal ? "Sim" : "Não"} />
                  <Row label="Crítica" value={measurement.critical ? "Sim" : "Não"} />
                  <Row label="Medido em" value={fmtDatetime(measurement.measured_at)} />
                </div>
              </Card>

              {String(measurement.notes || "").trim() ? (
                <Card title="Observações" icon={Stethoscope} accent="bg-slate-500" className="md:col-span-2">
                  <p className="whitespace-pre-wrap break-words text-[11px] leading-4 text-foreground">{measurement.notes}</p>
                </Card>
              ) : null}

              <Card title="Cronologia" icon={CalendarClock} accent="bg-rose-500" className="md:col-span-2">
                <div className="flex flex-wrap items-stretch gap-1">
                  {[
                    { label: "Criada", value: measurement.created_at, active: Boolean(measurement.created_at) },
                    { label: "Medida", value: measurement.measured_at, active: Boolean(measurement.measured_at) },
                    { label: "Atualizada", value: measurement.updated_at, active: Boolean(measurement.updated_at) },
                  ].map((step, index, steps) => (
                    <TimelineStep key={step.label} label={step.label} value={step.value} active={step.active} isLast={index === steps.length - 1} />
                  ))}
                </div>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
