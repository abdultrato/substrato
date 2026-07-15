"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Bug, Loader2, Save } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";
import { MICROORGANISM_CATALOG } from "@/lib/microorganisms";

type Isolate = {
  id: number;
  custom_id: string;
  organism_name: string;
  gram_stain: string;
  quantity: string;
  is_significant: boolean;
  notes: string;
};

const GRAM_OPTIONS = ["Gram negativos", "Gram positivos", "Gram variáveis", "Não aplicável"];
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
      const data = await apiFetch<Isolate>(`/clinical_laboratory/isolate/${id}/`, { clientCache: false });
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

  async function save() {
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
                <p className="truncate font-mono text-[11px] text-muted-foreground">{isolate?.custom_id || "…"}</p>
              </div>
            </div>
            <button onClick={() => router.back()} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/55 dark:border-white/10 dark:bg-white/5">
              <ArrowLeft size={14} /> Voltar
            </button>
          </div>
        </section>

        {error && <div className="rounded-xl border border-red-200/60 bg-red-50/50 px-3 py-2 text-sm text-red-800 backdrop-blur-sm dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">{error}</div>}

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Carregando...</div>
        ) : (
          <section className="relative overflow-hidden rounded-xl border border-white/40 bg-white/30 p-4 pl-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
            <span className="absolute inset-y-0 left-0 w-1 bg-fuchsia-400" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={LABEL_CLS}>Microrganismo</label>
                <input value={organism} onChange={(e) => setOrganism(e.target.value)} list="edit-organisms" placeholder="ex: Escherichia coli" className={INPUT_CLS} />
                <datalist id="edit-organisms">
                  {MICROORGANISM_CATALOG.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.organisms.map((name) => <option key={name} value={name} />)}
                    </optgroup>
                  ))}
                </datalist>
              </div>
              <div>
                <label className={LABEL_CLS}>Coloração de Gram</label>
                <input value={gram} onChange={(e) => setGram(e.target.value)} list="edit-gram" placeholder="ex: Gram negativos Bacilos" className={INPUT_CLS} />
                <datalist id="edit-gram">
                  {GRAM_OPTIONS.map((g) => <option key={g} value={g} />)}
                </datalist>
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
              <button onClick={save} disabled={saving || !organism.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-fuchsia-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-fuchsia-700 disabled:opacity-60">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Guardar
              </button>
              <button onClick={() => router.back()} className="inline-flex h-9 items-center rounded-lg border border-white/40 bg-white/35 px-4 text-sm font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/55 dark:border-white/10 dark:bg-white/5">
                Cancelar
              </button>
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
