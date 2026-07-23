"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Check,
  Clock3,
  FileText,
  Loader2,
  Microscope,
  PenLine,
  Save,
  User,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { SearchableRelationSelect } from "@/components/form/AutoForm";
import { apiFetch } from "@/lib/api";
import { isNotFoundLikeError } from "@/lib/errors/api-error";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS } from "@/lib/rbac";
import { routeParamToString } from "@/lib/routeParams";
import type { RelationTarget, RelationOption } from "@/lib/resources/relationOptions";

// ── Relation targets ──────────────────────────────────────────────────────────

const T_STUDY: RelationTarget = {
  endpoint: "/radiology/study/",
  labelFields: ["accession_number", "patient_name", "custom_id"],
};
const T_RADIOLOGIST: RelationTarget = {
  endpoint: "/human_resources/employee/",
  labelFields: ["name", "employee_code", "custom_id"],
};

const EDIT_GROUPS = [GROUPS.ADMIN, GROUPS.RADIOLOGIA];

const ENDPOINT = "/radiology/report/";

const STATUSES = [
  { value: "DRAFT", label: "Rascunho" },
  { value: "PRELIMINARY", label: "Preliminar" },
  { value: "FINAL", label: "Final" },
  { value: "AMENDED", label: "Retificado" },
  { value: "CANCELLED", label: "Cancelado" },
];

const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  STATUSES.map((item) => [item.value, item.label])
);

