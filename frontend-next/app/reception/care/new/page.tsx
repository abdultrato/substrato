"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, UserCheck } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { SearchableRelationSelect } from "@/components/form/AutoForm";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS } from "@/lib/rbac";
import type { RelationTarget } from "@/lib/resources/relationOptions";

const CREATE_GROUPS = [GROUPS.ADMIN, GROUPS.RECEPCAO];

const T_PATIENT: RelationTarget = {
  endpoint: "/clinical/patient/",
  labelFields: ["name", "document_number", "custom_id"],
};

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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      <div className="border-b border-border/60 px-4 py-2.5">
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

export default function ReceptionCareCreatePage() {
  useAuthGuard();
  const router = useRouter();
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [patient, setPatient] = useState<number | null>(null);
  const [priority, setPriority] = useState("NOR");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
      const data = await apiFetch<{ id?: number }>("/reception/checkin/", {
        method: "POST",
        body: JSON.stringify({
          patient,
          priority,
          reason: reason.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      if (!data?.id) throw new Error("Resposta inesperada do servidor.");
      router.push(`/reception/care/${data.id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao criar atendimento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={CREATE_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-2xl space-y-3">

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                <UserCheck size={16} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">Novo atendimento</h1>
                <p className="text-[11px] text-muted-foreground">Registo de entrada do paciente</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/reception/care")}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted"
              >
                <ArrowLeft size={13} /> Voltar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Registar
              </button>
            </div>
          </div>
        </div>

        {saveError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {saveError}
          </div>
        ) : null}

        <SectionCard title="Identificação">
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

          <Field label="Prioridade">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
            >
              <option value="NOR">Normal</option>
              <option value="PREF">Preferencial</option>
              <option value="URG">Urgente</option>
            </select>
          </Field>
        </SectionCard>

        <SectionCard title="Observações">
          <Field label="Motivo da visita" hint="Breve descrição do motivo do atendimento.">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: dor abdominal, coleta de exames..."
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
            />
          </Field>

          <Field label="Notas adicionais">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Informações complementares..."
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 resize-none"
            />
          </Field>
        </SectionCard>

      </form>
    </AppLayout>
  );
}
