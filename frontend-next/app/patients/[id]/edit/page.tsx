"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  FileText,
  HeartHandshake,
  Loader2,
  Phone,
  Save,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { isNotFoundLikeError } from "@/lib/errors/api-error";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS, userHasAnyGroup } from "@/lib/rbac";
import { useAuth } from "@/hooks/useAuth";
import type { Patient } from "@/lib/types";

type PatientDetail = Patient & {
  age_display?: string | null;
  is_blood_donor?: boolean;
  is_organ_donor?: boolean;
  updated_at?: string;
  companion_name?: string;
  companion_relationship?: string;
  companion_contact?: string;
  companion_email?: string;
};

const EDIT_GROUPS = [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA_OCUPACIONAL];

// ── Floating label input ──────────────────────────────────────────────────────

const FL_BASE =
  "peer w-full rounded-lg border border-border bg-background px-3.5 pb-2 pt-5 text-sm text-foreground shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 disabled:opacity-50";
const FL_LABEL =
  "pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-medium text-muted-foreground transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:text-violet-500";

function FInput({
  label, value, onChange, type = "text", autoComplete,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; autoComplete?: string;
}) {
  return (
    <div className="relative">
      <input
        type={type}
        placeholder=" "
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className={FL_BASE}
      />
      <label className={FL_LABEL}>{label}</label>
    </div>
  );
}

