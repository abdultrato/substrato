"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Dna, Loader2, Save } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

const ENDPOINT = "/clinical_laboratory/molecular_result/";
const QUEUE_ENDPOINT = "/clinical_laboratory/molecular_result/queue/";
const LIST_HREF = "/clinical-laboratory/molecular";

type MolecularQueueItem = {
  id: string;
  kind: "pending" | "molecular_result";
  molecular_result_id: number | null;
  order_item: number;
  order_item_custom_id?: string;
  order_custom_id?: string;
  patient_name?: string;
  test_name?: string;
  test_code?: string;
  test_method?: string;
  sample: number | null;
  sample_barcode?: string;
  sample_type?: string;
  sample_received_at?: string | null;
  assay: string;
  detection: string;
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
  "rounded-xl border border-white/25 bg-white/[0.14] shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]";
const INPUT =
  "h-9 w-full rounded-lg border border-white/[0.22] bg-white/[0.10] px-2.5 text-sm text-foreground shadow-sm outline-none backdrop-blur-md transition placeholder:text-muted-foreground focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/[0.10] dark:bg-white/[0.04]";
const TEXTAREA =
  "min-h-[92px] w-full rounded-lg border border-white/[0.22] bg-white/[0.10] px-2.5 py-2 text-sm text-foreground shadow-sm outline-none backdrop-blur-md transition placeholder:text-muted-foreground focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/[0.10] dark:bg-white/[0.04]";

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-MZ", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function FieldCard({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`space-y-1.5 rounded-lg border border-white/[0.16] bg-white/[0.08] p-2.5 backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.025] ${className}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/[0.16] bg-white/[0.08] p-2.5 backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.025]">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold text-foreground">{value || "—"}</p>
    </div>
  );
}

export default function ClinicalLaboratoryMolecularCreatePage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">A carregar...</div>}>
      <MolecularCreateForm />
    </Suspense>
  );
}

function MolecularCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderItem = Number(searchParams.get("order_item") || 0);
  const sample = searchParams.get("sample") ? Number(searchParams.get("sample")) : null;
  const assay = searchParams.get("assay") || "PCR";
  const isGeneXpert = assay === "GENEXPERT_MTB_RIF";

  const [queue, setQueue] = useState<MolecularQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detection, setDetection] = useState("NAO_DETETADO");
  const [rifResistance, setRifResistance] = useState(isGeneXpert ? "SENSIVEL" : "NA");
  const [quantitativeValue, setQuantitativeValue] = useState("");
  const [unit, setUnit] = useState("");
  const [ctValue, setCtValue] = useState("");
  const [instrument, setInstrument] = useState("");
  const [performedAt, setPerformedAt] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadQueue() {
      setLoading(true);
      setError(null);
      try {
        const rows = await apiFetch<MolecularQueueItem[]>(QUEUE_ENDPOINT, { clientCache: false });
        if (mounted) setQueue(rows);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Não foi possível carregar os dados herdados do exame molecular.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadQueue().catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isGeneXpert) {
      setRifResistance("NA");
    } else if (detection === "DETETADO" && rifResistance === "NA") {
      setRifResistance("SENSIVEL");
    } else if (detection !== "DETETADO") {
      setRifResistance("NA");
    }
  }, [detection, isGeneXpert, rifResistance]);

  const candidate = useMemo(
    () => queue.find((item) => item.kind === "pending" && item.order_item === orderItem && (sample ? item.sample === sample : true)) || null,
    [orderItem, queue, sample]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orderItem) {
      setError("O item do pedido é obrigatório e deve vir herdado da fila molecular.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await apiFetch<{ id: number }>(ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          order_item: orderItem,
          sample,
          assay,
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
      router.push(`${LIST_HREF}/${created.id}`);
    } catch (err: any) {
      setError(err?.message || "Não foi possível guardar o resultado molecular.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-[97vw] space-y-2 overflow-x-hidden px-1 sm:px-0">
        <section className={`relative overflow-hidden px-3 py-2.5 ${GLASS}`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-500 via-cyan-500 to-sky-500" />
          <div className="relative flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start gap-2.5 md:items-center">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-600 text-white shadow-sm shadow-indigo-500/25">
                <Dna size={18} />
              </span>
              <div className="min-w-0">
                <div className="mb-0.5 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-indigo-200/70 bg-indigo-50/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 backdrop-blur-sm dark:border-indigo-800/40 dark:bg-indigo-900/20 dark:text-indigo-300">
                    Molecular
                  </span>
                  <span className="rounded-full border border-cyan-200/70 bg-cyan-50/50 px-2 py-0.5 text-[10px] font-medium text-cyan-700 backdrop-blur-sm dark:border-cyan-800/40 dark:bg-cyan-900/20 dark:text-cyan-300">
                    {ASSAY_LABELS[assay] ?? assay}
                  </span>
                </div>
                <h1 className="text-base font-bold text-foreground sm:text-lg">Novo resultado molecular</h1>
                <p className="text-xs text-muted-foreground md:truncate">
                  Pedido, amostra e ensaio são herdados da fila; nesta página regista-se apenas o resultado técnico.
                </p>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-1.5 md:flex md:w-auto md:shrink-0 md:items-center">
              <Link
                href={LIST_HREF}
                className="inline-flex h-8 min-w-0 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/[0.10] px-3 text-sm font-medium text-foreground shadow-sm backdrop-blur-md transition hover:bg-white/[0.18] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
              >
                <ArrowLeft size={16} />
                Voltar
              </Link>
              <button
                type="submit"
                disabled={saving || !orderItem}
                className="inline-flex h-8 min-w-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Guardar
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200/60 bg-red-50/50 px-3 py-2 text-sm text-red-800 shadow-sm backdrop-blur-sm dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="grid min-w-0 grid-cols-1 gap-2 xl:grid-cols-[minmax(280px,0.9fr)_minmax(360px,1.2fr)]">
          <section className={`min-w-0 p-3 ${GLASS}`}>
            <div className="mb-2 border-b border-white/[0.14] pb-2 dark:border-white/[0.08]">
              <h2 className="text-sm font-semibold text-foreground">Rastreabilidade herdada</h2>
              <p className="text-xs text-muted-foreground">
                Estes dados vêm da fila molecular e não são selecionados manualmente neste formulário.
              </p>
            </div>

            {loading ? (
              <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">
                <Loader2 size={18} className="mr-2 animate-spin" />
                A carregar contexto...
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] gap-2">
                <InfoTile label="Paciente" value={candidate?.patient_name || "Paciente não identificado"} />
                <InfoTile label="Pedido" value={candidate?.order_custom_id || `Item ${orderItem || "-"}`} />
                <InfoTile label="Exame" value={candidate?.test_name || ASSAY_LABELS[assay] || assay} />
                <InfoTile label="Método" value={candidate?.test_method || "Molecular"} />
                <InfoTile label="Amostra" value={candidate?.sample_barcode || candidate?.sample_type || (sample ? `Amostra ${sample}` : "—")} />
                <InfoTile label="Recebida" value={formatDateTime(candidate?.sample_received_at)} />
              </div>
            )}
          </section>

          <section className={`min-w-0 p-3 ${GLASS}`}>
            <div className="mb-2 flex flex-col gap-1 border-b border-white/[0.14] pb-2 dark:border-white/[0.08] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Resultado técnico</h2>
                <p className="text-xs text-muted-foreground">Registe deteção, resistência e dados instrumentais.</p>
              </div>
              <span className="rounded-full border border-indigo-200/60 bg-indigo-50/40 px-2.5 py-1 text-xs font-medium text-indigo-700 backdrop-blur-sm dark:border-indigo-800/40 dark:bg-indigo-900/20 dark:text-indigo-300">
                {ASSAY_LABELS[assay] ?? assay}
              </span>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,210px),1fr))] gap-2">
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
                <input
                  value={quantitativeValue}
                  onChange={(event) => setQuantitativeValue(event.target.value)}
                  inputMode="decimal"
                  placeholder="Ex.: 125000"
                  className={INPUT}
                />
              </FieldCard>

              <FieldCard label="Unidade">
                <input
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                  placeholder="Ex.: cópias/mL"
                  className={INPUT}
                />
              </FieldCard>

              <FieldCard label="Ct">
                <input
                  value={ctValue}
                  onChange={(event) => setCtValue(event.target.value)}
                  inputMode="decimal"
                  placeholder="Ex.: 28.4"
                  className={INPUT}
                />
              </FieldCard>

              <FieldCard label="Instrumento">
                <input
                  value={instrument}
                  onChange={(event) => setInstrument(event.target.value)}
                  placeholder="Ex.: GeneXpert IV"
                  className={INPUT}
                />
              </FieldCard>

              <FieldCard label="Data e hora da execução">
                <input
                  type="datetime-local"
                  value={performedAt}
                  onChange={(event) => setPerformedAt(event.target.value)}
                  className={INPUT}
                />
              </FieldCard>

              <FieldCard label="Interpretação" className="[grid-column:1/-1]">
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Interpretação, observações operacionais, repetição ou limitações da amostra."
                  className={TEXTAREA}
                />
              </FieldCard>
            </div>
          </section>
        </div>
      </form>
    </AppLayout>
  );
}
