"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Bug, FlaskConical, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";
import { ANTIBIOTIC_OPTIONS } from "@/lib/antibiotics";

type Susceptibility = {
  id: number;
  custom_id: string;
  antibiotic: string;
  method: string;
  result: string;
  zone_mm: number | null;
  mic_value: string;
};

type IsolateDetail = {
  id: number;
  custom_id: string;
  organism_name: string;
  gram_stain: string;
  quantity: string;
  is_significant: boolean;
  notes: string;
  culture_id: number | null;
  culture_custom_id: string;
  culture_type_display: string;
  culture_status_display: string;
  specimen: string;
  order_custom_id: string;
  patient_name: string;
  test_name: string;
  susceptibilities: Susceptibility[];
  antibiogram_count: number;
};

const METHOD_LABELS: Record<string, string> = { DISCO: "Disco (Kirby-Bauer)", CIM: "CIM", ETEST: "E-test", AUTOMATIZADO: "Automatizado" };
const RESULT_LABELS: Record<string, string> = { SENSIVEL: "Sensível", INTERMEDIO: "Intermédio", RESISTENTE: "Resistente" };
const RESULT_TONE: Record<string, string> = {
  SENSIVEL: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  INTERMEDIO: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  RESISTENTE: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
};

const INPUT_CLS = "h-8 w-full rounded-lg border border-white/40 bg-white/40 px-2 text-xs text-foreground outline-none focus:border-fuchsia-400 dark:border-white/10 dark:bg-white/5";
const LABEL_CLS = "mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

