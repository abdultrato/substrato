"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, Loader2, Save, UserPlus } from "lucide-react";

import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { SearchableRelationSelect } from "@/components/form/AutoForm";
import { useAuth } from "@/hooks/useAuth";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch } from "@/lib/api";
import { GROUPS, userHasAnyGroup } from "@/lib/rbac";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";
import type { RelationTarget } from "@/lib/resources/relationOptions";

// ── Relation targets ──────────────────────────────────────────────────────────

const T_PATIENT: RelationTarget = {
  endpoint: "/clinical/patient/",
  labelFields: ["name", "document_number", "custom_id"],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function SectionCard({ icon: Icon, title, accent = "bg-[var(--primary-600)]", children }: {
  icon: React.ElementType; title: string; accent?: string; children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-1.5 pl-5">
        <Icon size={13} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-2.5 px-4 py-2.5 pl-5">{children}</div>
    </section>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReceptionCheckinEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const canWrite = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.RECEPCAO]);

  // Form state
  const [patient, setPatient] = useState<number | null>(null);
  const [priority, setPriority] = useState("NOR");
  const [status, setStatus] = useState("AGUARD");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // initialOptions for SearchableRelationSelect pre-population
  const [patientInitial, setPatientInitial] = useState<{ value: string; label: string } | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoadingData(true);
        const data = await apiFetch<any>(`/reception/checkin/${id}/`);
        setPatient(data.patient ?? null);
        setPriority(data.priority ?? "NOR");
        setStatus(data.status ?? "AGUARD");
        setReason(data.reason ?? "");
        setNotes(data.notes ?? "");
        if (data.patient && data.patient_name) {
          setPatientInitial({ value: String(data.patient), label: data.patient_name });
        }
      } catch (e: any) {
        setLoadError(e?.message || "Erro ao carregar dados.");
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, [id]);

  function validate() {
    const e: Record<string, string> = {};
    if (!patient) e.patient = "Selecione um paciente.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await apiFetch(`/reception/checkin/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          patient,
          priority,
          status,
          reason: reason.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      router.push(`/reception/reception-checkins/${id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao guardar alterações.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("reception")}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-2xl space-y-3">

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                <ClipboardList size={16} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">Editar check-in</h1>
                <p className="text-[11px] text-muted-foreground">#{id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.push(`/reception/reception-checkins/${id}`)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <button type="submit" disabled={saving || loadingData || !canWrite}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Guardar
              </button>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {saveError}
          </div>
        )}

        {loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {loadError}
          </div>
        ) : loadingData ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/25 py-16 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Carregando dados...</span>
          </div>
        ) : (
          <>
            {/* Identificação */}
            <SectionCard icon={ClipboardList} title="Identificação" accent="bg-violet-500">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <Field label="Paciente" required error={errors.patient}>
                    <div className="flex items-start gap-2">
                      <div className="relative flex-1 focus-within:z-50">
                        <SearchableRelationSelect
                          fieldName="patient"
                          value={patient}
                          onChange={(v) => { setPatient(v); if (v) setErrors((p) => ({ ...p, patient: "" })); }}
                          target={T_PATIENT}
                          placeholder="Pesquisar pelo nome ou documento..."
                          initialOptions={patientInitial ? [patientInitial] : undefined}
                          safeRefreshToken={safeRefreshToken}
                        />
                      </div>
                      <Link href="/patients/new" target="_blank"
                        title="Criar novo paciente"
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-400">
                        <UserPlus size={15} />
                      </Link>
                    </div>
                  </Field>
                </div>

                <Field label="Prioridade">
                  <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
                    <option value="NOR">Normal</option>
                    <option value="PREF">Preferencial</option>
                    <option value="URG">Urgente</option>
                  </select>
                </Field>

                <Field label="Estado">
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                    <option value="AGUARD">Aguardando</option>
                    <option value="ATEND">Em atendimento</option>
                    <option value="REQ">Requisição criada</option>
                    <option value="FAT">Fatura vinculada</option>
                    <option value="CONC">Concluído</option>
                    <option value="CANC">Cancelado</option>
                  </select>
                </Field>
              </div>
            </SectionCard>

            {/* Observações */}
            <SectionCard icon={ClipboardList} title="Observações" accent="bg-amber-500">
              <Field label="Motivo da visita" hint="Breve descrição do motivo do atendimento.">
                <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex.: dor abdominal, coleta de exames..."
                  className={inputCls} />
              </Field>

              <Field label="Notas adicionais">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Informações complementares..."
                  className={`${inputCls} resize-none`} />
              </Field>
            </SectionCard>
          </>
        )}

      </form>
    </AppLayout>
  );
}
