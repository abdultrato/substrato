"use client";

import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Beaker,
  ClipboardList,
  FileText,
  Loader2,
  Microscope,
  Save,
  Search,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";
import { relationOptionsFromRows } from "@/lib/resources/relationOptions";
import type { RelationTarget } from "@/lib/resources/relationOptions";

const ENDPOINT = "/clinical_laboratory/culture/";
const BASE_PATH = "/clinical-laboratory/cultures";

const CULTURE_TYPES = [
  { value: "AEROBIA", label: "Aeróbia" },
  { value: "ANAEROBIA", label: "Anaeróbia" },
  { value: "FUNGICA", label: "Fúngica (micológica)" },
  { value: "MICOBACTERIA", label: "Micobacteriana (TB)" },
  { value: "HEMOCULTURA", label: "Hemocultura" },
  { value: "UROCULTURA", label: "Urocultura" },
  { value: "OUTRA", label: "Outra" },
];

const STATUS_CHOICES = [
  { value: "MONTADA", label: "Montada" },
  { value: "INCUBACAO", label: "Em incubação" },
  { value: "CRESCIMENTO", label: "Crescimento detetado" },
  { value: "SEM_CRESCIMENTO", label: "Sem crescimento" },
  { value: "CONCLUIDA", label: "Concluída" },
];

const ORDER_ITEM_TARGET: RelationTarget = {
  endpoint: "/clinical_laboratory/order_item/",
  labelFields: ["custom_id", "test_name", "exam_name", "test", "order", "id"],
};

const SAMPLE_TARGET: RelationTarget = {
  endpoint: "/clinical_laboratory/sample/",
  labelFields: ["barcode", "custom_id", "sample_type", "status", "id"],
};

const USER_TARGET: RelationTarget = {
  endpoint: "/identity/user/",
  labelFields: ["first_name", "last_name", "username", "email"],
};

const inputClass =
  "h-9 w-full rounded-lg border border-white/30 bg-white/35 px-3 text-sm text-foreground shadow-sm outline-none backdrop-blur-sm transition placeholder:text-muted-foreground focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.06]";

const textareaClass =
  "min-h-28 w-full rounded-lg border border-white/30 bg-white/35 px-3 py-2 text-sm text-foreground shadow-sm outline-none backdrop-blur-sm transition placeholder:text-muted-foreground focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 dark:border-white/10 dark:bg-white/[0.06]";

