"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Check,
  Clock3,
  Factory,
  Loader2,
  MapPin,
  Save,
  Server,
  Wrench,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { isNotFoundLikeError } from "@/lib/errors/api-error";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS } from "@/lib/rbac";
import { routeParamToString } from "@/lib/routeParams";

const EDIT_GROUPS = [GROUPS.ADMIN, GROUPS.RADIOLOGIA];

const ENDPOINT = "/radiology/equipment/";

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

const STATUSES = [
  { value: "ACTIVE", label: "Ativo" },
  { value: "MAINTENANCE", label: "Em manutenção" },
  { value: "INACTIVE", label: "Inativo" },
];

const MODALITY_LABELS: Record<string, string> = Object.fromEntries(
  MODALITIES.map((item) => [item.value, item.label])
);
const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  STATUSES.map((item) => [item.value, item.label])
);

type ImagingEquipmentDetail = {
  id: number;
  custom_id?: string | null;
  name?: string | null;
  code?: string | null;
  modality?: string | null;
  status?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  ae_title?: string | null;
  station_name?: string | null;
  location?: string | null;
  pacs_endpoint?: string | null;
  last_quality_control?: string | null;
  next_quality_control?: string | null;
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

/** Datas do modelo são `DateField`: o input usa e devolve `YYYY-MM-DD`. */
function toDateInput(value?: string | null): string {
  if (!value) return "";
  return String(value).slice(0, 10);
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

export default function EditRadiologyEquipmentPage() {
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
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [modality, setModality] = useState("XRAY");
  const [status, setStatus] = useState("ACTIVE");

  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  const [aeTitle, setAeTitle] = useState("");
  const [stationName, setStationName] = useState("");
  const [location, setLocation] = useState("");
  const [pacsEndpoint, setPacsEndpoint] = useState("");

  const [lastQc, setLastQc] = useState("");
  const [nextQc, setNextQc] = useState("");
  const [notes, setNotes] = useState("");

  const [timeline, setTimeline] = useState({
    createdAt: null as string | null,
    lastQc: null as string | null,
    nextQc: null as string | null,
    updatedAt: null as string | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!idStr) return;
    try {
      setLoading(true);
      setLoadError(null);
      const d = await apiFetch<ImagingEquipmentDetail>(`${ENDPOINT}${idStr}/`, {
        clientCache: safeRefreshToken === 0,
      });

      setCustomId(d.custom_id ?? String(d.id));

      setName(d.name || "");
      setCode(d.code || "");
      setModality(d.modality || "XRAY");
      setStatus(d.status || "ACTIVE");

      setManufacturer(d.manufacturer || "");
      setModel(d.model || "");
      setSerialNumber(d.serial_number || "");

      setAeTitle(d.ae_title || "");
      setStationName(d.station_name || "");
      setLocation(d.location || "");
      setPacsEndpoint(d.pacs_endpoint || "");

      setLastQc(toDateInput(d.last_quality_control));
      setNextQc(toDateInput(d.next_quality_control));
      setNotes(d.notes || "");

      setTimeline({
        createdAt: d.created_at ?? null,
        lastQc: d.last_quality_control ?? null,
        nextQc: d.next_quality_control ?? null,
        updatedAt: d.updated_at ?? null,
      });
    } catch (err: any) {
      setLoadError(
        isNotFoundLikeError(err) ? "Equipamento não encontrado." : err?.message || "Erro ao carregar."
      );
    } finally {
      setLoading(false);
    }
  }, [idStr, safeRefreshToken]);

  useEffect(() => { load(); }, [load]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Indique o nome do equipamento.";
    if (!code.trim()) e.code = "Indique o código do equipamento.";
    if (!modality) e.modality = "Selecione a modalidade.";
    if (!status) e.status = "Selecione o estado.";
    if (lastQc && nextQc && nextQc < lastQc)
      e.next_quality_control = "O próximo controlo não pode ser anterior ao último.";
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
          name,
          code,
          modality,
          status,
          manufacturer,
          model,
          serial_number: serialNumber,
          ae_title: aeTitle,
          station_name: stationName,
          location,
          pacs_endpoint: pacsEndpoint,
          last_quality_control: lastQc || null,
          next_quality_control: nextQc || null,
          notes,
        }),
      });
      router.push(`/radiology/equipment/${idStr}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  }

  const backButton = (
    <button
      type="button"
      onClick={() => router.push(`/radiology/equipment/${idStr}`)}
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
    { label: "Último CQ", value: timeline.lastQc, by: null },
    { label: "Próximo CQ", value: timeline.nextQc, by: null },
    { label: "Actualizado", value: timeline.updatedAt, by: null },
  ];
  const currentStepIndex = chronologySteps.findIndex((step) => !step.value);

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="space-y-2">

        {/* Header */}
        <div className="relative overflow-hidden rounded-lg border border-white/20 bg-white/30 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-wrap items-start justify-between gap-2 pl-1">
            <div className="min-w-0 space-y-1">
              <h1 className="text-lg font-bold leading-tight text-foreground">Editar equipamento de imagem</h1>
              <p className="text-[11px] text-muted-foreground">{customId}</p>
              <div className="flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto whitespace-nowrap pt-0.5">
                <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background/80 px-2.5 text-xs font-semibold text-foreground">
                  <Wrench size={13} />
                  {name || "Sem nome"}
                  {code ? <span className="text-muted-foreground">({code})</span> : null}
                </span>
                <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background/80 px-2.5 text-xs font-semibold text-foreground">
                  <Activity size={13} />
                  {MODALITY_LABELS[modality] || modality}
                  <span className="text-muted-foreground">- {STATUS_LABELS[status] || status}</span>
                </span>
                {status === "MAINTENANCE" ? (
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 text-xs font-semibold text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
                    <AlertTriangle size={13} />
                    Em manutenção
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
            <SectionCard icon={Wrench} title="Identificação" accent="bg-emerald-500" compact>
              <Field label="Nome" required error={errors.name} compact>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, name: "" })); }}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Código" required error={errors.code} compact>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, code: "" })); }}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Modalidade" required error={errors.modality} compact>
                <select value={modality} onChange={(e) => setModality(e.target.value)} className={INPUT_CLASS}>
                  {MODALITIES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Estado" required error={errors.status} compact>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={INPUT_CLASS}>
                  {STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
            </SectionCard>
          </div>

          <div>
            <SectionCard icon={Factory} title="Fabricante e modelo" accent="bg-violet-500" compact>
              <Field label="Fabricante" compact>
                <input type="text" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Modelo" compact>
                <input type="text" value={model} onChange={(e) => setModel(e.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Número de série" compact>
                <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className={INPUT_CLASS} />
              </Field>
            </SectionCard>
          </div>

          <div>
            <SectionCard icon={Server} title="Integração PACS/RIS" accent="bg-amber-500" compact>
              <Field label="AE Title PACS" compact>
                <input type="text" value={aeTitle} onChange={(e) => setAeTitle(e.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Estação" compact>
                <input type="text" value={stationName} onChange={(e) => setStationName(e.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Endpoint PACS/RIS" compact>
                <input type="text" value={pacsEndpoint} onChange={(e) => setPacsEndpoint(e.target.value)} placeholder="dicom://pacs.local:11112/AE" className={INPUT_CLASS} />
              </Field>
              <Field label="Localização" compact>
                <div className="relative">
                  <MapPin size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={`${INPUT_CLASS} pl-8`} />
                </div>
              </Field>
            </SectionCard>
          </div>

          <div>
            <SectionCard icon={CalendarClock} title="Controlo de qualidade" accent="bg-rose-500" compact>
              <Field label="Último controlo" compact>
                <input type="date" value={lastQc} onChange={(e) => setLastQc(e.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Próximo controlo" error={errors.next_quality_control} compact>
                <input
                  type="date"
                  value={nextQc}
                  onChange={(e) => { setNextQc(e.target.value); setErrors((p) => ({ ...p, next_quality_control: "" })); }}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Observações" compact>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={`${INPUT_CLASS} resize-y`} />
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
