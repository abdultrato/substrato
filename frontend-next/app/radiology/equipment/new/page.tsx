"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Factory,
  Loader2,
  MapPin,
  Save,
  Server,
  Wrench,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const CREATE_GROUPS = [GROUPS.ADMIN, GROUPS.RADIOLOGIA];

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewRadiologyEquipmentPage() {
  useAuthGuard();
  const router = useRouter();

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

  const [errors, setErrors] = useState<Record<string, string>>({});

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
      const created = await apiFetch<{ id: number }>(ENDPOINT, {
        method: "POST",
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
      router.push(created?.id ? `/radiology/equipment/${created.id}` : "/radiology/equipment");
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao criar o equipamento.");
    } finally {
      setSaving(false);
    }
  }

  const backButton = (
    <button
      type="button"
      onClick={() => router.push("/radiology/equipment")}
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
              <h1 className="text-lg font-bold leading-tight text-foreground">Novo equipamento de imagem</h1>
              <p className="text-[11px] text-muted-foreground">Estação de aquisição do serviço de radiologia</p>
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
                Criar equipamento
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
            <SectionCard icon={Wrench} title="Identificação" accent="bg-emerald-500" compact>
              <Field label="Nome" required error={errors.name} compact>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, name: "" })); }}
                  placeholder="Tomografia 01 - Aquilion Lightning"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Código" required error={errors.code} compact>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, code: "" })); }}
                  placeholder="EQ-TC-001"
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
                <input type="text" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="Siemens Healthineers" className={INPUT_CLASS} />
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
                <input type="text" value={aeTitle} onChange={(e) => setAeTitle(e.target.value)} placeholder="AE_TC001" className={INPUT_CLASS} />
              </Field>
              <Field label="Estação" compact>
                <input type="text" value={stationName} onChange={(e) => setStationName(e.target.value)} placeholder="STATION-001" className={INPUT_CLASS} />
              </Field>
              <Field label="Endpoint PACS/RIS" compact>
                <input type="text" value={pacsEndpoint} onChange={(e) => setPacsEndpoint(e.target.value)} placeholder="dicom://pacs.local:11112/AE" className={INPUT_CLASS} />
              </Field>
              <Field label="Localização" compact>
                <div className="relative">
                  <MapPin size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bloco A - Piso 0" className={`${INPUT_CLASS} pl-8`} />
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
      </form>
    </AppLayout>
  );
}
