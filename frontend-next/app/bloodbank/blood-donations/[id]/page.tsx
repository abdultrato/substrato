"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Calendar,
  ChevronDown,
  Droplets,
  FlaskConical,
  HeartPulse,
  Loader2,
  Save,
  StickyNote,
  User,
  XCircle,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";
import type { BloodDonation } from "@/lib/api-client/models/BloodDonation";

const ALLOWED = [GROUPS.ADMIN, GROUPS.LABORATORIO, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.ENFERMAGEM];

const DONATION_STATUS_OPTS = [
  { value: "REG", label: "Registado",    color: "border-slate-300 bg-slate-100 text-slate-700" },
  { value: "SCR", label: "Em triagem",   color: "border-amber-300 bg-amber-100 text-amber-800" },
  { value: "COM", label: "Concluído",    color: "border-emerald-300 bg-emerald-100 text-emerald-800" },
  { value: "CAN", label: "Cancelado",    color: "border-red-300 bg-red-100 text-red-800" },
];

const SCREENING_STATUS_OPTS = [
  { value: "PEN", label: "Pendente",    color: "border-amber-300 bg-amber-100 text-amber-800" },
  { value: "APR", label: "Aprovado",    color: "border-emerald-300 bg-emerald-100 text-emerald-800" },
  { value: "REJ", label: "Rejeitado",   color: "border-red-300 bg-red-100 text-red-800" },
];

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

const DONATION_TYPE_OPTS  = [{ value: "WBL", label: "Sangue total" }, { value: "APH", label: "Aférese" }];
const DONOR_ROLE_OPTS     = [{ value: "VOL", label: "Voluntário" }, { value: "REP", label: "Substituição" }];
const BLOOD_TYPE_OPTS     = ["O-","O+","A-","A+","B-","B+","AB-","AB+","UNK"].map(v => ({ value: v, label: v === "UNK" ? "Desconhecido" : v }));

function fmtDate(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("pt-PT", { dateStyle: "medium" });
}

