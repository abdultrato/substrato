"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  Check,
  Clock3,
  Database,
  Loader2,
  Save,
  Server,
  TerminalSquare,
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
/** Equipamento de imagem (radiologia), nao o catalogo geral de equipamentos. */
const T_EQUIPMENT: RelationTarget = {
  endpoint: "/radiology/equipment/",
  labelFields: ["name", "code", "ae_title", "custom_id"],
};

const EDIT_GROUPS = [GROUPS.ADMIN, GROUPS.RADIOLOGIA];

const ENDPOINT = "/radiology/pacs_event/";

const EVENT_TYPES = [
  { value: "WORKLIST_CREATE", label: "Criar worklist" },
  { value: "WORKLIST_UPDATE", label: "Atualizar worklist" },
  { value: "STUDY_SYNC", label: "Sincronizar estudo" },
  { value: "STORE", label: "Armazenar imagem" },
  { value: "QUERY", label: "Consultar PACS" },
  { value: "RETRIEVE", label: "Recuperar imagem" },
  { value: "REPORT_SEND", label: "Enviar laudo" },
  { value: "ERROR", label: "Erro" },
];

const DIRECTIONS = [
  { value: "OUTBOUND", label: "Saída" },
  { value: "INBOUND", label: "Entrada" },
];

const STATUSES = [
  { value: "PENDING", label: "Pendente" },
  { value: "SENT", label: "Enviado" },
  { value: "ACKNOWLEDGED", label: "Confirmado" },
  { value: "FAILED", label: "Falhou" },
  { value: "IGNORED", label: "Ignorado" },
];

const EVENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  EVENT_TYPES.map((item) => [item.value, item.label])
);
const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  STATUSES.map((item) => [item.value, item.label])
);