function FSelect({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${FL_BASE} appearance-none`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <label className={FL_LABEL}>{label}</label>
    </div>
  );
}

function FCheckbox({
  label, checked, onChange,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border accent-violet-600"
      />
      <span className="font-medium text-foreground">{label}</span>
    </label>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon, title, children,
}: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
          <Icon size={13} />
        </span>
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function FullRow({ children }: { children: React.ReactNode }) {
  return <div className="sm:col-span-2">{children}</div>;
}

// ── Options ───────────────────────────────────────────────────────────────────

const GENDER_OPTS = [
  { value: "", label: "— Selecionar —" },
  { value: "Masculino", label: "Masculino" },
  { value: "Femenino", label: "Feminino" },
];

const BLOOD_TYPE_OPTS = [
  { value: "UNK", label: "— Desconhecido —" },
  ...["O-","O+","A-","A+","B-","B+","AB-","AB+"].map((v) => ({ value: v, label: v })),
];

const RACE_OPTS = [
  { value: "", label: "— Selecionar —" },
  ...["Branca","Negra","Parda","Amarela","Indígena","Outro"].map((v) => ({ value: v, label: v })),
];

const DOC_TYPE_OPTS = [
  { value: "BI", label: "Bilhete de Identidade" },
  { value: "PASS", label: "Passaporte" },
  { value: "DIRE", label: "DIRE" },
  { value: "CC", label: "Carta de Condução" },
  { value: "NUIT", label: "NUIT" },
  { value: "CE", label: "Cartão de Eleitor" },
  { value: "CN", label: "Certidão de Nascimento" },
  { value: "OUT", label: "Outro" },
];

const PROVENANCE_OPTS = [
  "Ambulatório","Clínica Externa","Medicina Ocupacional","Maternidade",
  "Ginecologia","Pediatria","Banco de Socorros","Consulta Externa",
  "Urologia","Cirurgia","Dentária","Oftalmologia","Doação de Sangue","Outro",
].map((v) => ({ value: v, label: v }));

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EditPatientPage() {
  useAuthGuard();
  const { user } = useAuth();
  const router = useRouter();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const { id } = useParams() as { id?: string | string[] };
  const idStr = Array.isArray(id) ? id[0] : id;

  const canEdit = userHasAnyGroup(user, EDIT_GROUPS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // form state
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [bloodType, setBloodType] = useState("UNK");
  const [raceOrigin, setRaceOrigin] = useState("");
  const [docType, setDocType] = useState("BI");
  const [docNumber, setDocNumber] = useState("");

  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [complement, setComplement] = useState("");

  const [pregnant, setPregnant] = useState(false);
  const [gestWeeks, setGestWeeks] = useState("");
  const [isBloodDonor, setIsBloodDonor] = useState(false);
  const [isOrganDonor, setIsOrganDonor] = useState(false);
  const [companionName, setCompanionName] = useState("");
  const [companionRel, setCompanionRel] = useState("");
  const [companionContact, setCompanionContact] = useState("");
  const [companionEmail, setCompanionEmail] = useState("");

  const [provenance, setProvenance] = useState("Clínica Externa");

  const load = useCallback(async () => {
    if (!idStr) return;
    try {
      setLoading(true);
      setLoadError(null);
      const p = await apiFetch<PatientDetail>(`/patients/${idStr}/`, {
        clientCache: safeRefreshToken === 0,
      });
      setName(p.name ?? "");
      setBirthDate(p.birth_date ?? "");
      setGender(p.gender ?? "");
      setBloodType(p.blood_type ?? "UNK");
      setRaceOrigin(p.race_origin ?? "");
      setDocType(p.document_type ?? "BI");
      setDocNumber(p.document_number ?? "");
      setContact(p.contact ?? "");
      setEmail(p.email ?? "");
      setStreet(p.address_street ?? "");
      setAddressNumber(p.address_number ?? "");
      setNeighborhood(p.address_neighborhood ?? "");
      setCity(p.address_city ?? "");
      setProvince(p.address_province ?? "");
      setPostalCode(p.address_postal_code ?? "");
      setComplement(p.address_complement ?? "");
      setPregnant(p.pregnant ?? false);
      setGestWeeks(p.gestational_age_weeks != null ? String(p.gestational_age_weeks) : "");
      setIsBloodDonor((p as any).is_blood_donor ?? false);
      setIsOrganDonor((p as any).is_organ_donor ?? false);
      setCompanionName((p as any).companion_name ?? "");
      setCompanionRel((p as any).companion_relationship ?? "");
      setCompanionContact((p as any).companion_contact ?? "");
      setCompanionEmail((p as any).companion_email ?? "");
      setProvenance(p.provenance ?? "Clínica Externa");
    } catch (err: any) {
      setLoadError(isNotFoundLikeError(err) ? "Paciente não encontrado." : err?.message || "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [idStr, safeRefreshToken]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!idStr) return;
    setSaving(true);
    setSaveError(null);
    try {
      await apiFetch(`/patients/${idStr}/`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          birth_date: birthDate || null,
          gender: gender || null,
          blood_type: bloodType,
          race_origin: raceOrigin || null,
          document_type: docType,
          document_number: docNumber || null,
          contact: contact || null,
          email: email || null,
          address_street: street,
          address_number: addressNumber,
          address_neighborhood: neighborhood,
          address_city: city,
          address_province: province,
          address_postal_code: postalCode,
          address_complement: complement,
          pregnant,
          gestational_age_weeks: pregnant && gestWeeks ? Number(gestWeeks) : null,
          is_blood_donor: isBloodDonor,
          is_organ_donor: isOrganDonor,
          companion_name: companionName,
          companion_relationship: companionRel,
          companion_contact: companionContact,
          companion_email: companionEmail || null,
          provenance,
        }),
      });
      router.push(`/patients/${idStr}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  }

  const backButton = (
    <button
      type="button"
      onClick={() => router.push(`/patients/${idStr}`)}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground-2 transition hover:bg-muted"
    >
      <ArrowLeft size={14} />
      Voltar
    </button>
  );

  if (loading) {
    return (
      <AppLayout requiredGroups={EDIT_GROUPS}>
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded-xl border border-white/20 bg-white/25 dark:bg-white/5 dark:border-white/10" />
          <div className="grid gap-3 md:grid-cols-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl border border-white/20 bg-white/25 dark:bg-white/5 dark:border-white/10" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (loadError) {
    return (
      <AppLayout requiredGroups={EDIT_GROUPS}>
        <div className="space-y-3">
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
      <form onSubmit={handleSave} className="space-y-3">

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold leading-tight text-foreground">Editar paciente</h1>
              <p className="text-[11px] text-muted-foreground">{name || "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              {backButton}
              <button
                type="submit"
                disabled={saving || !canEdit}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Guardar
              </button>
            </div>
          </div>
        </div>

        {saveError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {saveError}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">

          {/* Identificação */}
          <SectionCard icon={User} title="Identificação">
            <FullRow>
              <FInput label="Nome completo" value={name} onChange={setName} autoComplete="name" />
            </FullRow>
            <FInput label="Data de nascimento" value={birthDate} onChange={setBirthDate} type="date" />
            <FSelect label="Género" value={gender} onChange={setGender} options={GENDER_OPTS} />
            <FSelect label="Tipo sanguíneo" value={bloodType} onChange={setBloodType} options={BLOOD_TYPE_OPTS} />
            <FSelect label="Raça / origem" value={raceOrigin} onChange={setRaceOrigin} options={RACE_OPTS} />
            <FSelect label="Tipo de documento" value={docType} onChange={setDocType} options={DOC_TYPE_OPTS} />
            <FInput label="Número de documento" value={docNumber} onChange={setDocNumber} />
          </SectionCard>

          {/* Contacto e morada */}
          <SectionCard icon={Phone} title="Contacto e morada">
            <FInput label="Telefone" value={contact} onChange={setContact} type="tel" autoComplete="tel" />
            <FInput label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
            <FInput label="Rua" value={street} onChange={setStreet} />
            <FInput label="Número" value={addressNumber} onChange={setAddressNumber} />
            <FInput label="Bairro" value={neighborhood} onChange={setNeighborhood} />
            <FInput label="Cidade" value={city} onChange={setCity} />
            <FInput label="Província" value={province} onChange={setProvince} />
            <FInput label="Código postal" value={postalCode} onChange={setPostalCode} />
            <FullRow>
              <FInput label="Complemento" value={complement} onChange={setComplement} />
            </FullRow>
          </SectionCard>

          {/* Clínico */}
          <SectionCard icon={HeartHandshake} title="Clínico">
            <FullRow>
              <FCheckbox label="Gestante" checked={pregnant} onChange={setPregnant} />
            </FullRow>
            {pregnant ? (
              <FullRow>
                <FInput label="Semanas de gestação" value={gestWeeks} onChange={setGestWeeks} type="number" />
              </FullRow>
            ) : null}
            <FCheckbox label="Doador de sangue" checked={isBloodDonor} onChange={setIsBloodDonor} />
            <FCheckbox label="Doador de órgãos" checked={isOrganDonor} onChange={setIsOrganDonor} />
            <FullRow><hr className="border-border/40" /></FullRow>
            <FInput label="Nome do acompanhante" value={companionName} onChange={setCompanionName} />
            <FInput label="Parentesco" value={companionRel} onChange={setCompanionRel} />
            <FInput label="Telefone do acompanhante" value={companionContact} onChange={setCompanionContact} type="tel" />
            <FInput label="Email do acompanhante" value={companionEmail} onChange={setCompanionEmail} type="email" />
          </SectionCard>

          {/* Registo */}
          <SectionCard icon={FileText} title="Registo">
            <FullRow>
              <FSelect label="Proveniência" value={provenance} onChange={setProvenance} options={PROVENANCE_OPTS} />
            </FullRow>
          </SectionCard>

        </div>
      </form>
    </AppLayout>
  );
}
