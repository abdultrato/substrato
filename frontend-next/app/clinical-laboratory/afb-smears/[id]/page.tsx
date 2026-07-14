"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ClipboardList, Loader2, Pencil, Printer, TestTubes } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

const PENDING_HREF = "/clinical-laboratory/afb-smears/new";
const LIST_HREF = "/clinical-laboratory/afb-smears";

type AfbSmear = {
  id: number;
  custom_id: string;
  order_custom_id: string;
  patient_name: string;
  test_name: string;
  test_code: string;
  sample_barcode: string;
  sample_type: string;
  sample_received_at: string | null;
  stain: string;
  grade: string;
  afb_count: string;
  serial_number: number | null;
  performed_by_name: string;
  performed_at: string | null;
  notes: string;
  created_at: string;
};

const STAIN_LABELS: Record<string, string> = { ZN: "Ziehl-Neelsen", AURAMINA: "Auramina (fluorescência)" };
const GRADE_LABELS: Record<string, string> = {
  NEGATIVO: "Negativo",
  RARO: "Raros bacilos (escasso)",
  "1+": "1+",
  "2+": "2+",
  "3+": "3+",
};
const GRADE_TONE: Record<string, string> = {
  NEGATIVO: "border-emerald-300/60 bg-emerald-50/70 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/25 dark:text-emerald-300",
  RARO: "border-amber-300/60 bg-amber-50/70 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/25 dark:text-amber-300",
  "1+": "border-rose-300/60 bg-rose-50/70 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/25 dark:text-rose-300",
  "2+": "border-rose-300/60 bg-rose-50/70 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/25 dark:text-rose-300",
  "3+": "border-rose-300/60 bg-rose-50/70 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/25 dark:text-rose-300",
};

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-MZ", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/25 bg-white/40 px-2.5 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">{label}</p>
      <p className="text-sm font-medium text-[var(--text)]">{value || "—"}</p>
    </div>
  );
}

export default function AfbSmearDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [smear, setSmear] = useState<AfbSmear | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<AfbSmear>(`/clinical_laboratory/afb_smear/${id}/`, { clientCache: false });
      setSmear(data);
    } catch (err: any) {
      setError(err?.message || "Não foi possível carregar a baciloscopia.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <div className="mx-auto w-full max-w-3xl space-y-2 px-2 py-2 sm:px-4">
        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> A carregar baciloscopia...
          </div>
        ) : error || !smear ? (
          <div className="space-y-2">
            <div className="rounded-xl border border-red-200/60 bg-red-50/50 p-4 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
              {error || "Baciloscopia não encontrada."}
            </div>
            <Link href={PENDING_HREF} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-medium text-[var(--text)] shadow-sm hover:bg-[var(--gray-100)]">
              <ArrowLeft size={14} /> Voltar às pendentes
            </Link>
          </div>
        ) : (
          <>
            {/* Cabeçalho */}
            <div className="relative overflow-hidden rounded-xl border border-teal-200/70 bg-gradient-to-br from-teal-50/80 via-card to-card shadow-sm dark:border-teal-800/40 dark:from-teal-950/25 dark:via-card dark:to-card print:border-black/20">
              <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-teal-500 to-cyan-600 print:hidden" />
              <div className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 pl-4">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-sm">
                    <TestTubes size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--gray-500)]">
                      <Link href={LIST_HREF} className="hover:text-teal-600 hover:underline dark:hover:text-teal-400">Baciloscopias (BAAR)</Link>
                      <span>›</span>
                      <span className="font-medium text-[var(--text)]">{smear.custom_id}</span>
                    </div>
                    <h1 className="truncate text-base font-bold leading-tight text-[var(--text)] sm:text-lg">{smear.patient_name || "Baciloscopia (BAAR)"}</h1>
                    <p className="truncate text-xs text-[var(--gray-500)]">
                      {smear.test_name} · {smear.order_custom_id}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 print:hidden">
                  <Link href={PENDING_HREF} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-medium text-[var(--text)] shadow-sm transition hover:bg-[var(--gray-100)]">
                    <ArrowLeft size={14} /> Pendentes
                  </Link>
                  <Link href={`${LIST_HREF}/${smear.id}/edit`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-medium text-[var(--text)] shadow-sm transition hover:bg-[var(--gray-100)]">
                    <Pencil size={14} /> Editar
                  </Link>
                  <button type="button" onClick={() => window.print()} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:from-teal-700 hover:to-cyan-700">
                    <Printer size={14} /> Imprimir
                  </button>
                </div>
              </div>
            </div>

            {/* Resultado */}
            <div className="rounded-xl border border-white/25 bg-white/50 p-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
              <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/20 pb-2 dark:border-white/10">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text)]"><ClipboardList size={15} /> Resultado da baciloscopia</h2>
                <span className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold ${GRADE_TONE[smear.grade] ?? "border-slate-300/60 bg-slate-100/60 text-slate-700"}`}>
                  {GRADE_LABELS[smear.grade] ?? smear.grade}
                </span>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Coloração" value={STAIN_LABELS[smear.stain] ?? smear.stain} />
                <Field label="Graduação" value={GRADE_LABELS[smear.grade] ?? smear.grade} />
                <Field label="Contagem BAAR" value={smear.afb_count} />
                <Field label="Nº da lâmina" value={smear.serial_number ?? "—"} />
                <Field label="Amostra" value={smear.sample_barcode || smear.sample_type} />
                <Field label="Recebida" value={fmtDate(smear.sample_received_at)} />
                <Field label="Executado por" value={smear.performed_by_name} />
                <Field label="Realizada" value={fmtDate(smear.performed_at)} />
                <Field label="Código" value={smear.custom_id} />
              </div>
              {smear.notes ? (
                <div className="mt-2 rounded-lg border border-white/25 bg-white/40 px-2.5 py-1.5 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Observações</p>
                  <p className="whitespace-pre-wrap text-sm text-[var(--text)]">{smear.notes}</p>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
