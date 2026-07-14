"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Save, TestTubes } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

const ENDPOINT = "/clinical_laboratory/afb_smear/";
const QUEUE_ENDPOINT = "/clinical_laboratory/afb_smear/queue/";
const LIST_HREF = "/clinical-laboratory/afb-smears";

type AfbCandidate = {
  id: string;
  kind: "pending" | "afb_smear";
  afb_smear_id: number | null;
  afb_smear_custom_id?: string;
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
  grade?: string;
  stain?: string;
  performed_at?: string | null;
};

const STAIN_OPTIONS = [
  { value: "ZN", label: "Ziehl-Neelsen" },
  { value: "AURAMINA", label: "Auramina" },
];

const GRADE_OPTIONS = [
  { value: "NEGATIVO", label: "Negativo" },
  { value: "RARO", label: "Raros bacilos" },
  { value: "1+", label: "1+" },
  { value: "2+", label: "2+" },
  { value: "3+", label: "3+" },
];

const GLASS =
  "rounded-lg border border-white/20 bg-white/[0.10] shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.025]";
const INPUT =
  "h-9 w-full rounded-md border border-white/[0.18] bg-white/[0.08] px-2 text-sm text-foreground shadow-sm outline-none backdrop-blur-md transition placeholder:text-muted-foreground focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 dark:border-white/[0.08] dark:bg-white/[0.03]";
const TEXTAREA =
  "min-h-[86px] w-full rounded-md border border-white/[0.18] bg-white/[0.08] px-2 py-1.5 text-sm text-foreground shadow-sm outline-none backdrop-blur-md transition placeholder:text-muted-foreground focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 dark:border-white/[0.08] dark:bg-white/[0.03]";

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-MZ", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function candidateTitle(candidate: AfbCandidate) {
  return candidate.test_name || candidate.test_code || candidate.order_item_custom_id || `Item ${candidate.order_item}`;
}

