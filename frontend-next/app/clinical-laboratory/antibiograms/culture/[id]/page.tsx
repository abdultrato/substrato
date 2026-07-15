"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FlaskConical, Loader2, Pill, Plus, Trash2 } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

type Susceptibility = {
  id: number;
  custom_id: string;
  antibiotic: string;
  method: string;
  result: string;
  zone_mm: number | null;
  mic_value: string;
};

type Isolate = {
  id: number;
  custom_id: string;
  organism_name: string;
  gram_stain: string;
  quantity: string;
  is_significant: boolean;
  susceptibilities: Susceptibility[];
};

type CulturePayload = {
  culture_id: number;
  culture_custom_id: string;
  culture_type_display: string;
  status_display: string;
  specimen: string;
  order_custom_id: string;
  patient_name: string;
  test_name: string;
  isolates: Isolate[];
};

const METHOD_LABELS: Record<string, string> = { DISCO: "Disco (Kirby-Bauer)", CIM: "CIM", ETEST: "E-test", AUTOMATIZADO: "Automatizado" };
const RESULT_LABELS: Record<string, string> = { SENSIVEL: "Sensível", INTERMEDIO: "Intermédio", RESISTENTE: "Resistente" };
const RESULT_TONE: Record<string, string> = {
  SENSIVEL: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  INTERMEDIO: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  RESISTENTE: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
};

const INPUT_CLS = "h-8 w-full rounded-lg border border-white/40 bg-white/40 px-2 text-xs text-foreground outline-none focus:border-violet-400 dark:border-white/10 dark:bg-white/5";
const LABEL_CLS = "mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

