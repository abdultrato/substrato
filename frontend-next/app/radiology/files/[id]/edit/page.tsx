"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Clock3,
  Database,
  FileImage,
  HardDrive,
  Layers,
  Loader2,
  Save,
  Server,
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
const T_SERIES: RelationTarget = {
  endpoint: "/radiology/series/",
  labelFields: ["series_instance_uid", "description", "custom_id"],
};

const EDIT_GROUPS = [GROUPS.ADMIN, GROUPS.RADIOLOGIA];

const ENDPOINT = "/radiology/file/";

const FILE_TYPES = [
  { value: "DICOM", label: "DICOM" },
  { value: "IMAGE", label: "Imagem" },
  { value: "REPORT_PDF", label: "PDF de laudo" },
  { value: "VIDEO", label: "Vídeo" },
  { value: "OTHER", label: "Outro" },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  FILE_TYPES.map((item) => [item.value, item.label])
);

type ImagingFileDetail = {
  id: number;
  custom_id?: string | null;
  study: number;
  study_label?: string | null;
  series?: number | null;
  series_label?: string | null;
  file_type?: string | null;
  pacs_object_uri?: string | null;
  sop_instance_uid?: string | null;
  content_type?: string | null;
  file_size?: number | null;
  image_number?: number | null;
  checksum?: string | null;
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

function formatBytes(value?: number | null) {
  const bytes = Number(value || 0);
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(bytes / 1024 ** index)} ${units[index]}`;
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

export default function EditRadiologyFilePage() {
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
  const [series, setSeries] = useState<number | null>(null);
  const [seriesOpts, setSeriesOpts] = useState<RelationOption[]>([]);

  const [fileType, setFileType] = useState("DICOM");
  const [contentType, setContentType] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [imageNumber, setImageNumber] = useState("");

  const [pacsUri, setPacsUri] = useState("");
  const [sopUid, setSopUid] = useState("");
  const [checksum, setChecksum] = useState("");
  const [notes, setNotes] = useState("");

  const [timeline, setTimeline] = useState({
    createdAt: null as string | null,
    updatedAt: null as string | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!idStr) return;
    try {
      setLoading(true);
      setLoadError(null);
      const d = await apiFetch<ImagingFileDetail>(`${ENDPOINT}${idStr}/`, {
        clientCache: safeRefreshToken === 0,
      });

      setCustomId(d.custom_id ?? String(d.id));

      setStudy(d.study ?? null);
      if (d.study && d.study_label) setStudyOpts([{ value: String(d.study), label: d.study_label }]);

      setSeries(d.series ?? null);
      if (d.series && d.series_label) setSeriesOpts([{ value: String(d.series), label: d.series_label }]);

      setFileType(d.file_type || "DICOM");
      setContentType(d.content_type || "");
      setFileSize(d.file_size != null ? String(d.file_size) : "");
      setImageNumber(d.image_number != null ? String(d.image_number) : "");

      setPacsUri(d.pacs_object_uri || "");
      setSopUid(d.sop_instance_uid || "");
      setChecksum(d.checksum || "");
      setNotes(d.notes || "");

      setTimeline({ createdAt: d.created_at ?? null, updatedAt: d.updated_at ?? null });
    } catch (err: any) {
      setLoadError(
        isNotFoundLikeError(err) ? "Ficheiro radiológico não encontrado." : err?.message || "Erro ao carregar."
      );
    } finally {
      setLoading(false);
    }
  }, [idStr, safeRefreshToken]);

  useEffect(() => { load(); }, [load]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!study) e.study = "Selecione o estudo associado.";
    if (!fileType) e.file_type = "Selecione o tipo de ficheiro.";
    if (fileSize && Number(fileSize) < 0) e.file_size = "O tamanho não pode ser negativo.";
    if (imageNumber && Number(imageNumber) < 0) e.image_number = "O número da imagem não pode ser negativo.";
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
          series: series ?? null,
          file_type: fileType,
          content_type: contentType,
          file_size: fileSize === "" ? 0 : Number(fileSize),
          image_number: imageNumber === "" ? 0 : Number(imageNumber),
          pacs_object_uri: pacsUri,
          sop_instance_uid: sopUid,
          checksum,
          notes,
        }),
      });
      router.push(`/radiology/files/${idStr}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  }

  const backButton = (
    <button
      type="button"
      onClick={() => router.push(`/radiology/files/${idStr}`)}
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
    { label: "Actualizado", value: timeline.updatedAt, by: null },
  ];
  const currentStepIndex = chronologySteps.findIndex((step) => !step.value);

  const studyLabel = studyOpts[0]?.label || "Estudo não associado";
  const seriesLabel = seriesOpts[0]?.label || "Sem série";

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="space-y-2">

        {/* Header */}
        <div className="relative overflow-hidden rounded-lg border border-white/20 bg-white/30 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-wrap items-start justify-between gap-2 pl-1">
            <div className="min-w-0 space-y-1">
              <h1 className="text-lg font-bold leading-tight text-foreground">Editar ficheiro radiológico</h1>
              <p className="text-[11px] text-muted-foreground">{customId}</p>
              <div className="flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto whitespace-nowrap pt-0.5">
                <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background/80 px-2.5 text-xs font-semibold text-foreground">
                  <FileImage size={13} />
                  {studyLabel}
                </span>
                <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background/80 px-2.5 text-xs font-semibold text-foreground">
                  <Layers size={13} />
                  {seriesLabel}
                </span>
                <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background/80 px-2.5 text-xs font-semibold text-foreground">
                  <HardDrive size={13} />
                  {TYPE_LABELS[fileType] || fileType}
                  <span className="text-muted-foreground">- {formatBytes(Number(fileSize))}</span>
                </span>
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
            <SectionCard icon={FileImage} title="Vínculo radiológico" accent="bg-emerald-500" compact>
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
              <Field label="Série" compact>
                <SearchableRelationSelect
                  fieldName="series"
                  value={series}
                  onChange={setSeries}
                  target={T_SERIES}
                  initialOptions={seriesOpts}
                  placeholder="Pesquisar série..."
                  safeRefreshToken={safeRefreshToken}
                />
              </Field>
            </SectionCard>
          </div>

          <div>
            <SectionCard icon={HardDrive} title="Ficheiro" accent="bg-violet-500" compact>
              <Field label="Tipo de ficheiro" required error={errors.file_type} compact>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                  className={INPUT_CLASS}
                >
                  {FILE_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Tipo MIME" compact>
                <input
                  type="text"
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  placeholder="application/dicom"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Tamanho do ficheiro (bytes)" error={errors.file_size} compact>
                <input
                  type="number"
                  min={0}
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Número da imagem" error={errors.image_number} compact>
                <input
                  type="number"
                  min={0}
                  value={imageNumber}
                  onChange={(e) => setImageNumber(e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
            </SectionCard>
          </div>

          <div>
            <SectionCard icon={Server} title="Identificação DICOM e PACS" accent="bg-amber-500" compact>
              <Field label="URI no PACS" compact>
                <input
                  type="text"
                  value={pacsUri}
                  onChange={(e) => setPacsUri(e.target.value)}
                  placeholder="pacs://objects/..."
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="SOP Instance UID" compact>
                <input
                  type="text"
                  value={sopUid}
                  onChange={(e) => setSopUid(e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Checksum" compact>
                <input
                  type="text"
                  value={checksum}
                  onChange={(e) => setChecksum(e.target.value)}
                  className={INPUT_CLASS}
                />
              </Field>
            </SectionCard>
          </div>

          <div>
            <SectionCard icon={Database} title="Observações" accent="bg-sky-500" compact>
              <Field label="Notas do registo" compact>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className={`${INPUT_CLASS} resize-y`}
                />
              </Field>
            </SectionCard>
          </div>
        </div>

        {/* Cronologia (último cartão da página) */}
        <SectionCard icon={CalendarClock} title="Cronologia" accent="bg-slate-500">
          <div className="grid grid-cols-2 gap-1.5">
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
