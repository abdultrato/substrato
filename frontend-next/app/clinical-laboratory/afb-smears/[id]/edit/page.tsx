"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, TestTubes } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

const ENDPOINT = "/clinical_laboratory/afb_smear/";
const LIST_HREF = "/clinical-laboratory/afb-smears";

type AfbSmear = {
  id: number;
  custom_id: string;
  order_custom_id: string;
  patient_name: string;
  test_name: string;
  sample_barcode: string;
  sample_type: string;
  stain: string;
  grade: string;
  afb_count: string;
  serial_number: number | null;
  notes: string;
};

const STAIN_OPTIONS = [
  { value: "ZN", label: "Ziehl-Neelsen" },
  { value: "AURAMINA", label: "Auramina (fluorescência)" },
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

export default function AfbSmearEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [smear, setSmear] = useState<AfbSmear | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stain, setStain] = useState("ZN");
  const [grade, setGrade] = useState("NEGATIVO");
  const [afbCount, setAfbCount] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<AfbSmear>(`${ENDPOINT}${id}/`, { clientCache: false });
      setSmear(data);
      setStain(data.stain || "ZN");
      setGrade(data.grade || "NEGATIVO");
      setAfbCount(data.afb_count || "");
      setSerialNumber(data.serial_number != null ? String(data.serial_number) : "");
      setNotes(data.notes || "");
    } catch (err: any) {
      setError(err?.message || "Não foi possível carregar a baciloscopia.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`${ENDPOINT}${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          stain,
          grade,
          afb_count: afbCount.trim(),
          serial_number: serialNumber ? Number(serialNumber) : null,
          notes: notes.trim(),
        }),
      });
      router.push(`${LIST_HREF}/${id}`);
    } catch (err: any) {
      setError(err?.message || "Não foi possível guardar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="mx-auto w-full max-w-3xl space-y-2 px-2 py-2 sm:px-4">
        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> A carregar baciloscopia...
          </div>
        ) : error && !smear ? (
          <div className="space-y-2">
            <div className="rounded-xl border border-red-200/60 bg-red-50/50 p-4 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
              {error}
            </div>
            <Link href={LIST_HREF} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-medium text-[var(--text)] shadow-sm hover:bg-[var(--gray-100)]">
              <ArrowLeft size={14} /> Voltar à lista
            </Link>
          </div>
        ) : smear ? (
          <form onSubmit={handleSubmit} noValidate className="space-y-2">
            {/* Cabeçalho */}
            <div className="relative overflow-hidden rounded-xl border border-teal-200/70 bg-gradient-to-br from-teal-50/80 via-card to-card shadow-sm dark:border-teal-800/40 dark:from-teal-950/25 dark:via-card dark:to-card">
              <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-teal-500 to-cyan-600" />
              <div className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 pl-4">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-sm">
                    <TestTubes size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--gray-500)]">
                      <Link href={LIST_HREF} className="hover:text-teal-600 hover:underline dark:hover:text-teal-400">Baciloscopias (BAAR)</Link>
                      <span>›</span>
                      <Link href={`${LIST_HREF}/${smear.id}`} className="hover:text-teal-600 hover:underline dark:hover:text-teal-400">{smear.custom_id}</Link>
                      <span>›</span>
                      <span className="font-medium text-[var(--text)]">Editar</span>
                    </div>
                    <h1 className="truncate text-base font-bold leading-tight text-[var(--text)] sm:text-lg">{smear.patient_name || "Baciloscopia (BAAR)"}</h1>
                    <p className="truncate text-xs text-[var(--gray-500)]">
                      {smear.test_name} · {smear.order_custom_id} · {smear.sample_barcode || smear.sample_type}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Link href={`${LIST_HREF}/${smear.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-medium text-[var(--text)] shadow-sm transition hover:bg-[var(--gray-100)]">
                    <ArrowLeft size={14} /> Voltar
                  </Link>
                  <button type="submit" disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:from-teal-700 hover:to-cyan-700 disabled:opacity-60">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
                  </button>
                </div>
              </div>
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200/60 bg-red-50/50 px-3 py-2 text-sm text-red-800 shadow-sm backdrop-blur-sm dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
                {error}
              </div>
            ) : null}

            {/* Campos de leitura */}
            <section className={`p-2.5 ${GLASS}`}>
              <h2 className="mb-1.5 border-b border-white/[0.14] pb-1.5 text-sm font-semibold text-foreground dark:border-white/[0.08]">Leitura BAAR</h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-1.5">
                <label className="space-y-1 rounded-md border border-white/[0.14] bg-white/[0.06] p-2 backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.02]">
                  <span className="text-xs font-medium text-muted-foreground">Coloração</span>
                  <select value={stain} onChange={(event) => setStain(event.target.value)} className={INPUT}>
                    {STAIN_OPTIONS.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                  </select>
                </label>

                <label className="space-y-1 rounded-md border border-white/[0.14] bg-white/[0.06] p-2 backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.02]">
                  <span className="text-xs font-medium text-muted-foreground">Graduação</span>
                  <select value={grade} onChange={(event) => setGrade(event.target.value)} className={INPUT}>
                    {GRADE_OPTIONS.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                  </select>
                </label>

                <label className="space-y-1 rounded-md border border-white/[0.14] bg-white/[0.06] p-2 backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.02]">
                  <span className="text-xs font-medium text-muted-foreground">Contagem BAAR</span>
                  <input value={afbCount} onChange={(event) => setAfbCount(event.target.value)} placeholder="0 BAAR/100 campos" className={INPUT} />
                </label>

                <label className="space-y-1 rounded-md border border-white/[0.14] bg-white/[0.06] p-2 backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.02]">
                  <span className="text-xs font-medium text-muted-foreground">Número da lâmina</span>
                  <input type="number" min={1} value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} placeholder="1" className={INPUT} />
                </label>

                <label className="space-y-1 rounded-md border border-white/[0.14] bg-white/[0.06] p-2 backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.02] [grid-column:1/-1]">
                  <span className="text-xs font-medium text-muted-foreground">Observações</span>
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Qualidade da amostra, leitura microscópica ou necessidade de repetição." className={TEXTAREA} />
                </label>
              </div>
            </section>
          </form>
        ) : null}
      </div>
    </AppLayout>
  );
}
