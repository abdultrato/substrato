"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Activity, ArrowLeft, Dna, Edit3, FlaskConical, Loader2, Microscope, Printer, ShieldAlert } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GENEEXPERT_ASSAY, molecularDetailPath, molecularEditPath, molecularListPath } from "@/lib/molecularRoutes";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

const ENDPOINT = "/clinical_laboratory/molecular_result/";

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
  performed_by_name?: string;
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

const DETECTION_LABELS: Record<string, string> = {
  DETETADO: "Detetado",
  NAO_DETETADO: "Não detetado",
  INDETERMINADO: "Indeterminado",
  INVALIDO: "Inválido",
};

const RIF_LABELS: Record<string, string> = {
  NA: "N/A",
  SENSIVEL: "Sensível à rifampicina",
  RESISTENTE: "Resistente à rifampicina",
  INDETERMINADO: "Indeterminado",
};

const DETECTION_STYLE: Record<string, string> = {
  DETETADO: "border-red-300/25 bg-red-50/[0.02] text-red-700 dark:border-red-800/20 dark:bg-red-900/[0.02] dark:text-red-300",
  NAO_DETETADO: "border-emerald-300/25 bg-emerald-50/[0.02] text-emerald-700 dark:border-emerald-800/20 dark:bg-emerald-900/[0.02] dark:text-emerald-300",
  INDETERMINADO: "border-amber-300/25 bg-amber-50/[0.02] text-amber-700 dark:border-amber-800/20 dark:bg-amber-900/[0.02] dark:text-amber-300",
  INVALIDO: "border-slate-300/25 bg-slate-50/[0.02] text-slate-700 dark:border-slate-700/20 dark:bg-slate-900/[0.02] dark:text-slate-300",
};

