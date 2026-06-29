"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, ClipboardList, Loader2, Pill, Plus, Search, StickyNote, Trash2, X } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const FIELD =
  "w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition";

const LABEL = "mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

const DOSAGE_UNITS = [
  { value: "MG", label: "mg" },
  { value: "ML", label: "ml" },
  { value: "G", label: "g" },
  { value: "L", label: "L" },
  { value: "KG", label: "kg" },
];

type Product = { id: number; name: string; custom_id?: string };

type LineItem = {
  key: string;
  medication: Product;
  dosage_value: string;
  dosage_unit: string;
  dose_count: string;
  interval_hours: string;
  notes: string;
};

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: typeof ClipboardList;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`relative overflow-hidden ${GLASS}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="px-3 py-2 pl-4">
        <div className="mb-3 flex items-start gap-2">
          <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accent} text-white shadow-sm`}>
            <Icon size={14} />
          </span>
          <div className="min-w-0">
            <h2 className="text-xs font-semibold leading-tight text-foreground">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

function MedicationSearch({ onSelect }: { onSelect: (p: Product) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function onInput(val: string) {
    setQuery(val);
    setOpen(true);
    if (timer.current) clearTimeout(timer.current);
    if (!val.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiFetch<{ results?: Product[]; count?: number } | Product[]>(
          `/pharmacy/product/?type=MED&search=${encodeURIComponent(val)}&page_size=10`
        );
        const list = Array.isArray(data) ? data : (data as any).results ?? [];
        setResults(list);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  }

  function select(p: Product) {
    onSelect(p);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Pesquisar medicação por nome…"
          className={`${FIELD} pl-8 pr-8`}
          value={query}
          onChange={e => onInput(e.target.value)}
          onFocus={() => query && setOpen(true)}
        />
        {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
        {query && !loading && (
          <button type="button" onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          {results.map(p => (
            <li key={p.id}>
              <button type="button" onClick={() => select(p)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition">
                <Pill size={13} className="shrink-0 text-violet-500" />
                <span className="font-medium text-foreground">{p.name}</span>
                {p.custom_id && <span className="ml-auto text-[10px] text-muted-foreground">{p.custom_id}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && query && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-lg">
          Sem resultados para "{query}"
        </div>
      )}
    </div>
  );
}

function LineItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: LineItem;
  onChange: (key: string, field: string, val: string) => void;
  onRemove: (key: string) => void;
}) {
  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    onChange(item.key, field, e.target.value);

  return (
    <div className="group relative rounded-lg border border-border/60 bg-background/40 p-3 transition hover:border-violet-500/30">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Pill size={13} className="text-violet-500" />
          <span className="text-sm font-semibold text-foreground">{item.medication.name}</span>
          {item.medication.custom_id && (
            <span className="rounded-full border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">
              {item.medication.custom_id}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(item.key)}
          className="rounded p-1 text-muted-foreground opacity-0 transition hover:text-red-500 group-hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        <div>
          <label className={LABEL}>Dose *</label>
          <input required type="number" min="0.01" step="0.01" placeholder="Ex.: 500"
            className={FIELD} value={item.dosage_value} onChange={set("dosage_value")} />
        </div>
        <div>
          <label className={LABEL}>Unidade *</label>
          <select required className={FIELD} value={item.dosage_unit} onChange={set("dosage_unit")}>
            {DOSAGE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Nº doses</label>
          <input type="number" min="1" placeholder="1" className={FIELD} value={item.dose_count} onChange={set("dose_count")} />
        </div>
        <div>
          <label className={LABEL}>Intervalo (h)</label>
          <input type="number" min="1" placeholder="Se >1 dose" className={FIELD} value={item.interval_hours} onChange={set("interval_hours")} />
        </div>
        <div className="col-span-2">
          <label className={LABEL}>Observações</label>
          <input type="text" placeholder="Notas de administração…" className={FIELD} value={item.notes} onChange={set("notes")} />
        </div>
      </div>
    </div>
  );
}

function PrescriptionItemCreateInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recordId = searchParams.get("record");

  const [items, setItems] = useState<LineItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(0);

  function addMedication(p: Product) {
    setItems(prev => [
      ...prev,
      { key: `${p.id}-${Date.now()}`, medication: p, dosage_value: "", dosage_unit: "MG", dose_count: "1", interval_hours: "", notes: "" },
    ]);
  }

  function updateItem(key: string, field: string, val: string) {
    setItems(prev => prev.map(i => i.key === key ? { ...i, [field]: val } : i));
  }

  function removeItem(key: string) {
    setItems(prev => prev.filter(i => i.key !== key));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!items.length) { setError("Adicione pelo menos uma medicação."); return; }
    setSaving(true);
    setError(null);
    let saved = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        const body: Record<string, any> = {
          medication: item.medication.id,
          dosage_value: item.dosage_value,
          dosage_unit: item.dosage_unit,
          dose_count: Number(item.dose_count) || 1,
          notes: item.notes,
        };
        if (recordId) body.record = Number(recordId);
        if (item.interval_hours) body.interval_hours = Number(item.interval_hours);

        await apiFetch("/medical_records/prescricaoitem/", { method: "POST", body: JSON.stringify(body) });
        saved++;
      } catch (reason: any) {
        errors.push(`${item.medication.name}: ${reason?.message || "Erro desconhecido"}`);
      }
    }

    setSaving(false);
    setSuccess(saved);

    if (errors.length) {
      setError(errors.join(" · "));
    } else {
      router.push(recordId ? `/medical-records/records/${recordId}` : "/medical-records/prescription-items");
    }
  }

  const backHref = recordId
    ? `/medical-records/records/${recordId}`
    : "/medical-records/prescription-items";

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <form onSubmit={handleSubmit} className="w-full space-y-2 px-1">

        {/* ── Cabeçalho ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20">
                <Pill size={17} />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-foreground">
                  Itens de prescrição
                </h1>
                <p className="text-[11px] text-muted-foreground">
                  {recordId ? `Cardex #${recordId} · ` : ""}
                  {items.length === 0 ? "Pesquise e adicione medicações abaixo." : `${items.length} medicaç${items.length === 1 ? "ão" : "ões"} adicionada${items.length === 1 ? "" : "s"}.`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button type="submit" disabled={saving}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-gradient-to-br from-violet-600 to-purple-600 px-4 text-sm font-semibold text-white shadow-sm shadow-violet-500/20 transition hover:opacity-90 disabled:opacity-60">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  {saving ? "A guardar…" : `Guardar ${items.length > 1 ? `(${items.length})` : ""}`}
                </button>
              )}
              <Link href={backHref}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 text-sm font-medium text-foreground backdrop-blur-sm transition hover:bg-white/20">
                <ArrowLeft size={16} /> Voltar
              </Link>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}
        {success > 0 && !error && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300">
            {success} item{success > 1 ? "s" : ""} guardado{success > 1 ? "s" : ""} com sucesso.
          </div>
        )}

        {/* ── Pesquisa de medicação ── */}
        <SectionCard title="Adicionar medicação" subtitle="Pesquise pelo nome e clique para adicionar à lista." icon={Search} accent="bg-sky-500">
          <MedicationSearch onSelect={addMedication} />
        </SectionCard>

        {/* ── Lista de itens ── */}
        {items.length > 0 && (
          <SectionCard title="Medicações prescritas" subtitle="Configure dose, unidade, esquema e observações para cada medicação." icon={Pill} accent="bg-violet-500">
            <div className="space-y-2">
              {items.map(item => (
                <LineItemRow key={item.key} item={item} onChange={updateItem} onRemove={removeItem} />
              ))}
            </div>
            <button type="button" onClick={() => document.querySelector<HTMLInputElement>('input[placeholder*="Pesquisar"]')?.focus()}
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-violet-500 transition">
              <Plus size={13} /> Adicionar outra medicação
            </button>
          </SectionCard>
        )}

        {/* ── Empty state ── */}
        {items.length === 0 && (
          <section className={`relative overflow-hidden ${GLASS}`}>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                <Pill size={22} />
              </span>
              <p className="text-sm font-medium text-foreground">Nenhuma medicação adicionada</p>
              <p className="mt-1 text-xs text-muted-foreground">Use a pesquisa acima para encontrar e adicionar medicações.</p>
            </div>
          </section>
        )}

      </form>
    </AppLayout>
  );
}

export default function PrescriptionItemCreatePage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Carregando…</div>}>
      <PrescriptionItemCreateInner />
    </Suspense>
  );
}
