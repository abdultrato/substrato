"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  FlaskConical,
  Loader2,
  Save,
  Search,
  Stethoscope,
  User,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { SearchableRelationSelect } from "@/components/form/AutoForm";
import { apiFetch, apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS } from "@/lib/rbac";
import { relationOptionsFromRows } from "@/lib/resources/relationOptions";
import type { RelationTarget } from "@/lib/resources/relationOptions";

// ── Relation targets ──────────────────────────────────────────────────────────

const T_PATIENT: RelationTarget = { endpoint: "/clinical/patient/", labelFields: ["name", "document_number", "custom_id"] };
const T_PHYSICIAN: RelationTarget = { endpoint: "/consultations/doctors/", labelFields: ["name", "profession_name", "custom_id"] };
const T_LAB_EXAMS: RelationTarget = { endpoint: "/clinical_laboratory/test/", labelFields: ["name", "code", "custom_id"], staticFilters: { active: true } };
const T_MED_EXAMS: RelationTarget = { endpoint: "/clinical/medicalexam/", labelFields: ["name", "method", "custom_id"] };
const T_PROFILE: RelationTarget = { endpoint: "/clinical/occupational_profile/", labelFields: ["name", "profession", "custom_id"] };
const T_COMPANY: RelationTarget = { endpoint: "/external_entities/empresa/", labelFields: ["name", "nuit", "custom_id"] };

const CREATE_GROUPS = [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA];

type RequestType = "LAB" | "MED";

// ── Compact inline multi-select ────────────────────────────────────────────────

