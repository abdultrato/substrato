"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Droplets,
  FlaskConical,
  HeartPulse,
  Loader2,
  StickyNote,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const ALLOWED = [GROUPS.ADMIN, GROUPS.LABORATORIO, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.ENFERMAGEM];

/* ── Opções ─────────────────────────────────────────────────────────── */
const DONOR_ROLE_OPTS    = [{ value: "VOL", label: "Voluntário" }, { value: "REP", label: "Substituição" }];
const DONATION_TYPE_OPTS = [{ value: "WBL", label: "Sangue total" }, { value: "APH", label: "Aférese" }];
const BLOOD_TYPE_OPTS    = ["O-","O+","A-","A+","B-","B+","AB-","AB+","UNK"].map(v => ({ value: v, label: v === "UNK" ? "Desconhecido" : v }));

const TEST_OPTS = [
  { value: "NDO", label: "N/D" },
  { value: "PEN", label: "Pendente" },
  { value: "NEG", label: "Negativo" },
  { value: "POS", label: "Positivo" },
  { value: "INC", label: "Inconclusivo" },
];
const TEST_COLOR: Record<string, string> = {
  NDO: "border-slate-200 bg-slate-50 text-slate-500",
  PEN: "border-amber-200 bg-amber-50 text-amber-700",
  NEG: "border-emerald-200 bg-emerald-50 text-emerald-700",
  POS: "border-red-200 bg-red-50 text-red-700",
  INC: "border-orange-200 bg-orange-50 text-orange-700",
};

const ERROR_LABELS: Record<string, string> = {
  "HIV test": "VIH",
  "Syphilis rpr test": "Sífilis (RPR)",
  "Hepatitis b hbsag test": "Hepatite B",
  "Hepatitis c anti hcv test": "Hepatite C",
  "Malaria test": "Malária",
  "Doador peso (kg)": "Peso do doador",
  "Hemoglobin g dl": "Hemoglobina",
  donor: "Doador",
}

function toLocalCalendarDate(value: string | Date) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  }
  const raw = String(value || "").trim()
  if (!raw) return new Date(NaN)
  const isoDate = raw.includes("T") ? raw.split("T")[0] : raw
  const [year, month, day] = isoDate.split("-").map((part) => parseInt(part, 10))
  if (!year || !month || !day) return new Date(raw)
  return new Date(year, month - 1, day)
}

function parseDonationSubmitError(message: string): {
  title: string
  summary?: string
  items: { label: string; message: string }[]
} | null {
  const raw = String(message || "").trim()
  if (!raw) return null

  const knownPairs = Object.keys(ERROR_LABELS)
    .map((label) => {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      return raw.match(new RegExp(`${escaped}:\\s*([^]+?)(?=\\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][^:]{1,40}:|$)`, "i"))
        ? {
            label: ERROR_LABELS[label],
            message:
              raw.match(new RegExp(`${escaped}:\\s*([^]+?)(?=\\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][^:]{1,40}:|$)`, "i"))?.[1]?.trim() || "",
          }
        : null
    })
    .filter(Boolean) as { label: string; message: string }[]

  if (knownPairs.length > 0) {
    return {
      title: "Triagem clínica incompleta para aprovação",
      summary: "Antes de concluir esta doação, preencha os parâmetros obrigatórios e garanta resultados compatíveis com triagem aprovada.",
      items: knownPairs,
    }
  }

  if (raw.toLowerCase().includes("nova doacao ainda nao permitida")) {
    return {
      title: "Doador temporariamente impedido para nova doação",
      summary: raw,
      items: [],
    }
  }

  return null
}

/* ── Tipos ───────────────────────────────────────────────────────────── */
type FormState = {
  /* Etapa 1 */
  donor: string;
  donor_role: string;
  blood_type: string;
  donation_type: string;
  volume_ml: string;
  collected_at: string;
  /* Etapa 2 */
  donor_weight_kg: string;
  donor_height_cm: string;
  hemoglobin_g_dl: string;
  blood_pressure_systolic: string;
  blood_pressure_diastolic: string;
  pulse_bpm: string;
  temperature_c: string;
  /* Etapa 3 */
  hiv_test: string;
  syphilis_rpr_test: string;
  hepatitis_b_hbsag_test: string;
  hepatitis_c_anti_hcv_test: string;
  malaria_test: string;
  test_notes: string;
  contraindications: string;
  notes: string;
};

