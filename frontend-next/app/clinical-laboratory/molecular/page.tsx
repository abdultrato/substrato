"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Dna, Loader2, RefreshCw, Search } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { CardFooter, CardTitle, Pill, StatusPill, fmtDate } from "@/components/clinical-laboratory/ResourceCardList";
import { apiFetch, apiFetchList } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

type MolecularResult = {
  id: number;
  custom_id: string;
  assay: string;
  detection: string;
  rif_resistance: string;
  instrument: string;
  performed_at: string | null;
  order_custom_id?: string;
  patient_name?: string;
  test_name?: string;
  sample_barcode?: string;
};

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

const DETECTION_LABELS: Record<string, string> = {
  DETETADO: "Detetado",
  NAO_DETETADO: "Não detetado",
  INDETERMINADO: "Indeterminado",
  INVALIDO: "Inválido",
  PENDENTE: "Pendente",
};

const DETECTION_TONE: Record<string, "red" | "emerald" | "gray" | "amber"> = {
  DETETADO: "red",
  NAO_DETETADO: "emerald",
  INDETERMINADO: "gray",
  INVALIDO: "gray",
  PENDENTE: "amber",
};

const RIF_LABELS: Record<string, string> = {
  SENSIVEL: "RIF sensível",
  RESISTENTE: "RIF resistente",
  INDETERMINADO: "RIF indeterminado",
};

function formatCandidateDate(value?: string | null) {
  if (!value) return "—";
  return fmtDate(value);
}

function candidateHref(item: MolecularQueueItem) {
  if (item.kind === "molecular_result" && item.molecular_result_id) {
    return `/clinical-laboratory/molecular/${item.molecular_result_id}`;
  }
  const params = new URLSearchParams({
    order_item: String(item.order_item),
    assay: item.assay || "PCR",
  });
  if (item.sample) params.set("sample", String(item.sample));
  return `/clinical-laboratory/molecular/new?${params.toString()}`;
}

type MolecularPageConfig = {
  assayFilter: string;
  title: string;
  subtitle: string;
  badge: string;
  pendingLabel: string;
  emptyPendingLabel: string;
};

const DEFAULT_CONFIG: MolecularPageConfig = {
  assayFilter: "GENEXPERT_MTB_RIF",
  title: "Fila molecular / GeneXpert",
  subtitle: "Exames GeneXpert são herdados do pedido e da amostra; esta página não cria resultados livres.",
  badge: "GeneXpert",
  pendingLabel: "candidato(s) GeneXpert",
  emptyPendingLabel: "Nenhum exame GeneXpert pendente com amostra recebida/aceite/em processamento.",
};

const HIV_VIRAL_LOAD_CONFIG: MolecularPageConfig = {
  assayFilter: "CV_HIV",
  title: "Biologia Molecular: Carga Viral de HIV",
  subtitle: "Exames de carga viral HIV são herdados do pedido e da amostra; o método esperado é PCR - Reação da Polimerase em Cadeia.",
  badge: "Carga Viral HIV",
  pendingLabel: "candidato(s) Carga Viral de HIV",
  emptyPendingLabel: "Nenhum exame de Carga Viral de HIV pendente com amostra recebida/aceite/em processamento.",
};