function StatusPill({ opts, value, onChange }: {
  opts: { value: string; label: string; color: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opts.map(o => (
        <button key={o.value} type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition
            ${value === o.value
              ? `${o.color} ring-2 ring-offset-1 ring-current`
              : "border-border bg-card text-muted-foreground hover:bg-muted"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TestSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`appearance-none rounded-full border py-0.5 pl-2.5 pr-6 text-[10px] font-semibold outline-none ${TEST_COLOR[value] ?? "border-border bg-card text-foreground"}`}>
          {TEST_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={10} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-60" />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = "text", min, max, step, placeholder }: {
  value: string | number; onChange: (v: string) => void;
  type?: string; min?: string; max?: string; step?: string; placeholder?: string;
}) {
  return (
    <input type={type} value={value ?? ""} min={min} max={max} step={step} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="h-8 w-full rounded-lg border border-border bg-card px-2.5 text-[12px] text-foreground outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400/30" />
  );
}

function Select({ value, onChange, opts }: { value: string; onChange: (v: string) => void; opts: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="h-8 w-full appearance-none rounded-lg border border-border bg-card px-2.5 pr-7 text-[12px] text-foreground outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400/30">
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-60" />
    </div>
  );
}

function Card({ title, accent, icon: Icon, children }: {
  title: string; accent: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />
      <div className="flex items-center gap-1.5 border-b border-border/50 px-3 py-1.5 pl-4">
        <Icon size={11} className="text-muted-foreground" />
        <h2 className="text-[11px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-3 p-3 pl-4">{children}</div>
    </section>
  );
}

type Form = {
  status: string;
  screening_status: string;
  hiv_test: string;
  syphilis_rpr_test: string;
  hepatitis_b_hbsag_test: string;
  hepatitis_c_anti_hcv_test: string;
  malaria_test: string;
  test_notes: string;
  contraindications: string;
  notes: string;
  donor_weight_kg: string;
  donor_height_cm: string;
  hemoglobin_g_dl: string;
  blood_pressure_systolic: string;
  blood_pressure_diastolic: string;
  pulse_bpm: string;
  temperature_c: string;
  volume_ml: string;
  collected_at: string;
  processed_at: string;
  donation_type: string;
  donor_role: string;
  blood_type: string;
  bag_identifier: string;
};

function toForm(d: BloodDonation): Form {
  return {
    status:                   d.status                    ?? "REG",
    screening_status:         d.screening_status          ?? "PEN",
    hiv_test:                 d.hiv_test                  ?? "NDO",
    syphilis_rpr_test:        d.syphilis_rpr_test         ?? "NDO",
    hepatitis_b_hbsag_test:   d.hepatitis_b_hbsag_test    ?? "NDO",
    hepatitis_c_anti_hcv_test:d.hepatitis_c_anti_hcv_test ?? "NDO",
    malaria_test:             d.malaria_test              ?? "NDO",
    test_notes:               d.test_notes                ?? "",
    contraindications:        d.contraindications         ?? "",
    notes:                    d.notes                     ?? "",
    donor_weight_kg:          d.donor_weight_kg           != null ? String(d.donor_weight_kg) : "",
    donor_height_cm:          d.donor_height_cm           != null ? String(d.donor_height_cm) : "",
    hemoglobin_g_dl:          d.hemoglobin_g_dl           != null ? String(d.hemoglobin_g_dl) : "",
    blood_pressure_systolic:  d.blood_pressure_systolic   != null ? String(d.blood_pressure_systolic) : "",
    blood_pressure_diastolic: d.blood_pressure_diastolic  != null ? String(d.blood_pressure_diastolic) : "",
    pulse_bpm:                d.pulse_bpm                 != null ? String(d.pulse_bpm) : "",
    temperature_c:            d.temperature_c             != null ? String(d.temperature_c) : "",
    volume_ml:                d.volume_ml                 != null ? String(d.volume_ml) : "",
    collected_at:             d.collected_at              ? d.collected_at.slice(0, 16) : "",
    processed_at:             d.processed_at              ? d.processed_at.slice(0, 16) : "",
    donation_type:            d.donation_type             ?? "WBL",
    donor_role:               d.donor_role                ?? "VOL",
    blood_type:               d.blood_type                ?? "UNK",
    bag_identifier:           d.bag_identifier            ?? "",
  };
}

export default function BloodDonationDetailPage() {
  useAuthGuard();
  const router = useRouter();
  const { id } = useParams() as { id?: string | string[] };
  const idStr = Array.isArray(id) ? id[0] : id;

  const [donation, setDonation] = useState<BloodDonation | null>(null);
  const [donorName, setDonorName] = useState<string>("");
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!idStr) return;
    try {
      setLoading(true); setError(null);
      const d = await apiFetch<BloodDonation>(`/bloodbank/donation/${idStr}/`);
      setDonation(d);
      setForm(toForm(d));
      if (d.donor) {
        apiFetch<{ name?: string }>(`/patients/${d.donor}/`).then(p => setDonorName(p.name || "")).catch(() => {});
      }
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || "Erro ao carregar doação.");
    } finally { setLoading(false); }
  }, [idStr]);

  useEffect(() => { load(); }, [load]);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm(f => f ? { ...f, [key]: value } : f);
  }

  async function save() {
    if (!form || !idStr) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        status: form.status,
        screening_status: form.screening_status,
        hiv_test: form.hiv_test,
        syphilis_rpr_test: form.syphilis_rpr_test,
        hepatitis_b_hbsag_test: form.hepatitis_b_hbsag_test,
        hepatitis_c_anti_hcv_test: form.hepatitis_c_anti_hcv_test,
        malaria_test: form.malaria_test,
        ...(form.test_notes        ? { test_notes: form.test_notes }               : {}),
        ...(form.contraindications ? { contraindications: form.contraindications } : {}),
        ...(form.notes             ? { notes: form.notes }                         : {}),
        donation_type: form.donation_type,
        donor_role: form.donor_role,
        blood_type: form.blood_type,
        bag_identifier: form.bag_identifier,
        collected_at: form.collected_at || null,
        processed_at: form.processed_at || null,
      };
      if (form.volume_ml)                 payload.volume_ml = Number(form.volume_ml);
      if (form.donor_weight_kg)           payload.donor_weight_kg = form.donor_weight_kg;
      if (form.donor_height_cm)           payload.donor_height_cm = Number(form.donor_height_cm);
      if (form.hemoglobin_g_dl)           payload.hemoglobin_g_dl = form.hemoglobin_g_dl;
      if (form.blood_pressure_systolic)   payload.blood_pressure_systolic = Number(form.blood_pressure_systolic);
      if (form.blood_pressure_diastolic)  payload.blood_pressure_diastolic = Number(form.blood_pressure_diastolic);
      if (form.pulse_bpm)                 payload.pulse_bpm = Number(form.pulse_bpm);
      if (form.temperature_c)             payload.temperature_c = form.temperature_c;
      await apiFetch(`/bloodbank/donation/${idStr}/`, { method: "PATCH", body: JSON.stringify(payload) });
      router.back();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || "Erro ao guardar.");
    } finally { setSaving(false); }
  }

  if (loading) return (
    <AppLayout requiredGroups={ALLOWED}>
      <div className="flex items-center justify-center py-24 text-muted-foreground"><Loader2 size={22} className="animate-spin" /></div>
    </AppLayout>
  );

  if (error || !donation || !form) return (
    <AppLayout requiredGroups={ALLOWED}>
      <div className="mx-auto w-[90%] space-y-3">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
          {error || "Doação não encontrada."}
        </div>
        <button onClick={() => router.back()}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium transition hover:bg-muted">
          <ArrowLeft size={13} /> Voltar
        </button>
      </div>
    </AppLayout>
  );

  const statusOpt  = DONATION_STATUS_OPTS.find(o => o.value === form.status);
  const screenOpt  = SCREENING_STATUS_OPTS.find(o => o.value === form.screening_status);

  return (
    <AppLayout requiredGroups={ALLOWED}>
      <div className="mx-auto w-[90%] space-y-2 pb-4">

        {/* ── Hero ───────────────────────────────────────────── */}
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

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-cyan-600 shadow-md shadow-rose-500/25">
              <Droplets size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10px] text-muted-foreground">{donation.custom_id || `DON-#${donation.id}`}</div>
              <h1 className="text-base font-bold leading-tight text-foreground">{form.bag_identifier || `Bolsa #${donation.id}`}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {donorName && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-600/30 dark:bg-slate-800/20 dark:text-slate-300">
                    <User size={9} /> {donorName}
                  </span>
                )}
                {donation.collected_at && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-600/30 dark:bg-slate-800/20 dark:text-slate-300">
                    <Calendar size={9} /> {fmtDate(donation.collected_at)}
                  </span>
                )}
                {statusOpt && (
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusOpt.color}`}>{statusOpt.label}</span>
                )}
                {screenOpt && (
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${screenOpt.color}`}>Triagem: {screenOpt.label}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={save} disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 px-3 text-xs font-semibold text-white shadow-md shadow-rose-500/20 transition hover:from-rose-700 hover:to-pink-700 disabled:opacity-60">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Guardar
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            <XCircle size={13} /> {error}
          </div>
        )}

        {/* ── Linha 1: Estado + Triagem ───────────────────────── */}
        <div className="grid gap-2 lg:grid-cols-2">

          <Card title="Estado da doação" accent="bg-gradient-to-b from-rose-500 to-pink-600" icon={Activity}>
            <StatusPill opts={DONATION_STATUS_OPTS} value={form.status} onChange={v => set("status", v)} />
          </Card>

          <Card title="Estado de triagem" accent="bg-gradient-to-b from-amber-500 to-orange-500" icon={FlaskConical}>
            <StatusPill opts={SCREENING_STATUS_OPTS} value={form.screening_status} onChange={v => set("screening_status", v)} />
          </Card>

        </div>

        {/* ── Linha 2: Rastreio serológico ────────────────────── */}
        <Card title="Rastreio serológico" accent="bg-gradient-to-b from-violet-500 to-purple-600" icon={FlaskConical}>
          <div className="grid gap-0 divide-y divide-border/30">
            <TestSelect label="VIH"             value={form.hiv_test}                onChange={v => set("hiv_test", v)} />
            <TestSelect label="Sífilis (RPR)"   value={form.syphilis_rpr_test}       onChange={v => set("syphilis_rpr_test", v)} />
            <TestSelect label="Hepatite B"      value={form.hepatitis_b_hbsag_test}  onChange={v => set("hepatitis_b_hbsag_test", v)} />
            <TestSelect label="Hepatite C"      value={form.hepatitis_c_anti_hcv_test} onChange={v => set("hepatitis_c_anti_hcv_test", v)} />
            <TestSelect label="Malária"         value={form.malaria_test}            onChange={v => set("malaria_test", v)} />
          </div>
        </Card>

        {/* ── Linha 3: Sinais vitais + Detalhes colheita ─────── */}
        <div className="grid gap-2 lg:grid-cols-2">

          <Card title="Sinais vitais do doador" accent="bg-cyan-500" icon={HeartPulse}>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Peso (kg)">
                <Input type="number" min="0" step="0.1" value={form.donor_weight_kg} onChange={v => set("donor_weight_kg", v)} placeholder="ex: 70.5" />
              </Field>
              <Field label="Altura (cm)">
                <Input type="number" min="0" value={form.donor_height_cm} onChange={v => set("donor_height_cm", v)} placeholder="ex: 175" />
              </Field>
              <Field label="Hemoglobina (g/dL)">
                <Input type="number" min="0" step="0.1" value={form.hemoglobin_g_dl} onChange={v => set("hemoglobin_g_dl", v)} placeholder="ex: 13.5" />
              </Field>
              <Field label="Temperatura (°C)">
                <Input type="number" min="0" step="0.1" value={form.temperature_c} onChange={v => set("temperature_c", v)} placeholder="ex: 36.8" />
              </Field>
              <Field label="Pressão sistólica">
                <Input type="number" min="0" value={form.blood_pressure_systolic} onChange={v => set("blood_pressure_systolic", v)} placeholder="ex: 120" />
              </Field>
              <Field label="Pressão diastólica">
                <Input type="number" min="0" value={form.blood_pressure_diastolic} onChange={v => set("blood_pressure_diastolic", v)} placeholder="ex: 80" />
              </Field>
              <Field label="Pulso (bpm)">
                <Input type="number" min="0" value={form.pulse_bpm} onChange={v => set("pulse_bpm", v)} placeholder="ex: 72" />
              </Field>
            </div>
          </Card>

          <Card title="Detalhes da colheita" accent="bg-gradient-to-b from-blue-500 to-indigo-600" icon={Droplets}>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Identificador bolsa">
                <Input value={form.bag_identifier} onChange={v => set("bag_identifier", v)} placeholder="DON-XXXXX" />
              </Field>
              <Field label="Tipo de doador">
                <Select value={form.donor_role} onChange={v => set("donor_role", v)} opts={DONOR_ROLE_OPTS} />
              </Field>
              <Field label="Tipo de colheita">
                <Select value={form.donation_type} onChange={v => set("donation_type", v)} opts={DONATION_TYPE_OPTS} />
              </Field>
              <Field label="Grupo sanguíneo">
                <Select value={form.blood_type} onChange={v => set("blood_type", v)} opts={BLOOD_TYPE_OPTS} />
              </Field>
              <Field label="Volume colhido (mL)">
                <Input type="number" min="0" value={form.volume_ml} onChange={v => set("volume_ml", v)} placeholder="ex: 450" />
              </Field>
              <Field label="Data de colheita">
                <Input type="datetime-local" value={form.collected_at} onChange={v => set("collected_at", v)} />
              </Field>
              <Field label="Data de processamento">
                <Input type="datetime-local" value={form.processed_at} onChange={v => set("processed_at", v)} />
              </Field>
            </div>
          </Card>

        </div>

        {/* ── Linha 4: Notas ──────────────────────────────────── */}
        <Card title="Notas e observações" accent="bg-slate-400" icon={StickyNote}>
          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Notas de triagem">
              <textarea value={form.test_notes} onChange={e => set("test_notes", e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12px] text-foreground outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400/30 resize-none" />
            </Field>
            <Field label="Contraindicações">
              <textarea value={form.contraindications} onChange={e => set("contraindications", e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12px] text-foreground outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400/30 resize-none" />
            </Field>
            <Field label="Observações gerais">
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12px] text-foreground outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400/30 resize-none" />
            </Field>
          </div>
        </Card>

      </div>
    </AppLayout>
  );
}