export default function AntibiogramWorkspacePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const [data, setData] = useState<CulturePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulário de novo isolado (subcultura).
  const [orgName, setOrgName] = useState("");
  const [gram, setGram] = useState("");
  const [quantity, setQuantity] = useState("");
  const [savingIsolate, setSavingIsolate] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await apiFetch<CulturePayload>(`/clinical_laboratory/culture/${id}/antibiograma/`, { clientCache: false });
      setData(payload);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar a cultura.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function addIsolate() {
    if (!orgName.trim() || !id) return;
    setSavingIsolate(true);
    setError(null);
    try {
      await apiFetch("/clinical_laboratory/isolate/", {
        method: "POST",
        body: JSON.stringify({
          culture: Number(id),
          organism_name: orgName.trim(),
          gram_stain: gram.trim(),
          quantity: quantity.trim(),
          is_significant: true,
        }),
      });
      setOrgName(""); setGram(""); setQuantity("");
      await load();
    } catch (err: any) {
      setError(err?.message || "Falha ao registar o isolado.");
    } finally {
      setSavingIsolate(false);
    }
  }

  async function deleteIsolate(isolateId: number) {
    setError(null);
    try {
      await apiFetch(`/clinical_laboratory/isolate/${isolateId}/`, { method: "DELETE" });
      await load();
    } catch (err: any) {
      setError(err?.message || "Falha ao remover o isolado.");
    }
  }

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="mx-auto w-full max-w-5xl space-y-3">
        <section className="relative overflow-hidden rounded-xl border border-white/25 bg-gradient-to-br from-white/35 via-white/20 to-violet-100/25 p-3 pl-4 shadow-md shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:from-white/[0.07] dark:via-white/[0.03] dark:to-violet-950/20">
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-violet-500 to-fuchsia-600" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25">
                <Pill size={18} />
              </span>
              <div className="min-w-0">
                <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full border border-violet-200/70 bg-violet-50/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:border-violet-800/40 dark:bg-violet-900/20 dark:text-violet-300">
                    {data?.status_display || "Cultura"}
                  </span>
                  {data && (
                    <span className="font-mono text-[10px] text-muted-foreground">{data.culture_custom_id} · #{data.order_custom_id}</span>
                  )}
                </div>
                <h1 className="truncate text-lg font-semibold leading-tight text-foreground">{data?.patient_name || "Cultura"}</h1>
                <p className="truncate text-xs text-muted-foreground">
                  {data ? [data.culture_type_display, data.specimen, data.test_name].filter(Boolean).join(" · ") : "A carregar…"}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/clinical-laboratory/antibiograms")}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/55 dark:border-white/10 dark:bg-white/5"
            >
              <ArrowLeft size={14} /> Voltar
            </button>
          </div>
        </section>

        {error && <div className="rounded-xl border border-red-200/60 bg-red-50/50 px-3 py-2 text-sm text-red-800 backdrop-blur-sm dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">{error}</div>}

        {loading && !data ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Carregando...</div>
        ) : (
          <>
            {/* ── Subcultura: novo isolado ── */}
            <section className="relative overflow-hidden rounded-xl border border-white/40 bg-white/30 p-3 pl-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
              <span className="absolute inset-y-0 left-0 w-1 bg-violet-400" />
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><FlaskConical size={14} className="text-violet-600 dark:text-violet-400" /> Subcultura — registar microrganismo isolado</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
                <div>
                  <label className={LABEL_CLS}>Microrganismo</label>
                  <input value={orgName} onChange={(e) => setOrgName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addIsolate()} placeholder="ex: Escherichia coli" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Gram</label>
                  <input value={gram} onChange={(e) => setGram(e.target.value)} placeholder="ex: Gram-negativo" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Quantidade</label>
                  <input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="ex: >10⁵ UFC/mL" className={INPUT_CLS} />
                </div>
                <button
                  onClick={addIsolate}
                  disabled={savingIsolate || !orgName.trim()}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
                >
                  {savingIsolate ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Isolar
                </button>
              </div>
            </section>

            {/* ── Isolados e antibiogramas ── */}
            {(data?.isolates.length ?? 0) === 0 ? (
              <div className="rounded-xl border border-dashed border-white/30 bg-white/20 p-6 text-center text-sm text-muted-foreground backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                Sem isolados. Registe o microrganismo isolado da subcultura para iniciar o antibiograma.
              </div>
            ) : (
              <div className="space-y-2.5">
                {data!.isolates.map((iso) => (
                  <IsolateCard key={iso.id} isolate={iso} onChanged={load} onDelete={() => deleteIsolate(iso.id)} setError={setError} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

function IsolateCard({
  isolate, onChanged, onDelete, setError,
}: {
  isolate: Isolate;
  onChanged: () => Promise<void>;
  onDelete: () => void;
  setError: (msg: string | null) => void;
}) {
  const [antibiotic, setAntibiotic] = useState("");
  const [method, setMethod] = useState("DISCO");
  const [result, setResult] = useState("SENSIVEL");
  const [zone, setZone] = useState("");
  const [mic, setMic] = useState("");
  const [saving, setSaving] = useState(false);

  async function addAntibiogram() {
    if (!antibiotic.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/clinical_laboratory/antibiogram/", {
        method: "POST",
        body: JSON.stringify({
          isolate: isolate.id,
          antibiotic: antibiotic.trim(),
          method,
          result,
          zone_mm: zone ? Number(zone) : null,
          mic_value: mic.trim(),
        }),
      });
      setAntibiotic(""); setZone(""); setMic("");
      await onChanged();
    } catch (err: any) {
      setError(err?.message || "Falha ao registar o antibiograma.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAntibiogram(sid: number) {
    setError(null);
    try {
      await apiFetch(`/clinical_laboratory/antibiogram/${sid}/`, { method: "DELETE" });
      await onChanged();
    } catch (err: any) {
      setError(err?.message || "Falha ao remover o antibiograma.");
    }
  }

  return (
    <section className="relative overflow-hidden rounded-xl border border-white/40 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
      <span className="absolute inset-y-0 left-0 w-1 bg-fuchsia-400" />

      <div className="flex items-center justify-between gap-2 px-3 py-2 pl-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <FlaskConical size={13} className="shrink-0 text-fuchsia-600 dark:text-fuchsia-400" />
          <h3 className="truncate text-sm font-semibold italic text-foreground">{isolate.organism_name}</h3>
          {isolate.gram_stain && <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">{isolate.gram_stain}</span>}
          {isolate.quantity && <span className="shrink-0 text-[10px] text-muted-foreground">{isolate.quantity}</span>}
        </div>
        <button onClick={onDelete} title="Remover isolado" className="shrink-0 rounded-lg p-1 text-muted-foreground transition hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30">
          <Trash2 size={13} />
        </button>
      </div>

      {isolate.susceptibilities.length > 0 && (
        <table className="w-full border-t border-white/40 text-xs dark:border-white/10">
          <thead>
            <tr className="text-left text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-1.5 pl-4">Antibiótico</th>
              <th className="px-2 py-1.5">Método</th>
              <th className="px-2 py-1.5 text-right">Halo / CIM</th>
              <th className="px-2 py-1.5 text-right">Resultado</th>
              <th className="px-2 py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {isolate.susceptibilities.map((s) => (
              <tr key={s.id} className="border-t border-white/30 dark:border-white/5">
                <td className="px-3 py-1.5 pl-4 font-medium text-foreground">{s.antibiotic}</td>
                <td className="px-2 py-1.5 text-muted-foreground">{METHOD_LABELS[s.method] ?? s.method}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right text-muted-foreground">
                  {[s.zone_mm ? `${s.zone_mm} mm` : "", s.mic_value ? `CIM ${s.mic_value}` : ""].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-2 py-1.5 text-right">
                  <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${RESULT_TONE[s.result] ?? "bg-slate-100 text-slate-600"}`}>
                    {RESULT_LABELS[s.result] ?? s.result}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right">
                  <button onClick={() => deleteAntibiogram(s.id)} title="Remover" className="rounded p-0.5 text-muted-foreground transition hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30">
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Novo antibiograma para este isolado */}
      <div className="grid grid-cols-1 gap-2 border-t border-white/40 p-2.5 pl-4 sm:grid-cols-[2fr_1.4fr_1fr_1fr_1.2fr_auto] sm:items-end dark:border-white/10">
        <div>
          <label className={LABEL_CLS}>Antibiótico</label>
          <input value={antibiotic} onChange={(e) => setAntibiotic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addAntibiogram()} placeholder="ex: Ampicilina" className={INPUT_CLS} />
        </div>
        <div>
          <label className={LABEL_CLS}>Método</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={INPUT_CLS}>
            {Object.entries(METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL_CLS}>Halo (mm)</label>
          <input value={zone} onChange={(e) => setZone(e.target.value)} inputMode="numeric" placeholder="mm" className={INPUT_CLS} />
        </div>
        <div>
          <label className={LABEL_CLS}>CIM</label>
          <input value={mic} onChange={(e) => setMic(e.target.value)} placeholder="µg/mL" className={INPUT_CLS} />
        </div>
        <div>
          <label className={LABEL_CLS}>Resultado</label>
          <select value={result} onChange={(e) => setResult(e.target.value)} className={INPUT_CLS}>
            {Object.entries(RESULT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <button
          onClick={addAntibiogram}
          disabled={saving || !antibiotic.trim()}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-fuchsia-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-fuchsia-700 disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
        </button>
      </div>
    </section>
  );
}
