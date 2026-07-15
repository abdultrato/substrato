"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Bug, FlaskConical, Loader2, Save, Search } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";
import { MICROORGANISM_OPTIONS } from "@/lib/microorganisms";

type Isolate = {
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
};

const GRAM_OPTIONS = [
  "Gram negativos Bacilos",
  "Gram negativos Cocos",
  "Gram positivos Cocos",
  "Gram positivos Bacilos",
  "Gram negativos",
  "Gram positivos",
  "Gram variáveis",
  "Leveduras",
  "Não aplicável",
];
const INPUT_CLS = "h-9 w-full rounded-lg border border-white/40 bg-white/40 px-2.5 text-sm text-foreground outline-none focus:border-fuchsia-400 dark:border-white/10 dark:bg-white/5";
const LABEL_CLS = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

export default function IsolateEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const [isolate, setIsolate] = useState<Isolate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [organism, setOrganism] = useState("");
  const [gram, setGram] = useState("");
  const [quantity, setQuantity] = useState("");
  const [significant, setSignificant] = useState(true);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Isolate>(`/clinical_laboratory/isolate/${id}/detalhe/`, { clientCache: false });
      setIsolate(data);
      setOrganism(data.organism_name || "");
      setGram(data.gram_stain || "");
      setQuantity(data.quantity || "");
      setSignificant(data.is_significant);
      setNotes(data.notes || "");
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar o isolado.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!organism.trim() || !id) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/clinical_laboratory/isolate/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          organism_name: organism.trim(),
          gram_stain: gram.trim(),
          quantity: quantity.trim(),
          is_significant: significant,
          notes: notes.trim(),
        }),
      });
      router.push(`/clinical-laboratory/isolates/${id}`);
    } catch (err: any) {
      setError(err?.message || "Falha ao guardar o isolado.");
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="mx-auto w-full max-w-2xl space-y-3">
        <section className="relative overflow-hidden rounded-xl border border-white/25 bg-gradient-to-br from-white/35 via-white/20 to-fuchsia-100/25 p-3 pl-4 shadow-md shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:from-white/[0.07] dark:via-white/[0.03] dark:to-fuchsia-950/20">
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-fuchsia-500 to-violet-600" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-violet-600 text-white shadow-lg shadow-fuchsia-500/25">
                <Bug size={18} />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold leading-tight text-foreground">Editar isolado</h1>
                <p className="truncate text-xs text-muted-foreground">
                  {isolate ? [isolate.patient_name, isolate.order_custom_id].filter(Boolean).join(" · ") || isolate.custom_id : "A carregar…"}
                </p>
              </div>
            </div>
            <Link href={`/clinical-laboratory/isolates/${id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/55 dark:border-white/10 dark:bg-white/5">
              <ArrowLeft size={14} /> Voltar
            </Link>
          </div>
        </section>

        {error && <div className="rounded-xl border border-red-200/60 bg-red-50/50 px-3 py-2 text-sm text-red-800 backdrop-blur-sm dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">{error}</div>}

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Carregando...</div>
        ) : isolate ? (
          <>
          <section className="relative overflow-hidden rounded-xl border border-white/40 bg-white/30 p-3 pl-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
            <span className="absolute inset-y-0 left-0 w-1 bg-teal-400" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
              <Field label="Paciente" value={isolate.patient_name || "—"} />
              <Field label="Requisição" value={isolate.order_custom_id || "—"} mono />
              <Field label="Exame" value={isolate.test_name || "—"} />
              <Field label="Espécime" value={isolate.specimen || "—"} />
              <Field label="Tipo de cultura" value={isolate.culture_type_display || "—"} />
              <Field label="Estado da cultura" value={isolate.culture_status_display || "—"} />
              <Field label="Cultura" value={isolate.culture_custom_id || "—"} mono />
              <Field label="Isolado" value={isolate.custom_id || "—"} mono />
            </div>
            {isolate.culture_id && (
              <Link href={`/clinical-laboratory/cultures/${isolate.culture_id}`} className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 underline decoration-dotted hover:no-underline dark:text-teal-300">
                <FlaskConical size={12} /> Abrir cultura de origem
              </Link>
            )}
          </section>

          <form onSubmit={save} className="relative overflow-visible rounded-xl border border-white/40 bg-white/30 p-4 pl-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
            <span className="absolute inset-y-0 left-0 w-1 bg-fuchsia-400" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={LABEL_CLS}>Microrganismo</label>
                <SuggestInput value={organism} onChange={setOrganism} suggestions={MICROORGANISM_OPTIONS} placeholder="ex: Escherichia coli" />
              </div>
              <div>
                <label className={LABEL_CLS}>Coloração de Gram</label>
                <SuggestInput value={gram} onChange={setGram} suggestions={GRAM_OPTIONS} placeholder="ex: Gram negativos Bacilos" />
              </div>
              <div>
                <label className={LABEL_CLS}>Quantidade / contagem</label>
                <input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="ex: >10⁵ UFC/mL" className={INPUT_CLS} />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL_CLS}>Notas</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Observações do isolado…" className="w-full rounded-lg border border-white/40 bg-white/40 px-2.5 py-2 text-sm text-foreground outline-none focus:border-fuchsia-400 dark:border-white/10 dark:bg-white/5" />
              </div>
              <label className="flex cursor-pointer select-none items-center gap-2 sm:col-span-2">
                <input type="checkbox" checked={significant} onChange={(e) => setSignificant(e.target.checked)} className="h-4 w-4 rounded border-white/40 accent-fuchsia-600" />
                <span className="text-sm text-foreground">Isolado clinicamente significativo</span>
              </label>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button type="submit" disabled={saving || !organism.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-fuchsia-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-fuchsia-700 disabled:opacity-60">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Guardar
              </button>
              <Link href={`/clinical-laboratory/isolates/${id}`} className="inline-flex h-9 items-center rounded-lg border border-white/40 bg-white/35 px-4 text-sm font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/55 dark:border-white/10 dark:bg-white/5">
                Cancelar
              </Link>
            </div>
          </form>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}

function SuggestInput({ value, onChange, suggestions, placeholder }: {
  value: string;
  onChange: (value: string) => void;
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
      <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => { onChange(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        className={`${INPUT_CLS} pl-8`}
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

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`truncate text-foreground ${mono ? "font-mono text-[11px]" : ""}`}>{value}</p>
    </div>
  );
}