function InlineExamSelect({
  value, onChange, target, placeholder, safeRefreshToken, error, initialLabels,
}: {
  value: number[]; onChange: (v: number[]) => void; target: RelationTarget;
  placeholder?: string; safeRefreshToken?: number; error?: string;
  initialLabels?: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ value: string; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [labelById, setLabelById] = useState<Record<string, string>>(initialLabels ?? {});
  const listboxId = useId();

  useEffect(() => {
    if (initialLabels) setLabelById((cur) => ({ ...initialLabels, ...cur }));
  }, [initialLabels]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedIds = useMemo(() => value.map(String), [value]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { items } = await apiFetchList<Record<string, any>>(target.endpoint, {
          page: 1, pageSize: 25,
          query: { ...(target.staticFilters ?? {}), ...(query.trim() ? { search: query.trim() } : {}) },
          clientCache: safeRefreshToken === 0,
          clientCacheTtlMs: 30000,
        });
        const opts = relationOptionsFromRows(items, target);
        setResults(opts);
        setLabelById((cur) => {
          const next = { ...cur };
          for (const o of opts) next[o.value] = o.label;
          return next;
        });
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 250);
  }, [query, open, target, safeRefreshToken]);

  function add(opt: { value: string; label: string }) {
    setLabelById((cur) => ({ ...cur, [opt.value]: opt.label }));
    if (!selectedIds.includes(opt.value)) onChange([...value, Number(opt.value)]);
    setQuery(""); setOpen(false);
  }
  function remove(id: string) { onChange(value.filter((v) => String(v) !== id)); }

  const available = results.filter((o) => !selectedIds.includes(o.value));

  return (
    <div className="space-y-1.5">
      {/* Selected exams inline */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] text-foreground min-h-[32px]">
          {selectedIds.map((id, i) => (
            <span key={id} className="inline-flex items-center gap-0.5">
              {i > 0 && <span className="text-muted-foreground">,</span>}
              <span className="font-medium">{labelById[id] || `#${id}`}</span>
              <button type="button" onClick={() => remove(id)}
                className="ml-0.5 text-muted-foreground hover:text-red-500 transition">
                <X size={9} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text" value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder || "Pesquisar exame..."}
          className={`w-full rounded-lg border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:ring-2 focus:ring-violet-500/25 ${error ? "border-red-300 focus:border-red-400" : "border-border focus:border-violet-500"}`}
        />
        {searching && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}

        {open && (query || available.length > 0) && (
          <div id={listboxId} role="listbox"
            className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
            {available.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-muted-foreground">
                {searching ? "A pesquisar..." : "Nenhum exame encontrado."}
              </p>
            ) : (
              <ul className="max-h-48 overflow-y-auto divide-y divide-border/40">
                {available.map((opt) => (
                  <li key={opt.value}>
                    <button type="button" onMouseDown={() => add(opt)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground transition hover:bg-muted">
                      <FlaskConical size={11} className="shrink-0 text-violet-500" />
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-[11px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

// ── Design helpers ─────────────────────────────────────────────────────────────

function Card({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="relative z-0 rounded-lg border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm focus-within:z-50 dark:bg-white/5 dark:border-white/10">
      <div className="flex items-center gap-1.5 border-b border-border/50 px-3 py-2">
        <Icon size={11} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-[11px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-3 p-3">{children}</div>
    </section>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-foreground">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

const selectCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewRequestPage() {
  useAuthGuard();
  const router = useRouter();
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [patient, setPatient] = useState<number | null>(null);
  const [physician, setPhysician] = useState<number | null>(null);
  const [exams, setExams] = useState<number[]>([]);
  const [examLabels, setExamLabels] = useState<Record<string, string>>({});
  const [isOccupational, setIsOccupational] = useState(false);
  const [profile, setProfile] = useState<number | null>(null);
  const [company, setCompany] = useState<number | null>(null);
  const [clinicalStatus, setClinicalStatus] = useState("");

  useEffect(() => {
    if (!profile) return;
    apiFetch<{ exams: number[]; exam_names: string[] }>(`/clinical/occupational_profile/${profile}/`)
      .then((data) => {
        if (!data.exams?.length) return;
        const labels: Record<string, string> = {};
        data.exams.forEach((id, i) => { labels[String(id)] = data.exam_names?.[i] ?? `#${id}`; });
        setExams(data.exams);
        setExamLabels(labels);
        setErrors((p) => ({ ...p, exams: "" }));
      })
      .catch(() => {});
  }, [profile]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const examTarget = requestType === "MED" ? T_MED_EXAMS : T_LAB_EXAMS;

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!requestType) e.type = "Selecione o tipo de requisição.";
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
      const data = await apiFetch<{ id?: number }>("/clinical/labrequest/", {
        method: "POST",
        body: JSON.stringify({
          patient,
          requesting_physician: physician ?? null,
          exams,
          is_occupational: isOccupational,
          occupational_profile: isOccupational ? profile : null,
          requesting_company: company ?? null,
          clinical_status: clinicalStatus || null,
          type: requestType,
        }),
      });
      if (!data?.id) throw new Error("Resposta inesperada do servidor.");
      router.push(`/requests/${data.id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao criar requisição.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={CREATE_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-3">

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold leading-tight text-foreground">Nova requisição</h1>
              <p className="text-[11px] text-muted-foreground">
                {requestType === "LAB" ? "Exames laboratoriais" : requestType === "MED" ? "Exames médicos" : "Selecione o tipo abaixo"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <button type="submit" disabled={saving || !requestType}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Criar requisição
              </button>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {saveError}
          </div>
        )}

        {/* Type selector — primary card */}
        <div className="rounded-xl border border-white/20 bg-white/25 p-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <p className="mb-2 text-[11px] font-semibold text-foreground">
            Tipo de requisição{!requestType && <span className="ml-1 text-red-500">*</span>}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { type: "LAB" as const, icon: FlaskConical, label: "Exames laboratoriais", desc: "Hemograma, bioquímica, microbiologia…" },
              { type: "MED" as const, icon: Stethoscope, label: "Exames médicos",        desc: "Imagiologia, ECG, espirometria…" },
            ] as const).map(({ type, icon: Icon, label, desc }) => (
              <button key={type} type="button" onClick={() => { setRequestType(type); setExams([]); setExamLabels({}); setErrors({}); }}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                  requestType === type
                    ? "border-violet-500 bg-violet-50 text-violet-700 dark:border-violet-500/60 dark:bg-violet-900/20 dark:text-violet-300"
                    : "border-border bg-background text-foreground hover:border-violet-300 hover:bg-muted"
                }`}>
                <Icon size={16} className={requestType === type ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"} />
                <div>
                  <div className="text-xs font-semibold">{label}</div>
                  <div className="text-[10px] text-muted-foreground">{desc}</div>
                </div>
                {requestType === type && <ChevronRight size={13} className="ml-auto text-violet-500" />}
              </button>
            ))}
          </div>
          {errors.type && <p className="mt-1 text-[10px] font-medium text-red-600">{errors.type}</p>}
        </div>

        {requestType && (
          <div className="grid gap-2 lg:grid-cols-2">

            {/* Paciente */}
            <Card icon={User} title="Paciente e médico">
              <Field label="Paciente" required error={errors.patient}>
                <SearchableRelationSelect fieldName="patient" value={patient}
                  onChange={(v) => { setPatient(v); if (v) setErrors((p) => ({ ...p, patient: "" })); }}
                  target={T_PATIENT} placeholder="Pesquisar pelo nome ou documento…" safeRefreshToken={safeRefreshToken} />
              </Field>
              <Field label="Médico solicitante">
                <SearchableRelationSelect fieldName="requesting_physician" value={physician}
                  onChange={setPhysician} target={T_PHYSICIAN} placeholder="Pesquisar médico…" safeRefreshToken={safeRefreshToken} />
              </Field>
            </Card>

            {/* Exames */}
            <Card icon={FlaskConical} title="Exames solicitados">
              <Field label="Exames" required error={errors.exams}>
                <InlineExamSelect value={exams}
                  onChange={(v) => { setExams(v); if (v.length > 0) setErrors((p) => ({ ...p, exams: "" })); }}
                  target={examTarget} placeholder="Pesquisar e adicionar exame…" safeRefreshToken={safeRefreshToken}
                  error={errors.exams} initialLabels={examLabels} />
              </Field>
            </Card>

            {/* Medicina Ocupacional */}
            <Card icon={Stethoscope} title="Medicina ocupacional">
              <Field label="Tipo">
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs transition hover:border-violet-400">
                  <input type="checkbox" checked={isOccupational}
                    onChange={(e) => { setIsOccupational(e.target.checked); if (!e.target.checked) { setProfile(null); setExams([]); setExamLabels({}); } }}
                    className="h-3.5 w-3.5 rounded border-border accent-violet-600" />
                  <span className="font-medium">Requisição ocupacional</span>
                </label>
              </Field>
              {isOccupational && (
                <Field label="Perfil profissional">
                  <SearchableRelationSelect fieldName="occupational_profile" value={profile}
                    onChange={(v) => { setProfile(v); if (!v) { setExams([]); setExamLabels({}); } }}
                    target={T_PROFILE} placeholder="Pesquisar perfil…" safeRefreshToken={safeRefreshToken} />
                </Field>
              )}
            </Card>

            {/* Registo */}
            <Card icon={Building2} title="Registo">
              <Field label="Empresa solicitante">
                <SearchableRelationSelect fieldName="requesting_company" value={company}
                  onChange={setCompany} target={T_COMPANY} placeholder="Pesquisar empresa…" safeRefreshToken={safeRefreshToken} />
              </Field>
              <Field label="Estado de prioridade">
                <select value={clinicalStatus} onChange={(e) => setClinicalStatus(e.target.value)} className={selectCls}>
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
            </Card>

          </div>
        )}

      </form>
    </AppLayout>
  );
}
