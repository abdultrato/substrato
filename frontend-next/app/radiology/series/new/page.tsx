"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  CalendarClock,
  Fingerprint,
  Image as ImageIcon,
  Layers,
  Loader2,
  Save,
  Server,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { SearchableRelationSelect } from "@/components/form/AutoForm";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS } from "@/lib/rbac";
import type { RelationTarget, RelationOption } from "@/lib/resources/relationOptions";

// ── Relation targets ──────────────────────────────────────────────────────────

const T_STUDY: RelationTarget = {
  endpoint: "/radiology/study/",
  labelFields: ["accession_number", "patient_name", "custom_id"],
};

const CREATE_GROUPS = [GROUPS.ADMIN, GROUPS.RADIOLOGIA];

const ENDPOINT = "/radiology/series/";

const MODALITIES = [
  { value: "XRAY", label: "Raio-X" },
  { value: "ULTRASOUND", label: "Ultrassom" },
  { value: "CT", label: "Tomografia" },
  { value: "MRI", label: "Ressonância magnética" },
  { value: "MAMMOGRAPHY", label: "Mamografia" },
  { value: "FLUOROSCOPY", label: "Fluoroscopia" },
  { value: "DENSITOMETRY", label: "Densitometria" },
  { value: "OTHER", label: "Outra" },
];

const REGIONS = [
  { value: "HEAD", label: "Cabeça" },
  { value: "NECK", label: "Pescoço" },
  { value: "CHEST", label: "Tórax" },
  { value: "ABDOMEN", label: "Abdómen" },
  { value: "PELVIS", label: "Pelve" },
  { value: "SPINE", label: "Coluna" },
  { value: "UPPER_LIMB", label: "Membro superior" },
  { value: "LOWER_LIMB", label: "Membro inferior" },
  { value: "BREAST", label: "Mama" },
  { value: "VASCULAR", label: "Vascular" },
  { value: "WHOLE_BODY", label: "Corpo inteiro" },
  { value: "OTHER", label: "Outra" },
];