export default function AfbSmearCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCandidateId = searchParams.get("candidate") || "";
  const [queue, setQueue] = useState<AfbCandidate[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stain, setStain] = useState("ZN");
  const [grade, setGrade] = useState("NEGATIVO");
  const [afbCount, setAfbCount] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");

  const selected = useMemo(
    () => queue.find((candidate) => candidate.id === selectedId) || null,
    [queue, selectedId]
  );
  const pendingCandidates = queue.filter((candidate) => candidate.kind === "pending");
  const existingCandidates = queue.filter((candidate) => candidate.kind === "afb_smear");
  // Modo "um paciente": aberto a partir de "Registar leitura" com ?candidate=.
  const singleMode = Boolean(initialCandidateId);

  useEffect(() => {
    let mounted = true;

    async function loadQueue() {
      setLoading(true);
      setError(null);
      try {
        const rows = await apiFetch<AfbCandidate[]>(QUEUE_ENDPOINT, { clientCache: false });
        if (!mounted) return;
        setQueue(rows);
        setSelectedId((current) => {
          if (current) return current;
          // Vindo de "Registar leitura" (com ?candidate=): fixa nesse candidato
          // (mesmo que não seja encontrado, para mostrar aviso dedicado).
          if (initialCandidateId) return initialCandidateId;
          return rows.find((row) => row.kind === "pending")?.id || "";
        });
      } catch (err: any) {
        if (mounted) setError(err?.message || "Não foi possível carregar candidatos BAAR.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadQueue().catch(() => {});
    return () => {
      mounted = false;
    };
  }, [initialCandidateId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || selected.kind !== "pending") {
      setError("Selecione um exame candidato BAAR ainda pendente.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await apiFetch<{ id: number }>(ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          order_item: selected.order_item,
          sample: selected.sample,
          stain,
          grade,
          afb_count: afbCount.trim(),
          serial_number: serialNumber ? Number(serialNumber) : null,
          notes: notes.trim(),
        }),
      });
      router.push(`${LIST_HREF}/${created.id}`);
    } catch (err: any) {
      setError(err?.message || "Não foi possível guardar a baciloscopia.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-[97vw] space-y-1.5 overflow-x-hidden px-1 sm:px-0">
        <section className={`relative overflow-hidden px-3 py-2.5 ${GLASS}`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sky-500 via-cyan-500 to-emerald-500" />
          <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-sm shadow-sky-500/20">
                <TestTubes size={18} />
              </span>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-foreground sm:text-lg">Nova baciloscopia (BAAR)</h1>
                <p className="text-xs text-muted-foreground sm:truncate">
                  Selecione um exame com método BAAR; pedido e amostra são herdados automaticamente.
                </p>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:shrink-0 sm:items-center">
              <Link
                href={LIST_HREF}
                className="inline-flex h-8 min-w-0 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/[0.10] px-3 text-sm font-medium text-foreground shadow-sm backdrop-blur-md transition hover:bg-white/[0.18] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
              >
                <ArrowLeft size={16} />
                Voltar
              </Link>
              <button
                type="submit"
                disabled={saving || !selected || selected.kind !== "pending"}
                className="inline-flex h-8 min-w-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-cyan-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:from-sky-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
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

        <div className={`grid min-w-0 grid-cols-1 gap-1.5 ${singleMode ? "" : "xl:grid-cols-[minmax(280px,0.9fr)_minmax(360px,1.2fr)]"}`}>
          {!singleMode && (
          <section className={`min-w-0 p-2 ${GLASS}`}>
            <div className="mb-1.5 flex items-center justify-between gap-2 border-b border-white/[0.14] pb-1.5 dark:border-white/[0.08]">
              <h2 className="text-sm font-semibold text-foreground">Candidatos BAAR</h2>
              <span className="rounded-md border border-sky-200/40 bg-sky-100/20 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:border-sky-700/30 dark:bg-sky-950/20 dark:text-sky-300">
                {pendingCandidates.length} pendente(s)
              </span>
            </div>

            {loading ? (
              <div className="flex h-36 items-center justify-center text-sm text-muted-foreground">
                <Loader2 size={18} className="mr-2 animate-spin" />
                A carregar candidatos...
              </div>
            ) : pendingCandidates.length ? (
              <div className="grid max-h-[48vh] gap-1.5 overflow-y-auto pr-1 xl:max-h-[62vh]">
                {pendingCandidates.map((candidate) => {
                  const active = candidate.id === selectedId;
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => setSelectedId(candidate.id)}
                      className={[
                        "rounded-md border p-2 text-left shadow-sm backdrop-blur-md transition",
                        active
                          ? "border-sky-400/70 bg-sky-100/30 ring-2 ring-sky-400/20 dark:border-sky-500/50 dark:bg-sky-950/20"
                          : "border-white/[0.14] bg-white/[0.06] hover:bg-white/[0.12] dark:border-white/[0.08] dark:bg-white/[0.02]",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{candidateTitle(candidate)}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {candidate.order_custom_id || "Pedido sem código"} · {candidate.patient_name || "Paciente não identificado"}
                          </p>
                        </div>
                        {active ? <CheckCircle2 size={17} className="shrink-0 text-sky-600 dark:text-sky-300" /> : null}
                      </div>
                      <div className="mt-1 grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-1 text-[11px] text-muted-foreground">
                        <span className="truncate">Amostra: {candidate.sample_barcode || candidate.sample_type || "herdada"}</span>
                        <span className="truncate">Método: {candidate.test_method || "BAAR"}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-white/[0.14] bg-white/[0.06] p-3 text-sm text-muted-foreground dark:border-white/[0.08] dark:bg-white/[0.02]">
                Não há exames pendentes com método BAAR e amostra recebida/aceite/em processamento.
              </div>
            )}

            {existingCandidates.length ? (
              <div className="mt-2 border-t border-white/[0.14] pt-2 text-xs text-muted-foreground dark:border-white/[0.08]">
                {existingCandidates.length} baciloscopia(s) já registada(s) nesta fila.
              </div>
            ) : null}
          </section>
          )}

          {singleMode && !loading && !selected ? (
            <section className={`min-w-0 p-3 ${GLASS}`}>
              <p className="text-sm text-foreground">Este exame já não está pendente ou não foi encontrado na fila BAAR.</p>
              <p className="mt-1 text-xs text-muted-foreground">Pode já ter sido registado ou a amostra ainda não foi recebida.</p>
              <Link
                href={LIST_HREF}
                className="mt-2 inline-flex h-8 items-center gap-2 rounded-lg border border-white/20 bg-white/[0.10] px-3 text-sm font-medium text-foreground shadow-sm backdrop-blur-md transition hover:bg-white/[0.18] dark:border-white/10 dark:bg-white/[0.04]"
              >
                <ArrowLeft size={16} /> Voltar às pendentes
              </Link>
            </section>
          ) : null}

          {(!singleMode || selected) && (
          <section className={`min-w-0 p-2 ${GLASS}`}>
            {singleMode && selected ? (
              <div className="mb-1.5 flex flex-wrap items-center gap-2 rounded-md border border-sky-200/40 bg-sky-100/20 px-2.5 py-1.5 dark:border-sky-700/30 dark:bg-sky-950/20">
                <span className="text-sm font-semibold text-foreground">{selected.patient_name || "Paciente não identificado"}</span>
                <span className="text-xs text-muted-foreground">{selected.order_custom_id || "Pedido"} · {selected.test_name || "Baciloscopia (BAAR)"}</span>
              </div>
            ) : null}
            <div className="mb-1.5 flex flex-col gap-1 border-b border-white/[0.14] pb-1.5 dark:border-white/[0.08] sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <h2 className="text-sm font-semibold text-foreground">Leitura BAAR</h2>
              <span className="min-w-0 text-xs text-muted-foreground sm:truncate">
                {selected ? `${selected.order_custom_id || "Pedido"} · ${selected.sample_barcode || selected.sample_type || "amostra"}` : "selecione candidato"}
              </span>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-1.5">
              <label className="space-y-1 rounded-md border border-white/[0.14] bg-white/[0.06] p-2 backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.02]">
                <span className="text-xs font-medium text-muted-foreground">Coloração</span>
                <select value={stain} onChange={(event) => setStain(event.target.value)} className={INPUT}>
                  {STAIN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 rounded-md border border-white/[0.14] bg-white/[0.06] p-2 backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.02]">
                <span className="text-xs font-medium text-muted-foreground">Graduação</span>
                <select value={grade} onChange={(event) => setGrade(event.target.value)} className={INPUT}>
                  {GRADE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 rounded-md border border-white/[0.14] bg-white/[0.06] p-2 backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.02]">
                <span className="text-xs font-medium text-muted-foreground">Contagem BAAR</span>
                <input
                  value={afbCount}
                  onChange={(event) => setAfbCount(event.target.value)}
                  placeholder="0 BAAR/100 campos"
                  className={INPUT}
                />
              </label>

              <label className="space-y-1 rounded-md border border-white/[0.14] bg-white/[0.06] p-2 backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.02]">
                <span className="text-xs font-medium text-muted-foreground">Número da lâmina</span>
                <input
                  type="number"
                  min={1}
                  value={serialNumber}
                  onChange={(event) => setSerialNumber(event.target.value)}
                  placeholder="1"
                  className={INPUT}
                />
              </label>

              <label className="space-y-1 rounded-md border border-white/[0.14] bg-white/[0.06] p-2 backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.02] [grid-column:1/-1]">
                <span className="text-xs font-medium text-muted-foreground">Observações</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Qualidade da amostra, leitura microscópica ou necessidade de repetição."
                  className={TEXTAREA}
                />
              </label>
            </div>

            <div className="mt-1.5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-1.5 rounded-md border border-white/[0.14] bg-white/[0.05] p-2 text-xs text-muted-foreground backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.02]">
              <span className="truncate">Exame: {selected?.test_name || "-"}</span>
              <span className="truncate">Amostra: {selected?.sample_barcode || selected?.sample_type || "-"}</span>
              <span className="truncate">Recebida: {formatDateTime(selected?.sample_received_at) || "-"}</span>
            </div>
          </section>
          )}
        </div>
      </form>
    </AppLayout>
  );
}
