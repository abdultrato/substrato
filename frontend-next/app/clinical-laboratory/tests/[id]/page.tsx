"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Clock,
  FlaskConical,
  Loader2,
  Pencil,
  Plus,
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

// ── Types ─────────────────────────────────────────────────────────────────────

type LabTest = {
  id: number; custom_id: string; code: string; name: string;
  sector: number; sector_name: string; sector_code: string;
  sample_type: string; method: string;
  price: string; turnaround_hours: number;
  requires_fasting: boolean; requires_consent: boolean; active: boolean;
};

type LabTestField = {
  id: number; custom_id: string; code: string; name: string;
  unit: string; reference_range: string;
  reference_low: string | null; reference_high: string | null;
  critical_low: string | null; critical_high: string | null;
  result_type: string; result_choices: string[];
  sequence: number; active: boolean;
};

type FieldDraft = {
  name: string; code: string; unit: string; reference_range: string;
  reference_low: string; reference_high: string;
  critical_low: string; critical_high: string; sequence: string;
  result_type: string; result_choices: string[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const SAMPLE_LABELS: Record<string, string> = {
  SANGUE_TOTAL: "Sangue total", SORO: "Soro", PLASMA: "Plasma", URINA: "Urina",
  FEZES: "Fezes", ESCARRO: "Escarro", LCR: "Líquor", ZARAGATOA: "Swab",
  SEMEN: "Sémen", MEDULA: "Medula", LIQUIDO: "Líquido", OUTRO: "Outro",
};

const UNIT_OPTIONS = [
  "g/dl", "g/L", "mg/dl", "mg/L", "mg/24h", "µg/dL", "µg/L", "µg/mL",
  "ng/mL", "ng/dL", "pg/mL", "mmol/l", "mmol/mol", "µmol/l", "nmol/L", "pmol/L",
  "mEq/L", "cel/mm3", "x10³/µl", "x10⁶/µL", "%", "u/l", "U/mL", "UI/L", "UI/mL",
  "mUI/L", "kU/L", "p/µL", "ph", "fl", "pg", "mm/h",
  "Ct", "cópias/mL", "log10", "% alelo", "% IS", "S/CO", "mUI/mL", "título", "index",
  "UFC/mL", "UFC/g", "S/I/R", "mm", "cruzes", "campo", "células/campo",
  "mL/24h", "mL/min", "mg/g creatinina", "densidade",
  "segundos", "minutos", "ratio", "mmHg", "mOsm/kg", "s", "INR", "razão/índice", "sem unidade",
];

const CHOICE_PRESETS: { label: string; choices: string[] }[] = [
  { label: "Qualitativo", choices: ["Negativo", "Positivo", "Indeterminado"] },
  { label: "Titulação", choices: ["Reativo 80", "Reativo 160", "Reativo 240", "Reativo 320", "Não Reativo"] },
  { label: "Semiquant.", choices: ["Reativo +", "Reativo ++", "Reativo +++"] },
];

function emptyDraft(sequence: number): FieldDraft {
  return { name: "", code: "", unit: "", reference_range: "", reference_low: "", reference_high: "", critical_low: "", critical_high: "", sequence: String(sequence), result_type: "numero", result_choices: [] };
}

function fieldToDraft(f: LabTestField): FieldDraft {
  return {
    name: f.name, code: f.code, unit: f.unit, reference_range: f.reference_range,
    reference_low: f.reference_low ?? "", reference_high: f.reference_high ?? "",
    critical_low: f.critical_low ?? "", critical_high: f.critical_high ?? "",
    sequence: String(f.sequence),
    result_type: f.result_type ?? "numero",
    result_choices: f.result_choices ?? [],
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(val: string | number) {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return n.toLocaleString("pt-PT", { style: "currency", currency: "MZN" });
}

function fmtRange(low: string | null, high: string | null, fallback?: string) {
  const hasLow = low !== null && low !== undefined && low !== "";
  const hasHigh = high !== null && high !== undefined && high !== "";
  if (!hasLow && !hasHigh) return fallback?.trim() || "—";
  return `${hasLow ? Number(low) : "−∞"} – ${hasHigh ? Number(high) : "+∞"}`;
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, children, action }: {
  icon: React.ElementType; title: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Icon size={13} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
          <h2 className="text-xs font-semibold text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-border/30 last:border-0">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

const smIn = "w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/25";

// ── Inline field form ─────────────────────────────────────────────────────────

function ChoicesEditor({ choices, onChange }: { choices: string[]; onChange: (c: string[]) => void }) {
  const [inputVal, setInputVal] = useState("");
  function addItem() {
    const v = inputVal.trim();
    if (v && !choices.includes(v)) onChange([...choices, v]);
    setInputVal("");
  }
  return (
    <div className="space-y-1.5 rounded-md border border-border/50 bg-background/50 p-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Opções de escolha</p>
      {/* Presets */}
      <div className="flex flex-wrap gap-1">
        {CHOICE_PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => onChange(p.choices)}
            className="inline-flex h-5 items-center rounded px-1.5 text-[10px] border border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-700/40 dark:text-violet-300 dark:hover:bg-violet-900/20 transition">
            {p.label}
          </button>
        ))}
      </div>
      {/* Current choices as tags */}
      {choices.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {choices.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
              {c}
              <button type="button" onClick={() => onChange(choices.filter((_, j) => j !== i))}
                className="ml-0.5 text-muted-foreground hover:text-red-500 transition">
                <X size={8} />
              </button>
            </span>
          ))}
        </div>
      )}
      {/* Add custom */}
      <div className="flex gap-1">
        <input type="text" value={inputVal} onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
          placeholder="Adicionar opção…" className={smIn + " flex-1"} />
        <button type="button" onClick={addItem}
          className="inline-flex h-[29px] items-center rounded-md border border-border bg-card px-2 text-[11px] font-medium text-foreground hover:bg-muted transition">
          <Plus size={11} />
        </button>
      </div>
    </div>
  );
}

