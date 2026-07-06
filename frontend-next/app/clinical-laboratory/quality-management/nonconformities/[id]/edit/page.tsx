"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, FileText, FileWarning, Loader2, Save, ShieldAlert } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";
import {
  Card,
  Field,
  Nonconformity,
  RelationSelect,
  SEVERITY_BAR,
  SEVERITY_CHOICES,
  SEVERITY_COLOR,
  SOURCE_CHOICES,
  STATUS_CHOICES,
  STATUS_COLOR,
  T_SECTOR,
  inputCls,
  sectorLabel,
  toDateInput,
} from "../../_components";

const EDIT_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

export default function EditNonconformityPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [customId, setCustomId] = useState("");
  const [sector, setSector] = useState<number | null>(null);
  const [sectorName, setSectorName] = useState("");
  const [source, setSource] = useState("INTERNA");
  const [sourceRef, setSourceRef] = useState("");
  const [detectedAt, setDetectedAt] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("MENOR");
  const [immediateAction, setImmediateAction] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [patientImpact, setPatientImpact] = useState(false);
  const [status, setStatus] = useState("ABERTA");
  const [loadingRec, setLoadingRec] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoadingRec(true);
    apiFetch<Nonconformity>(`/clinical_laboratory/nonconformity/${id}/`)
      .then((rec) => {
        setCode(rec.code ?? "");
        setCustomId(rec.custom_id ?? "");
        setSector(rec.sector ?? null);
        setSectorName(sectorLabel(rec) ?? "");
        setSource(rec.source ?? "INTERNA");
        setSourceRef(rec.source_ref ?? "");
        setDetectedAt(toDateInput(rec.detected_at));
        setDescription(rec.description ?? "");
        setSeverity(rec.severity ?? "MENOR");
        setImmediateAction(rec.immediate_action ?? "");
        setRootCause(rec.root_cause ?? "");
        setPatientImpact(Boolean(rec.patient_impact));
        setStatus(rec.status ?? "ABERTA");
      })
      .catch((e) => setLoadError(e?.message ?? "Erro ao carregar não conformidade."))
      .finally(() => setLoadingRec(false));
  }, [id]);

  function validate() {
    const next: Record<string, string> = {};
    if (!description.trim()) next.description = "Descrição obrigatória.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      await apiFetch(`/clinical_laboratory/nonconformity/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          code: code.trim(),
          sector,
          source,
          source_ref: sourceRef.trim(),
          detected_at: detectedAt ? new Date(detectedAt).toISOString() : null,
          description: description.trim(),
          severity,
          immediate_action: immediateAction.trim(),
          root_cause: rootCause.trim(),
          patient_impact: patientImpact,
          status,
        }),
      });
      router.push(`/clinical-laboratory/quality-management/nonconformities/${id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao guardar não conformidade.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingRec) {
    return (
      <AppLayout requiredGroups={EDIT_GROUPS}>
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (loadError) {
    return (
      <AppLayout requiredGroups={EDIT_GROUPS}>
        <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">{loadError}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-1.5">
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-rose-500/10 blur-2xl" />
            <div className="absolute -bottom-6 left-8 h-20 w-20 rounded-full bg-orange-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${SEVERITY_BAR[severity]}`} />
          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 shadow-md shadow-rose-500/30">
              <FileWarning size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Gestão da qualidade</span><span>/</span><span>Não conformidades</span><span>/</span>
                <span className="font-mono text-[9px]">{code || customId}</span><span>/</span>
                <span className="font-medium text-foreground">Editar</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">{description.trim() || "Editar não conformidade"}</h1>
              <span className={`mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${SEVERITY_COLOR[severity]}`}>{SEVERITY_CHOICES.find((x) => x.value === severity)?.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted"><ArrowLeft size={13} /> Voltar</button>
              <button type="submit" disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-orange-600 px-4 text-xs font-semibold text-white shadow-md shadow-rose-500/30 transition hover:from-rose-700 hover:to-orange-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar alterações
              </button>
            </div>
          </div>
        </div>

        {saveError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">{saveError}</div>}

        <div className="grid gap-1.5 lg:grid-cols-2">
          <Card icon={FileWarning} title="Identificação" accent="bg-rose-500">
            <Field label="Código interno">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Opcional" className={inputCls} />
            </Field>
            <Field label="Sector">
              <RelationSelect value={sector} onChange={(v, l) => { setSector(v); setSectorName(l); }} target={T_SECTOR} placeholder="Pesquisar sector..." initialLabel={sectorName} />
            </Field>
            <Field label="Detetada em">
              <input type="datetime-local" value={detectedAt} onChange={(e) => setDetectedAt(e.target.value)} className={inputCls} />
            </Field>
          </Card>

          <Card icon={ShieldAlert} title="Classificação" accent={SEVERITY_BAR[severity]}>
            <Field label="Origem">
              <select value={source} onChange={(e) => setSource(e.target.value)} className={inputCls}>{SOURCE_CHOICES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select>
            </Field>
            <Field label="Referência da origem">
              <input value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} maxLength={80} className={inputCls} />
            </Field>
            <div className="grid gap-1.5 sm:grid-cols-3">
              {SEVERITY_CHOICES.map(({ value, label }) => (
                <button key={value} type="button" onClick={() => setSeverity(value)} className={`relative overflow-hidden rounded-lg border px-3 py-2.5 text-left text-[11px] transition ${severity === value ? SEVERITY_COLOR[value] + " ring-1 ring-current/30" : "border-border bg-background hover:bg-muted"}`}>
                  <span className={`absolute inset-y-0 left-0 w-0.5 ${SEVERITY_BAR[value]}`} />
                  <span className="block pl-1.5 font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </Card>

          <div className="lg:col-span-2">
            <Card icon={FileText} title="Descrição e impacto" accent="bg-orange-500">
              <Field label="Descrição" required error={errors.description}>
                <textarea value={description} onChange={(e) => { setDescription(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, description: "" })); }} rows={4} className={`${inputCls} resize-y ${errors.description ? "border-red-300 focus:border-red-400" : ""}`} />
              </Field>
              <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground">
                <input type="checkbox" checked={patientImpact} onChange={(e) => setPatientImpact(e.target.checked)} className="h-4 w-4 rounded border-border accent-rose-600" />
                Impacto no paciente
              </label>
            </Card>
          </div>

          <Card icon={ClipboardList} title="Investigação" accent="bg-slate-400">
            <Field label="Ação imediata">
              <textarea value={immediateAction} onChange={(e) => setImmediateAction(e.target.value)} rows={4} className={`${inputCls} resize-y`} />
            </Field>
            <Field label="Causa raiz">
              <textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} rows={4} className={`${inputCls} resize-y`} />
            </Field>
          </Card>

          <Card icon={ShieldAlert} title="Estado" accent="bg-sky-500">
            <div className="grid gap-1.5 sm:grid-cols-2">
              {STATUS_CHOICES.map(({ value, label }) => (
                <button key={value} type="button" onClick={() => setStatus(value)} className={`rounded-lg border px-3 py-2 text-left text-[11px] font-semibold transition ${status === value ? STATUS_COLOR[value] + " ring-1 ring-current/30" : "border-border bg-background hover:bg-muted"}`}>{label}</button>
              ))}
            </div>
          </Card>
        </div>
      </form>
    </AppLayout>
  );
}
