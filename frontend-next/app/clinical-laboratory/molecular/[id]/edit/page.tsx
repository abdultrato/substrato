"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Dna, Loader2, Save } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

const ENDPOINT = "/clinical_laboratory/molecular_result/";
const LIST_HREF = "/clinical-laboratory/molecular";

type MolecularResult = {
  id: number;
  custom_id: string;
  order_item: number;
  sample: number | null;
  assay: string;
  detection: string;
  rif_resistance: string;
  quantitative_value: string | number | null;
  unit: string;
  ct_value: string | number | null;
  instrument: string;
  performed_at: string | null;
  notes: string;
  order_custom_id?: string;
  patient_name?: string;
  test_name?: string;
  test_code?: string;
  test_method?: string;
  sample_barcode?: string;
  sample_type?: string;
  sample_received_at?: string | null;
};

const ASSAY_LABELS: Record<string, string> = {
  GENEXPERT_MTB_RIF: "GeneXpert MTB/RIF",
  TB_PCR: "TB PCR",
  CV_HIV: "Carga viral HIV",
  CV_HEPATITE: "Carga viral hepatite",
  HPV_DNA: "HPV DNA",
  COVID_PCR: "COVID PCR",
  PCR: "PCR",
  OUTRO: "Outro",
};

const DETECTION_OPTIONS = [
  { value: "NAO_DETETADO", label: "Não detetado" },
  { value: "DETETADO", label: "Detetado" },
  { value: "INDETERMINADO", label: "Indeterminado" },
  { value: "INVALIDO", label: "Inválido" },
];

const RIF_OPTIONS = [
  { value: "NA", label: "N/A" },
  { value: "SENSIVEL", label: "Sensível à rifampicina" },
  { value: "RESISTENTE", label: "Resistente à rifampicina" },
  { value: "INDETERMINADO", label: "Indeterminado" },
];

const GLASS =
  "rounded-xl border border-white/[0.10] bg-white/[0.02] shadow-none backdrop-blur-[1px] dark:border-white/[0.06] dark:bg-white/[0.02]";
const INPUT =
  "h-7 w-full rounded-lg border border-white/[0.10] bg-white/[0.02] px-2 text-sm text-foreground shadow-sm outline-none backdrop-blur-[1px] transition placeholder:text-muted-foreground focus:border-indigo-400 focus:bg-white/[0.03] focus:ring-2 focus:ring-indigo-500/20 dark:border-white/[0.06] dark:bg-white/[0.02] dark:focus:bg-white/[0.03]";
const TEXTAREA =
  "min-h-[84px] w-full rounded-lg border border-white/[0.10] bg-white/[0.02] px-2 py-1.5 text-sm text-foreground shadow-sm outline-none backdrop-blur-[1px] transition placeholder:text-muted-foreground focus:border-indigo-400 focus:bg-white/[0.03] focus:ring-2 focus:ring-indigo-500/20 dark:border-white/[0.06] dark:bg-white/[0.02] dark:focus:bg-white/[0.03]";

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-MZ", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function FieldCard({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`space-y-1 rounded-lg border border-white/[0.10] bg-white/[0.02] p-1.5 backdrop-blur-[1px] dark:border-white/[0.06] dark:bg-white/[0.02] ${className}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/[0.10] bg-white/[0.02] p-1.5 backdrop-blur-[1px] dark:border-white/[0.06] dark:bg-white/[0.02]">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold text-foreground">{value || "—"}</p>
    </div>
  );
}

export default function ClinicalLaboratoryMolecularEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [record, setRecord] = useState<MolecularResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detection, setDetection] = useState("NAO_DETETADO");
  const [rifResistance, setRifResistance] = useState("NA");
  const [quantitativeValue, setQuantitativeValue] = useState("");
  const [unit, setUnit] = useState("");
  const [ctValue, setCtValue] = useState("");
  const [instrument, setInstrument] = useState("");
  const [performedAt, setPerformedAt] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<MolecularResult>(`${ENDPOINT}${id}/`, { clientCache: false });
        if (!mounted) return;
        setRecord(data);
        setDetection(data.detection || "NAO_DETETADO");
        setRifResistance(data.rif_resistance || "NA");
        setQuantitativeValue(data.quantitative_value == null ? "" : String(data.quantitative_value));
        setUnit(data.unit || "");
        setCtValue(data.ct_value == null ? "" : String(data.ct_value));
        setInstrument(data.instrument || "");
        setPerformedAt(toDateTimeLocal(data.performed_at));
        setNotes(data.notes || "");
      } catch (err: any) {
        if (mounted) setError(err?.message || "Não foi possível carregar o resultado molecular.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load().catch(() => {});
    return () => {
      mounted = false;
    };
  }, [id]);

  const isGeneXpert = record?.assay === "GENEXPERT_MTB_RIF";
  const assayLabel = record ? (ASSAY_LABELS[record.assay] ?? record.assay) : "Resultado molecular";

  useEffect(() => {
    if (!record) return;
    if (!isGeneXpert || detection !== "DETETADO") {
      setRifResistance("NA");
    } else if (rifResistance === "NA") {
      setRifResistance("SENSIVEL");
    }
  }, [detection, isGeneXpert, record, rifResistance]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record) return;

    setSaving(true);
    setError(null);
    try {
      const saved = await apiFetch<MolecularResult>(`${ENDPOINT}${record.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          detection,
          rif_resistance: isGeneXpert ? rifResistance : "NA",
          quantitative_value: quantitativeValue.trim() || null,
          unit: unit.trim(),
          ct_value: ctValue.trim() || null,
          instrument: instrument.trim(),
          performed_at: performedAt ? new Date(performedAt).toISOString() : null,
          notes: notes.trim(),
        }),
      });
      router.push(`${LIST_HREF}/${saved.id}`);
    } catch (err: any) {
      setError(err?.message || "Não foi possível guardar as alterações do resultado molecular.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
        <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          A carregar resultado molecular...
        </div>
      </AppLayout>
    );
  }

  if (!record) {
    return (
      <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
        <div className="mx-auto w-full max-w-[97vw] rounded-lg border border-red-200/35 bg-red-50/[0.08] p-3 text-sm text-red-800 backdrop-blur-[1px] dark:border-red-800/25 dark:bg-red-900/[0.04] dark:text-red-300">
          {error || "Resultado molecular não encontrado."}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-[97vw] space-y-1 overflow-x-hidden px-0.5">
        <section className={`relative overflow-hidden px-2 py-1.5 ${GLASS}`}>
          <span className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-indigo-500 via-cyan-500 to-sky-500" />
          <div className="relative flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start gap-1.5 md:items-center">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-600 text-white shadow-sm shadow-indigo-500/15">
                <Dna size={18} />
              </span>
              <div className="min-w-0">
                <div className="mb-0.5 flex flex-wrap gap-1">
                  <span className="rounded-full border border-indigo-200/30 bg-indigo-50/[0.02] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 backdrop-blur-[1px] dark:border-indigo-800/20 dark:bg-indigo-900/[0.02] dark:text-indigo-300">
                    Molecular
                  </span>
                  <span className="rounded-full border border-cyan-200/30 bg-cyan-50/[0.02] px-1.5 py-0.5 text-[10px] font-medium text-cyan-700 backdrop-blur-[1px] dark:border-cyan-800/20 dark:bg-cyan-900/[0.02] dark:text-cyan-300">
                    {record.custom_id}
                  </span>
                </div>
                <h1 className="text-base font-bold text-foreground sm:text-lg">Editar resultado molecular</h1>
                <p className="truncate text-xs text-muted-foreground">{assayLabel} · {record.patient_name || "Paciente não identificado"}</p>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-1 md:flex md:w-auto md:shrink-0 md:items-center">
              <Link
                href={`${LIST_HREF}/${record.id}`}
                className="inline-flex h-7 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-white/[0.10] bg-white/[0.02] px-2.5 text-sm font-medium text-foreground shadow-sm backdrop-blur-[1px] transition hover:bg-white/[0.03] dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:bg-white/[0.03]"
              >
                <ArrowLeft size={16} />
                Voltar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-7 min-w-0 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 px-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Guardar
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200/35 bg-red-50/[0.08] px-2 py-1.5 text-sm text-red-800 shadow-sm backdrop-blur-[1px] dark:border-red-800/25 dark:bg-red-900/[0.04] dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-1">
          <section className={`relative min-w-0 overflow-hidden p-2 pl-3 ${GLASS}`}>
            <span className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-sky-500 to-cyan-500" />
            <div className="mb-1.5 border-b border-white/[0.08] pb-1.5 dark:border-white/[0.05]">
              <h2 className="text-sm font-semibold text-foreground">Rastreabilidade herdada</h2>
              <p className="text-xs text-muted-foreground">Pedido, amostra e ensaio permanecem herdados do fluxo molecular.</p>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-1">
              <InfoTile label="Paciente" value={record.patient_name || "Paciente não identificado"} />
              <InfoTile label="Pedido" value={record.order_custom_id || `Item ${record.order_item}`} />
              <InfoTile label="Exame" value={record.test_name || ASSAY_LABELS[record.assay] || record.assay} />
              <InfoTile label="Método" value={record.test_method || "Molecular"} />
              <InfoTile label="Amostra" value={record.sample_barcode || record.sample_type || (record.sample ? `Amostra ${record.sample}` : "—")} />
              <InfoTile label="Recebida" value={formatDateTime(record.sample_received_at)} />
            </div>
          </section>

          <section className={`relative min-w-0 overflow-hidden p-2 pl-3 ${GLASS}`}>
            <span className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-indigo-500 to-cyan-500" />
            <div className="mb-1.5 flex flex-col gap-1 border-b border-white/[0.08] pb-1.5 dark:border-white/[0.05] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Resultado técnico</h2>
                <p className="text-xs text-muted-foreground">Actualize deteção, resistência e dados instrumentais.</p>
              </div>
              <span className="rounded-full border border-indigo-200/30 bg-indigo-50/[0.02] px-1.5 py-0.5 text-xs font-medium text-indigo-700 backdrop-blur-[1px] dark:border-indigo-800/20 dark:bg-indigo-900/[0.02] dark:text-indigo-300">
                {assayLabel}
              </span>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-1">
              <FieldCard label="Deteção">
                <select value={detection} onChange={(event) => setDetection(event.target.value)} className={INPUT}>
                  {DETECTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </FieldCard>

              <FieldCard label="Resistência à rifampicina">
                <select
                  value={isGeneXpert ? rifResistance : "NA"}
                  onChange={(event) => setRifResistance(event.target.value)}
                  disabled={!isGeneXpert || detection !== "DETETADO"}
                  className={INPUT}
                >
                  {RIF_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </FieldCard>

              <FieldCard label="Valor quantitativo">
                <input value={quantitativeValue} onChange={(event) => setQuantitativeValue(event.target.value)} inputMode="decimal" className={INPUT} />
              </FieldCard>

              <FieldCard label="Unidade">
                <input value={unit} onChange={(event) => setUnit(event.target.value)} className={INPUT} />
              </FieldCard>

              <FieldCard label="Ct">
                <input value={ctValue} onChange={(event) => setCtValue(event.target.value)} inputMode="decimal" className={INPUT} />
              </FieldCard>

              <FieldCard label="Instrumento">
                <input value={instrument} onChange={(event) => setInstrument(event.target.value)} className={INPUT} />
              </FieldCard>

              <FieldCard label="Data e hora da execução">
                <input type="datetime-local" value={performedAt} onChange={(event) => setPerformedAt(event.target.value)} className={INPUT} />
              </FieldCard>

              <FieldCard label="Interpretação" className="[grid-column:1/-1]">
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={TEXTAREA} />
              </FieldCard>
            </div>
          </section>
        </div>
      </form>
    </AppLayout>
  );
}
