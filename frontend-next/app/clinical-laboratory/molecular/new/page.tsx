"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
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

// Carga viral: "Não detetado" lê-se como carga viral indetetável.
const DETECTION_OPTIONS_VIRAL_LOAD = [
  { value: "NAO_DETETADO", label: "Indetetável" },
  { value: "DETETADO", label: "Detetado (quantificável)" },
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

function FieldCard({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
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
  const isViralLoad = assay === "CV_HIV" || assay === "CV_HEPATITE";
  const detectionOptions = isViralLoad ? DETECTION_OPTIONS_VIRAL_LOAD : DETECTION_OPTIONS;
  const listHref = assay === "CV_HIV" ? "/clinical-laboratory/molecular/hiv-viral-load" : LIST_HREF;

  const [queue, setQueue] = useState<MolecularQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detection, setDetection] = useState("NAO_DETETADO");
  const [rifResistance, setRifResistance] = useState(isGeneXpert ? "SENSIVEL" : "NA");
  const [quantitativeValue, setQuantitativeValue] = useState("");
  const [unit, setUnit] = useState(isViralLoad ? "cópias/mL" : "");
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

  // Carga viral indetetável não tem valor quantificável.
  useEffect(() => {
    if (isViralLoad && detection !== "DETETADO") setQuantitativeValue("");
  }, [isViralLoad, detection]);

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
                    {ASSAY_LABELS[assay] ?? assay}
                  </span>
                </div>
                <h1 className="text-base font-bold text-foreground sm:text-lg">Novo resultado molecular</h1>
                <p className="text-xs text-muted-foreground md:truncate">
                  Pedido, amostra e ensaio são herdados da fila; nesta página regista-se apenas o resultado técnico.
                </p>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-1 md:flex md:w-auto md:shrink-0 md:items-center">
              <Link
                href={listHref}
                className="inline-flex h-7 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-white/[0.10] bg-white/[0.02] px-2.5 text-sm font-medium text-foreground shadow-sm backdrop-blur-[1px] transition hover:bg-white/[0.03] dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:bg-white/[0.03]"
              >
                <ArrowLeft size={16} />
                Voltar
              </Link>
              <button
                type="submit"
                disabled={saving || !orderItem}
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
              <p className="text-xs text-muted-foreground">
                Estes dados vêm da fila molecular e não são selecionados manualmente neste formulário.
              </p>
            </div>

            {loading ? (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                <Loader2 size={18} className="mr-2 animate-spin" />
                A carregar contexto...
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-1">
                <InfoTile label="Paciente" value={candidate?.patient_name || "Paciente não identificado"} />
                <InfoTile label="Pedido" value={candidate?.order_custom_id || `Item ${orderItem || "-"}`} />
                <InfoTile label="Exame" value={candidate?.test_name || ASSAY_LABELS[assay] || assay} />
                <InfoTile label="Método" value={candidate?.test_method || "Molecular"} />
                <InfoTile label="Amostra" value={candidate?.sample_barcode || candidate?.sample_type || (sample ? `Amostra ${sample}` : "—")} />
                <InfoTile label="Recebida" value={formatDateTime(candidate?.sample_received_at)} />
              </div>
            )}
          </section>

          <section className={`relative min-w-0 overflow-hidden p-2 pl-3 ${GLASS}`}>
            <span className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-indigo-500 to-cyan-500" />
            <div className="mb-1.5 flex flex-col gap-1 border-b border-white/[0.08] pb-1.5 dark:border-white/[0.05] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Resultado técnico</h2>
                <p className="text-xs text-muted-foreground">
                  {isViralLoad
                    ? "Registe a deteção e a carga viral (cópias/mL)."
                    : "Registe deteção, resistência e dados instrumentais."}
                </p>
              </div>
              <span className="rounded-full border border-indigo-200/30 bg-indigo-50/[0.02] px-1.5 py-0.5 text-xs font-medium text-indigo-700 backdrop-blur-[1px] dark:border-indigo-800/20 dark:bg-indigo-900/[0.02] dark:text-indigo-300">
                {ASSAY_LABELS[assay] ?? assay}
              </span>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-1">
              <FieldCard label="Deteção">
                <select value={detection} onChange={(event) => setDetection(event.target.value)} className={INPUT}>
                  {detectionOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </FieldCard>

              {isGeneXpert ? (
                <FieldCard label="Resistência à rifampicina">
                  <select
                    value={rifResistance}
                    onChange={(event) => setRifResistance(event.target.value)}
                    disabled={detection !== "DETETADO"}
                    className={INPUT}
                  >
                    {RIF_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </FieldCard>
              ) : null}

              <FieldCard label={isViralLoad ? "Carga viral" : "Valor quantitativo"}>
                <input
                  value={quantitativeValue}
                  onChange={(event) => setQuantitativeValue(event.target.value)}
                  inputMode="decimal"
                  disabled={isViralLoad && detection !== "DETETADO"}
                  placeholder={isViralLoad ? (detection === "DETETADO" ? "Ex.: 650" : "Indetetável") : "Ex.: 125000"}
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
                  placeholder={isViralLoad ? "Ex.: Abbott m2000 / GeneXpert HIV-VL" : "Ex.: GeneXpert IV"}
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
