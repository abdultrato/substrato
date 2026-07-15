"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { isNotFoundLikeError } from "@/lib/errors/api-error";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS } from "@/lib/rbac";
import type { RelationTarget, RelationOption } from "@/lib/resources/relationOptions";

// ── Relation targets ──────────────────────────────────────────────────────────

const T_PATIENT: RelationTarget = {
  endpoint: "/clinical/patient/",
  labelFields: ["name", "document_number", "custom_id"],
};
const T_PHYSICIAN: RelationTarget = {
  endpoint: "/consultations/doctors/",
  labelFields: ["name", "profession_name", "custom_id"],
};
const T_EXAMS: RelationTarget = {
  endpoint: "/clinical_laboratory/test/",
  labelFields: ["name", "code", "custom_id"],
  staticFilters: { active: true },
};
const T_PROFILE: RelationTarget = {
  endpoint: "/clinical/occupational_profile/",
  labelFields: ["name", "profession", "custom_id"],
};
const T_COMPANY: RelationTarget = {
  endpoint: "/external_entities/empresa/",
  labelFields: ["name", "nuit", "custom_id"],
};

const EDIT_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.RECEPCAO,
  GROUPS.MEDICINA,
];

type LabRequestDetail = {
  id: number;
  custom_id?: string | null;
  patient: number;
  patient_name?: string;
  requesting_physician?: number | null;
  requesting_physician_name?: string | null;
  exams?: number[];
  items?: Array<{ id?: number; exam?: number | null; exam_name?: string }>;
  is_occupational?: boolean;
  occupational_profile?: number | null;
  occupational_profile_name?: string | null;
  requesting_company?: number | null;
  requesting_company_name?: string | null;
  clinical_status?: string | null;
};