function FieldForm({ draft, onChange, onSave, onCancel, saving, error }: {
  draft: FieldDraft;
  onChange: (patch: Partial<FieldDraft>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error?: string | null;
}) {
  return (
    <div className="rounded-lg border border-violet-200/60 bg-violet-50/30 p-3 space-y-2 dark:border-violet-700/30 dark:bg-violet-900/10">
      {/* Row 1: Name + Code + Unit + result_type */}
      <div className="grid grid-cols-4 gap-2">
        <div className="col-span-1 space-y-1">
          <label className="text-[10px] font-semibold text-muted-foreground">Nome *</label>
          <input type="text" value={draft.name} onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Ex.: Hemoglobina" className={smIn} autoFocus />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-muted-foreground">Código</label>
          <input type="text" value={draft.code} onChange={(e) => onChange({ code: e.target.value })}
            placeholder="HB" className={smIn} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-muted-foreground">Tipo de resultado</label>
          <select value={draft.result_type} onChange={(e) => onChange({ result_type: e.target.value, result_choices: [] })} className={smIn}>
            <option value="numero">Número</option>
            <option value="texto">Texto livre</option>
            <option value="texto_choice">Escolha (lista)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-muted-foreground">Unidade</label>
          <select value={draft.unit} onChange={(e) => onChange({ unit: e.target.value })} className={smIn}
            disabled={draft.result_type !== "numero"}>
            <option value="">—</option>
            {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Row 2: Limits (numeric) or choices */}
      {draft.result_type === "numero" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 rounded-md border border-border/50 bg-background/50 p-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Intervalo de referência</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Mín.</label>
                <input type="number" step="any" value={draft.reference_low} onChange={(e) => onChange({ reference_low: e.target.value })} placeholder="—" className={smIn} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Máx.</label>
                <input type="number" step="any" value={draft.reference_high} onChange={(e) => onChange({ reference_high: e.target.value })} placeholder="—" className={smIn} />
              </div>
            </div>
          </div>
          <div className="space-y-1.5 rounded-md border border-red-200/60 bg-red-50/30 p-2 dark:border-red-700/30 dark:bg-red-900/10">
            <p className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Limiar crítico (pânico)</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Mín.</label>
                <input type="number" step="any" value={draft.critical_low} onChange={(e) => onChange({ critical_low: e.target.value })} placeholder="—" className={smIn} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Máx.</label>
                <input type="number" step="any" value={draft.critical_high} onChange={(e) => onChange({ critical_high: e.target.value })} placeholder="—" className={smIn} />
              </div>
            </div>
          </div>
        </div>
      )}

      {draft.result_type === "texto_choice" && (
        <ChoicesEditor choices={draft.result_choices} onChange={(c) => onChange({ result_choices: c })} />
      )}

      {error && <p className="text-[11px] font-medium text-red-600 dark:text-red-400">{error}</p>}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] font-medium text-foreground transition hover:bg-muted">
          <X size={11} /> Cancelar
        </button>
        <button type="button" onClick={onSave} disabled={saving || !draft.name.trim()}
          className="inline-flex h-7 items-center gap-1 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-[11px] font-semibold text-white transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50">
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Guardar
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LabTestDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [test, setTest] = useState<LabTest | null>(null);
  const [fields, setFields] = useState<LabTestField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  // Inline field state
  const [addingField, setAddingField] = useState(false);
  const [newDraft, setNewDraft] = useState<FieldDraft>(emptyDraft(0));
  const [newSaving, setNewSaving] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<FieldDraft>(emptyDraft(0));
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [movingId, setMovingId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null);
      try {
        const [testData, fieldsData] = await Promise.all([
          apiFetch<LabTest>(`/clinical_laboratory/test/${id}/`),
          apiFetchList<LabTestField>("/clinical_laboratory/test_field/", { pageSize: 200, query: { test: id } }),
        ]);
        setTest(testData);
        setFields(fieldsData.items);
      } catch (e: any) { setError(e?.message || "Erro ao carregar."); }
      finally { setLoading(false); }
    }
    load();
  }, [id]);

  async function toggleActive() {
    if (!test) return;
    setToggling(true);
    try {
      const action = test.active ? "inativar" : "ativar";
      const updated = await apiFetch<LabTest>(`/clinical_laboratory/test/${id}/${action}/`, { method: "POST" });
      setTest(updated);
    } catch (e: any) { alert(e?.message || "Erro ao alterar estado."); }
    finally { setToggling(false); }
  }

  async function saveNewField() {
    setNewSaving(true); setNewError(null);
    try {
      const created = await apiFetch<LabTestField>("/clinical_laboratory/test_field/", {
        method: "POST",
        body: JSON.stringify({
          test: Number(id), name: newDraft.name.trim(), code: newDraft.code.trim(),
          unit: newDraft.result_type === "numero" ? newDraft.unit : "",
          result_type: newDraft.result_type,
          result_choices: newDraft.result_choices,
          reference_low: newDraft.result_type === "numero" ? (newDraft.reference_low || null) : null,
          reference_high: newDraft.result_type === "numero" ? (newDraft.reference_high || null) : null,
          critical_low: newDraft.result_type === "numero" ? (newDraft.critical_low || null) : null,
          critical_high: newDraft.result_type === "numero" ? (newDraft.critical_high || null) : null,
          sequence: Number(newDraft.sequence) || fields.length,
        }),
      });
      setFields((prev) => [...prev, created]);
      setAddingField(false);
      setNewDraft(emptyDraft(fields.length + 1));
    } catch (e: any) { setNewError(e?.message || "Erro ao criar campo."); }
    finally { setNewSaving(false); }
  }

  function startEdit(f: LabTestField) {
    setEditingId(f.id);
    setEditDraft(fieldToDraft(f));
    setEditError(null);
    setAddingField(false);
  }

  async function saveEdit() {
    if (!editingId) return;
    setEditSaving(true); setEditError(null);
    try {
      const updated = await apiFetch<LabTestField>(`/clinical_laboratory/test_field/${editingId}/`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editDraft.name.trim(), code: editDraft.code.trim(),
          unit: editDraft.result_type === "numero" ? editDraft.unit : "",
          result_type: editDraft.result_type,
          result_choices: editDraft.result_choices,
          reference_low: editDraft.result_type === "numero" ? (editDraft.reference_low || null) : null,
          reference_high: editDraft.result_type === "numero" ? (editDraft.reference_high || null) : null,
          critical_low: editDraft.result_type === "numero" ? (editDraft.critical_low || null) : null,
          critical_high: editDraft.result_type === "numero" ? (editDraft.critical_high || null) : null,
          sequence: Number(editDraft.sequence) || 0,
        }),
      });
      setFields((prev) => prev.map((f) => f.id === editingId ? updated : f));
      setEditingId(null);
    } catch (e: any) { setEditError(e?.message || "Erro ao guardar."); }
    finally { setEditSaving(false); }
  }

  async function moveField(index: number, direction: "up" | "down") {
    const sorted = [...fields].sort((a, b) => a.sequence - b.sequence);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;
    const a = sorted[index];
    const b = sorted[targetIndex];
    setMovingId(a.id);
    try {
      await Promise.all([
        apiFetch(`/clinical_laboratory/test_field/${a.id}/`, { method: "PATCH", body: JSON.stringify({ sequence: b.sequence }) }),
        apiFetch(`/clinical_laboratory/test_field/${b.id}/`, { method: "PATCH", body: JSON.stringify({ sequence: a.sequence }) }),
      ]);
      setFields((prev) => prev.map((f) => {
        if (f.id === a.id) return { ...f, sequence: b.sequence };
        if (f.id === b.id) return { ...f, sequence: a.sequence };
        return f;
      }));
    } catch (e: any) { alert(e?.message || "Erro ao reordenar."); }
    finally { setMovingId(null); }
  }

  async function deleteField(fieldId: number) {
    if (!confirm("Eliminar este campo permanentemente?")) return;
    setDeletingId(fieldId);
    try {
      await apiFetch(`/clinical_laboratory/test_field/${fieldId}/`, { method: "DELETE" });
      setFields((prev) => prev.filter((f) => f.id !== fieldId));
      if (editingId === fieldId) setEditingId(null);
    } catch (e: any) { alert(e?.message || "Erro ao eliminar."); }
    finally { setDeletingId(null); }
  }

  if (loading) return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Carregando…
      </div>
    </AppLayout>
  );

  if (error || !test) return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-800">
        {error || "Exame não encontrado."}
      </div>
    </AppLayout>
  );

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="space-y-3">

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                <FlaskConical size={16} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold leading-tight text-foreground">{test.name}</h1>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    test.active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-400"
                  }`}>{test.active ? "Ativo" : "Inativo"}</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono">{test.code} · {test.custom_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={toggleActive} disabled={toggling}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-50">
                {toggling ? <Loader2 size={13} className="animate-spin" /> : test.active ? <ToggleLeft size={13} /> : <ToggleRight size={13} className="text-emerald-500" />}
                {test.active ? "Inativar" : "Ativar"}
              </button>
              <Link href={`/clinical-laboratory/tests/${id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700">
                <Pencil size={13} /> Editar
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <SectionCard icon={FlaskConical} title="Identificação">
            <div className="divide-y divide-border/30">
              <InfoRow label="Sector" value={test.sector_name || "—"} />
              <InfoRow label="Tipo de amostra" value={(SAMPLE_LABELS[test.sample_type] ?? test.sample_type) || "—"} />
              <InfoRow label="Método" value={test.method || "—"} />
              <InfoRow label="Jejum" value={test.requires_fasting ? <span className="text-amber-600 font-semibold">Sim</span> : "Não"} />
              <InfoRow label="Consentimento" value={test.requires_consent ? <span className="text-amber-600 font-semibold">Sim</span> : "Não"} />
            </div>
          </SectionCard>

          <SectionCard icon={Clock} title="Preço e prazo">
            <div className="divide-y divide-border/30">
              <InfoRow label="Preço" value={<span className="text-base font-bold text-foreground">{fmtPrice(test.price)}</span>} />
              <InfoRow label="Tempo de resposta" value={`${test.turnaround_hours}h`} />
            </div>
          </SectionCard>
        </div>

        {/* Campos / Analitos — inline editor */}
        <SectionCard icon={ShieldAlert} title={`Campos do exame (analitos) · ${fields.length}`}
          action={
            !addingField && (
              <button type="button" onClick={() => { setAddingField(true); setEditingId(null); setNewDraft(emptyDraft(fields.length)); }}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[11px] font-medium text-foreground transition hover:bg-muted">
                <Plus size={11} /> Adicionar campo
              </button>
            )
          }>

          <div className="space-y-1">
            {/* Column header */}
            {(fields.length > 0 || addingField) && (
              <div className="grid grid-cols-[28px_1fr_80px_130px_130px_80px] gap-2 border-b border-border/40 px-2 pb-1.5 text-[10px] font-semibold text-muted-foreground">
                <span className="text-center">#</span>
                <span>Campo</span>
                <span>Unidade</span>
                <span>Referência</span>
                <span className="text-red-500 dark:text-red-400">Crítico</span>
                <span />
              </div>
            )}

            {/* Existing fields — sorted by sequence */}
            {[...fields].sort((a, b) => a.sequence - b.sequence).map((f, idx, sorted) => (
              <div key={f.id}>
                {editingId === f.id ? (
                  <FieldForm
                    draft={editDraft}
                    onChange={(p) => setEditDraft((d) => ({ ...d, ...p }))}
                    onSave={saveEdit}
                    onCancel={() => setEditingId(null)}
                    saving={editSaving}
                    error={editError}
                  />
                ) : (
                  <div className="group grid grid-cols-[28px_1fr_80px_130px_130px_80px] gap-2 items-center rounded-lg px-2 py-1.5 text-xs hover:bg-muted/40 transition">
                    {/* Position */}
                    <div className="flex flex-col items-center gap-0.5">
                      <button type="button" onClick={() => moveField(idx, "up")} disabled={idx === 0 || movingId === f.id}
                        className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition">
                        <ArrowUp size={9} />
                      </button>
                      <span className="text-[10px] font-bold text-muted-foreground leading-none">{idx + 1}</span>
                      <button type="button" onClick={() => moveField(idx, "down")} disabled={idx === sorted.length - 1 || movingId === f.id}
                        className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition">
                        <ArrowDown size={9} />
                      </button>
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium text-foreground truncate block">{f.name || f.code || "—"}</span>
                      {f.result_type && f.result_type !== "numero" && (
                        <span className={`inline-flex items-center rounded px-1 py-0.5 text-[9px] font-semibold leading-none mt-0.5 ${f.result_type === "texto_choice" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                          {f.result_type === "texto_choice" ? `lista (${(f.result_choices ?? []).length})` : "texto"}
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground truncate">{f.result_type === "numero" ? (f.unit || "—") : "—"}</span>
                    <span className="text-foreground">{f.result_type === "numero" ? fmtRange(f.reference_low, f.reference_high, f.reference_range) : "—"}</span>
                    <span>
                      {f.result_type !== "numero" || fmtRange(f.critical_low, f.critical_high) === "—"
                        ? <span className="text-muted-foreground">—</span>
                        : <span className="font-semibold text-red-600 dark:text-red-400">{fmtRange(f.critical_low, f.critical_high)}</span>
                      }
                    </span>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                      {f.active
                        ? <CheckCircle2 size={11} className="text-emerald-500" />
                        : <AlertTriangle size={11} className="text-red-400" />}
                      <button type="button" onClick={() => startEdit(f)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition">
                        <Pencil size={11} />
                      </button>
                      <button type="button" onClick={() => deleteField(f.id)} disabled={deletingId === f.id}
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition disabled:opacity-50">
                        {deletingId === f.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* New field form */}
            {addingField && (
              <FieldForm
                draft={newDraft}
                onChange={(p) => setNewDraft((d) => ({ ...d, ...p }))}
                onSave={saveNewField}
                onCancel={() => setAddingField(false)}
                saving={newSaving}
                error={newError}
              />
            )}

            {fields.length === 0 && !addingField && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Nenhum campo adicionado. Clique em "Adicionar campo" para começar.
              </p>
            )}
          </div>
        </SectionCard>

      </div>
    </AppLayout>
  );
}