function MolecularQueuePage() {
  const pathname = usePathname() || "";
  const config = pathname.includes("/hiv-viral-load") ? HIV_VIRAL_LOAD_CONFIG : DEFAULT_CONFIG;
  const [queue, setQueue] = useState<MolecularQueueItem[]>([]);
  const [results, setResults] = useState<MolecularResult[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(manual = false) {
    const startedAt = Date.now();
    if (manual) setRefreshing(true);
    setLoading(true);
    setError(null);
    try {
      const [queueRows, listRows] = await Promise.all([
        apiFetch<MolecularQueueItem[]>("/clinical_laboratory/molecular_result/queue/", { clientCache: false }),
        apiFetchList<MolecularResult>("/clinical_laboratory/molecular_result/", {
          page: 1,
          pageSize: 24,
          query: { ordering: "-created_at" },
          clientCache: false,
        }),
      ]);
      setQueue(queueRows.filter((item) => item.assay === config.assayFilter));
      setResults(listRows.items.filter((item) => item.assay === config.assayFilter));
    } catch (err: any) {
      setError(err?.message || "Não foi possível carregar a fila molecular.");
    } finally {
      if (manual) {
        const remaining = Math.max(0, 500 - (Date.now() - startedAt));
        if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
        setRefreshing(false);
      }
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pending = queue.filter((item) => item.kind === "pending");

  const filteredPending = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return pending;
    return pending.filter((item) => [
      item.patient_name,
      item.order_custom_id,
      item.order_item_custom_id,
      item.test_name,
      item.test_code,
      item.test_method,
      item.sample_barcode,
      ASSAY_LABELS[item.assay],
    ].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [pending, query]);

  const filteredResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return results;
    return results.filter((item) => [
      item.custom_id,
      item.patient_name,
      item.order_custom_id,
      item.test_name,
      item.sample_barcode,
      ASSAY_LABELS[item.assay],
      DETECTION_LABELS[item.detection],
      item.instrument,
    ].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [results, query]);

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="mx-auto w-full max-w-[97vw] space-y-1">
        <section className="relative overflow-hidden rounded-xl border border-white/[0.10] bg-white/[0.02] p-2 pl-3 shadow-none backdrop-blur-[1px] dark:border-white/[0.06] dark:bg-white/[0.02]">
          <span className="absolute inset-y-0 left-0 w-0.5 rounded-l-xl bg-gradient-to-b from-indigo-500 to-cyan-600" />
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-600 text-white shadow-sm shadow-indigo-500/15">
                <Dna size={18} />
              </span>
              <div>
                <div className="mb-0.5 flex gap-1">
                  <span className="rounded-full border border-indigo-200/30 bg-indigo-50/[0.02] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 backdrop-blur-[1px] dark:border-indigo-800/20 dark:bg-indigo-900/[0.02] dark:text-indigo-300">
                    Biologia molecular
                  </span>
                  <span className="rounded-full border border-cyan-200/30 bg-cyan-50/[0.02] px-1.5 py-0.5 text-[10px] font-medium text-cyan-700 backdrop-blur-[1px] dark:border-cyan-800/20 dark:bg-cyan-900/[0.02] dark:text-cyan-300">
                    {config.badge}
                  </span>
                </div>
                <h1 className="text-lg font-semibold leading-tight text-foreground">{config.title}</h1>
                <p className="text-xs text-muted-foreground">
                  {config.subtitle}
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-1 sm:w-auto sm:min-w-[360px] sm:flex-row sm:items-center">
              <div className="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-white/[0.10] bg-white/[0.02] px-2 shadow-sm backdrop-blur-[1px] dark:border-white/[0.06] dark:bg-white/[0.02]">
                <Search size={14} className="shrink-0 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Pesquisar por paciente, pedido ou método"
                  className="h-full min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                />
              </div>
              <button
                type="button"
                onClick={() => load(true)}
                disabled={refreshing}
                className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border border-white/[0.10] bg-white/[0.02] px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-[1px] transition hover:bg-white/[0.03] disabled:opacity-60 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:bg-white/[0.03]"
              >
                <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                Actualizar
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-1">
            <section className="rounded-xl border border-white/[0.10] bg-white/[0.02] p-2 shadow-none backdrop-blur-[1px] dark:border-white/[0.06] dark:bg-white/[0.02]">
              <div className="mb-1.5 flex items-center justify-between gap-1.5">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Exames pendentes</h2>
                  <p className="text-xs text-muted-foreground">{filteredPending.length} {config.pendingLabel}</p>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" />
                  A carregar fila molecular...
                </div>
              ) : filteredPending.length ? (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-1">
                  {filteredPending.map((item) => (
                    <Link
                      key={item.id}
                      href={candidateHref(item)}
                      className="group relative overflow-hidden rounded-xl border border-white/[0.10] bg-white/[0.02] p-2 pl-3 shadow-none backdrop-blur-[1px] transition hover:border-indigo-300/60 hover:bg-white/[0.03] dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-indigo-500/40"
                    >
                      <span className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-amber-500 to-orange-500" />
                      <div className="mb-1.5 flex items-start justify-between gap-1.5">
                        <CardTitle code={item.order_custom_id || item.order_item_custom_id} name={item.test_name || item.test_code || "Exame molecular"} />
                        <StatusPill tone="amber">Pendente</StatusPill>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Pill tone="indigo">{ASSAY_LABELS[item.assay] ?? item.assay}</Pill>
                        <Pill tone="gray">{item.test_method || "Método molecular"}</Pill>
                        <Pill tone="blue">{item.sample_barcode || item.sample_type || "Amostra herdada"}</Pill>
                      </div>
                      <CardFooter
                        left={<>{item.patient_name || "Paciente não identificado"}</>}
                        right={`Recebida ${formatCandidateDate(item.sample_received_at)}`}
                      />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-white/[0.10] bg-white/[0.02] px-2 py-4 text-center text-sm text-muted-foreground backdrop-blur-[1px] dark:border-white/[0.06] dark:bg-white/[0.02]">
                  {config.emptyPendingLabel}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-white/[0.10] bg-white/[0.02] p-2 shadow-none backdrop-blur-[1px] dark:border-white/[0.06] dark:bg-white/[0.02]">
              <div className="mb-1.5">
                <h2 className="text-sm font-semibold text-foreground">Resultados registados</h2>
                <p className="text-xs text-muted-foreground">{filteredResults.length} resultado(s) recentes</p>
              </div>

              {loading ? null : filteredResults.length ? (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-1">
                  {filteredResults.map((m) => (
                    <Link
                      key={m.id}
                      href={`/clinical-laboratory/molecular/${m.id}`}
                      className="group relative flex flex-col overflow-hidden rounded-xl border border-white/[0.10] bg-white/[0.02] p-2 pl-3 shadow-none backdrop-blur-[1px] transition hover:border-indigo-300/50 hover:bg-white/[0.03] dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-indigo-500/30"
                    >
                      <span className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-indigo-500 to-cyan-500" />
                      <div className="mb-1.5 flex items-start justify-between gap-1.5">
                        <CardTitle code={m.custom_id} name={ASSAY_LABELS[m.assay] ?? m.assay} />
                        <StatusPill tone={DETECTION_TONE[m.detection] ?? "gray"}>{DETECTION_LABELS[m.detection] ?? m.detection}</StatusPill>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {m.rif_resistance && m.rif_resistance !== "NA" ? (
                          <Pill tone={m.rif_resistance === "RESISTENTE" ? "red" : "violet"}>{RIF_LABELS[m.rif_resistance] ?? m.rif_resistance}</Pill>
                        ) : null}
                        {m.instrument ? <Pill tone="gray">{m.instrument}</Pill> : null}
                        {m.sample_barcode ? <Pill tone="blue">{m.sample_barcode}</Pill> : null}
                      </div>
                      <CardFooter left={<>{m.patient_name || m.order_custom_id || "—"}</>} right={m.performed_at ? `Realizado ${fmtDate(m.performed_at)}` : "—"} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-white/[0.10] bg-white/[0.02] px-2 py-4 text-center text-sm text-muted-foreground backdrop-blur-[1px] dark:border-white/[0.06] dark:bg-white/[0.02]">
                  Nenhum resultado molecular encontrado.
                </div>
              )}
            </section>
          </div>
      </div>
    </AppLayout>
  );
}

export default function LabMolecularPage() {
  return <MolecularQueuePage />;
}