const GLASS =
  "rounded-xl border border-white/[0.10] bg-white/[0.02] shadow-none backdrop-blur-[1px] dark:border-white/[0.06] dark:bg-white/[0.02]";

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-MZ", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function display(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function Card({
  title,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  icon: typeof Dna;
  accent: string;
  children: ReactNode;
}) {
  return (
    <section className={`relative min-w-0 overflow-hidden p-2 pl-3 ${GLASS}`}>
      <span className={`absolute inset-y-0 left-0 w-0.5 ${accent}`} />
      <div className="mb-1.5 flex items-center gap-1.5 border-b border-white/[0.05] pb-1.5 dark:border-white/[0.03]">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-600 text-white shadow-sm shadow-indigo-500/15">
          <Icon size={15} />
        </span>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.02] p-1.5 backdrop-blur-[1px] dark:border-white/[0.05] dark:bg-white/[0.02]">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function MolecularDetailPage({
  expectedAssay,
  legacyRedirect = false,
}: {
  expectedAssay?: string;
  legacyRedirect?: boolean;
}) {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [record, setRecord] = useState<MolecularResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<MolecularResult>(`${ENDPOINT}${id}/`, { clientCache: false });
        if (mounted) setRecord(data);
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

  useEffect(() => {
    if (!record) return;
    const canonical = molecularDetailPath(record.id, record.assay);
    if (legacyRedirect || (expectedAssay && record.assay !== expectedAssay)) {
      router.replace(canonical);
    }
  }, [expectedAssay, legacyRedirect, record, router]);

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
        <div className="mx-auto w-full max-w-[97vw] rounded-lg border border-red-200/45 bg-red-50/[0.18] p-4 text-sm text-red-800 backdrop-blur-xl dark:border-red-800/35 dark:bg-red-900/[0.10] dark:text-red-300">
          {error || "Resultado molecular não encontrado."}
        </div>
      </AppLayout>
    );
  }

  const assayLabel = ASSAY_LABELS[record.assay] ?? record.assay;
  const detectionLabel = DETECTION_LABELS[record.detection] ?? record.detection;
  const detectionStyle = DETECTION_STYLE[record.detection] ?? DETECTION_STYLE.INVALIDO;
  const quantitative = record.quantitative_value ? `${record.quantitative_value}${record.unit ? ` ${record.unit}` : ""}` : "—";
  const isGeneXpert = record.assay === GENEEXPERT_ASSAY;
  const listHref = molecularListPath(record.assay);

  async function openResultPdf() {
    setPrinting(true);
    setError(null);
    try {
      const blob = await apiFetch<Blob>(`${ENDPOINT}${record.id}/pdf/`, {
        responseType: "blob",
        clientCache: false,
      });
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `${record.custom_id || "resultado-molecular"}.pdf`;
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err: any) {
      setError(err?.message || "Não foi possível abrir o PDF do resultado.");
    } finally {
      setPrinting(false);
    }
  }

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="mx-auto w-full max-w-[97vw] space-y-1 overflow-x-hidden px-0.5">
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
                    {isGeneXpert ? "GeneXpert" : "Biologia molecular"}
                  </span>
                  <span className="rounded-full border border-cyan-200/30 bg-cyan-50/[0.02] px-1.5 py-0.5 text-[10px] font-medium text-cyan-700 backdrop-blur-[1px] dark:border-cyan-800/20 dark:bg-cyan-900/[0.02] dark:text-cyan-300">
                    {record.custom_id}
                  </span>
                </div>
                <h1 className="truncate text-base font-bold text-foreground sm:text-lg">{assayLabel}</h1>
                <p className="truncate text-xs text-muted-foreground">
                  {display(record.patient_name, "Paciente não identificado")} · {display(record.order_custom_id, "Pedido")} · {display(record.sample_barcode || record.sample_type, "Amostra")}
                </p>
              </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-1 sm:grid-cols-3 md:flex md:w-auto md:shrink-0 md:items-center">
              <Link
                href={listHref}
                className="inline-flex h-7 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-white/[0.10] bg-white/[0.02] px-2.5 text-sm font-medium text-foreground shadow-sm backdrop-blur-[1px] transition hover:bg-white/[0.03] dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:bg-white/[0.03]"
              >
                <ArrowLeft size={16} />
                Voltar
              </Link>
              <button
                type="button"
                onClick={openResultPdf}
                disabled={printing}
                className="inline-flex h-7 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-300/35 bg-cyan-50/[0.08] px-2.5 text-sm font-semibold text-cyan-800 shadow-sm backdrop-blur-[1px] transition hover:bg-cyan-50/[0.14] dark:border-cyan-800/30 dark:bg-cyan-900/[0.08] dark:text-cyan-200 dark:hover:bg-cyan-900/[0.14]"
              >
                {printing ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
                Imprimir resultado
              </button>
              <Link
                href={molecularEditPath(record.id, record.assay)}
                className="inline-flex h-7 min-w-0 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 px-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-cyan-700"
              >
                <Edit3 size={15} />
                Editar
              </Link>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200/35 bg-red-50/[0.08] px-2 py-1.5 text-sm text-red-800 shadow-sm backdrop-blur-[1px] dark:border-red-800/25 dark:bg-red-900/[0.04] dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="space-y-1 overflow-x-auto pb-0.5">
          <div className="grid min-w-[720px] grid-cols-2 gap-1">
            <Card title="Rastreabilidade" icon={Microscope} accent="bg-gradient-to-b from-sky-500 to-cyan-500">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-1">
                <InfoTile label="Paciente" value={display(record.patient_name, "Paciente não identificado")} />
                <InfoTile label="Pedido" value={display(record.order_custom_id)} />
                <InfoTile label="Exame" value={display(record.test_name || record.test_code, assayLabel)} />
                <InfoTile label="Método" value={display(record.test_method, "Molecular")} />
                <InfoTile label="Amostra" value={display(record.sample_barcode || record.sample_type)} />
                <InfoTile label="Recebida" value={formatDateTime(record.sample_received_at)} />
              </div>
            </Card>

            <Card title="Resultado" icon={Activity} accent="bg-gradient-to-b from-emerald-500 to-teal-500">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-1">
                <div className={`rounded-lg border p-2 backdrop-blur-[1px] ${detectionStyle}`}>
                  <p className="text-[11px] font-medium uppercase tracking-wide opacity-75">Deteção</p>
                  <p className="text-lg font-bold">{detectionLabel}</p>
                </div>
                <InfoTile label="Ensaio" value={assayLabel} />
                {isGeneXpert ? (
                  <InfoTile label="Rifampicina" value={RIF_LABELS[record.rif_resistance] ?? display(record.rif_resistance)} />
                ) : null}
                <InfoTile label="Executado em" value={formatDateTime(record.performed_at)} />
              </div>
            </Card>
          </div>

          <div className="grid min-w-[720px] grid-cols-2 gap-1">
            <Card title="Instrumentação e quantificação" icon={FlaskConical} accent="bg-gradient-to-b from-indigo-500 to-blue-500">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-1">
                <InfoTile label="Valor quantitativo" value={quantitative} />
                <InfoTile label="Ct" value={display(record.ct_value)} />
                <InfoTile label="Instrumento" value={display(record.instrument)} />
                <InfoTile label="Executado por" value={display(record.performed_by_name)} />
              </div>
            </Card>

            <Card title="Interpretação" icon={ShieldAlert} accent="bg-gradient-to-b from-amber-500 to-orange-500">
              <div className="min-h-[84px] rounded-lg border border-white/[0.08] bg-white/[0.02] p-2 text-sm leading-relaxed text-foreground backdrop-blur-[1px] dark:border-white/[0.05] dark:bg-white/[0.02]">
                {record.notes ? <p className="whitespace-pre-wrap">{record.notes}</p> : <p className="text-muted-foreground">Sem interpretação ou observações registadas.</p>}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function ClinicalLaboratoryMolecularLegacyDetailPage() {
  return <MolecularDetailPage legacyRedirect />;
}