// ── Design components ─────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  accent = "bg-[var(--primary-600)]",
  children,
}: {
  icon: React.ElementType;
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative z-0 rounded-lg border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm focus-within:z-50 dark:bg-white/5 dark:border-white/10">
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="flex items-center gap-1.5 border-b border-border/60 px-3 py-2 pl-4">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
          <Icon size={13} />
        </span>
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-3 p-3">{children}</div>
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
    <div className="space-y-1">
      <label className="text-xs font-semibold text-foreground">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditRequestPage() {
  useAuthGuard();
  const router = useRouter();
  const { id } = useParams() as { id?: string | string[] };
  const idStr = Array.isArray(id) ? id[0] : id;
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [customId, setCustomId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // form state
  const [patient, setPatient] = useState<number | null>(null);
  const [patientOpts, setPatientOpts] = useState<RelationOption[]>([]);

  const [physician, setPhysician] = useState<number | null>(null);
  const [physicianOpts, setPhysicianOpts] = useState<RelationOption[]>([]);

  const [exams, setExams] = useState<number[]>([]);
  const [examOpts, setExamOpts] = useState<RelationOption[]>([]);

  const [isOccupational, setIsOccupational] = useState(false);
  const [profile, setProfile] = useState<number | null>(null);
  const [profileOpts, setProfileOpts] = useState<RelationOption[]>([]);

  const [company, setCompany] = useState<number | null>(null);
  const [companyOpts, setCompanyOpts] = useState<RelationOption[]>([]);

  const [clinicalStatus, setClinicalStatus] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!idStr) return;
    try {
      setLoading(true);
      setLoadError(null);
      const d = await apiFetch<LabRequestDetail>(`/clinical/labrequest/${idStr}/`, {
        clientCache: safeRefreshToken === 0,
      });

      setCustomId(d.custom_id ?? String(d.id));

      setPatient(d.patient ?? null);
      if (d.patient && d.patient_name)
        setPatientOpts([{ value: String(d.patient), label: d.patient_name }]);

      setPhysician(d.requesting_physician ?? null);
      if (d.requesting_physician && d.requesting_physician_name)
        setPhysicianOpts([{ value: String(d.requesting_physician), label: d.requesting_physician_name }]);

      const examIds = d.exams ?? [];
      setExams(examIds);
      const examOptsFromItems: RelationOption[] = (d.items ?? [])
        .filter((it) => it.exam != null && it.exam_name)
        .map((it) => ({ value: String(it.exam), label: it.exam_name! }));
      setExamOpts(examOptsFromItems);

      setIsOccupational(d.is_occupational ?? false);
      setProfile(d.occupational_profile ?? null);
      if (d.occupational_profile && d.occupational_profile_name)
        setProfileOpts([{ value: String(d.occupational_profile), label: d.occupational_profile_name }]);

      setCompany(d.requesting_company ?? null);
      if (d.requesting_company && d.requesting_company_name)
        setCompanyOpts([{ value: String(d.requesting_company), label: d.requesting_company_name }]);

      setClinicalStatus(d.clinical_status ?? "");
    } catch (err: any) {
      setLoadError(isNotFoundLikeError(err) ? "Requisição não encontrada." : err?.message || "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [idStr, safeRefreshToken]);

  useEffect(() => { load(); }, [load]);

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
      await apiFetch(`/clinical/labrequest/${idStr}/`, {
        method: "PATCH",
        body: JSON.stringify({
          patient,
          requesting_physician: physician ?? null,
          exams,
          is_occupational: isOccupational,
          occupational_profile: isOccupational ? profile : null,
          requesting_company: company ?? null,
          clinical_status: clinicalStatus || null,
        }),
      });
      router.push(`/requests/${idStr}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  }

  const backButton = (
    <button
      type="button"
      onClick={() => router.push(`/requests/${idStr}`)}
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

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="space-y-2">

        {/* Header */}
        <div className="relative overflow-hidden rounded-lg border border-white/20 bg-white/30 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-wrap items-center justify-between gap-2 pl-1">
            <div>
              <h1 className="text-lg font-bold leading-tight text-foreground">Editar requisição</h1>
              <p className="text-[11px] text-muted-foreground">{customId}</p>
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

        <div className="grid gap-2 lg:grid-cols-2">

          {/* Paciente e médico */}
          <SectionCard icon={User} title="Paciente e médico" accent="bg-sky-500">
            <Field label="Paciente" required error={errors.patient}>
              <SearchableRelationSelect
                fieldName="patient"
                value={patient}
                onChange={(v) => { setPatient(v); if (v) setErrors((p) => ({ ...p, patient: "" })); }}
                target={T_PATIENT}
                initialOptions={patientOpts}
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
                initialOptions={physicianOpts}
                placeholder="Pesquisar médico..."
                safeRefreshToken={safeRefreshToken}
              />
            </Field>
          </SectionCard>

          {/* Exames */}
          <SectionCard icon={FlaskConical} title="Exames solicitados" accent="bg-violet-500">
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
                initialOptions={examOpts}
                placeholder="Pesquisar exames..."
                safeRefreshToken={safeRefreshToken}
              />
            </Field>
          </SectionCard>

          {/* Medicina Ocupacional */}
          <SectionCard icon={Stethoscope} title="Medicina ocupacional" accent="bg-emerald-500">
            <Field label="Tipo de requisição">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 transition hover:border-violet-400">
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
                  initialOptions={profileOpts}
                  placeholder="Pesquisar perfil profissional..."
                  safeRefreshToken={safeRefreshToken}
                />
              </Field>
            ) : null}
          </SectionCard>

          {/* Registo */}
          <SectionCard icon={Building2} title="Registo" accent="bg-amber-500">
            <Field label="Empresa solicitante">
              <SearchableRelationSelect
                fieldName="requesting_company"
                value={company}
                onChange={setCompany}
                target={T_COMPANY}
                initialOptions={companyOpts}
                placeholder="Pesquisar empresa..."
                safeRefreshToken={safeRefreshToken}
              />
            </Field>
            <Field label="Estado clínico">
              <select
                value={clinicalStatus}
                onChange={(e) => setClinicalStatus(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
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
