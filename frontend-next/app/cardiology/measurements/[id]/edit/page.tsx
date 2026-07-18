"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  HeartPulse,
  Loader2,
  Ruler,
  Save,
  Stethoscope,
  User,
  Waves,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { GROUPS, userHasAnyGroup } from "@/lib/rbac";

const REQUIRED_GROUPS = [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.CARDIOLOGIA];

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const inputClass =
  "h-8 w-full rounded-md border border-border bg-background/60 px-2 text-xs text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-rose-500/40";

const textareaClass =
  "min-h-20 w-full resize-y rounded-md border border-border bg-background/60 px-2 py-1.5 text-xs leading-5 text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-rose-500/40";

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
};

type FieldProps = {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
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

function toLocalDatetime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toApiDatetime(value: string) {
  return value ? new Date(value).toISOString() : null;
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

function stateMeta(critical: boolean, abnormal: boolean) {
  if (critical) {
    return {
      label: "Crítica",
      bar: "bg-rose-500",
      chip: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
      Icon: AlertTriangle,
    };
  }
  if (abnormal) {
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

function Card({
  title,
  icon: Icon,
  children,
  accent = "bg-rose-500",
  className = "",
}: {
  title: string;
  icon: typeof Waves;
  children: ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <section className={`relative overflow-visible ${GLASS} ${className}`}>
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

function Field({ label, children, hint, error }: FieldProps) {
  return (
    <label className="block space-y-0.5">
      <span className="whitespace-nowrap text-[10px] font-semibold text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="block text-[9px] text-muted-foreground">{hint}</span> : null}
      {error ? <span className="block text-[9px] font-medium text-rose-600 dark:text-rose-300">{error}</span> : null}
    </label>
  );
}

function InlineCheck({
  checked,
  onChange,
  label,
  tone,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  tone: "amber" | "rose";
}) {
  const active =
    tone === "rose"
      ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300"
      : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300";
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex h-8 min-w-0 items-center gap-1 rounded-md border px-2 text-xs font-semibold transition ${
        checked ? active : "border-border bg-background/60 text-muted-foreground hover:bg-muted"
      }`}
    >
      {checked ? <CheckCircle2 size={13} /> : <span className="h-3 w-3 rounded-full border border-current" />}
      {label}
    </button>
  );
}

export default function CardiologyMeasurementEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { user } = useAuth();
  const isAdmin = userHasAnyGroup(user, [GROUPS.ADMIN]);

  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [valueType, setValueType] = useState("NUMERIC");
  const [numericValue, setNumericValue] = useState("");
  const [textValueState, setTextValueState] = useState("");
  const [unit, setUnit] = useState("");
  const [referenceRange, setReferenceRange] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [abnormal, setAbnormal] = useState(false);
  const [critical, setCritical] = useState(false);
  const [measuredAt, setMeasuredAt] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Measurement>(`/specialty_diagnostics/measurement/${id}/`);
      setMeasurement(data);
      setName(data.name || "");
      setCode(data.code || "");
      setValueType(data.value_type || "NUMERIC");
      setNumericValue(data.numeric_value === null || data.numeric_value === undefined ? "" : String(data.numeric_value));
      setTextValueState(data.text_value || "");
      setUnit(data.unit || "");
      setReferenceRange(data.reference_range || "");
      setInterpretation(data.interpretation || "");
      setAbnormal(Boolean(data.abnormal));
      setCritical(Boolean(data.critical));
      setMeasuredAt(toLocalDatetime(data.measured_at));
      setNotes(data.notes || "");
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

  const meta = useMemo(() => stateMeta(critical, abnormal), [abnormal, critical]);
  const StatusIcon = meta.Icon;

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim() && !code.trim()) next.name = "Informe nome ou código da medição.";
    if (valueType === "NUMERIC" && numericValue.trim() === "") next.numericValue = "Informe o valor numérico.";
    if (valueType !== "NUMERIC" && textValueState.trim() === "") next.textValue = "Informe o valor textual.";
    if (!measuredAt) next.measuredAt = "Informe a data/hora da medição.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!measurement || !validate()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim() || code.trim(),
        value_type: valueType,
        numeric_value: valueType === "NUMERIC" ? numericValue : null,
        text_value: valueType === "NUMERIC" ? "" : textValueState.trim(),
        unit: isAdmin ? unit.trim() : measurement.unit || "",
        reference_range: isAdmin ? referenceRange.trim() : measurement.reference_range || "",
        interpretation: interpretation.trim(),
        abnormal,
        critical,
        measured_at: toApiDatetime(measuredAt),
        notes: notes.trim(),
      };
      const updated = await apiFetch<Measurement>(`/specialty_diagnostics/measurement/${measurement.id}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      router.push(`/cardiology/measurements/${updated.id}/`);
    } catch (err: any) {
      setError(err?.message || "Não foi possível guardar a medição.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={REQUIRED_GROUPS}>
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[97vw] space-y-1 px-0.5">
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
                  <h1 className="break-words text-sm font-bold leading-tight text-foreground xl:truncate">Editar medição</h1>
                  <p className="break-all font-mono text-[10px] leading-tight text-muted-foreground md:truncate">
                    {measurement.custom_id || `SDM-${measurement.id}`} · {measurementTitle(measurement)}
                  </p>
                </div>
                <span className={`inline-flex h-7 shrink-0 items-center rounded border px-2 text-[11px] font-semibold ${meta.chip}`}>
                  {meta.label}
                </span>
                <Link
                  href={`/cardiology/measurements/${measurement.id}/`}
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-white/20 bg-white/10 px-2 text-[11px] font-medium text-muted-foreground backdrop-blur-sm transition hover:bg-white/20 hover:text-foreground"
                >
                  <ArrowLeft size={12} /> Voltar
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded bg-gradient-to-br from-rose-500 to-red-600 px-2 text-[11px] font-semibold text-white shadow-sm shadow-rose-500/20 transition hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Guardar
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1 border-t border-white/20 px-2 py-1 pl-4 min-[520px]:grid-cols-3 md:grid-cols-6 dark:border-white/10">
                <HeaderMetric label="Paciente" value={textValue(measurement.patient_name)} />
                <HeaderMetric label="Exame" value={textValue(measurement.order_label || measurement.order)} />
                <HeaderMetric label="Modalidade" value={modalityLabel(measurement.modality)} />
                <HeaderMetric label="Valor atual" value={measurementValue({ ...measurement, numeric_value: numericValue, text_value: textValueState, unit })} />
                <HeaderMetric label="Tipo" value={valueTypeLabel(valueType)} />
                <HeaderMetric label="Medido em" value={fmtDatetime(measurement.measured_at)} />
              </div>
            </section>

            {error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
              <Card title="Identificação" icon={Waves} accent="bg-rose-500">
                <div className="grid grid-cols-1 gap-1 min-[520px]:grid-cols-2">
                  <Field label="Nome" error={errors.name}>
                    <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Nome da medição" />
                  </Field>
                  <Field label="Código" hint="Gerado automaticamente pelo sistema.">
                    <div className="flex h-8 w-full items-center rounded-md border border-border bg-muted/40 px-2 font-mono text-xs text-muted-foreground">
                      {textValue(code)}
                    </div>
                  </Field>
                  <Field label="Tipo de valor">
                    <select value={valueType} onChange={(event) => setValueType(event.target.value)} className={inputClass}>
                      <option value="NUMERIC">Numérico</option>
                      <option value="TEXT">Texto</option>
                      <option value="BOOLEAN">Booleano</option>
                      <option value="WAVEFORM">Traçado</option>
                      <option value="IMAGE">Imagem</option>
                    </select>
                  </Field>
                  <Field label="Medido em" error={errors.measuredAt}>
                    <input type="datetime-local" value={measuredAt} onChange={(event) => setMeasuredAt(event.target.value)} className={inputClass} />
                  </Field>
                </div>
              </Card>

              <Card title="Exame vinculado" icon={User} accent="bg-blue-500">
                <div className="grid grid-cols-1 gap-1 text-[10px] leading-tight">
                  <div className="grid grid-cols-[7rem_1fr] gap-1">
                    <span className="whitespace-nowrap text-muted-foreground">Paciente</span>
                    <span className="break-words font-medium">{textValue(measurement.patient_name)}</span>
                  </div>
                  <div className="grid grid-cols-[7rem_1fr] gap-1">
                    <span className="whitespace-nowrap text-muted-foreground">Exame</span>
                    {measurement.order ? (
                      <Link href={`/cardiology/exams/${measurement.order}/`} className="break-words font-medium text-rose-600 hover:underline dark:text-rose-300">
                        {measurement.order_label || `Exame #${measurement.order}`}
                      </Link>
                    ) : (
                      <span className="font-medium">-</span>
                    )}
                  </div>
                  <div className="grid grid-cols-[7rem_1fr] gap-1">
                    <span className="whitespace-nowrap text-muted-foreground">Modalidade</span>
                    <span className="font-medium">{modalityLabel(measurement.modality)}</span>
                  </div>
                </div>
              </Card>

              <Card title="Valor e referência" icon={Ruler} accent={critical ? "bg-rose-500" : abnormal ? "bg-amber-500" : "bg-emerald-500"}>
                <div className="grid grid-cols-1 gap-1 min-[520px]:grid-cols-3">
                  {valueType === "NUMERIC" ? (
                    <Field label="Valor numérico" error={errors.numericValue}>
                      <input type="number" step="0.001" value={numericValue} onChange={(event) => setNumericValue(event.target.value)} className={inputClass} />
                    </Field>
                  ) : (
                    <Field label="Valor textual" error={errors.textValue}>
                      <input value={textValueState} onChange={(event) => setTextValueState(event.target.value)} className={inputClass} />
                    </Field>
                  )}
                  <Field label="Unidade" hint={isAdmin ? undefined : "Editável apenas pelo administrador."}>
                    <input
                      value={unit}
                      onChange={(event) => setUnit(event.target.value)}
                      disabled={!isAdmin}
                      className={`${inputClass} disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-muted-foreground`}
                      placeholder="bpm, ms, mmHg..."
                    />
                  </Field>
                  <Field label="Intervalo de referência" hint={isAdmin ? undefined : "Editável apenas pelo administrador."}>
                    <input
                      value={referenceRange}
                      onChange={(event) => setReferenceRange(event.target.value)}
                      disabled={!isAdmin}
                      className={`${inputClass} disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-muted-foreground`}
                      placeholder="Ex.: 60-100 bpm"
                    />
                  </Field>
                </div>
              </Card>

              <Card title="Estado clínico" icon={HeartPulse} accent={critical ? "bg-rose-500" : abnormal ? "bg-amber-500" : "bg-emerald-500"}>
                <div className="flex flex-wrap items-center gap-1">
                  <InlineCheck checked={abnormal} onChange={setAbnormal} label="Alterada" tone="amber" />
                  <InlineCheck
                    checked={critical}
                    onChange={(checked) => {
                      setCritical(checked);
                      if (checked) setAbnormal(true);
                    }}
                    label="Crítica"
                    tone="rose"
                  />
                  <span className={`inline-flex h-8 items-center rounded-md border px-2 text-xs font-semibold ${meta.chip}`}>{meta.label}</span>
                </div>
              </Card>

              <Card title="Interpretação" icon={Stethoscope} accent="bg-violet-500">
                <Field label="Interpretação">
                  <textarea value={interpretation} onChange={(event) => setInterpretation(event.target.value)} className={textareaClass} placeholder="Interpretação clínica da medição..." />
                </Field>
              </Card>

              <Card title="Observações" icon={CalendarClock} accent="bg-slate-500">
                <Field label="Observações">
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={textareaClass} placeholder="Notas técnicas ou operacionais..." />
                </Field>
              </Card>
            </div>
          </>
        ) : null}
      </form>
    </AppLayout>
  );
}