function RelationSelect({
  value,
  label,
  target,
  placeholder,
  required,
  onChange,
}: {
  value: number | null;
  label: string;
  target: RelationTarget;
  placeholder: string;
  required?: boolean;
  onChange: (value: number | null, label: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ value: string; label: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();

  function runSearch(nextQuery: string) {
    setQuery(nextQuery);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { items } = await apiFetchList<Record<string, unknown>>(target.endpoint, {
          page: 1,
          pageSize: 20,
          query: nextQuery.trim() ? { search: nextQuery.trim() } : undefined,
        });
        setResults(relationOptionsFromRows(items, target));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 220);
  }

  function selectOption(option: { value: string; label: string }) {
    onChange(Number(option.value), option.label);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="space-y-1.5">
      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-teal-200/60 bg-teal-50/60 px-3 py-2 text-sm text-teal-800 shadow-sm backdrop-blur-sm dark:border-teal-800/40 dark:bg-teal-900/20 dark:text-teal-200">
          <span className="truncate">{label}</span>
          <button
            type="button"
            onClick={() => onChange(null, "")}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-teal-600 transition hover:bg-white/60 hover:text-red-600 dark:text-teal-300 dark:hover:bg-white/10"
            aria-label="Limpar seleção"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            required={required}
            onChange={(event) => runSearch(event.target.value)}
            onFocus={() => runSearch(query)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className={`${inputClass} pl-9`}
          />
          {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {open && (
            <div id={listboxId} role="listbox" className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-white/30 bg-white/90 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90">
              {results.length ? (
                <ul className="max-h-56 overflow-y-auto divide-y divide-border/50">
                  {results.map((option) => (
                    <li key={option.value}>
                      <button
                        type="button"
                        onMouseDown={() => selectOption(option)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
                      >
                        {option.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-2 text-xs text-muted-foreground">{searching ? "A pesquisar..." : "Nenhum resultado encontrado."}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      {children}
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}

function GlassCard({
  title,
  icon: Icon,
  accent,
  iconTone = "from-teal-600 to-cyan-600",
  children,
}: {
  title: string;
  icon: typeof Microscope;
  accent: string;
  iconTone?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition focus-within:z-50 dark:border-white/10 dark:bg-white/5">
      <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />
      <div className="flex items-center gap-1.5 border-b border-white/30 px-3 py-1.5 pl-4 dark:border-white/10">
        <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${iconTone} text-white shadow-md shadow-slate-900/10`}>
          <Icon size={14} />
        </span>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-2 p-2.5 pl-4">{children}</div>
    </section>
  );
}

export default function ClinicalLaboratoryCulturesCreatePage() {
  const router = useRouter();
  const [orderItem, setOrderItem] = useState<number | null>(null);
  const [orderItemLabel, setOrderItemLabel] = useState("");
  const [sample, setSample] = useState<number | null>(null);
  const [sampleLabel, setSampleLabel] = useState("");
  const [performedBy, setPerformedBy] = useState<number | null>(null);
  const [performedByLabel, setPerformedByLabel] = useState("");
  const [cultureType, setCultureType] = useState("AEROBIA");
  const [specimen, setSpecimen] = useState("");
  const [status, setStatus] = useState("MONTADA");
  const [incubationStartedAt, setIncubationStartedAt] = useState("");
  const [readAt, setReadAt] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!orderItem) nextErrors.orderItem = "Selecione o item do pedido laboratorial.";
    if (readAt && incubationStartedAt && new Date(readAt) < new Date(incubationStartedAt)) {
      nextErrors.readAt = "A leitura não pode ser anterior ao início da incubação.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setSaveError(null);
    try {
      const created = await apiFetch<{ id: number }>(ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          order_item: orderItem,
          sample,
          culture_type: cultureType,
          specimen: specimen.trim(),
          status,
          incubation_started_at: incubationStartedAt || null,
          read_at: readAt || null,
          performed_by: performedBy,
          notes: notes.trim(),
        }),
      });
      router.push(`${BASE_PATH}/${created.id}`);
    } catch (error: any) {
      setSaveError(error?.message || "Não foi possível criar a cultura.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-5xl space-y-2">
        <div className="relative overflow-hidden rounded-xl border border-white/25 bg-gradient-to-br from-white/35 via-white/20 to-teal-100/25 p-2.5 pl-4 shadow-md shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:from-white/[0.07] dark:via-white/[0.03] dark:to-teal-950/20">
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-teal-500 to-cyan-600" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-teal-200/25 to-transparent dark:from-teal-900/10" />
          <div className="relative flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/25">
                <Microscope size={18} />
              </span>
              <div className="min-w-0">
                <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex rounded-full border border-teal-200/70 bg-teal-50/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700 backdrop-blur-sm dark:border-teal-800/40 dark:bg-teal-900/20 dark:text-teal-300">
                    Microbiologia
                  </span>
                  <span className="inline-flex rounded-full border border-cyan-200/70 bg-cyan-50/70 px-2 py-0.5 text-[10px] font-medium text-cyan-700 backdrop-blur-sm dark:border-cyan-800/40 dark:bg-cyan-900/20 dark:text-cyan-300">
                    Cultura
                  </span>
                </div>
                <h1 className="truncate text-lg font-semibold leading-tight text-foreground">Nova cultura microbiológica</h1>
                <p className="truncate text-xs text-muted-foreground">Montagem, incubação e primeira leitura da cultura.</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => router.push(BASE_PATH)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/40 bg-white/35 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/55 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <ArrowLeft size={15} />
                Voltar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-3 text-xs font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:from-teal-700 hover:to-cyan-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Criar cultura
              </button>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="rounded-xl border border-red-200/60 bg-red-50/50 px-3 py-2 text-sm text-red-800 shadow-sm backdrop-blur-sm dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {saveError}
          </div>
        )}

        <div className="grid gap-2">
          <div className="space-y-2">
            <GlassCard title="Pedido e amostra" icon={ClipboardList} accent="bg-gradient-to-b from-teal-500 to-cyan-600" iconTone="from-teal-600 to-cyan-600">
              <div className="grid gap-2 md:grid-cols-2">
                <Field label="Item do pedido" required error={errors.orderItem}>
                  <RelationSelect
                    value={orderItem}
                    label={orderItemLabel}
                    target={ORDER_ITEM_TARGET}
                    placeholder="Pesquisar item, exame ou pedido"
                    required
                    onChange={(value, label) => {
                      setOrderItem(value);
                      setOrderItemLabel(label);
                    }}
                  />
                </Field>
                <Field label="Amostra vinculada">
                  <RelationSelect
                    value={sample}
                    label={sampleLabel}
                    target={SAMPLE_TARGET}
                    placeholder="Pesquisar código de barras ou amostra"
                    onChange={(value, label) => {
                      setSample(value);
                      setSampleLabel(label);
                    }}
                  />
                </Field>
              </div>
              <Field label="Espécime">
                <input
                  value={specimen}
                  onChange={(event) => setSpecimen(event.target.value)}
                  placeholder="Ex.: urina jato médio, sangue periférico, escarro"
                  className={inputClass}
                />
              </Field>
            </GlassCard>

            <GlassCard title="Cultura e incubação" icon={Beaker} accent="bg-gradient-to-b from-amber-500 to-orange-600" iconTone="from-amber-500 to-orange-600">
              <div className="grid gap-2 md:grid-cols-2">
                <Field label="Tipo de cultura">
                  <select value={cultureType} onChange={(event) => setCultureType(event.target.value)} className={inputClass}>
                    {CULTURE_TYPES.map((choice) => (
                      <option key={choice.value} value={choice.value}>{choice.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Estado">
                  <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
                    {STATUS_CHOICES.map((choice) => (
                      <option key={choice.value} value={choice.value}>{choice.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <Field label="Incubação iniciada em">
                  <input
                    type="datetime-local"
                    value={incubationStartedAt}
                    onChange={(event) => setIncubationStartedAt(event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Leitura em" error={errors.readAt}>
                  <input
                    type="datetime-local"
                    value={readAt}
                    onChange={(event) => setReadAt(event.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
            </GlassCard>

            <GlassCard title="Execução e notas" icon={FileText} accent="bg-gradient-to-b from-violet-500 to-fuchsia-600" iconTone="from-violet-600 to-fuchsia-600">
              <Field label="Executado por">
                <RelationSelect
                  value={performedBy}
                  label={performedByLabel}
                  target={USER_TARGET}
                  placeholder="Pesquisar técnico ou utilizador"
                  onChange={(value, label) => {
                    setPerformedBy(value);
                    setPerformedByLabel(label);
                  }}
                />
              </Field>
              <Field label="Observações">
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Condições de semeadura, meios usados, suspeita clínica, observações da primeira leitura..."
                  className={textareaClass}
                />
              </Field>
            </GlassCard>
          </div>

        </div>
      </form>
    </AppLayout>
  );
}
