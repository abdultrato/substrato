"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Clock3,
  FlaskConical,
  Loader2,
  Microscope,
  RefreshCw,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { abbreviateMiddleNames } from "@/lib/formatName";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";
import {
  STATE_STYLES,
  fmtQueueDate,
  groupEntryDate,
  groupState,
  itemState,
  type QueueItem,
} from "@/lib/cultureQueue";

const LIST_PATH = "/clinical-laboratory/cultures";

function RequisitionCultures() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const order = searchParams.get("order") || "";

  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  const load = useCallback(async (manual = false) => {
    const startedAt = Date.now();
    if (manual) setRefreshing(true);
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<QueueItem[]>("/clinical_laboratory/culture/queue/");
      setItems(data.filter((item) => item.order_custom_id === order));
    } catch (err: any) {
      setError(err?.message || "Não foi possível carregar a requisição.");
    } finally {
      if (manual) {
        const remaining = Math.max(0, 600 - (Date.now() - startedAt));
        if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
        setRefreshing(false);
      }
      setLoading(false);
    }
  }, [order]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => items ?? [], [items]);
  const now = Date.now();
  const patient = rows.find((item) => item.patient_name)?.patient_name || "";
  const entryDate = groupEntryDate(rows);
  const state = rows.length ? groupState(rows, now) : null;
  const style = state ? STATE_STYLES[state] : null;

  const summary = useMemo(() => {
    const porIniciar = rows.filter((item) => !item.culture_id).length;
    const emIncubacao = rows.filter((item) => item.status === "INCUBACAO" || item.status === "REINCUBACAO").length;
    return { porIniciar, emIncubacao };
  }, [rows]);

  async function startCulture(item: QueueItem) {
    if (item.culture_id) {
      router.push(`${LIST_PATH}/${item.culture_id}`);
      return;
    }
    setStartingId(item.id);
    setError(null);
    try {
      const culture = await apiFetch<{ id: number }>("/clinical_laboratory/culture/", {
        method: "POST",
        body: JSON.stringify({
          order_item: item.order_item,
          sample: item.sample,
          culture_type: "AEROBIA",
          specimen: item.sample_type || "",
          status: "MONTADA",
        }),
      });
      router.push(`${LIST_PATH}/${culture.id}`);
    } catch (err: any) {
      setError(err?.message || "Não foi possível iniciar a cultura.");
    } finally {
      setStartingId(null);
    }
  }

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="mx-auto w-full max-w-4xl space-y-3">
        <section className="relative overflow-hidden rounded-xl border border-white/25 bg-gradient-to-br from-white/35 via-white/20 to-teal-100/25 p-3 pl-4 shadow-md shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:from-white/[0.07] dark:via-white/[0.03] dark:to-teal-950/20">
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${style ? style.strip : "bg-gradient-to-b from-teal-500 to-cyan-600"}`} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/25">
                <Microscope size={18} />
              </span>
              <div className="min-w-0">
                <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-teal-200/70 bg-teal-50/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700 backdrop-blur-sm dark:border-teal-800/40 dark:bg-teal-900/20 dark:text-teal-300">
                    <ClipboardList size={11} /> Requisição
                  </span>
                  {style && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.count}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} /> {style.label}
                    </span>
                  )}
                </div>
                <h1 className="flex items-center gap-1.5 truncate text-lg font-semibold leading-tight text-foreground">
                  <User size={15} className="shrink-0 text-teal-600 dark:text-teal-400" />
                  {abbreviateMiddleNames(patient) || "Paciente não informado"}
                </h1>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="font-mono">{order || "—"}</span>
                  <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> Entrada {entryDate ? fmtQueueDate(entryDate) : "—"}</span>
                  {rows.length > 0 && <span>· {rows.length} exame(s)</span>}
                  {summary.porIniciar > 0 && <span>· {summary.porIniciar} por iniciar</span>}
                  {summary.emIncubacao > 0 && <span>· {summary.emIncubacao} em incubação</span>}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Link href={LIST_PATH} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/55 dark:border-white/10 dark:bg-white/5">
                <ArrowLeft size={14} /> Voltar
              </Link>
              <button
                onClick={() => load(true)}
                disabled={loading || refreshing}
                aria-busy={loading || refreshing}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/55 disabled:cursor-not-allowed disabled:opacity-65 dark:border-white/10 dark:bg-white/5"
              >
                <RefreshCw size={14} className={loading || refreshing ? "animate-spin" : ""} />
                {loading || refreshing ? "Atualizando" : "Atualizar"}
              </button>
            </div>
          </div>
        </section>

        {error && <div className="rounded-xl border border-red-200/60 bg-red-50/50 px-3 py-2 text-sm text-red-800 backdrop-blur-sm dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">{error}</div>}

        {loading && !items ? (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Carregando exames...</div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/30 bg-white/20 p-8 text-center text-sm text-muted-foreground backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
            Nenhum exame de cultura encontrado para esta requisição.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-2">
            {rows.map((item) => {
              const rowStyle = STATE_STYLES[itemState(item, now)];
              return (
                <div key={item.id} className="flex flex-col gap-1.5 rounded-xl border border-white/25 bg-white/30 p-2.5 shadow-sm backdrop-blur-sm transition hover:border-white/40 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${rowStyle.dot}`} title={rowStyle.label} />
                    <FlaskConical size={13} className="shrink-0 text-teal-600 dark:text-teal-400" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground" title={item.test_name}>{item.test_name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="rounded-full border border-white/40 bg-white/45 px-1.5 py-0.5 font-semibold text-foreground dark:border-white/10 dark:bg-white/10">{item.status_display}</span>
                    <span className="truncate">{item.test_code || "Sem código"}</span>
                    <span className="truncate">· {item.sample_barcode || "Sem amostra"}</span>
                  </div>
                  <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock3 size={10} className="shrink-0" />
                    <span className="truncate">{item.incubation_expected_end_at ? `Leitura ${fmtQueueDate(item.incubation_expected_end_at)}` : "Aguardando sementeira"}</span>
                  </div>
                  {item.culture_id ? (
                    <Link href={`${LIST_PATH}/${item.culture_id}`} className="mt-0.5 inline-flex h-7 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 text-xs font-semibold text-white shadow-sm shadow-violet-500/20">
                      Abrir <ArrowRight size={12} />
                    </Link>
                  ) : (
                    <button onClick={() => startCulture(item)} disabled={startingId === item.id} className="mt-0.5 inline-flex h-7 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-3 text-xs font-semibold text-white shadow-sm shadow-teal-500/20 disabled:opacity-60">
                      {startingId === item.id ? <Loader2 size={12} className="animate-spin" /> : <FlaskConical size={12} />} Iniciar cultura
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function RequisitionCulturesPage() {
  return (
    <Suspense fallback={<AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}><div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Carregando...</div></AppLayout>}>
      <RequisitionCultures />
    </Suspense>
  );
}