const INITIAL: FormState = {
  donor: "",
  donor_role: "VOL",
  blood_type: "UNK",
  donation_type: "WBL",
  volume_ml: "450",
  collected_at: new Date().toISOString().slice(0, 16),
  donor_weight_kg: "",
  donor_height_cm: "",
  hemoglobin_g_dl: "",
  blood_pressure_systolic: "",
  blood_pressure_diastolic: "",
  pulse_bpm: "",
  temperature_c: "",
  hiv_test: "PEN",
  syphilis_rpr_test: "PEN",
  hepatitis_b_hbsag_test: "PEN",
  hepatitis_c_anti_hcv_test: "PEN",
  malaria_test: "PEN",
  test_notes: "",
  contraindications: "",
  notes: "",
};

/* ── Componentes ─────────────────────────────────────────────────────── */
function Pills({ opts, value, onChange }: {
  opts: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opts.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition
            ${value === o.value
              ? "border-rose-400 bg-rose-500 text-white shadow-sm"
              : "border-border bg-card text-muted-foreground hover:bg-muted"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SelField({ label, value, onChange, opts }: {
  label: string; value: string; onChange: (v: string) => void;
  opts: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      {label && <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>}
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="h-9 w-full appearance-none rounded-lg border border-border bg-card px-3 pr-8 text-[12px] text-foreground outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400/30">
          {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}

function TxtField({ label, value, onChange, type = "text", min, max, step, placeholder, readOnly }: {
  label: string; value: string | number; onChange: (v: string) => void;
  type?: string; min?: string; max?: string; step?: string; placeholder?: string; readOnly?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <input type={type} value={value ?? ""} min={min} max={max} step={step} placeholder={placeholder}
        readOnly={readOnly}
        onChange={e => onChange(e.target.value)}
        className={`h-9 w-full rounded-lg border border-border px-3 text-[12px] text-foreground outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400/30 ${readOnly ? "bg-muted/50 cursor-not-allowed" : "bg-card"}`} />
    </div>
  );
}

function TestRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/40 py-1.5 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className={`appearance-none rounded-full border py-0.5 pl-2.5 pr-6 text-[10px] font-semibold outline-none ${TEST_COLOR[value] ?? "border-border bg-card text-foreground"}`}>
          {TEST_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={10} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-60" />
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-0.5">
      <span className="shrink-0 text-[10px] text-muted-foreground">{label}</span>
      <span className="text-right text-[11px] font-medium text-foreground">{value}</span>
    </div>
  );
}

/* ── Etapas config ──────────────────────────────────────────────────── */
const STEPS = [
  { label: "Colheita",      icon: Droplets },
  { label: "Sinais vitais", icon: HeartPulse },
  { label: "Rastreio",      icon: FlaskConical },
  { label: "Revisão",       icon: StickyNote },
];

/* ── Página principal ───────────────────────────────────────────────── */
function NewDonationWizard() {
  useAuthGuard();
  const router = useRouter();
  const searchParams = useSearchParams();
  const donorParam = searchParams?.get("donor") || "";

  const [form, setForm] = useState<FormState>({ ...INITIAL, donor: donorParam });
  const [donorName, setDonorName] = useState<string>("");
  const [bloodTypeLocked, setBloodTypeLocked] = useState(false);
  const [eligibilityBlock, setEligibilityBlock] = useState<{
    message: string; lastDate: string; daysElapsed: number; daysRequired: number; releaseDate: string;
  } | null>(null);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!donorParam) return;
    (async () => {
      try {
        const patient = await apiFetch<{ name?: string; blood_type?: string; gender?: string }>(`/patients/${donorParam}/`);
        setDonorName(patient.name || "");

        // Verificar se o grupo sanguíneo já é conhecido pelo paciente
        if (patient.blood_type && patient.blood_type !== "UNK") {
          setForm(f => ({ ...f, blood_type: patient.blood_type! }));
          setBloodTypeLocked(true);
        }

        // Verificar doações anteriores — herdar grupo sanguíneo e verificar elegibilidade
        try {
          const res = await apiFetch<{ results?: { blood_type?: string; collected_at?: string }[]; items?: { blood_type?: string; collected_at?: string }[] }>(
            `/bloodbank/donation/?donor=${donorParam}&page_size=1&ordering=-collected_at`
          );
          const prev = (res?.results ?? res?.items ?? [])[0];

          // Herdar grupo sanguíneo da última doação se ainda não bloqueado
          if (!patient.blood_type || patient.blood_type === "UNK") {
            if (prev?.blood_type && prev.blood_type !== "UNK") {
              setForm(f => ({ ...f, blood_type: prev.blood_type! }));
              setBloodTypeLocked(true);
            }
          }

          // Verificar período de interdição
          if (prev?.collected_at) {
            const gender = (patient.gender || "").toLowerCase();
            const isFemale = gender.includes("femin") || gender.includes("femenin");
            const daysRequired = isFemale ? 120 : 90;
            const lastDate = toLocalCalendarDate(prev.collected_at);
            const today = toLocalCalendarDate(new Date());
            const daysElapsed = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysElapsed < daysRequired) {
              const releaseDate = new Date(lastDate);
              releaseDate.setDate(releaseDate.getDate() + daysRequired);
              setEligibilityBlock({
                message: isFemale
                  ? `Doadoras do sexo feminino devem aguardar 120 dias entre doações.`
                  : `Doadores do sexo masculino devem aguardar 90 dias entre doações.`,
                lastDate: lastDate.toLocaleDateString("pt-PT", { dateStyle: "long" }),
                daysElapsed,
                daysRequired,
                releaseDate: releaseDate.toLocaleDateString("pt-PT", { dateStyle: "long" }),
              });
            }
          }
        } catch { /* sem doações anteriores */ }
      } catch { /* falha ao carregar paciente */ }
    })();
  }, [donorParam]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }

  function validateStep(s: number): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (s === 0) {
      if (!form.donor.trim())  errs.donor        = "Obrigatório";
      if (!form.collected_at)  errs.collected_at  = "Obrigatório";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function next() {
    if (!validateStep(step)) return;
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  }
  function prev() { setStep(s => Math.max(s - 1, 0)); }

  const submit = useCallback(async () => {
    if (eligibilityBlock) {
      setSubmitError(
        `Nova doação ainda não permitida para este doador. ${eligibilityBlock.message} Apto novamente em ${eligibilityBlock.releaseDate}.`
      );
      return;
    }
    setSubmitting(true); setSubmitError(null);
    try {
      const payload: Record<string, unknown> = {
        donor: Number(form.donor),
        donor_role: form.donor_role,
        blood_type: form.blood_type,
        donation_type: form.donation_type,
        collected_at: form.collected_at || null,
        status: "REG",
        screening_status: "PEN",
        hiv_test: form.hiv_test,
        syphilis_rpr_test: form.syphilis_rpr_test,
        hepatitis_b_hbsag_test: form.hepatitis_b_hbsag_test,
        hepatitis_c_anti_hcv_test: form.hepatitis_c_anti_hcv_test,
        malaria_test: form.malaria_test,
      };
      if (form.volume_ml)                payload.volume_ml                = Number(form.volume_ml);
      if (form.donor_weight_kg)          payload.donor_weight_kg          = form.donor_weight_kg;
      if (form.donor_height_cm)          payload.donor_height_cm          = Number(form.donor_height_cm);
      if (form.hemoglobin_g_dl)          payload.hemoglobin_g_dl          = form.hemoglobin_g_dl;
      if (form.blood_pressure_systolic)  payload.blood_pressure_systolic  = Number(form.blood_pressure_systolic);
      if (form.blood_pressure_diastolic) payload.blood_pressure_diastolic = Number(form.blood_pressure_diastolic);
      if (form.pulse_bpm)                payload.pulse_bpm                = Number(form.pulse_bpm);
      if (form.temperature_c)            payload.temperature_c            = form.temperature_c;
      if (form.test_notes)               payload.test_notes               = form.test_notes;
      if (form.contraindications)        payload.contraindications        = form.contraindications;
      if (form.notes)                    payload.notes                    = form.notes;

      const created = await apiFetch<{ id?: number }>("/bloodbank/donation/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (created?.id) {
        router.push(`/bloodbank/blood-donations/${created.id}`);
      } else if (form.donor) {
        router.push(`/bloodbank/donors/${form.donor}`);
      } else {
        router.push("/bloodbank");
      }
    } catch (e: unknown) {
      setSubmitError((e as { message?: string })?.message || "Erro ao registar doação.");
    } finally { setSubmitting(false); }
  }, [eligibilityBlock, form, router]);

  const testLabel: Record<string, string> = { NDO: "N/D", PEN: "Pendente", NEG: "Negativo", POS: "Positivo", INC: "Inconclusivo" };
  const donorRoleLabel = DONOR_ROLE_OPTS.find(o => o.value === form.donor_role)?.label ?? form.donor_role;
  const donationTypeLabel = DONATION_TYPE_OPTS.find(o => o.value === form.donation_type)?.label ?? form.donation_type;
  const bloodTypeLabel = form.blood_type === "UNK" ? "Desconhecido" : form.blood_type;
  const parsedSubmitError = submitError ? parseDonationSubmitError(submitError) : null

  return (
    <AppLayout requiredGroups={ALLOWED}>
      <div className="mx-auto w-[90%] space-y-3 pb-6">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-rose-500 via-pink-500 to-cyan-500" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3 pl-5">
            <button type="button" onClick={() => router.back()}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
              <ArrowLeft size={13} /> Voltar
            </button>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-cyan-600 shadow-md shadow-rose-500/25">
              <Droplets size={18} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Banco de Sangue</div>
              <h1 className="text-base font-bold leading-tight text-foreground">Nova doação de sangue</h1>
              {donorName && (
                <p className="text-[11px] text-muted-foreground">Doador: <span className="font-semibold text-foreground">{donorName}</span></p>
              )}
            </div>

            {/* Navegação dentro do hero */}
            <div className="flex items-center gap-2">
              <button type="button" onClick={prev} disabled={step === 0}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40">
                <ArrowLeft size={13} /> Anterior
              </button>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {step + 1} / {STEPS.length}
              </span>
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={next} disabled={!!eligibilityBlock}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 px-3 text-xs font-semibold text-white shadow-md shadow-rose-500/20 transition hover:from-rose-700 hover:to-pink-700 disabled:opacity-40 disabled:cursor-not-allowed">
                  Seguinte <ArrowRight size={13} />
                </button>
              ) : (
                <button type="button" onClick={submit} disabled={submitting || !!eligibilityBlock}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 px-3 text-xs font-semibold text-white shadow-md shadow-rose-500/20 transition hover:from-rose-700 hover:to-pink-700 disabled:opacity-60">
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Guardar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Stepper ───────────────────────────────────────────── */}
        <div className="flex items-center gap-0 overflow-hidden rounded-xl border border-white/20 bg-white/25 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          {STEPS.map((s, i) => {
            const done    = i < step;
            const current = i === step;
            const Icon    = s.icon;
            return (
              <div key={i} className={`relative flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition
                ${current  ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white"      : ""}
                ${done     ? "text-emerald-600 dark:text-emerald-400"                      : ""}
                ${!current && !done ? "text-muted-foreground"                              : ""}
                ${i > 0 ? "border-l border-white/20 dark:border-white/10"                 : ""}`}>
                {done
                  ? <Check size={13} className="shrink-0" />
                  : <Icon size={13} className="shrink-0" />}
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{i + 1}</span>
              </div>
            );
          })}
        </div>

        {eligibilityBlock ? (
          <div className="relative overflow-hidden rounded-xl border border-amber-300 bg-amber-50 shadow-sm dark:border-amber-700/50 dark:bg-amber-900/20">
            <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-amber-500 to-orange-500" />
            <div className="space-y-4 px-4 py-4 pl-5">
              <div>
                <h2 className="text-sm font-bold text-amber-900 dark:text-amber-100">Nova doação indisponível neste momento</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">{eligibilityBlock.message}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-amber-200 bg-white/70 px-3 py-2 dark:border-amber-700/30 dark:bg-white/[0.04]">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Última doação</div>
                  <div className="mt-0.5 text-[11px] font-medium text-amber-900 dark:text-amber-100">{eligibilityBlock.lastDate}</div>
                </div>
                <div className="rounded-lg border border-amber-200 bg-white/70 px-3 py-2 dark:border-amber-700/30 dark:bg-white/[0.04]">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Dias decorridos</div>
                  <div className="mt-0.5 text-[11px] font-medium text-amber-900 dark:text-amber-100">{eligibilityBlock.daysElapsed} de {eligibilityBlock.daysRequired}</div>
                </div>
                <div className="rounded-lg border border-amber-200 bg-white/70 px-3 py-2 dark:border-amber-700/30 dark:bg-white/[0.04]">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Liberado em</div>
                  <div className="mt-0.5 text-[11px] font-medium text-amber-900 dark:text-amber-100">{eligibilityBlock.releaseDate}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push(form.donor ? `/bloodbank/donors/${form.donor}` : "/bloodbank")}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-300 bg-white/80 px-3 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-white dark:border-amber-700/40 dark:bg-white/[0.06] dark:text-amber-200"
                >
                  <ArrowLeft size={13} /> Voltar ao doador
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Conteúdo por etapa ────────────────────────────────── */}
        {!eligibilityBlock ? (
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-rose-500 via-pink-500 to-cyan-500" />

          <div className="space-y-4 p-4 pl-5">

            {/* ── Etapa 0: Colheita ──────────────────────────────── */}
            {step === 0 && (
              <>
                <h2 className="text-[12px] font-bold text-foreground">Dados da colheita</h2>

                {eligibilityBlock && (
                  <div className="relative overflow-hidden rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-900/20">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-800/40 dark:text-amber-300">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-bold text-amber-800 dark:text-amber-200">Doador temporariamente inelegível</p>
                        <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-300">{eligibilityBlock.message}</p>
                        <div className="mt-2 grid grid-cols-3 gap-3 text-[10px]">
                          <div className="rounded-lg border border-amber-200 bg-white/60 px-2 py-1.5 dark:border-amber-700/40 dark:bg-amber-900/30">
                            <p className="font-semibold text-amber-600 dark:text-amber-400">Última doação</p>
                            <p className="font-bold text-amber-900 dark:text-amber-100">{eligibilityBlock.lastDate}</p>
                          </div>
                          <div className="rounded-lg border border-amber-200 bg-white/60 px-2 py-1.5 dark:border-amber-700/40 dark:bg-amber-900/30">
                            <p className="font-semibold text-amber-600 dark:text-amber-400">Dias decorridos</p>
                            <p className="font-bold text-amber-900 dark:text-amber-100">{eligibilityBlock.daysElapsed} de {eligibilityBlock.daysRequired} dias</p>
                          </div>
                          <div className="rounded-lg border border-amber-200 bg-white/60 px-2 py-1.5 dark:border-amber-700/40 dark:bg-amber-900/30">
                            <p className="font-semibold text-amber-600 dark:text-amber-400">Apto a partir de</p>
                            <p className="font-bold text-amber-900 dark:text-amber-100">{eligibilityBlock.releaseDate}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <TxtField label="Doador *" value={donorName || form.donor}
                    onChange={v => set("donor", v)}
                    placeholder="ID do paciente" readOnly={!!donorParam} />
                  {errors.donor && <p className="col-span-full -mt-2 text-[10px] text-red-600">{errors.donor}</p>}

                  <TxtField label="Data e hora de colheita *" value={form.collected_at}
                    onChange={v => set("collected_at", v)} type="datetime-local" />
                  {errors.collected_at && <p className="col-span-full -mt-2 text-[10px] text-red-600">{errors.collected_at}</p>}

                  <TxtField label="Volume colhido (mL)" value={form.volume_ml}
                    onChange={v => set("volume_ml", v)} type="number" min="0" placeholder="450" />

                </div>

                <div className="flex items-end justify-between gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Grupo sanguíneo</label>
                    {bloodTypeLocked ? (
                      <div className="flex h-9 items-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
                          <Droplets size={11} /> {form.blood_type === "UNK" ? "Desconhecido" : form.blood_type}
                        </span>
                      </div>
                    ) : (
                      <SelField label="" value={form.blood_type} onChange={v => set("blood_type", v)} opts={BLOOD_TYPE_OPTS} />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tipo de doador</label>
                    <Pills opts={DONOR_ROLE_OPTS} value={form.donor_role} onChange={v => set("donor_role", v)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tipo de colheita</label>
                    <Pills opts={DONATION_TYPE_OPTS} value={form.donation_type} onChange={v => set("donation_type", v)} />
                  </div>
                </div>
              </>
            )}

            {/* ── Etapa 1: Sinais vitais ─────────────────────────── */}
            {step === 1 && (
              <>
                <h2 className="text-[12px] font-bold text-foreground">Sinais vitais do doador</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <TxtField label="Peso (kg)" value={form.donor_weight_kg}
                    onChange={v => set("donor_weight_kg", v)} type="number" min="0" step="0.1" placeholder="ex: 70.5" />
                  <TxtField label="Altura (cm)" value={form.donor_height_cm}
                    onChange={v => set("donor_height_cm", v)} type="number" min="0" placeholder="ex: 175" />
                  <TxtField label="Hemoglobina (g/dL)" value={form.hemoglobin_g_dl}
                    onChange={v => set("hemoglobin_g_dl", v)} type="number" min="0" step="0.1" placeholder="ex: 13.5" />
                  <TxtField label="Pressão sistólica (mmHg)" value={form.blood_pressure_systolic}
                    onChange={v => set("blood_pressure_systolic", v)} type="number" min="0" placeholder="ex: 120" />
                  <TxtField label="Pressão diastólica (mmHg)" value={form.blood_pressure_diastolic}
                    onChange={v => set("blood_pressure_diastolic", v)} type="number" min="0" placeholder="ex: 80" />
                  <TxtField label="Pulso (bpm)" value={form.pulse_bpm}
                    onChange={v => set("pulse_bpm", v)} type="number" min="0" placeholder="ex: 72" />
                  <TxtField label="Temperatura (°C)" value={form.temperature_c}
                    onChange={v => set("temperature_c", v)} type="number" min="0" step="0.1" placeholder="ex: 36.8" />
                </div>
                <p className="text-[10px] text-muted-foreground">Todos os campos desta etapa são opcionais.</p>
              </>
            )}

            {/* ── Etapa 2: Rastreio ──────────────────────────────── */}
            {step === 2 && (
              <>
                <h2 className="text-[12px] font-bold text-foreground">Rastreio serológico</h2>
                <div className="rounded-lg border border-border/50 bg-white/20 dark:bg-white/5">
                  <TestRow label="VIH"             value={form.hiv_test}                  onChange={v => set("hiv_test", v)} />
                  <TestRow label="Sífilis (RPR)"   value={form.syphilis_rpr_test}         onChange={v => set("syphilis_rpr_test", v)} />
                  <TestRow label="Hepatite B"      value={form.hepatitis_b_hbsag_test}    onChange={v => set("hepatitis_b_hbsag_test", v)} />
                  <TestRow label="Hepatite C"      value={form.hepatitis_c_anti_hcv_test} onChange={v => set("hepatitis_c_anti_hcv_test", v)} />
                  <TestRow label="Malária"         value={form.malaria_test}              onChange={v => set("malaria_test", v)} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1 lg:col-span-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Contraindicações</label>
                    <textarea value={form.contraindications} onChange={e => set("contraindications", e.target.value)}
                      rows={3} placeholder="Descreva contraindicações encontradas..."
                      className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-[12px] text-foreground outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400/30" />
                  </div>
                  <div className="space-y-1 lg:col-span-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Notas de triagem</label>
                    <textarea value={form.test_notes} onChange={e => set("test_notes", e.target.value)}
                      rows={3} placeholder="Observações sobre o rastreio..."
                      className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-[12px] text-foreground outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400/30" />
                  </div>
                  <div className="space-y-1 lg:col-span-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Observações gerais</label>
                    <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                      rows={3} placeholder="Outras observações relevantes..."
                      className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-[12px] text-foreground outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400/30" />
                  </div>
                </div>
              </>
            )}

            {/* ── Etapa 3: Revisão ───────────────────────────────── */}
            {step === 3 && (
              <>
                <h2 className="text-[12px] font-bold text-foreground">Revisão antes de registar</h2>
                <div className="grid gap-3 sm:grid-cols-3">

                  <div className="rounded-lg border border-white/30 bg-white/30 p-3 dark:border-white/10 dark:bg-white/5">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">Colheita</p>
                    <div className="space-y-0.5">
                      <SummaryRow label="Doador"      value={donorName || form.donor} />
                      <SummaryRow label="Tipo doador" value={donorRoleLabel} />
                      <SummaryRow label="Colheita"    value={donationTypeLabel} />
                      <SummaryRow label="Grupo sang." value={bloodTypeLabel} />
                      <SummaryRow label="Volume"      value={form.volume_ml ? `${form.volume_ml} mL` : undefined} />
                      <SummaryRow label="Data"        value={form.collected_at ? new Date(form.collected_at).toLocaleString("pt-PT") : undefined} />
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/30 bg-white/30 p-3 dark:border-white/10 dark:bg-white/5">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-cyan-600 dark:text-cyan-400">Sinais vitais</p>
                    <div className="space-y-0.5">
                      <SummaryRow label="Peso"       value={form.donor_weight_kg ? `${form.donor_weight_kg} kg` : undefined} />
                      <SummaryRow label="Altura"     value={form.donor_height_cm ? `${form.donor_height_cm} cm` : undefined} />
                      <SummaryRow label="Hemoglobina" value={form.hemoglobin_g_dl ? `${form.hemoglobin_g_dl} g/dL` : undefined} />
                      <SummaryRow label="Pressão"    value={form.blood_pressure_systolic && form.blood_pressure_diastolic ? `${form.blood_pressure_systolic}/${form.blood_pressure_diastolic} mmHg` : undefined} />
                      <SummaryRow label="Pulso"      value={form.pulse_bpm ? `${form.pulse_bpm} bpm` : undefined} />
                      <SummaryRow label="Temperatura" value={form.temperature_c ? `${form.temperature_c} °C` : undefined} />
                    </div>
                    {!form.donor_weight_kg && !form.hemoglobin_g_dl && (
                      <p className="text-[9px] text-muted-foreground">Nenhum sinal vital registado.</p>
                    )}
                  </div>

                  <div className="rounded-lg border border-white/30 bg-white/30 p-3 dark:border-white/10 dark:bg-white/5">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">Rastreio serológico</p>
                    <div className="space-y-0.5">
                      <SummaryRow label="VIH"         value={testLabel[form.hiv_test]} />
                      <SummaryRow label="Sífilis"     value={testLabel[form.syphilis_rpr_test]} />
                      <SummaryRow label="Hepatite B"  value={testLabel[form.hepatitis_b_hbsag_test]} />
                      <SummaryRow label="Hepatite C"  value={testLabel[form.hepatitis_c_anti_hcv_test]} />
                      <SummaryRow label="Malária"     value={testLabel[form.malaria_test]} />
                    </div>
                  </div>
                </div>

                {submitError && (
                  parsedSubmitError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50/95 px-4 py-3 text-red-800 shadow-sm dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-red-700 dark:text-red-300">
                        {parsedSubmitError.title}
                      </div>
                      {parsedSubmitError.summary ? (
                        <p className="mt-1 text-[11px] leading-relaxed">{parsedSubmitError.summary}</p>
                      ) : null}
                      {parsedSubmitError.items.length > 0 ? (
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {parsedSubmitError.items.map((item, index) => (
                            <div
                              key={`${item.label}-${index}`}
                              className="rounded-lg border border-red-200/80 bg-white/65 px-3 py-2 text-[11px] shadow-sm dark:border-red-700/30 dark:bg-white/[0.05]"
                            >
                              <div className="font-semibold text-red-700 dark:text-red-300">{item.label}</div>
                              <div className="mt-0.5 text-red-800/90 dark:text-red-200">{item.message}</div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
                      {submitError}
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </div>
        ) : null}

      </div>
    </AppLayout>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 size={22} className="animate-spin" />
      </div>
    }>
      <NewDonationWizard />
    </Suspense>
  );
}
