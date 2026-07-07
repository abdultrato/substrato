"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock3, FlaskConical, Loader2, Microscope, RefreshCw, Search } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

type QueueItem = {
  id: string;
  kind: "pending" | "culture";
  culture_id: number | null;
  culture_custom_id: string;
  order_item: number;
  order_item_custom_id: string;
  order_custom_id: string;
  patient_name: string;
  test_name: string;
  test_code: string;
  test_method: string;
  sample: number | null;
  sample_barcode: string;
  sample_type: string;
  sample_received_at: string | null;
  status: string;
  status_display: string;
  incubation_started_at: string | null;
  incubation_expected_end_at: string | null;
};

const cardTones = [
  "from-teal-100/70 via-white/35 to-cyan-100/60 border-teal-200/45 shadow-teal-500/10",
  "from-violet-100/70 via-white/35 to-fuchsia-100/60 border-violet-200/45 shadow-violet-500/10",
  "from-amber-100/70 via-white/35 to-orange-100/60 border-amber-200/45 shadow-amber-500/10",
  "from-sky-100/70 via-white/35 to-indigo-100/60 border-sky-200/45 shadow-sky-500/10",
];

function fmtDate(value: string | null) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-MZ", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function LabCulturesPage() {
  const router = useRouter();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(manual = false) {
    const startedAt = Date.now();
    if (manual) setRefreshing(true);
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<QueueItem[]>("/clinical_laboratory/culture/queue/");
      setItems(data);
    } catch (err: any) {
      setError(err?.message || "Não foi possível carregar a fila de culturas.");
    } finally {
      if (manual) {
        const remaining = Math.max(0, 700 - (Date.now() - startedAt));
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
      item.sample_barcode,
      item.status_display,
    ].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [items, query]);

  async function startCulture(item: QueueItem) {
    if (item.culture_id) {
      router.push(`/clinical-laboratory/cultures/${item.culture_id}`);
      return;
    }
    setStartingId(item.id);
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
      router.push(`/clinical-laboratory/cultures/${culture.id}`);
    } catch (err: any) {
      setError(err?.message || "Não foi possível iniciar a cultura.");
    } finally {
      setStartingId(null);
    }
  }

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="mx-auto w-full max-w-7xl space-y-3">
        <section className="relative overflow-hidden rounded-xl border border-white/25 bg-gradient-to-br from-white/35 via-white/20 to-teal-100/25 p-3 pl-4 shadow-md shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:from-white/[0.07] dark:via-white/[0.03] dark:to-teal-950/20">
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-teal-500 to-cyan-600" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/25">
                <Microscope size={18} />
              </span>
              <div>
                <div className="mb-0.5 flex gap-1.5">
                  <span className="rounded-full border border-teal-200/70 bg-teal-50/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700 backdrop-blur-sm dark:border-teal-800/40 dark:bg-teal-900/20 dark:text-teal-300">Microbiologia</span>
                  <span className="rounded-full border border-cyan-200/70 bg-cyan-50/70 px-2 py-0.5 text-[10px] font-medium text-cyan-700 backdrop-blur-sm dark:border-cyan-800/40 dark:bg-cyan-900/20 dark:text-cyan-300">Fila de culturas</span>
                </div>
                <h1 className="text-lg font-semibold leading-tight text-foreground">Culturas pendentes e em execução</h1>
                <p className="text-xs text-muted-foreground">Apenas itens de requisição cujo exame usa método Cultura após recepção da amostra.</p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[360px] sm:flex-row sm:items-center">
              <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/40 bg-white/35 px-2.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                <Search size={14} className="shrink-0 text-muted-foreground" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar paciente, requisição, exame ou amostra" className="h-full min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" />
              </div>
              <button
                onClick={() => load(true)}
                disabled={loading || refreshing}
                aria-busy={loading || refreshing}
                className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/55 disabled:cursor-not-allowed disabled:opacity-65 dark:border-white/10 dark:bg-white/5"
              >
                <RefreshCw size={14} className={loading || refreshing ? "animate-spin" : ""} />
                {loading || refreshing ? "Atualizando" : "Atualizar"}
              </button>
            </div>
          </div>
        </section>

        {error && <div className="rounded-xl border border-red-200/60 bg-red-50/50 px-3 py-2 text-sm text-red-800 backdrop-blur-sm dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">{error}</div>}

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Carregando culturas...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/30 bg-white/20 p-8 text-center text-sm text-muted-foreground backdrop-blur-sm dark:border-white/10 dark:bg-white/5">Nenhuma cultura pendente para os filtros atuais.</div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item, index) => {
              const tone = cardTones[index % cardTones.length];
              return (
                <article key={item.id} className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${tone} p-3 pl-4 shadow-md backdrop-blur-xl dark:border-white/10 dark:from-white/[0.06] dark:via-white/[0.025] dark:to-white/[0.015]`}>
                  <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-teal-500 via-cyan-500 to-violet-500" />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-foreground">{item.test_name}</h2>
                      <p className="truncate text-xs text-muted-foreground">{item.patient_name || "Paciente não informado"}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/40 bg-white/35 px-2 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur-sm">{item.status_display}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                    <span className="rounded-lg border border-white/30 bg-white/25 px-2 py-1 backdrop-blur-sm">{item.order_custom_id}</span>
                    <span className="rounded-lg border border-white/30 bg-white/25 px-2 py-1 backdrop-blur-sm">{item.sample_barcode || "Sem amostra"}</span>
                    <span className="rounded-lg border border-white/30 bg-white/25 px-2 py-1 backdrop-blur-sm">{item.test_code || "Sem código"}</span>
                    <span className="rounded-lg border border-white/30 bg-white/25 px-2 py-1 backdrop-blur-sm">{fmtDate(item.sample_received_at)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Clock3 size={12} /> {item.incubation_expected_end_at ? `Leitura ${fmtDate(item.incubation_expected_end_at)}` : "Aguardando sementeira"}</span>
                    {item.culture_id ? (
                      <Link href={`/clinical-laboratory/cultures/${item.culture_id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/20">
                        Abrir <ArrowRight size={13} />
                      </Link>
                    ) : (
                      <button onClick={() => startCulture(item)} disabled={startingId === item.id} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-3 text-xs font-semibold text-white shadow-md shadow-teal-500/20 disabled:opacity-60">
                        {startingId === item.id ? <Loader2 size={13} className="animate-spin" /> : <FlaskConical size={13} />} Iniciar cultura
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