type PacsEventDetail = {
  id: number;
  custom_id?: string | null;
  study?: number | null;
  study_label?: string | null;
  equipment?: number | null;
  equipment_name?: string | null;
  event_type?: string | null;
  direction?: string | null;
  status?: string | null;
  external_system?: string | null;
  accession_number?: string | null;
  study_instance_uid?: string | null;
  message_control_id?: string | null;
  event_at?: string | null;
  payload?: Record<string, unknown> | null;
  response?: Record<string, unknown> | null;
  error_message?: string | null;
  retry_count?: number | null;
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

/** Serializa um objeto JSON para edicao; devolve string vazia quando nao ha conteudo. */
function toJsonText(value?: Record<string, unknown> | null): string {
  if (!value || Object.keys(value).length === 0) return "";
  return JSON.stringify(value, null, 2);
}

/** Faz parse do texto para objeto; devolve `undefined` quando o JSON e invalido. */
function parseJsonText(value: string): Record<string, unknown> | undefined {
  const text = value.trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
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

export default function EditPacsEventPage() {
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
  const [equipment, setEquipment] = useState<number | null>(null);
  const [equipmentOpts, setEquipmentOpts] = useState<RelationOption[]>([]);

  const [eventType, setEventType] = useState("WORKLIST_CREATE");
  const [direction, setDirection] = useState("OUTBOUND");
  const [status, setStatus] = useState("PENDING");
  const [externalSystem, setExternalSystem] = useState("");
  const [eventAt, setEventAt] = useState("");
  const [retryCount, setRetryCount] = useState("0");

  const [accessionNumber, setAccessionNumber] = useState("");
  const [studyInstanceUid, setStudyInstanceUid] = useState("");
  const [messageControlId, setMessageControlId] = useState("");

  const [payload, setPayload] = useState("");
  const [response, setResponse] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [timeline, setTimeline] = useState({
    createdAt: null as string | null,
    eventAt: null as string | null,
    updatedAt: null as string | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!idStr) return;
    try {
      setLoading(true);
      setLoadError(null);
      const d = await apiFetch<PacsEventDetail>(`${ENDPOINT}${idStr}/`, {
        clientCache: safeRefreshToken === 0,
      });

      setCustomId(d.custom_id ?? String(d.id));

      setStudy(d.study ?? null);
      if (d.study && d.study_label) setStudyOpts([{ value: String(d.study), label: d.study_label }]);

      setEquipment(d.equipment ?? null);
      if (d.equipment && d.equipment_name)
        setEquipmentOpts([{ value: String(d.equipment), label: d.equipment_name }]);

      setEventType(d.event_type || "WORKLIST_CREATE");
      setDirection(d.direction || "OUTBOUND");
      setStatus(d.status || "PENDING");
      setExternalSystem(d.external_system || "");
      setEventAt(toLocalInput(d.event_at));
      setRetryCount(d.retry_count != null ? String(d.retry_count) : "0");

      setAccessionNumber(d.accession_number || "");
      setStudyInstanceUid(d.study_instance_uid || "");
      setMessageControlId(d.message_control_id || "");

      setPayload(toJsonText(d.payload));
      setResponse(toJsonText(d.response));
      setErrorMessage(d.error_message || "");

      setTimeline({
        createdAt: d.created_at ?? null,
        eventAt: d.event_at ?? null,
        updatedAt: d.updated_at ?? null,
      });
    } catch (err: any) {
      setLoadError(
        isNotFoundLikeError(err) ? "Evento PACS não encontrado." : err?.message || "Erro ao carregar."
      );
    } finally {
      setLoading(false);
    }
  }, [idStr, safeRefreshToken]);

  useEffect(() => { load(); }, [load]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!eventType) e.event_type = "Selecione o tipo de evento.";
    if (!status) e.status = "Selecione o estado do evento.";
    if (!eventAt) e.event_at = "Indique a data do evento.";
    if (Number(retryCount) < 0) e.retry_count = "As tentativas não podem ser negativas.";
    if (parseJsonText(payload) === undefined) e.payload = "JSON inválido. Use um objeto, ex.: {\"chave\": \"valor\"}.";
    if (parseJsonText(response) === undefined) e.response = "JSON inválido. Use um objeto, ex.: {\"code\": \"0\"}.";
    if (status === "FAILED" && !errorMessage.trim())
      e.error_message = "Um evento falhado exige a mensagem de erro.";
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
          study: study ?? null,
          equipment: equipment ?? null,
          event_type: eventType,
          direction,
          status,
          external_system: externalSystem,
          accession_number: accessionNumber,
          study_instance_uid: studyInstanceUid,
          message_control_id: messageControlId,
          event_at: fromLocalInput(eventAt),
          payload: parseJsonText(payload) ?? {},
          response: parseJsonText(response) ?? {},
          error_message: errorMessage,
          retry_count: Number(retryCount || 0),
        }),
      });
      router.push(`/radiology/pacs-events/${idStr}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  }

  const backButton = (
    <button
      type="button"
      onClick={() => router.push(`/radiology/pacs-events/${idStr}`)}
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
    { label: "Evento", value: timeline.eventAt, by: null },
    { label: "Actualizado", value: timeline.updatedAt, by: null },
  ];
  const currentStepIndex = chronologySteps.findIndex((step) => !step.value);

  const studyLabel = studyOpts[0]?.label || "Estudo não associado";
  const inbound = direction === "INBOUND";

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="space-y-2">

        {/* Header */}
        <div className="relative overflow-hidden rounded-lg border border-white/20 bg-white/30 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-wrap items-start justify-between gap-2 pl-1">
            <div className="min-w-0 space-y-1">
              <h1 className="text-lg font-bold leading-tight text-foreground">Editar evento PACS</h1>
              <p className="text-[11px] text-muted-foreground">{customId}</p>
              <div className="flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto whitespace-nowrap pt-0.5">
                <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background/80 px-2.5 text-xs font-semibold text-foreground">
                  <Activity size={13} />
                  {studyLabel}
                </span>
                <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background/80 px-2.5 text-xs font-semibold text-foreground">
                  <TerminalSquare size={13} />
                  {EVENT_TYPE_LABELS[eventType] || eventType}
                  <span className="text-muted-foreground">- {STATUS_LABELS[status] || status}</span>
                </span>
                <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background/80 px-2.5 text-xs font-semibold text-foreground">
                  {inbound ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                  {inbound ? "Entrada" : "Saída"}
                </span>
                {status === "FAILED" ? (
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 text-xs font-semibold text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertTriangle size={13} />
                    Falha na integração
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
            <SectionCard icon={Activity} title="Vínculo radiológico" accent="bg-emerald-500" compact>
              <Field label="Estudo" compact>
                <SearchableRelationSelect
                  fieldName="study"
                  value={study}
                  onChange={setStudy}
                  target={T_STUDY}
                  initialOptions={studyOpts}
                  placeholder="Pesquisar estudo..."
                  safeRefreshToken={safeRefreshToken}
                />
              </Field>
              <Field label="Equipamento" compact>
                <SearchableRelationSelect
                  fieldName="equipment"
                  value={equipment}
                  onChange={setEquipment}
                  target={T_EQUIPMENT}
                  initialOptions={equipmentOpts}
                  placeholder="Pesquisar equipamento..."
                  safeRefreshToken={safeRefreshToken}
                />
              </Field>
            </SectionCard>
          </div>

          <div>
            <SectionCard icon={TerminalSquare} title="Evento de integração" accent="bg-violet-500" compact>
              <Field label="Tipo de evento" required error={errors.event_type} compact>
                <select value={eventType} onChange={(e) => setEventType(e.target.value)} className={INPUT_CLASS}>
                  {EVENT_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Direção" compact>
                <select value={direction} onChange={(e) => setDirection(e.target.value)} className={INPUT_CLASS}>
                  {DIRECTIONS.map((option) => (
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
              <Field label="Sistema externo" compact>
                <input type="text" value={externalSystem} onChange={(e) => setExternalSystem(e.target.value)} placeholder="PACS-Orthanc" className={INPUT_CLASS} />
              </Field>
              <Field label="Evento em" required error={errors.event_at} compact>
                <input type="datetime-local" value={eventAt} onChange={(e) => setEventAt(e.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Tentativas" error={errors.retry_count} compact>
                <input type="number" min={0} value={retryCount} onChange={(e) => setRetryCount(e.target.value)} className={INPUT_CLASS} />
              </Field>
            </SectionCard>
          </div>

          <div>
            <SectionCard icon={Server} title="Identificação DICOM" accent="bg-amber-500" compact>
              <Field label="Número de acesso" compact>
                <input type="text" value={accessionNumber} onChange={(e) => setAccessionNumber(e.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="Study Instance UID" compact>
                <input type="text" value={studyInstanceUid} onChange={(e) => setStudyInstanceUid(e.target.value)} className={INPUT_CLASS} />
              </Field>
              <Field label="ID da mensagem" compact>
                <input type="text" value={messageControlId} onChange={(e) => setMessageControlId(e.target.value)} className={INPUT_CLASS} />
              </Field>
            </SectionCard>
          </div>

          <div>
            <SectionCard icon={Database} title="Payload, resposta e erro" accent="bg-rose-500" compact>
              <Field label="Payload (JSON)" error={errors.payload} compact>
                <textarea
                  value={payload}
                  onChange={(e) => { setPayload(e.target.value); if (parseJsonText(e.target.value) !== undefined) setErrors((p) => ({ ...p, payload: "" })); }}
                  rows={6}
                  spellCheck={false}
                  placeholder={"{\n  \"accession\": \"ACC000001\"\n}"}
                  className={`${INPUT_CLASS} resize-y font-mono text-xs`}
                />
              </Field>
              <Field label="Resposta (JSON)" error={errors.response} compact>
                <textarea
                  value={response}
                  onChange={(e) => { setResponse(e.target.value); if (parseJsonText(e.target.value) !== undefined) setErrors((p) => ({ ...p, response: "" })); }}
                  rows={5}
                  spellCheck={false}
                  placeholder={"{\n  \"code\": \"0\"\n}"}
                  className={`${INPUT_CLASS} resize-y font-mono text-xs`}
                />
              </Field>
              <Field label="Mensagem de erro" error={errors.error_message} compact>
                <textarea
                  value={errorMessage}
                  onChange={(e) => { setErrorMessage(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, error_message: "" })); }}
                  rows={3}
                  className={`${INPUT_CLASS} resize-y`}
                />
              </Field>
            </SectionCard>
          </div>
        </div>

        {/* Cronologia (último cartão da página) */}
        <SectionCard icon={CalendarClock} title="Cronologia" accent="bg-slate-500">
          <div className="grid grid-cols-3 gap-1.5">
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
