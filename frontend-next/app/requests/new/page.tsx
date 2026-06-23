"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  FlaskConical,
  Loader2,
  Save,
  Stethoscope,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { SearchableRelationSelect, SearchableMultiSelect } from "@/components/form/AutoForm";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS } from "@/lib/rbac";
import type { RelationTarget } from "@/lib/resources/relationOptions";

// ── Hardcoded relation targets — zero OPTIONS requests ────────────────────────

const T_PATIENT: RelationTarget = {
  endpoint: "/clinical/patient/",
  labelFields: ["name", "document_number", "custom_id"],
};
const T_PHYSICIAN: RelationTarget = {
  endpoint: "/consultations/doctors/",
  labelFields: ["name", "profession_name", "custom_id"],
};
const T_EXAMS: RelationTarget = {
  endpoint: "/clinical/exam/",
  labelFields: ["name", "code", "custom_id"],
};
const T_PROFILE: RelationTarget = {
  endpoint: "/clinical/occupational_profile/",
  labelFields: ["name", "profession", "custom_id"],
};
const T_COMPANY: RelationTarget = {
  endpoint: "/external_entities/empresa/",
  labelFields: ["name", "nuit", "custom_id"],
};

const CREATE_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.RECEPCAO,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
];

// ── Design components ─────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative z-0 rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm focus-within:z-50 dark:bg-white/5 dark:border-white/10">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
          <Icon size={13} />
        </span>
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-[11px] font-medium text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewRequestPage() {
  useAuthGuard();
  const router = useRouter();
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [patient, setPatient] = useState<number | null>(null);
  const [physician, setPhysician] = useState<number | null>(null);
  const [exams, setExams] = useState<number[]>([]);
  const [isOccupational, setIsOccupational] = useState(false);
  const [profile, setProfile] = useState<number | null>(null);
  const [company, setCompany] = useState<number | null>(null);
  const [clinicalStatus, setClinicalStatus] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!patient) e.patient = "Selecione um paciente.";
    if (exams.length === 0) e.exams = "Adicione pelo menos um exame.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const data = await apiFetch<{ id?: number; custom_id?: string }>("/clinical/labrequest/", {
        method: "POST",
        body: JSON.stringify({
          patient,
          requesting_physician: physician ?? null,
          exams,
          is_occupational: isOccupational,
          occupational_profile: isOccupational ? profile : null,
          requesting_company: company ?? null,
          clinical_status: clinicalStatus || null,
          type: "LAB",
        }),
      });
      const newId = data?.id;
      if (!newId) throw new Error("Resposta inesperada do servidor.");
      router.push(`/requests/${newId}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao criar requisição.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={CREATE_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="space-y-3">

        {/* ── Header ── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold leading-tight text-foreground">Nova requisição</h1>
              <p className="text-[11px] text-muted-foreground">Exames laboratoriais</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground-2 transition hover:bg-muted"
              >
                <ArrowLeft size={14} />
                Voltar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Criar requisição
              </button>
            </div>
          </div>
        </div>

        {saveError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {saveError}
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-2">

          {/* ── Requisição ── */}
          <SectionCard icon={User} title="Paciente e médico">
            <Field label="Paciente" required error={errors.patient}>
              <SearchableRelationSelect
                fieldName="patient"
                value={patient}
                onChange={(v) => { setPatient(v); if (v) setErrors((p) => ({ ...p, patient: "" })); }}
                target={T_PATIENT}
                placeholder="Pesquisar pelo nome ou documento..."
                safeRefreshToken={safeRefreshToken}
              />
            </Field>
            <Field label="Médico solicitante">
              <SearchableRelationSelect
                fieldName="requesting_physician"
                value={physician}
                onChange={setPhysician}
                target={T_PHYSICIAN}
                placeholder="Pesquisar médico..."
                safeRefreshToken={safeRefreshToken}
              />
            </Field>
          </SectionCard>

          {/* ── Exames ── */}
          <SectionCard icon={FlaskConical} title="Exames solicitados">
            <Field
              label="Exames"
              required
              hint="Pesquise e clique para adicionar cada exame necessário."
              error={errors.exams}
            >
              <SearchableMultiSelect
                fieldName="exams"
                value={exams}
                onChange={(v) => { setExams(v); if (v.length > 0) setErrors((p) => ({ ...p, exams: "" })); }}
                target={T_EXAMS}
                placeholder="Pesquisar exames..."
                safeRefreshToken={safeRefreshToken}
              />
            </Field>
          </SectionCard>

          {/* ── Medicina Ocupacional ── */}
          <SectionCard icon={Stethoscope} title="Medicina ocupacional">
            <Field label="Tipo de requisição">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-background px-3.5 py-2.5 transition hover:border-violet-400">
                <input
                  type="checkbox"
                  checked={isOccupational}
                  onChange={(e) => {
                    setIsOccupational(e.target.checked);
                    if (!e.target.checked) setProfile(null);
                  }}
                  className="h-4 w-4 rounded border-border accent-violet-600"
                />
                <span className="text-sm font-medium text-foreground">Requisição de exames ocupacionais</span>
              </label>
            </Field>
            {isOccupational ? (
              <Field
                label="Perfil profissional"
                hint="Os exames da bandeja do perfil somam-se aos exames selecionados."
              >
                <SearchableRelationSelect
                  fieldName="occupational_profile"
                  value={profile}
                  onChange={setProfile}
                  target={T_PROFILE}
                  placeholder="Pesquisar perfil profissional..."
                  safeRefreshToken={safeRefreshToken}
                />
              </Field>
            ) : null}
          </SectionCard>

          {/* ── Registo ── */}
          <SectionCard icon={Building2} title="Registo">
            <Field label="Empresa solicitante">
              <SearchableRelationSelect
                fieldName="requesting_company"
                value={company}
                onChange={setCompany}
                target={T_COMPANY}
                placeholder="Pesquisar empresa..."
                safeRefreshToken={safeRefreshToken}
              />
            </Field>
            <Field label="Estado clínico">
              <select
                value={clinicalStatus}
                onChange={(e) => setClinicalStatus(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
              >
                <option value="">— Sem prioridade —</option>
                <option value="NAO_URGENTE">Não urgente</option>
                <option value="NORMAL">Normal</option>
                <option value="ROTINA">Rotina</option>
                <option value="POUCO_URGENTE">Pouco urgente</option>
                <option value="PRIORITARIO">Prioritário</option>
                <option value="URGENTE">Urgente</option>
                <option value="MUITO_URGENTE">Muito urgente</option>
                <option value="URGENTISSIMO">Urgentíssimo</option>
                <option value="EMERGENCIA">Emergência</option>
              </select>
            </Field>
          </SectionCard>

        </div>
      </form>
    </AppLayout>
  );
}