type ImagingReportDetail = {
  id: number;
  custom_id?: string | null;
  study: number;
  study_label?: string | null;
  patient_name?: string | null;
  radiologist?: number | null;
  radiologist_name?: string | null;
  status?: string | null;
  version_number?: number | null;
  reported_at?: string | null;
  signed_at?: string | null;
  template_used?: string | null;
  technique?: string | null;
  findings?: string | null;
  impression?: string | null;
  recommendations?: string | null;
  critical_result?: boolean | null;
  critical_notified_at?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

// ── Design components ─────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  accent = "bg-[var(--primary-600)]",
  compact = false,
  children,
}: {
  icon: React.ElementType;
  title: string;
  accent?: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`relative z-0 rounded-lg border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm focus-within:z-50 dark:bg-white/5 dark:border-white/10 ${compact ? "min-w-0" : ""}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className={`flex items-center gap-1.5 border-b border-border/60 pl-4 ${compact ? "px-2.5 py-1.5" : "px-3 py-2"}`}>
        <span className={`flex items-center justify-center rounded-md bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)] ${compact ? "h-5 w-5" : "h-6 w-6"}`}>
          <Icon size={compact ? 11 : 13} />
        </span>
        <h2 className={`text-xs font-semibold text-foreground ${compact ? "truncate whitespace-nowrap" : ""}`}>{title}</h2>
      </div>
      <div className={compact ? "min-w-0 space-y-1.5 p-2.5" : "space-y-3 p-3"}>{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  required,
  compact = false,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={compact ? "space-y-0.5" : "space-y-1"}>
      <label className={`${compact ? "text-[11px]" : "text-xs"} font-semibold text-foreground`}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && !compact && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25";

function formatDateTime(value?: string | null): string {
  if (!value) return "Pendente";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" }).format(date);
}

/** Converte ISO para o formato aceite por <input type="datetime-local">. */
function toLocalInput(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function TimelineStep({
  label,
  value,
  by,
  state,
}: {
  label: string;
  value?: string | null;
  by?: string | null;
  state: "done" | "current" | "pending";
}) {
  const done = Boolean(value);
  const stateStyle = state === "done"
    ? "bg-emerald-600 text-white shadow-emerald-500/20"
    : state === "current"
      ? "bg-amber-500 text-white shadow-amber-500/25"
      : "bg-muted text-muted-foreground";
  const iconStyle = state === "done"
    ? "bg-white/20 text-white"
    : state === "current"
      ? "bg-white/20 text-white"
      : "bg-background/80 text-red-500";
  const Icon = state === "done" ? Check : state === "current" ? Clock3 : X;
  return (
    <div className={`flex min-w-0 items-center gap-1.5 px-4 py-2 shadow-sm [clip-path:polygon(0_0,calc(100%-14px)_0,100%_50%,calc(100%-14px)_100%,0_100%,14px_50%)] ${stateStyle}`}>
      <span className={`ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${iconStyle}`}>
        <Icon size={14} strokeWidth={2.5} />
      </span>
      <div className="min-w-0 whitespace-nowrap">
        <p className="truncate text-xs font-semibold">{label}</p>
        <p className="truncate text-[11px] opacity-90">
          {state === "current" && !done ? "Em andamento" : formatDateTime(value)}
        </p>
        {by ? <p className="truncate text-[11px] opacity-80">por {by}</p> : null}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditRadiologyReportPage() {
  useAuthGuard();
  const router = useRouter();
  const params = useParams();
  const idStr = routeParamToString((params as { id?: string | string[] })?.id);
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [customId, setCustomId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // form state
  const [study, setStudy] = useState<number | null>(null);
  const [studyOpts, setStudyOpts] = useState<RelationOption[]>([]);
  const [radiologist, setRadiologist] = useState<number | null>(null);
  const [radiologistOpts, setRadiologistOpts] = useState<RelationOption[]>([]);
  const [patientName, setPatientName] = useState("Paciente não informado");

  const [status, setStatus] = useState("DRAFT");
  const [versionNumber, setVersionNumber] = useState("1");
  const [reportedAt, setReportedAt] = useState("");
  const [templateUsed, setTemplateUsed] = useState("");

  const [technique, setTechnique] = useState("");
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [recommendations, setRecommendations] = useState("");

  const [criticalResult, setCriticalResult] = useState(false);
  const [criticalNotifiedAt, setCriticalNotifiedAt] = useState("");
  const [notes, setNotes] = useState("");

  const [timeline, setTimeline] = useState({
    createdAt: null as string | null,
    reportedAt: null as string | null,
    signedAt: null as string | null,
    updatedAt: null as string | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!idStr) return;
    try {
      setLoading(true);
      setLoadError(null);
      const d = await apiFetch<ImagingReportDetail>(`${ENDPOINT}${idStr}/`, {
        clientCache: safeRefreshToken === 0,
      });

      setCustomId(d.custom_id ?? String(d.id));

      setStudy(d.study ?? null);
      if (d.study && d.study_label) setStudyOpts([{ value: String(d.study), label: d.study_label }]);

      setRadiologist(d.radiologist ?? null);
      if (d.radiologist && d.radiologist_name)
        setRadiologistOpts([{ value: String(d.radiologist), label: d.radiologist_name }]);

      setPatientName(d.patient_name || "Paciente não informado");

      setStatus(d.status || "DRAFT");
      setVersionNumber(d.version_number != null ? String(d.version_number) : "1");
      setReportedAt(toLocalInput(d.reported_at));
      setTemplateUsed(d.template_used || "");

      setTechnique(d.technique || "");
      setFindings(d.findings || "");
      setImpression(d.impression || "");
      setRecommendations(d.recommendations || "");

      setCriticalResult(Boolean(d.critical_result));
      setCriticalNotifiedAt(toLocalInput(d.critical_notified_at));
      setNotes(d.notes || "");

      setTimeline({
        createdAt: d.created_at ?? null,
        reportedAt: d.reported_at ?? null,
        signedAt: d.signed_at ?? null,
        updatedAt: d.updated_at ?? null,
      });
    } catch (err: any) {
      setLoadError(
        isNotFoundLikeError(err) ? "Laudo não encontrado." : err?.message || "Erro ao carregar."
      );
    } finally {
      setLoading(false);
    }
  }, [idStr, safeRefreshToken]);

  useEffect(() => { load(); }, [load]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!study) e.study = "Selecione o estudo associado.";
    if (!status) e.status = "Selecione o estado do laudo.";
    if (!reportedAt) e.reported_at = "Indique a data do laudo.";
    if (Number(versionNumber) < 1) e.version_number = "A versão deve ser igual ou superior a 1.";
    if (["FINAL", "AMENDED"].includes(status) && !impression.trim())
      e.impression = "Um laudo final exige a conclusão preenchida.";
    if (criticalResult && !criticalNotifiedAt)
      e.critical_notified_at = "Indique quando o resultado crítico foi notificado.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await apiFetch(`${ENDPOINT}${idStr}/`, {
        method: "PATCH",
        body: JSON.stringify({
          study,
          radiologist: radiologist ?? null,
          status,
          version_number: Number(versionNumber || 1),
          reported_at: fromLocalInput(reportedAt),
          template_used: templateUsed,
          technique,
          findings,
          impression,
          recommendations,
          critical_result: criticalResult,
          critical_notified_at: criticalResult ? fromLocalInput(criticalNotifiedAt) : null,
          notes,
        }),
      });
      router.push(`/radiology/reports/${idStr}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  }

  const backButton = (
    <button
      type="button"
      onClick={() => router.push(`/radiology/reports/${idStr}`)}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground-2 transition hover:bg-muted"
    >
      <ArrowLeft size={14} />
      Voltar
    </button>
  );

  if (loading) {
    return (
      <AppLayout requiredGroups={EDIT_GROUPS}>
        <div className="space-y-2">
          <div className="h-16 animate-pulse rounded-xl border border-white/20 bg-white/25 dark:bg-white/5 dark:border-white/10" />
          <div className="grid gap-2 lg:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl border border-white/20 bg-white/25 dark:bg-white/5 dark:border-white/10" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (loadError) {
    return (
      <AppLayout requiredGroups={EDIT_GROUPS}>
        <div className="space-y-2">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {loadError}
          </div>
          {backButton}
        </div>
      </AppLayout>
    );
  }

  const chronologySteps = [
    { label: "Criado", value: timeline.createdAt, by: null },
    { label: "Laudado", value: timeline.reportedAt, by: radiologistOpts[0]?.label ?? null },
    { label: "Assinado", value: timeline.signedAt, by: null },
    { label: "Actualizado", value: timeline.updatedAt, by: null },
  ];
  const currentStepIndex = chronologySteps.findIndex((step) => !step.value);

  const studyLabel = studyOpts[0]?.label || "Estudo não associado";

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="space-y-2">

        {/* Header */}
        <div className="relative overflow-hidden rounded-lg border border-white/20 bg-white/30 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-wrap items-start justify-between gap-2 pl-1">
            <div className="min-w-0 space-y-1">
              <h1 className="text-lg font-bold leading-tight text-foreground">Editar laudo radiológico</h1>
              <p className="text-[11px] text-muted-foreground">{customId}</p>
              <div className="flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto whitespace-nowrap pt-0.5">
                <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background/80 px-2.5 text-xs font-semibold text-foreground">
                  <User size={13} />
                  {patientName}
                </span>
                <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background/80 px-2.5 text-xs font-semibold text-foreground">
                  <Microscope size={13} />
                  {studyLabel}
                </span>
                <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background/80 px-2.5 text-xs font-semibold text-foreground">
                  <FileText size={13} />
                  {STATUS_LABELS[status] || status}
                  <span className="text-muted-foreground">- v{versionNumber || 1}</span>
                </span>
                {criticalResult ? (
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 text-xs font-semibold text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertTriangle size={13} />
                    Resultado crítico
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {backButton}
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Guardar
              </button>
            </div>
          </div>
        </div>

        {saveError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {saveError}
          </div>
        ) : null}

        {/* Cabeçalho acima permanece isolado; cartões do formulário em masonry. */}
        <div className="min-w-0 columns-1 gap-2 md:columns-2 [&>*]:mb-2 [&>*]:break-inside-avoid">
          <div>
            <SectionCard icon={Microscope} title="Vínculo radiológico" accent="bg-emerald-500" compact>
              <Field label="Estudo" required error={errors.study} compact>
                <SearchableRelationSelect
                  fieldName="study"
                  value={study}
                  onChange={(v) => { setStudy(v); if (v) setErrors((p) => ({ ...p, study: "" })); }}
                  target={T_STUDY}
                  initialOptions={studyOpts}
                  placeholder="Pesquisar estudo..."
                  safeRefreshToken={safeRefreshToken}
                />
              </Field>
              <Field label="Radiologista" compact>
                <SearchableRelationSelect
                  fieldName="radiologist"
                  value={radiologist}
                  onChange={setRadiologist}
                  target={T_RADIOLOGIST}
                  initialOptions={radiologistOpts}
                  placeholder="Pesquisar radiologista..."
                  safeRefreshToken={safeRefreshToken}
                />
              </Field>
            </SectionCard>
          </div>

          <div>
            <SectionCard icon={FileText} title="Estado do laudo" accent="bg-violet-500" compact>
              <Field label="Estado" required error={errors.status} compact>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={INPUT_CLASS}
                >
                  {STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="Versão"
                error={errors.version_number}
                compact
              >
                <input
                  type="number"
                  min={1}
                  value={versionNumber}
                  onChange={(e) => setVersionNumber(e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Laudado em" required error={errors.reported_at} compact>
                <input
                  type="datetime-local"
                  value={reportedAt}
                  onChange={(e) => setReportedAt(e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Modelo utilizado" compact>
                <input
                  type="text"
                  value={templateUsed}
                  onChange={(e) => setTemplateUsed(e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
            </SectionCard>
          </div>

          <div>
            <SectionCard icon={PenLine} title="Conteúdo do laudo" accent="bg-sky-500" compact>
              <Field label="Técnica" compact>
                <textarea
                  value={technique}
                  onChange={(e) => setTechnique(e.target.value)}
                  rows={3}
                  className={`${INPUT_CLASS} resize-y`}
                />
              </Field>
              <Field label="Achados" compact>
                <textarea
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  rows={5}
                  className={`${INPUT_CLASS} resize-y`}
                />
              </Field>
              <Field label="Conclusão / Impressão" error={errors.impression} compact>
                <textarea
                  value={impression}
                  onChange={(e) => { setImpression(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, impression: "" })); }}
                  rows={4}
                  className={`${INPUT_CLASS} resize-y`}
                />
              </Field>
              <Field label="Recomendações" compact>
                <textarea
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  rows={3}
                  className={`${INPUT_CLASS} resize-y`}
                />
              </Field>
            </SectionCard>
          </div>

          <div>
            <SectionCard icon={AlertTriangle} title="Resultado crítico" accent="bg-rose-500" compact>
              <Field label="Sinalização" compact>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 transition hover:border-violet-400">
                  <input
                    type="checkbox"
                    checked={criticalResult}
                    onChange={(e) => {
                      setCriticalResult(e.target.checked);
                      if (!e.target.checked) {
                        setCriticalNotifiedAt("");
                        setErrors((p) => ({ ...p, critical_notified_at: "" }));
                      }
                    }}
                    className="h-4 w-4 rounded border-border accent-violet-600"
                  />
                  <span className="min-w-0 truncate whitespace-nowrap text-xs font-medium text-foreground">
                    Laudo com resultado crítico
                  </span>
                </label>
              </Field>
              {criticalResult ? (
                <Field label="Notificado em" required error={errors.critical_notified_at} compact>
                  <input
                    type="datetime-local"
                    value={criticalNotifiedAt}
                    onChange={(e) => { setCriticalNotifiedAt(e.target.value); if (e.target.value) setErrors((p) => ({ ...p, critical_notified_at: "" })); }}
                    className={INPUT_CLASS}
                  />
                </Field>
              ) : null}
              <Field label="Observações" compact>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className={`${INPUT_CLASS} resize-y`}
                />
              </Field>
            </SectionCard>
          </div>
        </div>

        {/* Cronologia (último cartão da página) */}
        <SectionCard icon={CalendarClock} title="Cronologia" accent="bg-slate-500">
          <div className="grid grid-cols-4 gap-1.5">
            {chronologySteps.map((step, index) => (
              <TimelineStep
                key={step.label}
                label={step.label}
                value={step.value}
                by={step.by}
                state={step.value ? "done" : index === currentStepIndex ? "current" : "pending"}
              />
            ))}
          </div>
        </SectionCard>
      </form>
    </AppLayout>
  );
}
