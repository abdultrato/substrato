"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw, Search, TestTubes } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { CardFooter, CardTitle, Pill, StatusPill, fmtDate } from "@/components/clinical-laboratory/ResourceCardList";
import { apiFetch } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

type AfbQueueItem = {
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

const QUEUE_ENDPOINT = "/clinical_laboratory/afb_smear/queue/";
const LIST_HREF = "/clinical-laboratory/afb-smears";

const STAIN_LABELS: Record<string, string> = { ZN: "Ziehl-Neelsen", AURAMINA: "Auramina" };
const GRADE_TONE: Record<string, "emerald" | "amber" | "red" | "gray"> = {
  NEGATIVO: "emerald",
  RARO: "amber",
  "1+": "red",
  "2+": "red",
  "3+": "red",
  PENDENTE: "amber",
};

function gradeLabel(value?: string) {
  if (!value || value === "PENDENTE") return "Pendente";
  if (value === "NEGATIVO") return "Negativo";
  if (value === "RARO") return "Raro";
  return value;
}

function candidateTitle(item: AfbQueueItem) {
  return item.test_name || item.test_code || item.order_item_custom_id || `Item ${item.order_item}`;
}

function pendingHref(item: AfbQueueItem) {
  return `${LIST_HREF}/new?candidate=${encodeURIComponent(item.id)}`;
}

export default function LabAfbSmearsPage() {
  const [items, setItems] = useState<AfbQueueItem[]>([]);
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
      const rows = await apiFetch<AfbQueueItem[]>(QUEUE_ENDPOINT, { clientCache: false });
      setItems(rows);
    } catch (err: any) {
      setError(err?.message || "Não foi possível carregar a fila BAAR.");
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

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => [
      item.patient_name,
      item.order_custom_id,
      item.order_item_custom_id,
      item.test_name,
      item.test_code,
      item.test_method,
      item.sample_barcode,
      item.sample_type,
      item.grade,
      item.stain,
    ].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [items, query]);

  const pendingItems = filtered.filter((item) => item.kind === "pending");
  const registeredItems = filtered.filter((item) => item.kind === "afb_smear");

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="mx-auto w-full max-w-7xl space-y-3">
        <section className="relative overflow-hidden rounded-xl border border-white/25 bg-gradient-to-br from-white/35 via-sky-50/35 to-cyan-100/25 p-3 pl-4 shadow-md shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:from-white/[0.07] dark:via-sky-950/20 dark:to-cyan-950/20">
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-sky-500 to-cyan-600" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-cyan-600 text-white shadow-lg shadow-sky-500/25">
                <TestTubes size={18} />
              </span>
              <div>
                <div className="mb-0.5 flex gap-1.5">
                  <span className="rounded-full border border-sky-200/70 bg-sky-50/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 backdrop-blur-sm dark:border-sky-800/40 dark:bg-sky-900/20 dark:text-sky-300">
                    Baciloscopia
                  </span>
                  <span className="rounded-full border border-cyan-200/70 bg-cyan-50/70 px-2 py-0.5 text-[10px] font-medium text-cyan-700 backdrop-blur-sm dark:border-cyan-800/40 dark:bg-cyan-900/20 dark:text-cyan-300">
                    Fila BAAR
                  </span>
                </div>
                <h1 className="text-lg font-semibold leading-tight text-foreground">Baciloscopias (BAAR)</h1>
                <p className="text-xs text-muted-foreground">
                  Exames BAAR são herdados do pedido e da amostra. Registe a leitura a partir da fila pendente.
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[360px] sm:flex-row sm:items-center">
              <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/40 bg-white/35 px-2.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                <Search size={14} className="shrink-0 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Pesquisar por paciente, pedido, amostra ou método"
                  className="h-full min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                />
              </div>
              <button
                type="button"
                onClick={() => load(true)}
                disabled={refreshing}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-3 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                Actualizar
              </button>
              <Link
                href="/clinical-laboratory"
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-white/40 bg-white/25 px-3 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/45 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
              >
                <ArrowLeft size={13} />
                Voltar
              </Link>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] items-start gap-3">
        <section className="rounded-xl border border-white/25 bg-white/25 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Exames pendentes</h2>
              <p className="text-xs text-muted-foreground">{pendingItems.length} candidato(s) BAAR com amostra recebida/aceite/em processamento</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              A carregar fila BAAR...
            </div>
          ) : pendingItems.length ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {pendingItems.map((item) => (
                <Link
                  key={item.id}
                  href={pendingHref(item)}
                  className="group rounded-xl border border-white/25 bg-white/30 p-3 shadow-sm backdrop-blur-sm transition hover:border-sky-300/60 hover:bg-white/45 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-sky-500/40"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <CardTitle code={item.order_custom_id || item.order_item_custom_id} name={candidateTitle(item)} />
                    <StatusPill tone="amber">Pendente</StatusPill>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Pill tone="blue">{item.sample_barcode || item.sample_type || "Amostra herdada"}</Pill>
                    <Pill tone="gray">{item.test_method || "BAAR"}</Pill>
                    {item.sample_received_at ? <Pill tone="emerald">Recebida {fmtDate(item.sample_received_at)}</Pill> : null}
                  </div>
                  <CardFooter left={<>{item.patient_name || "Paciente não identificado"}</>} right="Registar leitura" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-white/25 bg-white/20 px-3 py-6 text-center text-sm text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]">
              Nenhum exame BAAR pendente. Execute o seed ou receba uma amostra BAAR para alimentar esta fila.
            </div>
          )}
        </section>

        <section className="rounded-xl border border-white/25 bg-white/20 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
          <div className="mb-2">
            <h2 className="text-sm font-semibold text-foreground">Leituras registadas</h2>
            <p className="text-xs text-muted-foreground">{registeredItems.length} baciloscopia(s) registada(s)</p>
          </div>

          {loading ? null : registeredItems.length ? (
            <div className="grid grid-cols-1 gap-2">
              {registeredItems.map((item) => (
                <Link
                  key={item.id}
                  href={`${LIST_HREF}/${item.afb_smear_id}`}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-white/20 bg-white/25 p-3 shadow-sm backdrop-blur-sm transition hover:border-sky-300/50 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:border-sky-500/30"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <CardTitle code={item.afb_smear_custom_id} name={candidateTitle(item)} />
                    <StatusPill tone={GRADE_TONE[item.grade || "PENDENTE"] ?? "gray"}>{gradeLabel(item.grade)}</StatusPill>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.stain ? <Pill tone="violet">{STAIN_LABELS[item.stain] ?? item.stain}</Pill> : null}
                    <Pill tone="blue">{item.sample_barcode || item.sample_type || "Amostra herdada"}</Pill>
                    <Pill tone="gray">{item.order_custom_id || "Pedido"}</Pill>
                  </div>
                  <CardFooter left={<>{item.patient_name || "—"}</>} right={item.performed_at ? `Realizada ${fmtDate(item.performed_at)}` : "—"} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-white/25 bg-white/15 px-3 py-6 text-center text-sm text-muted-foreground dark:border-white/10 dark:bg-white/[0.025]">
              Ainda não há leituras BAAR registadas.
            </div>
          )}
        </section>
        </div>
      </div>
    </AppLayout>
  );
}