const MODALITY_LABELS: Record<string, string> = Object.fromEntries(
  MODALITIES.map((item) => [item.value, item.label])
);

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

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewRadiologySeriesPage() {
  useAuthGuard();
  const router = useRouter();
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // form state
  const [study, setStudy] = useState<number | null>(null);
  const [studyOpts] = useState<RelationOption[]>([]);

  const [seriesNumber, setSeriesNumber] = useState("1");
  const [description, setDescription] = useState("");
  const [modality, setModality] = useState("OTHER");
  const [bodyRegion, setBodyRegion] = useState("OTHER");

  const [imageCount, setImageCount] = useState("0");
  const [seriesUid, setSeriesUid] = useState("");
  const [storageUri, setStorageUri] = useState("");

  const [startedAt, setStartedAt] = useState("");
  const [completedAt, setCompletedAt] = useState("");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!study) e.study = "Selecione o estudo associado.";
    if (Number(seriesNumber) < 1) e.series_number = "O número da série deve ser igual ou superior a 1.";
    if (Number(imageCount) < 0) e.image_count = "O número de imagens não pode ser negativo.";
    if (startedAt && completedAt && completedAt < startedAt)
      e.acquisition_completed_at = "A conclusão não pode ser anterior ao início.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const created = await apiFetch<{ id: number }>(ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          study,
          series_number: Number(seriesNumber || 1),
          description,
          modality,
          body_region: bodyRegion,
          image_count: Number(imageCount || 0),
          series_instance_uid: seriesUid,
          storage_uri: storageUri,
          acquisition_started_at: fromLocalInput(startedAt),
          acquisition_completed_at: fromLocalInput(completedAt),
          notes,
        }),
      });
      router.push(created?.id ? `/radiology/series/${created.id}` : "/radiology/series");
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao criar a série.");
    } finally {
      setSaving(false);
    }
  }

  const backButton = (
    <button
      type="button"
      onClick={() => router.push("/radiology/series")}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground-2 transition hover:bg-muted"
    >
      <ArrowLeft size={14} />
      Voltar
    </button>
  );

  return (
    <AppLayout requiredGroups={CREATE_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="space-y-2">

        {/* Header */}
        <div className="relative overflow-hidden rounded-lg border border-white/20 bg-white/30 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-wrap items-start justify-between gap-2 pl-1">
            <div className="min-w-0 space-y-1">
              <h1 className="text-lg font-bold leading-tight text-foreground">Nova série de imagem</h1>
              <p className="text-[11px] text-muted-foreground">Série DICOM associada a um estudo de imagem</p>
              <div className="flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto whitespace-nowrap pt-0.5">
                <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background/80 px-2.5 text-xs font-semibold text-foreground">
                  <Layers size={13} />
                  Série #{seriesNumber || "—"}
                  <span className="text-muted-foreground">- {MODALITY_LABELS[modality] || modality}</span>
                </span>
                <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background/80 px-2.5 text-xs font-semibold text-foreground">
                  <ImageIcon size={13} />
                  {imageCount || 0} imagens
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
                Criar série
              </button>
            </div>
          </div>
        </div>

        {saveError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {saveError}
          </div>
        ) : null}

        <div className="min-w-0 columns-1 gap-2 md:columns-2 [&>*]:mb-2 [&>*]:break-inside-avoid">
          <div>
            <SectionCard icon={Activity} title="Vínculo radiológico" accent="bg-emerald-500" compact>
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
              <Field
                label="Número da série"
                required
                error={errors.series_number}
                hint="Deve ser único dentro do estudo selecionado."
                compact
              >
                <input
                  type="number"
                  min={1}
                  value={seriesNumber}
                  onChange={(e) => { setSeriesNumber(e.target.value); setErrors((p) => ({ ...p, series_number: "" })); }}
                  className={INPUT_CLASS}
                />
              </Field>
            </SectionCard>
          </div>

          <div>
            <SectionCard icon={Layers} title="Descrição da série" accent="bg-violet-500" compact>
              <Field label="Descrição" compact>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Série 1 - Tórax" className={INPUT_CLASS} />
              </Field>
              <Field
                label="Modalidade"
                hint="Se ficar em «Outra», herda a modalidade do estudo."
                compact
              >
                <select value={modality} onChange={(e) => setModality(e.target.value)} className={INPUT_CLASS}>
                  {MODALITIES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="Região anatómica"
                hint="Se ficar em «Outra», herda a região do estudo."
                compact
              >
                <select value={bodyRegion} onChange={(e) => setBodyRegion(e.target.value)} className={INPUT_CLASS}>
                  {REGIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Número de imagens" error={errors.image_count} compact>
                <input
                  type="number"
                  min={0}
                  value={imageCount}
                  onChange={(e) => { setImageCount(e.target.value); setErrors((p) => ({ ...p, image_count: "" })); }}
                  className={INPUT_CLASS}
                />
              </Field>
            </SectionCard>
          </div>

          <div>
            <SectionCard icon={Fingerprint} title="Identificação e armazenamento" accent="bg-amber-500" compact>
              <Field label="Series Instance UID" compact>
                <input type="text" value={seriesUid} onChange={(e) => setSeriesUid(e.target.value)} placeholder="1.2.826.0.1.3680043..." className={INPUT_CLASS} />
              </Field>
              <Field label="URI de armazenamento" compact>
                <div className="relative">
                  <Server size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" value={storageUri} onChange={(e) => setStorageUri(e.target.value)} placeholder="pacs://series/..." className={`${INPUT_CLASS} pl-8`} />
                </div>
              </Field>
            </SectionCard>
          </div>

          <div>
            <SectionCard icon={CalendarClock} title="Aquisição" accent="bg-rose-500" compact>
              <Field label="Iniciada em" compact>
                <input type="datetime-local" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Concluída em" error={errors.acquisition_completed_at} compact>
                <input
                  type="datetime-local"
                  value={completedAt}
                  onChange={(e) => { setCompletedAt(e.target.value); setErrors((p) => ({ ...p, acquisition_completed_at: "" })); }}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Observações" compact>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={`${INPUT_CLASS} resize-y`} />
              </Field>
            </SectionCard>
          </div>
        </div>
      </form>
    </AppLayout>
  );
}
