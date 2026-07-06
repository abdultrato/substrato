"use client";

import { useEffect, useMemo, useState } from "react";
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
  T_EQUIPMENT,
  T_EXPOSURE_INCIDENT,
  T_ORDER,
  T_ORDER_ITEM,
  T_RESULT,
  T_SAMPLE,
  T_SECTOR,
  T_TEST,
  T_TEST_FIELD,
  composeRootCauseTrace,
  inputCls,
  parseTraceChainNote,
  parseTraceReference,
  sectorLabel,
  splitRootCauseTrace,
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
  const [order, setOrder] = useState<number | null>(null);
  const [orderLabel, setOrderLabel] = useState("");
  const [exam, setExam] = useState<number | null>(null);
  const [examLabel, setExamLabel] = useState("");
  const [examTest, setExamTest] = useState<number | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [resultLabel, setResultLabel] = useState("");
  const [sample, setSample] = useState<number | null>(null);
  const [sampleLabel, setSampleLabel] = useState("");
  const [equipment, setEquipment] = useState<number | null>(null);
  const [equipmentLabel, setEquipmentLabel] = useState("");
  const [analyte, setAnalyte] = useState<number | null>(null);
  const [analyteLabel, setAnalyteLabel] = useState("");
  const [exposureIncident, setExposureIncident] = useState<number | null>(null);
  const [exposureIncidentLabel, setExposureIncidentLabel] = useState("");
  const [traceNotes, setTraceNotes] = useState("");
  const [loadingRec, setLoadingRec] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const orderItemTarget = useMemo(() => ({
    ...T_ORDER_ITEM,
    staticFilters: { ...(order ? { order } : {}) },
  }), [order]);

  const resultTarget = useMemo(() => ({
    ...T_RESULT,
    staticFilters: {
      ...(exam ? { order_item: exam } : {}),
      ...(analyte ? { test_field: analyte } : {}),
      ...(sample ? { sample } : {}),
    },
  }), [exam, analyte, sample]);

  const sampleTarget = useMemo(() => ({
    ...T_SAMPLE,
    staticFilters: { ...(order ? { order } : {}) },
  }), [order]);

  const analyteTarget = useMemo(() => ({
    ...T_TEST_FIELD,
    staticFilters: { ...(examTest ? { test: examTest, active: true } : { active: true }) },
  }), [examTest]);

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
        const investigation = splitRootCauseTrace(rec.root_cause);
        setRootCause(investigation.rootCause);
        const orderRef = parseTraceReference(investigation.traceability, "Requisição");
        const examRef = parseTraceReference(investigation.traceability, "Exame");
        const resultRef = parseTraceReference(investigation.traceability, "Resultado");
        const sampleRef = parseTraceReference(investigation.traceability, "Amostra");
        const equipmentRef = parseTraceReference(investigation.traceability, "Equipamento relacionado");
        const analyteRef = parseTraceReference(investigation.traceability, "Analito/campo de exame");
        const incidentRef = parseTraceReference(investigation.traceability, "Incidente de exposição");
        setOrder(orderRef.id); setOrderLabel(orderRef.label);
        setExam(examRef.id); setExamLabel(examRef.label);
        setResult(resultRef.id); setResultLabel(resultRef.label);
        setSample(sampleRef.id); setSampleLabel(sampleRef.label);
        setEquipment(equipmentRef.id); setEquipmentLabel(equipmentRef.label);
        setAnalyte(analyteRef.id); setAnalyteLabel(analyteRef.label);
        setExposureIncident(incidentRef.id); setExposureIncidentLabel(incidentRef.label);
        setTraceNotes(parseTraceChainNote(investigation.traceability));
        setPatientImpact(Boolean(rec.patient_impact));
        setStatus(rec.status ?? "ABERTA");
        if (examRef.id) {
          apiFetch<Record<string, any>>(`/clinical_laboratory/order_item/${examRef.id}/`)
            .then((item) => {
              if (item?.test) setExamTest(Number(item.test));
              setExamLabel((prev) => prev || String(item?.test_name || item?.test_code || `Item #${examRef.id}`));
            })
            .catch(() => {});
        }
      })
      .catch((e) => setLoadError(e?.message ?? "Erro ao carregar não conformidade."))
      .finally(() => setLoadingRec(false));
  }, [id]);

  function validate() {
    const next: Record<string, string> = {};
    if (!description.trim()) next.description = "Descrição obrigatória.";
    if (patientImpact && !order && !exam && !result && !sample && !traceNotes.trim()) next.patientImpact = "Informe pelo menos uma referência do impacto no paciente ou descreva a cadeia.";
    if (source === "EQUIPAMENTO" && !equipment && !traceNotes.trim()) next.equipment = "Equipamento obrigatório para NC de equipamento.";
    if (source === "FALHA_QC" && !analyte && !exam && !traceNotes.trim()) next.analyte = "Informe o analito/campo, o exame ou descreva a cadeia.";
    if (source === "EXPOSICAO" && !sector && !exposureIncident && !traceNotes.trim()) next.incident = "Informe o sector, o incidente ou descreva a cadeia.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function traceabilityLines() {
    const lines = ["Rastreabilidade da origem:"];
    if (patientImpact) {
      lines.push("- Impacto no paciente: sim");
      if (order) lines.push(`  - Requisição: ${orderLabel} (#${order})`);
      if (exam) lines.push(`  - Exame: ${examLabel} (#${exam})`);
      if (result) lines.push(`  - Resultado: ${resultLabel} (#${result})`);
      if (sample) lines.push(`  - Amostra: ${sampleLabel} (#${sample})`);
    }
    if (source === "EQUIPAMENTO" && equipment) lines.push(`- Equipamento relacionado: ${equipmentLabel} (#${equipment})`);
    if (source === "FALHA_QC") {
      if (analyte) lines.push(`- Analito/campo de exame: ${analyteLabel} (#${analyte})`);
      if (exam) lines.push(`- Tipo de exame: ${examLabel} (#${exam})`);
    }
    if (source === "EXPOSICAO") {
      if (exposureIncident) lines.push(`- Incidente de exposição: ${exposureIncidentLabel} (#${exposureIncident})`);
      if (sector) lines.push(`- Sector do incidente: #${sector}`);
    }
    if (traceNotes.trim()) lines.push(`- Cadeia raiz-fruto: ${traceNotes.trim()}`);
    return lines.length > 1 ? lines.join("\n") : "";
  }

  function handleOrderChange(v: number | null, l: string) {
    setOrder(v); setOrderLabel(l);
    setExam(null); setExamLabel(""); setExamTest(null);
    setResult(null); setResultLabel("");
    setAnalyte(null); setAnalyteLabel("");
    setSample(null); setSampleLabel("");
  }

  async function handleExamChange(v: number | null, l: string) {
    setExam(v); setExamLabel(l);
    setExamTest(null);
    setResult(null); setResultLabel("");
    setAnalyte(null); setAnalyteLabel("");
    if (!v) return;
    try {
      const item = await apiFetch<Record<string, any>>(`/clinical_laboratory/order_item/${v}/`);
      if (item?.test) setExamTest(Number(item.test));
      setExamLabel(String(item?.test_name || item?.test_code || l || `Item #${v}`));
    } catch {}
  }

  async function handleResultChange(v: number | null, l: string) {
    setResult(v); setResultLabel(l);
    if (!v) return;
    try {
      const rec = await apiFetch<Record<string, any>>(`/clinical_laboratory/result/${v}/`);
      if (rec?.order_item) {
        const itemId = Number(rec.order_item);
        setExam(itemId);
        const item = await apiFetch<Record<string, any>>(`/clinical_laboratory/order_item/${itemId}/`);
        if (item?.test) setExamTest(Number(item.test));
        setExamLabel(String(item?.test_name || item?.test_code || rec?.test_name || `Item #${itemId}`));
        if (item?.order && !order) {
          setOrder(Number(item.order));
          setOrderLabel(String(rec?.order_custom_id || `Requisição #${item.order}`));
        }
      }
      if (rec?.test_field) {
        setAnalyte(Number(rec.test_field));
        setAnalyteLabel(String(rec?.field_name || `Analito #${rec.test_field}`));
      }
      if (rec?.sample) {
        setSample(Number(rec.sample));
        setSampleLabel(String(rec?.sample_barcode || `Amostra #${rec.sample}`));
      }
      setResultLabel(String(l || [rec?.custom_id, rec?.test_name, rec?.field_name, rec?.value, rec?.unit].filter(Boolean).join(" - ")));
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      const traceability = traceabilityLines();
      const compactRef = sourceRef.trim()
        || (patientImpact && orderLabel ? orderLabel : "")
        || (equipmentLabel || analyteLabel || exposureIncidentLabel).slice(0, 80);
      await apiFetch(`/clinical_laboratory/nonconformity/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          code: code.trim(),
          sector,
          source,
          source_ref: compactRef.slice(0, 80),
          detected_at: detectedAt ? new Date(detectedAt).toISOString() : null,
          description: description.trim(),
          severity,
          immediate_action: immediateAction.trim(),
          root_cause: composeRootCauseTrace(rootCause, traceability),
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
            <div className="rounded-lg border border-dashed border-rose-200 bg-rose-50/60 px-3 py-2 text-[11px] font-medium text-rose-700 dark:border-rose-800/40 dark:bg-rose-900/15 dark:text-rose-300">
              Código interno automático: <span className="font-mono">{code || customId || "gerado pelo sistema"}</span>
            </div>
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
              {errors.patientImpact && <p className="text-[10px] font-medium text-red-600 dark:text-red-400">{errors.patientImpact}</p>}
            </Card>
          </div>

          {patientImpact && (
            <div className="lg:col-span-2">
              <Card icon={ClipboardList} title="Rastreabilidade do impacto no paciente" accent="bg-red-500">
                <div className="grid gap-1.5 md:grid-cols-2">
                  <Field label="Requisição em causa">
                    <RelationSelect value={order} onChange={handleOrderChange} target={T_ORDER} placeholder="Pesquisar requisição..." initialLabel={orderLabel} />
                  </Field>
                  <Field label="Exame em causa">
                    <RelationSelect value={exam} onChange={handleExamChange} target={orderItemTarget} placeholder="Pesquisar exame da requisição..." initialLabel={examLabel} disabled={!order} disabledMessage="Selecione primeiro a requisição em causa." />
                  </Field>
                  <Field label="Resultado em causa">
                    <RelationSelect value={result} onChange={handleResultChange} target={resultTarget} placeholder="Pesquisar resultado..." initialLabel={resultLabel} disabled={!exam} disabledMessage="Selecione primeiro o exame da requisição." />
                  </Field>
                  <Field label="Amostra em causa">
                    <RelationSelect value={sample} onChange={(v, l) => { setSample(v); setSampleLabel(l); setResult(null); setResultLabel(""); }} target={sampleTarget} placeholder="Pesquisar amostra..." initialLabel={sampleLabel} disabled={!order} disabledMessage="Selecione primeiro a requisição em causa." />
                  </Field>
                </div>
              </Card>
            </div>
          )}

          {source === "EQUIPAMENTO" && (
            <div className="lg:col-span-2">
              <Card icon={ShieldAlert} title="Equipamento em causa" accent="bg-orange-500">
                <Field label="Equipamento cadastrado" required error={errors.equipment}>
                  <RelationSelect value={equipment} onChange={(v, l) => { setEquipment(v); setEquipmentLabel(l); }} target={T_EQUIPMENT} placeholder="Pesquisar equipamento..." />
                </Field>
              </Card>
            </div>
          )}

          {source === "FALHA_QC" && (
            <div className="lg:col-span-2">
              <Card icon={ShieldAlert} title="Controlo de qualidade" accent="bg-amber-400">
                <div className="grid gap-1.5 md:grid-cols-2">
                  <Field label="Analito/campo do exame" error={errors.analyte}>
                    <RelationSelect value={analyte} onChange={(v, l) => { setAnalyte(v); setAnalyteLabel(l); setResult(null); setResultLabel(""); }} target={analyteTarget} placeholder="Pesquisar analito..." initialLabel={analyteLabel} disabled={patientImpact && !!exam && !examTest} disabledMessage="Carregando o exame da requisição." />
                  </Field>
                  <Field label="Tipo de exame">
                    <RelationSelect value={exam} onChange={(v, l) => { setExam(v); setExamLabel(l); }} target={T_TEST} placeholder="Pesquisar tipo de exame..." />
                  </Field>
                </div>
              </Card>
            </div>
          )}

          {source === "EXPOSICAO" && (
            <div className="lg:col-span-2">
              <Card icon={ShieldAlert} title="Incidente por sector" accent="bg-violet-500">
                <Field label="Incidente de exposição" error={errors.incident}>
                  <RelationSelect value={exposureIncident} onChange={(v, l) => { setExposureIncident(v); setExposureIncidentLabel(l); }} target={T_EXPOSURE_INCIDENT} placeholder="Pesquisar incidente..." />
                </Field>
              </Card>
            </div>
          )}

          <Card icon={ClipboardList} title="Investigação" accent="bg-slate-400">
            <Field label="Ação imediata">
              <textarea value={immediateAction} onChange={(e) => setImmediateAction(e.target.value)} rows={4} className={`${inputCls} resize-y`} />
            </Field>
            <Field label="Causa raiz">
              <textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} rows={4} className={`${inputCls} resize-y`} />
            </Field>
            <Field label="Cadeia de rastreabilidade raiz-fruto">
              <textarea value={traceNotes} onChange={(e) => setTraceNotes(e.target.value)} rows={3} placeholder="Ex: origem operacional -> falha imediata -> efeito observado -> consequência." className={`${inputCls} resize-y`} />
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