export default function IsolateDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const [data, setData] = useState<IsolateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [antibiotic, setAntibiotic] = useState("");
  const [method, setMethod] = useState("DISCO");
  const [result, setResult] = useState("SENSIVEL");
  const [zone, setZone] = useState("");
  const [mic, setMic] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await apiFetch<IsolateDetail>(`/clinical_laboratory/isolate/${id}/detalhe/`, { clientCache: false });
      setData(payload);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar o isolado.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function addAntibiogram() {
    if (!antibiotic.trim() || !id) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/clinical_laboratory/antibiogram/", {
        method: "POST",
        body: JSON.stringify({
          isolate: Number(id),
          antibiotic: antibiotic.trim(),
          method,
          result,
          zone_mm: zone ? Number(zone) : null,
          mic_value: mic.trim(),
        }),
      });
      setAntibiotic(""); setZone(""); setMic("");
      await load();
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
      await load();
    } catch (err: any) {
      setError(err?.message || "Falha ao remover o antibiograma.");
    }
  }

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="mx-auto w-full max-w-4xl space-y-3">
        {/* ── Cabeçalho ── */}
        <section className="relative overflow-hidden rounded-xl border border-white/25 bg-gradient-to-br from-white/35 via-white/20 to-fuchsia-100/25 p-3 pl-4 shadow-md shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:from-white/[0.07] dark:via-white/[0.03] dark:to-fuchsia-950/20">
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-fuchsia-500 to-violet-600" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-violet-600 text-white shadow-lg shadow-fuchsia-500/25">
                <Bug size={18} />
              </span>
              <div className="min-w-0">
                <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                  {data?.is_significant && <span className="rounded-full border border-amber-200/70 bg-amber-50/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">Significativo</span>}
                  {data && <span className="font-mono text-[10px] text-muted-foreground">{data.custom_id}</span>}
                </div>
                <h1 className="truncate text-lg font-semibold italic leading-tight text-foreground">{data?.organism_name || "Isolado"}</h1>
                <p className="truncate text-xs text-muted-foreground">
                  {data ? [data.gram_stain, data.quantity].filter(Boolean).join(" · ") || "—" : "A carregar…"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Link href={`/clinical-laboratory/isolates/${id}/edit`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/55 dark:border-white/10 dark:bg-white/5">
                <Pencil size={13} /> Editar
              </Link>
              <button onClick={() => router.back()} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/55 dark:border-white/10 dark:bg-white/5">
                <ArrowLeft size={14} /> Voltar
              </button>
            </div>
          </div>
        </section>

        {error && <div className="rounded-xl border border-red-200/60 bg-red-50/50 px-3 py-2 text-sm text-red-800 backdrop-blur-sm dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">{error}</div>}

        {loading && !data ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Carregando...</div>
        ) : data ? (
          <>
            {/* ── Contexto da cultura ── */}
            <section className="relative overflow-hidden rounded-xl border border-white/40 bg-white/30 p-3 pl-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
              <span className="absolute inset-y-0 left-0 w-1 bg-teal-400" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                <Field label="Paciente" value={data.patient_name || "—"} />
                <Field label="Requisição" value={data.order_custom_id || "—"} mono />
                <Field label="Exame" value={data.test_name || "—"} />
                <Field label="Espécime" value={data.specimen || "—"} />
                <Field label="Tipo de cultura" value={data.culture_type_display || "—"} />
                <Field label="Estado da cultura" value={data.culture_status_display || "—"} />
                <Field label="Cultura" value={data.culture_custom_id || "—"} mono />
                {data.notes && <Field label="Notas" value={data.notes} />}
              </div>
              {data.culture_id && (
                <Link href={`/clinical-laboratory/cultures/${data.culture_id}`} className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 underline decoration-dotted hover:no-underline dark:text-teal-300">
                  <FlaskConical size={12} /> Abrir cultura de origem
                </Link>
              )}
            </section>

            {/* ── Antibiograma / TSA ── */}
            <section className="relative overflow-hidden rounded-xl border border-white/40 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
              <span className="absolute inset-y-0 left-0 w-1 bg-fuchsia-400" />
              <div className="flex items-center gap-1.5 px-3 py-2 pl-4">
                <FlaskConical size={13} className="shrink-0 text-fuchsia-600 dark:text-fuchsia-400" />
                <h2 className="text-sm font-semibold text-foreground">Antibiograma / TSA</h2>
                <span className="ml-auto text-[10px] text-muted-foreground">{data.antibiogram_count} {data.antibiogram_count === 1 ? "antibiótico" : "antibióticos"}</span>
              </div>

              {data.susceptibilities.length > 0 && (
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
                    {data.susceptibilities.map((s) => (
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

              <div className="grid grid-cols-1 gap-2 border-t border-white/40 p-2.5 pl-4 sm:grid-cols-[2fr_1.4fr_1fr_1fr_1.2fr_auto] sm:items-end dark:border-white/10">
                <div>
                  <label className={LABEL_CLS}>Antibiótico</label>
                  <SuggestInput
                    value={antibiotic}
                    onChange={setAntibiotic}
                    onEnter={addAntibiogram}
                    suggestions={ANTIBIOTIC_OPTIONS}
                    placeholder="Pesquisar antibiótico…"
                  />
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
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`truncate text-foreground ${mono ? "font-mono text-[11px]" : ""}`}>{value}</p>
    </div>
  );
}

function SuggestInput({ value, onChange, onEnter, suggestions, placeholder }: {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  suggestions: string[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const query = value.trim().toLowerCase();
  const filtered = suggestions
    .filter((option) => (!query || option.toLowerCase().includes(query)) && option !== value)
    .slice(0, 12);

  return (
    <div className="relative z-20 focus-within:z-50">
      <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => { onChange(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onEnter?.();
          }
        }}
        placeholder={placeholder}
        className={`${INPUT_CLS} pl-7`}
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-white/50 bg-white shadow-xl shadow-slate-900/15 dark:border-white/10 dark:bg-slate-950">
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  onMouseDown={() => { onChange(option); setOpen(false); }}
                  className="flex w-full items-center px-3 py-1.5 text-left text-xs text-foreground transition hover:bg-fuchsia-50 dark:hover:bg-white/10"
                >
                  {option}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
